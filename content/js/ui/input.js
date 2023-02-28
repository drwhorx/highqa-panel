$(window).on("load", () => {
    user.serial = "";
    ui.input = $(".input.popup").ext((input) => ({
        open: async function (spc) {
            input.reset();
            sample = user.sample;
            input.drawings.$(".clone").remove();
            let drawings = user.job.part.drawings.sort((a, b) =>
                a.get["Title"].localeCompare(b.get["Title"])
                || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
            for (let drawing of drawings) {
                let dims = user.op.dims.filter(e =>
                    drawing.dims.includes(e) && (spc == e ||
                        (e.holders.find(h => h.sample == sample) ||
                            e.results.find(h => h.sample == sample)))
                );
                if (dims.length == 0) continue;
                let dupe1 = ui.input.drawings.copy.dupe();
                drawing.draw_svg(dupe1.svg, dims);
                dupe1.$(".dim").each(function () {
                    let dim = $(this).prop("model");
                    $(this).addClass(dim.get_status(sample));
                    if (spc) {
                        dupe1.data.dim = $(this);
                        dupe1.dimreq.addClass(dim.get_status());
                        dupe1.dimreq.text(dim.get["DimNo"] + ": " + dim.get["Requirement"]);
                        dupe1.spotlight.show();
                    }
                });
                input.drawings.append(dupe1);
            }
            input.info.jobNo.text(user.job.get["Number"] + " - " + user.job.part.get["PartNumber"]);
            input.info.opNo.text(user.op.get["Code"] + " - " + user.op.get["Title"]);
            input.info.sampleNo.text("Sample " + user.sample?.get["SerialNumber"]);
            input.info.sampleNo.show(user.sample);
            input.info.loginName.text(
                user.login ? user.login.get["FirstName"] + " " + user.login.get["LastName"] : "Guest"
            );
            input.controls.input.hide();
            input.controls.browse.show();
            input.keyboard.hide();
            input.attach.hide();
            ui.prompts.spc.closest(".alpha").insertBefore(ui.input.closest(".alpha"));
            await ui.prompts.open(input);
        },
        info: input.$(".info1, .info2").ext((info) => ({
            jobNo: info.$(".jobNo"),
            opNo: info.$(".opNo"),
            sampleNo: info.$(".sampleNo"),
            loginName: info.$(".loginName"),
        })),
        drawings: input.$(".drawings").ext((drawings) => ({
            copy: drawings.$(".drawing.copy").ext((drawing) => ({
                scale: 1,
                loading: drawing.$(".loading"),
                spotlight: drawing.$(".spotlight"),
                dimreq: drawing.$(".spotlight .dimreq").nav(async function () {
                    await ui.prompts.spc.load(drawing.data.dim.prop("model"));
                }),
                multiples: drawing.$(".multiples").ext((multiples) => ({
                    scroll: multiples.$(".scroll"),
                    set_multiple: (multiple) => {
                        let dim = drawing.data.dim.prop("model");
                        let result = multiple.prop("model");
                        drawing.data.result = result;
                        drawing.data.multiple = multiple;
                        drawing.data.display.val(result ? $.fixed(result.get["Data"], dim.places()) : "");
                        drawing.data.display.attr("placeholder", result ? $.fixed(result.get["Data"], dim.places()) : multiple.text());
                        drawing.data.accept.check();

                        input.controls.comments.val(result?.data["Comments"] || "");
                        input.controls.comments.trigger("input");
                        let serial = result?.data["S/N"] || "";
                        user.serial = serial || user.serial;
                        input.controls.serial.val(user.serial);
                        input.controls.serial.toggleClass("pulsate", user.serial != serial);
                        input.controls.result = result;

                        let opposite = {
                            1: 2, 2: 1, 3: 4, 4: 3
                        }[dim.get["Units"]];
                        input.controls.unit1.val(dim.get["Units"]);
                        input.controls.unit1.text(types.Units[dim.get["Units"]]);
                        input.controls.unit2.val(opposite);
                        input.controls.unit2.text(types.Units[opposite]);
                        if (result) input.controls.unit1.trigger("click");

                        drawing.multiples.$(".multiple").removeClass("pulsate");
                        multiple.addClass("pulsate");

                        (async () => {
                            await input.attach.$(".clone").fadeout();
                            if (input.attach.is(":visible"))
                                input.attach.open();
                        })();
                    },
                    copy: multiples.$(".multiple.copy").nav(async function () {
                        multiples.set_multiple($(this));
                    }),
                })),
                data: drawing.$(".data").ext((data) => ({
                    dim: null,
                    result: null,
                    multiple: null,
                    loading: false,
                    display: data.$(".display").on("input", function (e) {
                        data.accept.check();
                    }),
                    number: data.$(".number").nav(function () {
                        let text = $(this).text();
                        data.display.val(data.display.val() + text);
                        data.accept.check();
                    }),
                    back: data.$(".back").nav(function () {
                        let val = data.display.val();
                        data.display.val(val.slice(0, -1));
                        data.accept.check();
                    }),
                    accept: data.$(".accept").ext((accept) => ({
                        check: () => {
                            accept.toggleClass("invalid", isNaN(data.display.val()) || (
                                data.display.val().trim() === "" && !data.result
                            ))
                            if (data.result) {
                                if (data.display.val().trim() === "") accept.text("Delete");
                                else if (data.display.val() == data.result.get["Data"]) accept.text("Resubmit");
                                else accept.text("Accept");
                            } else {
                                accept.text("Accept");
                            }
                        }
                    })).nav(async function () {
                        if ($(this).hasClass("invalid")) return;
                        await drawing.loading.fadein();
                        let shape = data.dim;
                        let dim = shape.prop("model");
                        let sample = user.sample;
                        let login = user.login;
                        let number = data.display.val();
                        let units = input.$(".units").not(".invalid").val();
                        let files = [];
                        if (data.result) {
                            files = (await data.result.get_files(() => true)).filter(file =>
                                !input.attach.$(".download.cancel").get().find(e =>
                                    $(e).prop("model")?.get["GUID"] == file["GUID"]
                                )
                            );
                            query = API("results/delete");
                            query.req["ResultGUIDs"] = data.result.get["GUID"];
                            await query.send();
                            unload_results([data.result]);
                        }
                        if (number.trim() !== "") {
                            let scale = dim.convert(units);
                            if (!isNaN(+number.trim())) number = +number / scale;

                            let date = new Date().toHighQADate();
                            if (data.result && data.result.get["Data"] == number)
                                date = data.result.get["InspectedDate"] || date;
                            query = API("ncr/set");
                            query.req["InputNCR"] = {
                                "GUID": "",
                                "JobGUID": user.job.get["GUID"],
                                "LotGUID": "",
                                "Number": date,
                                "Status": 0,
                                "CreationDate": date,
                                "CreatedByGUID": login.get["GUID"],
                                "ResponseDate": null,
                                "AssignedToGUID": "",
                                "WorkCellGUID": "",
                                "InspCenterGUID": "",
                                "BarcodeID": "",
                                "ERPID": "",
                                "Comments": JSON.stringify({
                                    "S/N": user.serial,
                                    "Comments": user.comments,
                                    "InspectedDate": date
                                })
                            }
                            user.comments = "";
                            let ncr = (await query.send())["OutputNCR"];

                            query = API("results/bulkload");
                            query.req["SampleGUID"] = sample.get["GUID"];
                            query.req["IgnoreInvalidLines"] = true;
                            query.req["InputResults"] = [
                                {
                                    "DimGUID": dim.get["GUID"],
                                    "ResNo": ncr["GUID"],
                                    "Data": number,
                                    "UpperTol": "",
                                    "LowerTol": "",
                                    "Deviation": "",
                                    "OutTol": "",
                                    "Bonus": 0,
                                    "Axis": "",
                                    "Feature1": "",
                                    "Feature2": "",
                                    "MeasuredByGUID": "",
                                    "Comment": "",
                                    "Result": 0,
                                    "NeedsCalculation": true
                                }
                            ]
                            await query.send();

                            let res = (await all([1, 2, 3, 4].map(async () => {
                                query = API("results/list");
                                query.req["SampleGUID"] = sample.get["GUID"];
                                return (await query.pages())["Results"];
                            }))).flat(2).find(e => e["ResNo"] == ncr["GUID"]);

                            load_ncrs([ncr]);
                            load_results([res]);

                            data.multiple.removeClass("insp done fail");
                            data.multiple.addClass(res["Status"] == 2 ? "fail" : "done");
                            data.multiple.text($.fixed(res["Data"], dim.places()));
                            for (let file of files) {
                                let query = API("results/addattachments");
                                query.req["ResultGUID"] = res["GUID"];
                                query.req["Files"] = file["GUID"];
                                await query.send();
                            }
                            let accept = input.attach.$(".accept").not(".cancel").get();
                            for (let add of accept) {
                                let file = $(add).prop("file");
                                let query = API("filestorage/upload");
                                let form = new FormData();
                                form.append("files", new File([file], file.name));
                                query.req = form;
                                let guid = (await query.send())["GUID"];
                                console.log(guid);

                                query = API("results/addattachments");
                                query.req["ResultGUID"] = res["GUID"];
                                query.req["Files"] = guid;
                                await query.send();
                            }
                            data.result = model.result[res["GUID"]];
                            data.multiple.prop("model", data.result);
                        } else {
                            data.multiple.text("Multiple #" + (+data.multiple.prop("index") + 1));
                            data.multiple.removeClass("fail done");
                            data.multiple.addClass("insp");
                            data.multiple.prop("model", data.result = null);
                        }
                        drawing.dimreq.removeClass("insp done fail");
                        shape.removeClass("insp done fail");
                        let status = shape.prop("model").get_status(user.sample);
                        drawing.dimreq.addClass(status);
                        shape.addClass(status);

                        ui.shop.planner.load();
                        drawing.loading.fadeout();

                        if (data.result == null) {
                            drawing.multiples.set_multiple(data.multiple);
                        } else if (dim.results.filter(r => r.sample == sample).length >= dim.get["Multiplier"]) {
                            data.cancel.click();
                        } else {
                            let multiple = $(drawing.multiples.$(".multiple.clone").toArray()
                                .find(e => e != data.multiple[0] && $(e).prop("model") == null));
                            drawing.multiples.set_multiple(multiple);
                        }
                    }),
                    cancel: data.$(".cancel").nav(async function () {
                        await all([
                            data.fadeout(true),
                            drawing.spotlight.fadeout(),
                            input.controls.input.fadeout(),
                            drawing.multiples.fadeout(true)
                        ]);
                        input.attach.close.trigger("click");
                        await all([
                            data.width("0"),
                            drawing.multiples.width("0"),
                            drawing.gap("0"),
                            drawings.height("75vh"),
                            input.controls.height("12.5vh")
                        ]);
                        data.hide();
                        drawing.$(".dim").show();
                        await all([
                            drawing.$(".dim").animate({ opacity: 1 }, 300),
                            drawings.$(".drawing").not(drawing).fadein(),
                            input.controls.browse.fadein()
                        ]);
                        drawing.data.dim = null;
                    }),
                })),
                dim: drawing.$(".dim.copy").nav(async function () {
                    if (!user.sample || drawing.data.dim?.get(0) == this) return;
                    let dim = $(this).prop("model");
                    let results = dim.get_results(user.sample);
                    let max = mathjs.max(results.length, dim.get["Multiplier"]);
                    let dims = drawing.$(".dim").not(this);
                    let hide = drawings.$(".drawing").not(drawing);
                    await all([
                        dims.animate({ opacity: 0 }, 300).promise(),
                        input.controls.browse.fadeout(),
                        hide.fadeout()
                    ]);
                    dims.hide();
                    drawing.data.css({ "opacity": 0 });
                    drawing.multiples.css({ "opacity": 0 });
                    drawing.data.show();
                    if (max > 1) {
                        drawing.multiples.show();
                    } else {
                        drawing.multiples.hide();
                    }
                    await all([
                        drawing.data.width("24vh"),
                        drawing.multiples.width("25vh"),
                        drawing.gap("2vh"),
                        drawings.height("70vh"),
                        input.controls.height("17.5vh")
                    ]);
                    drawing.data.dim = $(this);

                    drawing.multiples.$(".clone").remove();
                    for (let i = 0; i < max; i++) {
                        let multiple = drawing.multiples.copy.dupe();
                        multiple.prop("drawing", drawing);
                        multiple.prop("model", results[i]);
                        multiple.prop("index", i);
                        multiple.text(results[i] ? $.fixed(results[i].get["Data"], dim.places()) : "Multiple #" + (i + 1));
                        multiple.addClass(results[i] ? (results[i].get["Status"] == 2 ? "fail" : "done") : "insp");
                        drawing.multiples.scroll.append(multiple);
                        if (i == 0) drawing.multiples.set_multiple(multiple);
                    }

                    let plan = $(this).pickClass(["fail", "done", "insp"]);
                    drawing.dimreq.removeClass("fail done insp");
                    drawing.dimreq.addClass(plan);
                    drawing.dimreq.text(dim.get["DimNo"] + ": " + dim.get["Requirement"]);

                    await all([
                        drawing.spotlight.fadein(),
                        drawing.data.fadein(),
                        input.controls.input.fadein(),
                        max > 1 ? drawing.multiples.fadein() : null
                    ]);
                }),
                svg: drawing.$("svg"),
                clip: drawing.$(".clip")
                    .off("pointerdown pointermove mousewheel DOMMouseScroll")
                    .on(`contextmenu`, e => false)
                    .on("pointerdown", function (e) {
                        let svg = drawing.svg;
                        svg.prop("dragX", parseFloat(svg.css("left")) - e.pageX);
                        svg.prop("dragY", parseFloat(svg.css("top")) - e.pageY);
                        drawing.clip.css("cursor", "grabbing");
                        $(document.body).one("mouseup", function () {
                            svg.prop("dragX", NaN);
                            svg.prop("dragY", NaN);
                            drawing.clip.css("cursor", "");
                        });
                    })
                    .on("pointermove", function (e) {
                        let svg = drawing.svg;
                        if (!svg.prop("dragX")) return;
                        svg.css("left", svg.prop("dragX") + e.pageX);
                        svg.css("top", svg.prop("dragY") + e.pageY);
                    })
                    .bind("mousewheel DOMMouseScroll", function (e) {
                        let rect = drawing.svg[0].getBoundingClientRect();
                        let target = {
                            x: e.pageX - rect.x,
                            y: e.pageY - rect.y
                        }
                        if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
                            drawing.buttons.zoom(drawing.scale * 1.5, target, true);
                        } else {
                            drawing.buttons.zoom(drawing.scale / 1.5, target, true);
                        }
                    }),
                buttons: drawing.$(".buttons").ext((buttons) => ({
                    zoom: async (scale, target, scroll) => {
                        let svg = drawing.svg;
                        let clip = drawing.clip;
                        let scrollLeft = parseFloat(svg.css("left"));
                        let scrollTop = parseFloat(svg.css("top"));
                        let outerWidth = clip.outerWidth();
                        let outerHeight = clip.outerHeight();

                        if (!target) target = {
                            x: -scrollLeft + outerWidth / 2,
                            y: -scrollTop + outerHeight / 2
                        }
                        await all([
                            svg.animate({
                                "left": -(scale * target.x / drawing.scale - target.x - scrollLeft),
                                "top": -(scale * target.y / drawing.scale - target.y - scrollTop)
                            }, {
                                duration: scroll ? 0 : 200,
                                easing: "easeCircle",
                                queue: false
                            }).promise(),

                            $({ scale: drawing.scale }).animate({ scale }, {
                                duration: scroll ? 0 : 200,
                                easing: "easeCircle",
                                queue: false,
                                step: (val, fx) => {
                                    svg.css("transform", `scale(${val})`)
                                }
                            }).promise()
                        ]);
                        drawing.scale = scale;
                    },
                    zoomMove: async (scale, target) => {
                        let svg = drawing.svg;
                        let clip = drawing.clip;
                        let innerWidth = svg[0].getBoundingClientRect().width;
                        let innerHeight = svg[0].getBoundingClientRect().height;
                        let outerWidth = clip.outerWidth();
                        let outerHeight = clip.outerHeight();

                        if (!target) target = {
                            x: innerWidth / 2,
                            y: innerHeight / 2
                        }
                        await all([
                            svg.animate({
                                "left": -(target.x * scale / drawing.scale - outerWidth / 2),
                                "top": -(target.y * scale / drawing.scale - outerHeight / 2)
                            }, {
                                duration: 400,
                                easing: "easeCircle",
                                queue: false
                            }).promise(),

                            $({ scale: drawing.scale }).animate({ scale }, {
                                duration: 400,
                                easing: "easeCircle",
                                queue: false,
                                step: (val, fx) => {
                                    svg.css("transform", `scale(${val})`)
                                }
                            }).promise()
                        ]);
                        drawing.scale = scale;
                    },
                    zoomin: buttons.$(".zoomin").nav(async () => {
                        await buttons.zoom(drawing.scale * 1.5);
                    }),
                    zoomfit: buttons.$(".zoomfit").nav(async () => {
                        await buttons.zoomMove(1);
                    }),
                    zoomout: buttons.$(".zoomout").nav(async () => {
                        await buttons.zoom(drawing.scale / 1.5);
                    })
                }))
            }))
        })),
        scale: 1,
        controls: input.$(".controls").ext((controls) => ({
            browse: controls.$(".info1, .info2"),
            input: controls.$(".input"),
            unit1: controls.$(".units.primary"),
            unit2: controls.$(".units.convert"),
            units: controls.$(".units").nav(function () {
                controls.units.not(this).toggleClass("invalid", true);
                $(this).toggleClass("invalid", false);
            }),
            serial: controls.$(".serial").on("input", function () {
                user.serial = $(this).val();
                let serial = controls.result?.data["ERPID"] || "";
                $(this).toggleClass("pulsate", serial != user.serial);
            }).on("focus", function () {
                if (!input.keyboard.is(":visible"))
                    input.keyboard.open();
            }),
            comments: controls.$(".comments").on("input", function () {
                user.comments = $(this).val();
            }).on("focus", function () {
                if (!input.keyboard.is(":visible"))
                    input.keyboard.open();
            }),
            attach: controls.$(".attach").nav(async function () {
                input.attach.open();
            })
        })),
        keyboard: input.$("> .keyboard").ext((keyboard) => ({
            open: async () => {
                if (input.attach.is(":visible")) {
                    await input.attach.fadeout();
                    await keyboard.fadein();
                } else {
                    keyboard.fadein();
                    await input.bounce({ "top": "-33vh" });
                }
            },
            close: keyboard.$(".close").nav(async function () {
                await input.bounce({ "top": "0" });
                keyboard.hide();
            })
        })),
        attach: input.$("> .attach").ext((attach) => ({
            input: attach.$("input"),
            loading: attach.$(".loading"),
            scroll: attach.$(".scroll"),
            add: attach.$(".add").ext((add) => ({
                task: task(async valid => {
                    return await await_file(attach.input, valid);
                })
            })).click(async () => {
                let res = await attach.add.task.run();
                if (res == "cancelled") return;

                Array.from(res).map(file => {
                    let dupe = attach.file.dupe();
                    dupe.hide();
                    dupe.download.prop("file", file);
                    dupe.download.addClass("accept");
                    dupe.download.text(file.name);
                    attach.scroll.append(dupe);
                    dupe.fadein();
                });
            }),
            task: task(async valid => {
                return await input.controls.result.get_files(valid);
            }),
            open: async () => {
                attach.$(".clone").remove();
                if (input.keyboard.is(":visible")) {
                    await input.keyboard.fadeout();
                    await attach.fadein();
                } else if (!input.attach.is(":visible")) {
                    attach.fadein();
                    await input.bounce({ "top": "-33vh" });
                }
                if (!input.controls.result) return;

                attach.loading.fadein();
                let res = await attach.task.run();
                if (res == "cancelled") return;

                let files = await load_files(res);
                for (let file of files) {
                    let dupe = attach.file.dupe();
                    dupe.hide();
                    dupe.download.prop("model", file);
                    dupe.download.prop("file", file.get["Blob"]);
                    dupe.download.text(file.get["Name"]);
                    attach.scroll.append(dupe);
                }

                await attach.loading.fadeout();
                await attach.$(".clone").fadein();
            },
            file: attach.$(".copy.file").ext((file) => ({
                download: file.$(".download").nav(function () {
                    let model = $(this).prop("model");
                    let blob = $(this).prop("file");
                    let url = URL.createObjectURL(blob);
                    download(url, blob.name || model?.get["Name"]);
                }),
                remove: file.$(".remove").nav(() => {
                    file.download.toggleClass("cancel");
                })
            })),
            close: attach.$(".cancel").nav(async function () {
                attach.task.cancel();
                await input.bounce({ "top": "0" });
                attach.hide();
            })
        }))
    }));
});