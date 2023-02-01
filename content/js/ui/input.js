$(window).on("load", () => {
    user.serial = "";
    ui.input = $(".input.popup").ext((input) => ({
        open: async function (spc) {
            sample = user.sample;
            input.drawings.$(".clone").remove();
            let drawings = user.job.part.drawings.sort((a, b) =>
                a.get["Title"].localeCompare(b.get["Title"])
                || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
            for (let drawing of drawings) {
                let dims = user.op.dims.filter(e => 
                    drawing.dims.includes(e) && (!spc || spc == e) &&
                    (e.holders.find(h => h.sample == sample) ||
                    e.results.find(h => h.sample == sample))
                );
                if (dims.length == 0) continue;
                let dupe1 = ui.input.drawings.copy.dupe();
                drawing.draw_svg(dupe1.svg, dims);
                dupe1.$(".dim").each(function () {
                    let dim = $(this).prop("model");
                    $(this).addClass(dim.get_status(sample));
                    if (spc) {
                        dupe1.data.dim = dupe2;
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
            input.controls.css({ "height": "12.5vh" });
            input.drawings.css({ "height": "75vh" });
            input.controls.input.hide();
            input.controls.browse.show();
            input.controls.browse.css({ "opacity": 1, "top": 0 });
            input.$(".drawings1, .controls, .keyboard").css({ "top": "-0" });
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

                        input.controls.comments.val(result?.serial?.get["Comments"] || "");
                        input.controls.comments.trigger("input");
                        let serial = result?.serial?.get["ERPID"] || "";
                        user.serial = serial || user.serial;
                        input.controls.serial.val(user.serial);
                        input.controls.serial.toggleClass("pulsate", user.serial != serial);
                        input.controls.result = result;

                        drawing.multiples.$(".multiple").removeClass("pulsate");
                        multiple.addClass("pulsate");
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
                            accept.text(data.display.val().trim() === "" && data.result ? "Delete" : "Accept");
                        }
                    })).nav(async function () {
                        if ($(this).hasClass("invalid")) return;
                        await drawing.loading.fadein();
                        let shape = data.dim;
                        let dim = shape.prop("model");
                        let sample = user.sample;
                        let login = user.login;
                        let number = data.display.val();
                        if (data.result) {
                            query = API("results/delete");
                            query.req["ResultGUIDs"] = data.result.get["GUID"];
                            await query.send();
                            unload_results([data.result]);
                        }
                        if (number.trim() !== "") {
                            let date = new Date();
                            query = API("ncr/set");
                            query.req["InputNCR"] = {
                                "GUID": "",
                                "JobGUID": user.job.get["GUID"],
                                "LotGUID": "",
                                "Number": date.toHighQADate(),
                                "Status": 0,
                                "CreationDate": date.toHighQADate(),
                                "CreatedByGUID": login.get["GUID"],
                                "ResponseDate": null,
                                "AssignedToGUID": "",
                                "WorkCellGUID": "",
                                "InspCenterGUID": "",
                                "BarcodeID": "",
                                "ERPID": user.serial,
                                "Comments": user.comments
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
                        drawing.loading.hide();

                        if (data.result == null) {
                            drawing.multiples.set_multiple(data.multiple);
                        } else if (dim.results.length >= dim.get["Multiplier"]) {
                            data.cancel.click();
                        } else {
                            let multiple = $(drawing.multiples.$(".multiple.clone").toArray()
                                .find(e => e != data.multiple[0] && $(e).prop("model") == null));
                            drawing.multiples.set_multiple(multiple);
                        }
                    }),
                    more: data.$(".more").nav(async function () {
                        ui.keyboard.fadein();
                        await ui.prompts.open(ui.prompts.more);
                    }),
                    cancel: data.$(".cancel").nav(async function () {
                        await all([
                            data.fadeout(),
                            drawing.spotlight.fadeout(),
                            input.controls.input.fadeout(),
                            drawing.multiples.fadeout()
                        ]);
                        input.controls.input.hide();
                        input.keyboard.close.trigger("click");
                        await all([
                            data.width("0"),
                            drawing.multiples.width("0"),
                            drawing.gap("0"),
                            drawings.height("75vh"),
                            input.controls.height("12.5vh")
                        ]);
                        drawing.spotlight.hide();
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
                    hide.hide();
                    dims.hide();
                    input.controls.browse.hide();
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
            serial: controls.$(".serial").on("input", function () {
                user.serial = $(this).val();
                let serial = controls.result?.serial?.get["ERPID"] || "";
                $(this).toggleClass("pulsate", serial != user.serial);
            }).on("focus", function () {
                input.$(".drawings1, .controls, .keyboard").bounce({ "top": "-33vh" })
            }),
            comments: controls.$(".comments").on("input", function () {
                user.comments = $(this).val();
            }).on("focus", function () {
                input.$(".drawings1, .controls, .keyboard").bounce({ "top": "-33vh" })
            }),
            attach: controls.$(".attach").ext((attach) => ({
                update: () => {

                },
                task: task(async valid => {
                    return await await_file(controls.$(".attaches"), valid);
                })
            })).click(function () {
                return;
                let res = $(this).prop("obj").task.run();
                if (res == "cancelled") return;
            })
        })),
        keyboard: input.$(".keyboard").ext((keyboard) => ({
            close: keyboard.$(".close").nav(async function () {
                input.$(".drawings1, .controls, .keyboard").bounce({ "top": "0" })
            })
        }))
    }));
});