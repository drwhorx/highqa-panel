$(window).on("load", () => {
    var menu = ui.menu;
    var depts = menu.depts;

    ui.shop = menu.$("> .shop").ext((shop) => ({
        tile: shop.$("> .tile").extend({

        }),

        nav: () => shop.jobs.open(),
        card: shop.$("> .tile > .card").ext((card) => ({

        })).nav(() => shop.nav ? shop.nav() : null),

        info1: shop.$("> .tile > .info1").ext((info1) => ({
            jobNo: info1.$(".jobNo"),
            partNo: info1.$(".partNo"),
            pdf: info1.$(".copy.pdf").ext((pdf) => ({
                div: info1.$(".scroll"),
                loading: info1.$(".loading"),
                load: async function () {
                    let drawings = user.job.part.drawings.sort((a, b) =>
                        a.get["Title"].localeCompare(b.get["Title"])
                        || a.get["PdfPageNo"] - b.get["PdfPageNo"]);

                    pdf.div.hide();
                    drawings.map((drawing, i) => {
                        let img = pdf.dupe();
                        img.attr("src", drawing.png);
                        img.attr("tab-index", i);
                        pdf.div.append(img);
                    });
                    pdf.div.fadein();
                }
            }))
        })),
        info2: shop.$("> .tile > .info2").ext((info2) => ({
            jobNo: info2.$(".jobNo"),
            partNo: info2.$(".partNo"),
            opNo: info2.$(".opNo"),
            opName: info2.$(".opName"),
            reload: info2.$(".reload").nav(async () => {
                shop.planner.fadeout();
                shop.nav = null;
                loading(true);

                clear(user.job.results);
                clear(user.job.lots.fpi?.results);
                clear(user.job.lots.mfg?.results);
                user.job.samples.map(e => clear(e.results));
                let results = (await all(
                    user.job.samples.map(e => e.get_results())
                )).flat();
                load_results(results);

                shop.planner.load();
                await shop.planner.fadein();
                loading(false);
                shop.nav = shop.planner.close;
            }),
            fpi: info2.$(".fpi").nav(async () => {
                let sample = user.job.lots.fpi.samples[0];
                user.sample = sample
                if (!user.login)
                    if (await ui.prompts.modal(ui.login) == "cancel") return;
                return await ui.input.open();
            }),
            export: info2.$(".export").nav(async () => {
                loading(true);
                let book = XLSX.utils.book_new();
                let results = user.op.dims.map(e => e.results)
                    .flat().sort((a, b) => a.sample.get["SerialNumber"].match(/\d+/)[0] - b.sample.get["SerialNumber"].match(/\d+/)[0] ||
                        a.dim.get["DimSort"].localeCompare(b.dim.get["DimSort"]));
                let zip = new JSZip();
                XLSX.utils.book_append_sheet(book, XLSX.utils.table_to_sheet(
                    $("<table>").append(
                        $("<tr>").append([
                            "Dim #", "Requirement", "Sample #", "Result", "Status", "Operator", "S/N", "Comments", "Timestamp", "Attachments"
                        ].map(e => $("<td>").text(e)))
                    ).append(
                        await all(results.map(async result => {
                            let name = "";
                            let files = await result.get_files(() => true);
                            if (files.length > 1) {
                                let zip2 = new JSZip();
                                await all(files.map(async file => {
                                    let index = file["Name"].lastIndexOf(".");
                                    if (index < 0) index = file["Name"].length;
                                    let name = file["GUID"] + file["Name"].slice(index);
                                    await zip2.file(name, file["Blob"]);
                                }));
                                name = UUID() + ".zip";
                                zip.file(name, await zip2.generateAsync({ type: "blob" }));
                            }
                            if (files.length == 1) {
                                let file = files[0];
                                let index = file["Name"].lastIndexOf(".");
                                if (index < 0) index = file["Name"].length;
                                name = file["GUID"] + file["Name"].slice(index);
                                zip.file(name, file["Blob"]);
                            }
                            return $("<tr>").append([
                                result.dim.get["DimNo"],
                                result.dim.get["Requirement"],
                                result.sample.get["SerialNumber"],
                                result.get["Data"],
                                result.get["StatusText"],
                                result.inspector?.get["FirstName"] + " " + result.inspector?.get["LastName"],
                                result.data["S/N"] || "",
                                result.data["Comments"] || "",
                                (new Date(result.get["InspectedDate"]) - new Date("01/01/1900")) / (1000 * 60 * 60 * 24),
                                name
                            ].map(cell => $("<td>").text(cell)))
                        }))
                    )[0]
                ));
                if (raw(zip.files).length > 0) {
                    let array = XLSX.write(book, { type: "array", bookType: 'xlsx' });
                    let blob = new Blob([array]);
                    let name = user.job.get["Number"] + " - " + user.op.get["Code"];
                    zip.file(name + ".xlsx", blob);
                    let url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
                    download(url, name + ".zip");
                } else {
                    await XLSX.writeFile(book, user.job.get["Number"] + " - " + user.op.get["Code"] + ".xlsx");
                }
                loading(false);
            }),
            repair: info2.$(".repair").nav(async () => {
                await ui.prompts.modal(ui.quantity);
            })
        })),

        jobs: shop.$("> .jobs").ext((jobs) => ({
            grid: jobs.$(".grid").grid().ext((grid) => ({
                copy: grid.copy.nav(async function () {
                    return await shop.ops.open(this);
                })
            })),
            open: async function () {
                loading(true);
                shop.nav = null;
                let hide = depts.tiles.not(shop.tile);

                await hide.fadeout(true);
                await all([
                    menu.gap(0),
                    hide.width(0),
                    shop.gap("5vh"),
                    shop.tile.width("30vh"),
                ]);

                shop.nav = jobs.close;
                (async () => {
                    let res = await jobs.query.run();
                    if (res == "cancelled") return;
                    jobs.load()
                    shop.nav = null;

                    loading(false);
                    await jobs.fadein();
                    hide.hide();
                    shop.nav = jobs.close;
                })();
            },
            query: task(query_basic),
            load: function () {
                let grid = jobs.grid;
                grid.$("input").val(null);

                grid.rows().remove();
                let sorted = raw(model.job)
                    .filter(e => e.get["PartDeleted"] == 0 && e.get["Status"] == 1)
                    .sort((a, b) => b.get["Number"].replace(/..J/gi, "")
                        .localeCompare(a.get["Number"].replace(/..J/gi, "")))

                for (let job of sorted) {
                    let part = job.part;
                    let customer = part.customer;
                    let row = grid.copy.dupe();
                    row.$(".jobNo").span(job.get["Number"])
                        .prop("model", job);
                    row.$(".partNo").span(part.get["PartNumber"])
                        .prop("model", part);
                    row.$(".customer").span(customer.get["Name"])
                        .prop("model", customer);
                    row.$(".partName").span(part.get["PartName"])
                        .prop("model", part);
                    row.prop("model", job);
                    grid.append(row);
                }

                /*
                let parts = [...new Set(raw.jobs.map(e => e.part))]
                    .sort((a, b) => a.get["PartNumber"].localeCompare(b.get["PartNumber"]))
                let customers = [...new Set(raw.customers)]
                    .sort((a, b) => a.get["Name"].localeCompare(b.get["Name"]));
                expand.load(grid.find(".top .partNo"), parts.map(e => e.get["PartNumber"]), parts);
                expand.load(grid.find(".top .customer"), customers.map(e => e.get["Name"]), customers);
                */
            },
            close: async function () {
                jobs.query.cancel();
                loading(true);
                shop.nav = null;
                let show = depts.tiles.not(shop.tile);

                await jobs.fadeout();
                show.show();
                await all([
                    shop.gap(0),
                    show.width("40vh"),
                    menu.gap("15vh"),
                    shop.tile.width("40vh")
                ]);
                show.css("width", "")

                loading(false);
                await show.fadein();
                shop.nav = jobs.open;
            }
        })),
        ops: shop.$("> .ops").ext((ops) => ({
            grid: ops.$(".grid").grid().ext((grid) => ({
                copy: grid.copy.nav(async function () {
                    return await shop.planner.open(this);
                })
            })),
            open: async function (row) {
                loading(true);
                shop.nav = null;

                await shop.jobs.fadeout();
                await all([
                    shop.tile.width("95vh"),
                    shop.card.height("17.5vh"),
                    shop.tile.gap("2.5vh")
                ]);

                user.job = $(row).prop("model");
                shop.info1.jobNo.text("Job #: " + user.job.get["Number"]);
                shop.info1.partNo.text("Part #: " + user.job.part.get["PartNumber"]);
                shop.info1.$(".clone").remove();
                shop.info1.pdf.div.hide();
                shop.info1.pdf.loading.fadein();
                shop.info1.fadein();

                shop.nav = ops.close;
                (async () => {
                    let res = await ops.query.run();
                    if (res == "cancelled") return;

                    await shop.info1.pdf.loading.fadeout();
                    shop.nav = null;
                    shop.info1.pdf.load();
                    shop.ops.load();

                    loading(false);
                    await ops.fadein();
                    shop.nav = ops.close;
                })();
            },
            query: task(async (valid) => {
                await all([
                    query_job(user.job, { do_drawings: true, do_holders: true }, valid)
                ]);
                return valid();
            }),
            load: function () {
                let grid = ops.grid;

                grid.rows().remove();
                let sorted = user.job.part.ops
                    .sort((a, b) => a.get["Number"] - b.get["Number"])
                for (let op of sorted) {
                    let row = dupe(grid.copy);
                    row.$(".opNo").span(op.get["Code"]);
                    row.$(".opName").span(op.get["Title"]);
                    if (op.dims.find(e => e.results.length > 0))
                        row.addClass("active");
                    row.prop("model", op);
                    grid.append(row);
                }
            },
            close: async function () {
                ops.query.cancel();
                loading(true);
                shop.nav = null;

                await all([
                    shop.info1.fadeout(),
                    ops.fadeout()
                ]);
                await all([
                    shop.card.height("85vh"),
                    shop.tile.gap(0),
                    shop.tile.width("30vh")
                ])

                loading(false);
                await shop.jobs.fadein();
                shop.nav = shop.jobs.close;
            }
        })),
        planner: shop.$("> .planner").ext((planner) => ({
            grid: planner.$(".grid").grid().ext((grid) => ({
                dim: grid.$(".content .left").nav(async function () {
                    d3.selectAll(".spc.popup svg").selectAll("*").remove();
                    $(".spc.popup .stat, .spc.alpha .spc_tip .stat").text("")

                    let dim = $(this).prop("model");
                    ui.prompts.spc.load(dim);
                    return await ui.prompts.open(ui.prompts.spc);
                }),
                sample: grid.$(".sample.copy").nav(async function () {
                    let sample = $(this).prop("model");
                    user.sample = sample;
                    if (!user.login) {
                        await ui.people.logins.open();
                        if (await ui.prompts.modal(ui.people) == "cancel") return;
                    }
                    try {
                        loading(true);
                        let job = (await RealTrac.get_job({ jobNo: user.job.get["Number"] }))[0];
                        let employee = await RealTrac.get_employee({ employeeNo: user.login.get["EmployeeID"] });
                        if (!employee || !job) throw(null);
                        let sessions = await RealTrac.get_employee_sessions(employee.id);
                        for (let session of sessions) {
                            let op = await RealTrac.get_op({ opID: session.router_id });
                            if (job.id == op.job_id) {
                                let station = await RealTrac.get_station({ stationID: session.workStation_id });
                                ui.people.reset()
                                await ui.people.logins.load();
                                ui.people.options.user = employee;
                                await ui.people.options.load();
                                ui.people.session.user = employee;
                                ui.people.session.job = job;
                                ui.people.session.op = op;
                                ui.people.session.station = station;
                                ui.people.session.session = session;
                                await ui.people.session.edit.open();
                                loading(false);
                                await ui.prompts.modal(ui.people);
                                throw(null);
                            }
                        }
                    } catch (err) {
                        console.log(err);
                    }
                    loading(false);
                    await ui.input.open();
                }),
                pick: false,
                dragging: false,
                plan: grid.$(".plan.copy").off("hover pointerdown pointermove")
                    .hover(function (e) {
                        let sample = $(this).prop("sample");
                        $(sample).addClass("hover");
                    }, async (e) => {
                        grid.$(".hover").removeClass("hover")
                    }).on("mousedown", function (e) {
                        if (e.button > 0) return;
                        grid.dragging = true;
                        grid.pick = !$(this).hasClass("pick");
                        $(this).toggleClass("pick", grid.pick);
                    }).on("mousemove", function () {
                        if (!grid.dragging) return;
                        $(this).toggleClass("pick", grid.pick);
                    }).on("mouseup", async function (e) {
                        if (e.button > 0) return;
                        grid.dragging = false;
                        let action = shop.info2.$(".action");
                        let modify = shop.info2.$(".modify");
                        if (grid.pick && action.is(":visible")) {
                            await action.fadeout();
                            await modify.fadein();
                        }
                        if (!grid.pick && !grid.$(".pick").get(0)) {
                            await modify.fadeout();
                            await action.fadein();
                        }
                    })
            })),
            open: async function (row) {
                loading(true);
                shop.nav = null;

                await all([
                    shop.ops.fadeout(),
                    shop.info1.fadeout()
                ]);
                await all([
                    shop.tile.width("30vh"),
                    shop.card.height("30vh"),
                    shop.info2.height("48.5vh")
                ]);
                user.op = $(row).prop("model");
                shop.info2.jobNo.text(user.job.get["Number"]);
                shop.info2.partNo.text(user.job.part.get["PartNumber"]);
                shop.info2.opNo.text(user.op.get["Code"]);
                shop.info2.opName.text(user.op.get["Title"]);

                loading(false);
                planner.load();
                let modify = shop.info2.$(".modify");
                let action = shop.info2.$(".action");
                await all([
                    shop.info2.fadein(),
                    planner.fadein(),
                    modify.fadeout(),
                    action.fadein()
                ]);
                shop.nav = planner.close;
            },
            load: function () {
                let job = user.job;
                let op = user.op;

                planner.$(".clone").remove();
                let cols = job.lots.mfg.samples
                    .sort((a, b) => a.get["SerialNumber"].replace(/\D+/g, '')
                        - b.get["SerialNumber"].replace(/\D+/g, ''));
                let rows = op.dims
                    .sort((a, b) => a.get["DimSort"].localeCompare(b.get["DimSort"]));

                for (let i = 0; i < cols.length; i++) {
                    let row = planner.grid.head;
                    let cell = row.copy.dupe();
                    cell.span(cols[i].get["SerialNumber"].replace("_Scrap", ""));
                    cell.prop("model", cols[i])
                    row.append(cell);
                }
                let headers = planner.$(".sample");

                for (let i = 0; i < rows.length; i++) {
                    let row = planner.grid.copy.dupe();
                    let dim = rows[i];
                    row.$(".dimNo").span(dim.get["DimNo"]);
                    row.$(".dimReq").span(dim.get["Requirement"]);
                    row.$(".left").prop("model", dim);

                    for (let j = 0; j < cols.length; j++) {
                        let cell = row.copy.dupe();
                        let holder = dim.holders.find(e => e.sample == cols[j]);
                        let result = dim.get_result(cols[j]);
                        cell.addClass(dim.get_status(cols[j]));
                        cell.prop("dim", row.$(".left"));
                        cell.prop("sample", headers[j]);
                        cell.prop("model", result || holder);
                        row.append(cell);
                    }
                    planner.grid.append(row);
                }
            },
            close: async function () {
                loading(true);
                shop.nav = null;

                await all([
                    planner.fadeout(),
                    shop.info2.fadeout()
                ]);
                await all([
                    shop.tile.width("95vh"),
                    shop.card.height("17.5vh")
                ]);

                loading(false);
                await all([
                    shop.ops.fadein(),
                    shop.info1.fadein()
                ]);
                shop.nav = shop.ops.close;
            }
        }))
    }));
})