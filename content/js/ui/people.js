$(window).on("load", () => {
    ui.people = $(".popup.people").ext((people) => ({
        loading: $(".alpha.people").$(".loading"),
        logins: people.$(".logins").ext((logins) => ({
            scroll: logins.$(".scroll"),
            users: logins.$(".users"),
            user: logins.$(".user.copy").ext((user) => ({
                pfp: user.$(".pfp"),
                name: user.$(".name"),
                status: user.$(".status")
            })).nav(async function () {
                let user = $(this).prop("model");
                await people.options.open(user);
            }),
            load: async (old_user) => {
                let current = await RealTrac.get_current_logins();
                let users = (await RealTrac.get_employee_exts())
                    .filter(e => e.active)
                    .sort((a, b) => a.name.localeCompare(b.name));

                logins.$(".clone").remove();
                for (let user of users) {
                    user.logins = current.filter(e => e.employee_id == user.id);
                    let dupe = logins.user.dupe();
                    let url = URL.createObjectURL(new Blob([user.myImage]));
                    if (user.myImage?.byteLength > 0)
                        dupe.css("--pfp", `url(${url})`);
                    dupe.name.text(user.name);
                    dupe.toggleClass("active", user.logins.length > 0);
                    dupe.prop("model", user);
                    logins.users.append(dupe);
                }
                if (old_user)
                    return users.find(e => e.id == old_user.id);
            },
            open: async () => {
                people.reset();
                loading(true);
                await logins.load();
                await people.options.load();
                loading(false);
                people.session.hide();
                people.logins.show();
            }
        })),
        options: people.$(".options").ext((options) => ({
            name: options.$(".name"),
            clock: options.$(".clock").nav(async function () {
                if (!options.user) return;
                people.loading.fadein();
                let user = options.user;
                if (!user) return;
                if ($(this).hasClass("accept"))
                    await RealTrac.punch_out_employee({ employeeID: user.id });
                if ($(this).hasClass("cancel"))
                    await RealTrac.punch_in_employee({ employeeID: user.id });
                options.user = await people.logins.load(user);
                await options.load();
                people.loading.fadeout();
            }),
            clocked: options.$(".clocked"),
            scroll: options.$(".scroll"),
            add: options.$(".add").nav(async () => {
                if (!options.user) return;
                people.session.user = options.user;
                await people.session.open();
            }),
            login: options.$(".login").nav(async function () {
                if ($(this).hasClass("invalid") || !options.user) return;
                let contact = raw(model.contact).find(e => e.get["EmployeeID"] == options.user.number);
                if (!contact) return;
                user.login = contact;
                ui.title.name.text(contact.get["FirstName"] + " " + contact.get["LastName"])
                await ui.prompts.close(people, "accept");
            }),
            active: options.$(".copy.active").ext((active) => ({
                jobTitle: active.$(".jobTitle"),
                opTitle: active.$(".opTitle")
            })).nav(async function () {
                people.session.op = null;
                people.session.job = null;
                people.session.session = $(this).prop("model");
                people.session.user = options.user;
                await people.session.edit.open();
            }),
            user: null,
            load: async function () {
                let user = options.user;
                if (!user) return;
                options.name.text(user.name);
                let logins = await RealTrac.get_employee_logins(user.id);
                let clocked = logins.find(e => e.startDateTime)?.startDateTime;
                options.clocked.text(
                    clocked ? "Clocked " + $.format.date(new Date(clocked), "E M/dd h:mma") : "Not Clocked"
                );
                options.clock.toggleClass("accept", !!clocked);
                options.clock.toggleClass("cancel", !clocked);
                options.login.toggleClass("invalid", !raw(model.contact).find(
                    e => user.number == e.get["EmployeeID"]
                ));

                let sessions = await RealTrac.get_employee_sessions(user.id);
                let cells = await all(sessions.map(async session => {
                    let op = await RealTrac.get_op({ opID: session.router_id });
                    let job = await RealTrac.get_job({ jobID: op.job_id });
                    let part = await RealTrac.get_part({ partID: job.part_id });
                    let station = await RealTrac.get_station({ stationID: session.workStation_id });
                    let preview = await RealTrac.get_file({ fileID: part.primaryFileAttachment_id });

                    let dupe = options.active.dupe();
                    dupe.prop("model", session);
                    dupe.jobTitle.text(job.numberStr + " - " + part.name);
                    dupe.opTitle.text("OP " + op.operationNumber + " - " + station.name);
                    let url = URL.createObjectURL(new Blob([preview?.imageSnapShot]));
                    if (preview?.imageSnapShot?.byteLength > 0)
                        dupe.css("background-image", `url("${url}")`);
                    return dupe;
                }));
                options.$(".clone").remove();
                options.scroll.append(cells);
            },
            open: async function (user) {
                options.user = user;
                await options.fadeout(true);
                options.$(".clone").remove();
                await options.load(user);
                await options.fadein();
            }
        })),
        session: people.$(".session").ext((session) => ({
            title: session.$("> .scroll > .header > .title"),
            scroll: session.$(".scroll"),
            menus: session.$(".menu"),
            keys: session.$(".keys").ext((keys) => ({
                input: keys.$("input").on("input", function () {
                    let val = $(this).val();
                    session.jobs.$(".job").each(function () {
                        if (!$(this).$(".jobNo").text().includes(val))
                            $(this).hide();
                        else
                            $(this).show();
                    });
                }),
                num: keys.$(".num").click(function () {
                    if ($(this).hasClass("clear")) return;
                    let val = keys.input.val();
                    keys.input.val(val + $(this).text());
                    keys.input.trigger("input");
                }),
                clear: keys.$(".clear").click(function () {
                    keys.input.val("");
                    keys.input.trigger("input");
                })
            })),
            info: session.$(".header .info").ext((info) => ({
                jobNo: info.$(".jobNo"),
                opNo: info.$(".opNo"),
                stationName: info.$(".stationName")
            })),
            jobs: session.$(".jobs").ext((jobs) => ({
                row: jobs.$(".row.copy"),
                job: jobs.$(".job.copy").ext((job) => ({
                    jobNo: job.$(".jobNo"),
                    partNo: job.$(".partNo")
                })).nav(async function () {
                    session.job = $(this).prop("model");
                    await session.ops.open();
                }),
                load: async () => {
                    people.loading.fadein();
                    let res = (await RealTrac.get_active_jobs())
                        .sort((a, b) => b.numberStr.replace(/..J/gi, "")
                            .localeCompare(a.numberStr.replace(/..J/gi, "")));
                    let cells = res.map(job => {
                        let dupe = jobs.job.dupe();
                        dupe.prop("model", job);
                        dupe.jobNo.text(job.numberStr);
                        dupe.partNo.text(job.partName);
                        let url = URL.createObjectURL(new Blob([job.imageSnapShot]));
                        if (job.imageSnapShot?.byteLength > 0)
                            dupe.css("background-image", `url("${url}")`);
                        return dupe;
                    });
                    jobs.$(".clone").remove();
                    jobs.append(cells);
                    people.loading.fadeout();
                }
            })),
            ops: session.$(".ops").ext((ops) => ({
                op: ops.$(".op.copy").ext((op) => ({
                    opTitle: op.$(".opTitle"),
                    opDesc: op.$(".opDesc")
                })).nav(async function () {
                    session.op = $(this).prop("model");
                    await session.stations.open();
                }),
                load: async () => {
                    people.loading.fadein();
                    let job = session.job;
                    let res = (await RealTrac.get_job_ops({ jobID: job.id }))
                        .sort((a, b) => a.lineNumber - b.lineNumber);
                    let cells = await all(res.map(async op => {
                        let dupe = ops.op.dupe();
                        dupe.prop("model", op);
                        let title = "";
                        if (op.workCenter_id)
                            title = (await RealTrac.get_center({ centerID: op.workCenter_id })).name;
                        else if (op.vendor_id)
                            title = (await RealTrac.get_customer({ customerID: op.vendor_id })).customerCode;
                        dupe.opTitle.text("OP " + op.operationNumber + " - " + title);
                        dupe.opDesc.text(op.description + "\n" + op.specLines);
                        return dupe;
                    }));
                    ops.hide();
                    ops.$(".clone").remove();
                    ops.append(cells);
                    ops.fadein();
                    people.loading.fadeout();
                },
                open: async () => {
                    await all([
                        session.jobs.fadeout(),
                        session.keys.fadeout(true)
                    ]);
                    session.info.jobNo.text(session.job.numberStr);
                    session.info.opNo.hide();
                    session.info.stationName.hide();
                    await ops.load();
                    session.keys.hide();
                    await all([
                        ops.fadein(),
                        session.info.fadein()
                    ]);
                }
            })),
            stations: session.$(".stations").ext((stations) => ({
                station: stations.$(".station.copy").ext((station) => ({
                    stationName: station.$(".stationName"),
                    stationNo: station.$(".stationNo")
                })).nav(async function () {
                    session.station = $(this).prop("model");
                    session.session = null;
                    session.edit.open();
                }),
                load: async () => {
                    people.loading.fadein();
                    let op = session.op;
                    let res = (await RealTrac.get_stations())
                        .sort((a, b) => a.number - b.number);
                    let cells = res.map(station => {
                        let dupe = stations.station.dupe();
                        dupe.prop("model", station);
                        dupe.stationName.text(station.name);
                        dupe.stationNo.text(station.number);
                        dupe.css("--station-color", `#${(16777216 + station.color).toString(16)}`);
                        return dupe;
                    });
                    stations.hide();
                    stations.$(".clone").remove();
                    stations.append(cells);
                    stations.fadein();
                    people.loading.fadeout();
                },
                open: async () => {
                    await all([
                        session.ops.fadeout(),
                        session.info.fadeout(true)
                    ]);
                    session.info.opNo.text("OP " + session.op.operationNumber);
                    session.info.opNo.show();
                    session.info.stationName.hide();
                    await stations.load();
                    await all([
                        stations.fadein(),
                        session.info.fadein()
                    ]);
                }
            })),
            edit: session.$(".edit").ext((edit) => ({
                incr: edit.$(".incr").nav(async function () {
                    session.session = await RealTrac.get_session({ sessionID: session.session.id });
                    let good = session.session.pieceCount;
                    let scrap = session.session.scrapCount;
                    let res;
                    if ($(this).hasClass("good")) {
                        res = await RealTrac.set_session_qty({
                            sessionID: session.session.id,
                            good: good + +$(this).attr("value")
                        });
                    }
                    if ($(this).hasClass("scrap")) {
                        res = await RealTrac.set_session_qty({
                            sessionID: session.session.id,
                            scrap: scrap + +$(this).attr("value")
                        });
                    }
                    session.session = await RealTrac.get_session({ sessionID: session.session.id });
                    await edit.load();
                }),
                toggle: edit.$(".toggle").nav(async function () {
                    if ($(this).hasClass("accept")) {
                        let sessionID = (await RealTrac.add_new_session({
                            employeeID: session.user.id,
                            routerID: session.op.id,
                            stationID: session.station.id,
                        }));
                        session.session = await RealTrac.get_session({ sessionID });
                        return await edit.load();
                    }
                    if ($(this).hasClass("cancel")) {
                        let res = await RealTrac.set_session_end({ sessionID: session.session.id });
                        session.session = null;
                        session.op = await RealTrac.get_op({ opID: session.op.id });
                        return await edit.load();
                    }
                }),
                break: edit.$(".break").nav(async function () {
                    if ($(this).hasClass("invalid") || !session.session) return;
                    await RealTrac.set_session_break({
                        sessionID: session.session.id,
                        toBreak: $(this).hasClass("accept")
                    });
                    session.session = await RealTrac.get_session({ sessionID: session.session.id });
                    session.op = await RealTrac.get_op({ opID: session.op.id });
                    await edit.load();
                }),
                close: edit.$(".close").nav(async function () {
                    if ($(this).hasClass("invalid") || !session.session) return;
                    let res = await RealTrac.set_session_end({ sessionID: session.session.id, closeOp: true });
                    session.session = null;
                    session.op = await RealTrac.get_op({ opID: session.op.id });
                    return await edit.load();
                }),

                sessionInfo: edit.$(".sessionInfo").ext((info) => ({
                    title: info.$(".title"),
                    clocked: info.$(".clocked"),
                    pieces: info.$(".pieces"),
                    scrapped: info.$(".scrapped"),
                    hours: info.$(".hours"),
                    comments: info.$(".comments"),
                })),
                opInfo: edit.$(".opInfo").ext((info) => ({
                    title: info.$(".title"),
                    status: info.$(".status"),
                    pieces: info.$(".pieces"),
                    scrapped: info.$(".scrapped"),
                    hours: info.$(".hours"),
                    comments: info.$(".comments"),
                })),

                inputs: edit.$(".inputs"),
                incr: edit.$(".incr"),
                comments: edit.$(".comments")
                    .on("input", async function () {
                        await RealTrac.set_session_comment({
                            sessionID: session.session.id,
                            comment: $(this).val()
                        });
                        session.session.comment = $(this).val();
                    })
                    .on("focus", async () => {
                        await people.bounce({ "margin-top": "-23vh", "height": "90vh" });
                    }),

                load: async () => {
                    people.loading.fadein();
                    let sessions = await RealTrac.get_op_sessions({ opID: session.op.id });
                    let center = await RealTrac.get_center({ centerID: session.op.workCenter_id });
                    let user = session.session ?
                        await RealTrac.get_employee({ employeeID: session.session.employee_id }) : session.user;

                    let stats = sessions.reduce((a, b) => ({
                        good: a.good + b.pieceCount,
                        scrap: a.scrap + b.scrapCount,
                        hours: a.hours + (b.elapsedTime_s - b.totalBreakTime_s) / 3600,
                    }), {
                        good: 0, scrap: 0, hours: 0
                    });

                    edit.opInfo.title.text("OP " + session.op.operationNumber + " - " + center.name);
                    edit.opInfo.status.text("Status:\n" +
                        (new Date(session.op.dateClosed || "1/1/1950") > new Date("1/2/1950") ? "Closed" : "In Progress"));
                    edit.opInfo.hours.text("Elapsed:\n" + stats.hours.toFixed(2) + " Hrs");
                    edit.opInfo.pieces.text("Complete:\n" + stats.good + " Parts");
                    edit.opInfo.scrapped.text("Scrap:\n" + stats.scrap + " Parts");
                    edit.inputs.hide();

                    edit.toggle.text("New Session");
                    edit.toggle.toggleClass("accept", true);
                    edit.toggle.toggleClass("cancel", false);

                    edit.break.text("Break");
                    edit.break.toggleClass("invalid", true);
                    edit.break.toggleClass("accept", false);
                    edit.break.toggleClass("cancel", false);

                    edit.close.toggleClass("invalid", true);

                    if (!session.session) {
                        session.title.text("New Session");
                        edit.inputs.hide();
                        edit.comments.hide();
                        edit.sessionInfo.hide();
                    } else {
                        session.title.text("Edit Session");
                        edit.sessionInfo.title.text("Session: " + user.name);
                        edit.inputs.show();
                        edit.comments.show();
                        edit.sessionInfo.show();
                        let hours = (((new Date() - new Date(session.session.startDateTime)) / 1000 - session.session.totalBreakTime_s) / 3600);
                        edit.sessionInfo.hours.text("Elapsed:\n" + hours.toFixed(2) + " Hrs");
                        edit.sessionInfo.pieces.text("Complete:\n" + session.session.pieceCount + " Parts");
                        edit.sessionInfo.scrapped.text("Scrap:\n" + session.session.scrapCount + " Parts");
                        if (new Date(session.session.endDateTime || "1/1/1950") < new Date("1/2/1950")) {
                            edit.break.toggleClass("invalid", false);
                            if (new Date(session.session.breakStart || "1/1/1950") > new Date("1/2/1950")) {
                                edit.break.text("End Break");
                                edit.break.toggleClass("accept", false);
                                edit.break.toggleClass("cancel", true);
                                edit.sessionInfo.clocked.text("On Break:\n" +
                                    $.format.date(new Date(session.session.breakStart), "M/dd h:mma"));
                            } else {
                                edit.break.toggleClass("accept", true);
                                edit.break.toggleClass("cancel", false);
                                edit.sessionInfo.clocked.text("Started:\n" +
                                    $.format.date(new Date(session.session.startDateTime), "M/dd h:mma"));
                            }
                            edit.toggle.text("End Session");
                            edit.toggle.toggleClass("accept", false);
                            edit.toggle.toggleClass("cancel", true);

                            edit.close.toggleClass("invalid", false);
                            edit.close.toggleClass("cancel", true);
                        } else {
                            edit.sessionInfo.clocked.text("Finished:\n" +
                                $.format.date(new Date(session.session.endDateTime), "M/dd h:mma"));
                        }
                        edit.comments.val(session.session.comment);
                    }
                    people.options.load();
                    people.loading.fadeout();
                },
                open: async () => {
                    if (!session.session) {
                        await all([
                            session.stations.fadeout(),
                            session.info.fadeout(true)
                        ]);
                        session.info.stationName.show();
                        session.info.stationName.text(session.station.name);
                        await edit.load();
                        await all([
                            edit.fadein(),
                            session.info.fadein()
                        ]);
                    } else {
                        await people.logins.fadeout(true);
                        session.menus.hide();
                        session.reset();
                        session.op = await RealTrac.get_op({ opID: session.session.router_id });
                        session.job = await RealTrac.get_job({ jobID: session.op.job_id });
                        session.station = await RealTrac.get_station({ stationID: session.session.workStation_id });

                        session.info.jobNo.show();
                        session.info.opNo.show();
                        session.info.stationName.show();
                        session.info.jobNo.text(session.job.numberStr);
                        session.info.opNo.text("OP " + session.op.operationNumber);
                        session.info.stationName.text(session.station.name);

                        await edit.load();
                        people.logins.hide();
                        session.keys.hide();
                        session.info.show();
                        edit.show();
                        await session.fadein();
                    }
                },
                keyboard: $(".alpha.people .keyboard").ext((keyboard) => ({
                    close: keyboard.$(".close").nav(async () => {
                        await people.bounce({ "margin-top": "0", "height": "100vh" });
                    })
                }))
            })),
            open: async function () {
                await people.logins.fadeout();
                session.reset();
                session.menus.hide();
                session.jobs.show();
                session.info.hide();
                session.keys.show();
                session.title.text("Add Session");
                await session.fadein();
                await session.jobs.load();
                session.jobs.fadein();
            }
        }))
    }));
});