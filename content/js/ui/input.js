$(window).on("load", () => {
    var offset = {
        scale: 58.5,
        left: 3.85,
        top: 3.9,
        width: .15,
        height: .15
    }
    user.serial = "";
    ui.input = $(".input.popup").ext((input) => ({
        open: async function (spc) {
            sample = user.sample;
            input.scale = 1;
            input.controls.zoom();
            input.drawings.$(".clone").remove();
            let drawings = user.job.part.drawings.sort((a, b) =>
                a.get["Title"].localeCompare(b.get["Title"])
                || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
            for (let drawing of drawings) {
                let dims = user.op.dims.filter(e => drawing.dims.includes(e) && (!spc || spc == e));
                if (dims.length == 0) continue;
                let dupe1 = ui.input.drawings.copy.dupe();
                dupe1.$("img").attr("src", drawing.png);
                for (let dim of dims) {
                    let dupe2 = dupe1.$(".copy.dim").dupe();
                    let holder = dim.holders.find(e => e.sample == sample);
                    let result = dim.results.find(e => e.sample == sample);
                    if (!holder && !result && !spc) continue;
                    dupe2.addClass(dim.get_status(user.sample));
                    dupe2.prop("model", dim);
                    let coords = dim.get["ShapeCenter"].split(",");
                    let size = dim.get["ShapePoints"].split(",");
                    let factor = offset.scale / drawing.height;
                    dupe2.css({
                        left: ((coords[0] * factor) + offset.left) + "vh",
                        top: ((coords[1] * factor) + offset.top) + "vh",
                        width: ((size[0] * factor) - offset.width) + "vh",
                        height: ((size[1] * factor) - offset.height) + "vh",
                        transform: `rotateZ(${360 - dim.get["ShapeRotateAngle"]}deg)`
                    });
                    dupe2.$(".balloon").text(dim.get["DimNo"]);
                    if (spc) {
                        dupe1.data.dim = dupe2;
                        dupe1.dimreq.addClass(dim.get_status());
                        dupe1.dimreq.text(dim.get["DimNo"] + ": " + dim.get["Requirement"]);
                        dupe1.spotlight.show();
                    }
                    dupe1.$(".dims").append(dupe2);
                }
                input.drawings.append(dupe1);
            }
            input.info.jobNo.text(user.job.get["Number"] + " - " + user.job.part.get["PartNumber"]);
            input.info.opNo.text(user.op.get["Code"] + " - " + user.op.get["Title"]);
            input.info.sampleNo.text("Sample " + user.sample?.get["SerialNumber"]);
            input.info.sampleNo.show(user.sample);
            input.info.loginName.text(
                user.login ? user.login.get["FirstName"] + " " + user.login.get["LastName"] : "Guest"
            );
            input.controls.css({"height": "12.5vh"});
            input.drawings.css({"height": "75vh"});
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
            copy: drawings.$(".drawing").ext((drawing) => ({
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
                        input.controls.serial.val(result?.serial?.get["ERPID"] || user.serial);
                        input.controls.serial.trigger("input");

                        drawing.multiples.$(".multiple.clone").removeClass("pulsate");
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
                    clear: data.$(".clear").nav(function () {
                        data.display.val("");
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
                            drawing.$(".dim").animate({opacity: 1}, 300),
                            drawings.$(".drawing").not(drawing).fadein(),
                            input.controls.browse.fadein()
                        ]);
                        drawing.data.dim = null;
                    }),
                })),
                dims: drawing.$(".dims").ext((dims) => ({
                    copy: dims.$(".dim").nav(async function () {
                        if (!user.sample || drawing.data.dim?.get(0) == this) return;
                        let dim = $(this).prop("model");
                        let results = dim.get_results(user.sample);
                        let max = mathjs.max(results.length, dim.get["Multiplier"]);
                        let dims = drawing.$(".dim").not(this);
                        let hide = drawings.$(".drawing.clone").not(drawing);
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

                        drawing.multiples.$(".multiple.clone").remove();
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
                    })
                })),
            }))
        })),
        scale: 1,
        controls: input.$(".controls").ext((controls) => ({
            zoom: () => {
                input.drawings.$(".pdf, .dims").css("transform", `scale(${input.scale})`)
            },
            browse: controls.$(".buttons, .info1, .info2"),
            input: controls.$(".input"),
            serial: controls.$(".serial").on("input", function () {
                user.serial = $(this).val();
                $(this).toggleClass("pulsate", !!user.serial);
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
                $(this).prop("obj").update(res);
            }),
            zoomin: controls.$(".zoomin").nav(() => {
                input.scale += 0.5; controls.zoom();
            }),
            zoomfit: controls.$(".zoomfit").nav(async () => {
                input.scale = 0.8; controls.zoom();
                await timeout(200);
                input.scale = 1; controls.zoom();
            }),
            zoomout: controls.$(".zoomout").nav(() => {
                input.scale -= 0.5; controls.zoom();
            }),
        })),
        keyboard: input.$(".keyboard").ext((keyboard) => ({
            close: keyboard.$(".close").nav(async function () {
                input.$(".drawings1, .controls, .keyboard").bounce({ "top": "0" })
            })
        }))
    }));
});