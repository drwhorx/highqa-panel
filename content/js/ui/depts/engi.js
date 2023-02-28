$(window).on("load", () => {
    var menu = ui.menu;
    var depts = menu.depts;

    ui.engi = menu.$("> .engi").ext((engi) => ({
        tile: engi.$("> .tile").ext((tile) => ({

        })),

        info1: engi.$("> .tile > .info1").ext((info1) => ({
            partNo: info1.$(".partNo"),
            pdf: info1.$(".copy.pdf").ext((pdf) => ({
                div: info1.$(".scroll"),
                loading: info1.$(".loading"),
                load: async function () {
                    let drawings = user.part.drawings.sort((a, b) =>
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

        nav: () => engi.actions.open(),
        card: engi.$("> .tile > .card").ext((card) => ({

        })).nav(() => engi.nav ? engi.nav() : null),

        actions: engi.$("> .actions").ext((actions) => ({
            make: actions.$(".make.card")
                .nav(() => engi.parts.open()),
            xdfx: actions.$(".xdfx.card").ext((xdfx) => ({
                task: task(async valid => {
                    return await await_file(engi.xdfx.$("input"), valid);
                })
            })).click(async function (e) {
                let res = await actions.xdfx.task.run();
                if (res == "cancelled") return;
                engi.xdfx.open(res[0]);
            }),
            sync: actions.$(".sync.card")
                .nav(() => engi.sync.open()),
            query: task(query_basic),
            open: async () => {
                loading(true);
                let hide = depts.tiles.not(engi.tile);

                await hide.fadeout(true);
                await all([
                    menu.gap(0),
                    hide.width(0),
                    engi.gap("15vh"),
                    engi.tile.width("40vh"),
                ]);

                await actions.query.run();
                loading(false);
                await actions.fadein();
                hide.hide();
                engi.nav = actions.close;
            },
            close: async function () {
                loading(true);
                let show = depts.tiles.not(engi.tile);

                await actions.fadeout();
                show.show();
                await all([
                    engi.gap(0),
                    show.width("40vh"),
                    menu.gap("15vh"),
                    engi.tile.width("40vh")
                ]);

                loading(false);
                await show.fadein();
                engi.nav = actions.open;
            },
        })),
        parts: engi.$("> .parts").ext((parts) => ({
            grid: parts.$(".grid").grid(),
            open: async (action) => {
                let actions = engi.actions;
                loading(true);
                engi.nav = null;
                await actions.fadeout();
                actions.hide();
                await all([
                    engi.tile.width("30vh"),
                    engi.gap("5vh")
                ]);

                parts.load(action);
                loading(false);
                await parts.fadein();
                engi.nav = parts.close;
            },
            load: function () {
                let grid = parts.grid;
                grid.$("input").val(null);
                grid.rows().remove();

                let sorted = raw(model.part)
                    .filter(e => e.get["ERPID"] == "MASTER" && !e.get["IsArchived"] && !e.get["IsDeleted"])
                    .sort((a, b) => a.get["PartNumber"].localeCompare(b.get["PartNumber"]));

                for (let part of sorted) {
                    let customer = part.customer;
                    let row = grid.copy.dupe();
                    row.$(".partNo").span(part.get["PartNumber"])
                        .prop("model", part);
                    row.$(".customer").span(customer.get["Name"])
                        .prop("model", customer);
                    row.$(".partName").span(part.get["PartName"])
                        .prop("model", part);
                    row.$(".comment").span(part.get["PartComments"])
                        .prop("model", part);
                    row.prop("model", part);
                    row.nav(async function () {
                        return await engi.make.open(this);
                    })
                    grid.append(row);
                }
            },
            close: async () => {
                loading(true);
                engi.nav = null;
                await parts.fadeout();
                await all([
                    engi.tile.width("40vh"),
                    engi.gap("15vh")
                ]);

                loading(false);
                await engi.actions.fadein();
                engi.nav = engi.actions.close;
            }
        })),
        make: engi.$("> .make").ext((make) => ({
            jobNo: make.$("> .jobNo"),
            dueDate: make.$("> .dueDate"),
            jobQty: make.$("> .jobQty"),
            process: make.$("> .process").ext((process) => ({
                copy: process.$(".copy.mfg")
            })),
            accept: make.$("> .accept").nav(async () => {
                make.jobNo.removeClass("invalid");
                make.dueDate.removeClass("invalid");
                if (!make.jobNo.val().trim())
                    return make.jobNo.toggleClass("invalid", true);
                if (!+new Date(make.dueDate.val()))
                    return make.dueDate.toggleClass("invalid", true);

                loading(true);
                engi.nav = null;

                query = API("parts/clone");
                query.req["PartGUID"] = user.part.get["GUID"];
                let guid = (await query.send())["NewPartGUID"];

                query = API("parts/get");
                query.req["PartGUID"] = guid;
                let part = load_parts([(await query.send())["Part"]])[0];

                let date = new Date(make.dueDate.val()).toHighQADate();
                query = API("jobs/set");
                query.req["InputJob"] = {
                    "GUID": null,
                    "PartGUID": guid,
                    "Number": make.jobNo.val(),
                    "Title": "",
                    "Revision": "",
                    "Quantity": make.jobQty.val(),
                    "Status": 1,
                    "ActivationDate": date,
                    "DeliveryDate": date,
                    "ERPID": "",
                    "BarcodeID": "",
                    "AQLMode": 0,
                    "AQLTableGUID": "",
                    "InspectionLevel": 0
                };

                let res = (await query.send())["OutputJob"];
                if (res["PartGUID"] != guid) {
                    query = API("parts/delete");
                    query.req["PartGUIDs"] = guid;
                    await query.send();
                    delete model.part[guid];

                    query = API("parts/get");
                    query.req["PartGUID"] = res["PartGUID"];
                    part = load_parts([(await query.send())["Part"]])[0];
                }

                query = API("parts/set");
                query.req["InputPart"] = {
                    "GUID": part.get["GUID"],
                    "PartNumber": part.get["PartNumber"],
                    "PartName": part.get["PartName"],
                    "PartRevisionLevel": part.get["PartRevisionLevel"],
                    "PartComments": part.get["PartComments"],
                    "CustomerGUID": part.get["CustomerGUID"],
                    "File": "",
                    "ERPID": "",
                    "BarcodeID": part.get["BarcodeID"],
                    "PartCategoryGUID": part.get["PartCategoryGUID"]
                }
                await query.send();
                
                let job = load_jobs([res])[0];
                await query_job(job, {}, () => true);

                /*
                query = API("operations/set");
                query.req["InputOperation"] = {
                    "GUID": mfg.get["GUID"],
                    "PartGUID": part.get["GUID"],
                    "WorkCellGUID": mfg.get["WorkCellGUID"],
                    "MachineGUID": mfg.get["MachineGUID"],
                    "Code": mfg.get["Code"].trim() || "0",
                    "Title": "IN PROCESS",
                    "Description": mfg.get["Description"],
                    "ERPID": mfg.get["ERPID"],
                    "BarcodeID": mfg.get["BarcodeID"]
                }
                await query.send();
                mfg.get["Title"] = "IN PROCESS";
                */
                let mfg = part.mfgs.arr.find(e => e.get["Title"] == make.process.val());
                part.mfgs.mfg = mfg;

                await all(job.lots.arr.map(async lot => {
                    query = API("lots/delete");
                    query.req["LotGUIDs"] = lot.get["GUID"];
                    await query.send();
                    delete model.lot[lot.get["GUID"]];
                }));

                query = API("lots/set");
                query.req["InputLot"] = {
                    "GUID": "",
                    "JobGUID": job.get["GUID"],
                    "Number": job.get["Number"],
                    "Status": 1,
                    "StartDate": date,
                    "DueDate": date,
                    "Size": make.jobQty.val(),
                    "ERPID": "",
                    "BarcodeID": "",
                    "SamplesPerHour": 0,
                    "HoursPerShift": 0,
                    "QualityStage": 0,
                    "QualityLevel": 0,
                    "AQLTableGUID": "594d93e9-bcbb-4d8a-b3a0-9c39b5ee6c06",
                    "InspectionLevel": 1
                }
                job.lots.mfg = load_lots([(await query.send())["OutputLot"]])[0];

                query = API("lots/set");
                query.req["InputLot"] = {
                    "GUID": "",
                    "JobGUID": job.get["GUID"],
                    "Number": job.get["Number"] + " FPI",
                    "Status": 1,
                    "StartDate": date,
                    "DueDate": date,
                    "Size": 1,
                    "ERPID": "",
                    "BarcodeID": "",
                    "SamplesPerHour": 0,
                    "HoursPerShift": 0,
                    "QualityStage": 0,
                    "QualityLevel": 0,
                    "AQLTableGUID": "594d93e9-bcbb-4d8a-b3a0-9c39b5ee6c06",
                    "InspectionLevel": 1
                }
                job.lots.fpi = load_lots([(await query.send())["OutputLot"]])[0];

                for (let i = 1; i <= make.jobQty.val(); i++) {
                    query = API("samples/set");
                    query.req["InputSample"] = {
                        "GUID": "",
                        "PartGUID": part.get["GUID"],
                        "LotGUID": job.lots.mfg.get["GUID"],
                        "JobGUID": job.get["GUID"],
                        "SerialNumber": "# " + i,
                        "CavityNumber": 0,
                        "MachineNumber": "",
                        "FixtureNumber": "",
                        "Status": 0,
                        "ERPID": "",
                        "BarcodeID": ""
                    };
                    load_samples([(await query.send())["OutputSample"]]);
                }

                query = API("samples/set");
                query.req["InputSample"] = {
                    "GUID": "",
                    "PartGUID": part.get["GUID"],
                    "LotGUID": job.lots.fpi.get["GUID"],
                    "JobGUID": job.get["GUID"],
                    "SerialNumber": "FPI 1",
                    "CavityNumber": 0,
                    "MachineNumber": "",
                    "FixtureNumber": "",
                    "Status": 0,
                    "ERPID": "",
                    "BarcodeID": ""
                };
                load_samples([(await query.send())["OutputSample"]]);

                sample = job.lots.fpi.samples[0].get["GUID"];
                await all(part.mfgs.mfg.dims.map(async dim => {
                    let create = API("placeholders/create");
                    create.req["DimGUID"] = dim.get["GUID"];
                    create.req["SampleGUIDs"] = sample
                    await create.send();
                }));

                samples = job.lots.mfg.samples.map(e => e.get)
                    .sort((a, b) => a["SerialNumber"].replace(/\D+/g, '')
                        - b["SerialNumber"].replace(/\D+/g, ''));
                await all(part.mfgs.mfg.dims.map(async dim => {
                    let qty = sample_qty(dim.get["TolClass"], samples.length) || parseInt(dim.get["TolClass"]);
                    if (!qty) return;
                    let plan = samplize(qty, samples.length).map(e => samples[e]["GUID"]);
                    let create = API("placeholders/create");
                    create.req["DimGUID"] = dim.get["GUID"];
                    create.req["SampleGUIDs"] = plan.join(",");
                    await create.send();
                }));

                ui.message.open("Job Created!");
                loading(false);
                engi.nav = engi.make.close;
            }),
            open: async (row) => {
                loading(true);
                engi.nav = null;
                await engi.parts.fadeout();
                await all([
                    engi.tile.width("110vh"),
                    engi.card.height("17.5vh"),
                    engi.tile.gap("2.5vh")
                ]);

                user.part = $(row).prop("model");
                engi.info1.partNo.text("Part #: " + user.part.get["PartNumber"]);
                engi.info1.$(".pdf.clone").remove();
                engi.info1.pdf.div.hide();
                engi.info1.pdf.loading.fadein();
                engi.info1.fadein();
                engi.nav = make.close;

                (async () => {
                    let res = await make.query.run();
                    if (res == "cancelled") return;

                    await engi.info1.pdf.loading.fadeout();
                    engi.nav = null;
                    engi.info1.pdf.load();
                    engi.make.load();

                    loading(false);
                    await make.fadein();
                    engi.nav = make.close;
                })();
            },
            query: task(async (valid) => {
                await query_part(user.part, { do_drawings: true }, valid);
                return valid();
            }),
            load: () => {
                let mfgs = user.part.mfgs.arr;
                make.process.$("option").remove();
                for (let mfg of mfgs) {
                    let dupe = make.process.copy.dupe();
                    dupe.text(mfg.get["Title"]);
                    dupe.prop("model", mfg);
                    make.process.append(dupe);
                }
                make.$("input").val(null);
                make.process.val("");
            },
            close: async () => {
                engi.nav = null;
                make.query.cancel();
                loading(true);
                await all([
                    engi.info1.fadeout(),
                    make.fadeout()
                ]);
                await all([
                    engi.tile.width("30vh"),
                    engi.card.height("85vh"),
                    engi.tile.gap(0)
                ])

                loading(false);
                await engi.parts.fadein();
                engi.nav = engi.parts.close;
            }
        })),
        xdfx: engi.$("> .xdfx").ext((xdfx) => ({
            accept: xdfx.$(".accept").nav(async () => {
                let data = user.xdfx.data;
                let dims = user.part.mfgs.mfg.dims;
                for (let dim of dims) {
                    let res = data["Dims"][dim.get["GUID"]];
                    if (res) res["DimTolClass"] = sample_letter(dim);
                }
                await user.xdfx.download();
            }),
            open: async (file) => {
                loading(true);
                engi.nav = null;
                await engi.actions.fadeout();
                await all([
                    engi.tile.width("110vh"),
                    engi.card.height("17.5vh"),
                    engi.tile.gap("2.5vh"),
                    engi.gap("5vh")
                ]);

                user.xdfx = await new XDFX(file);
                let data = user.xdfx.data;

                engi.info1.partNo.text("Part #: " + raw(data["Parts"])[0]["PartNumber"]);
                engi.info1.$(".pdf.clone").remove();
                engi.info1.pdf.div.hide();
                engi.info1.pdf.loading.fadein();
                engi.info1.fadein();
                engi.nav = xdfx.close;

                (async () => {
                    let res = await xdfx.query.run();
                    if (res == "cancelled") return;

                    await engi.info1.pdf.loading.fadeout();
                    engi.nav = null;
                    engi.info1.pdf.load();
                    engi.xdfx.load();

                    loading(false);
                    await xdfx.fadein();
                    engi.nav = xdfx.close;
                })();
            },
            query: task(async (valid) => {
                let data = user.xdfx.data;
                await user.xdfx.load();
                let guid = raw(data["Parts"])[0]["GlobalID"];
                user.part = model.part[guid];
                return valid();
            }),
            load: () => {

            },
            close: async () => {
                xdfx.query.cancel();
                engi.nav = null;
                loading(true);
                await all([
                    engi.info1.fadeout(),
                    xdfx.fadeout()
                ]);
                await all([
                    engi.tile.width("40vh"),
                    engi.card.height("85vh"),
                    engi.tile.gap("0"),
                    engi.gap("15vh")
                ])

                loading(false);
                await engi.actions.fadein();
                engi.nav = engi.actions.close;
            }
        })),
        sync: engi.$("> .sync").ext((sync) => ({
            from: sync.$(".setup .from").ext((from) => ({
                xdfx: null, parts: null, jobs: null,
                copy: from.$(".copy.xdfx").nav(function () {
                    $(this).val(!$(this).val());
                    $(this).toggleClass("invalid", !$(this).val());
                    from.$(".xdfx").not(this)
                        .toggleClass("invalid", true)
                        .val(false)
                }),
                add: from.$(".add").click(async () => {
                    let res = await from.task.run();
                    if (res == "cancelled") return;
                    engi.nav = null;
                    loading(true);
                    from.xdfx = await new XDFX(res[0]);
                    await from.xdfx.load();

                    from.$(".clone").remove();
                    from.parts = from.xdfx.model;
                    from.jobs = from.parts.map(e => e.job).filter(e => !!e);
                    for (let part of from.parts) {
                        let dupe = from.copy.dupe();
                        let job = part.job;
                        dupe.$(".partNo").text(part.get["PartNumber"]);
                        dupe.$(".jobNo").text(job?.get["JobNumber"])
                            .hide(job?.get["Status"] != 1);
                        dupe.prop("model", part);
                        dupe.hide();
                        from.append(dupe);
                    }
                    from.$(".clone").fadein();
                    loading(false);
                    engi.nav = sync.close;
                }),
                task: task(async valid => {
                    return await await_file(from.$("input"), valid);
                })
            })),
            to: sync.$(".setup .to").ext((to) => ({
                xdfx: null, parts: null, jobs: null,
                copy: to.$(".copy.xdfx"),
                add: to.$(".add").click(async () => {
                    let res = await to.task.run();
                    if (res == "cancelled") return;
                    engi.nav = null;
                    loading(true);
                    to.xdfx = await new XDFX(res[0]);
                    await to.xdfx.load();

                    to.$(".clone").remove();
                    to.parts = to.xdfx.model;
                    to.jobs = to.parts.map(e => e.job).filter(e => !!e);
                    for (let part of to.parts) {
                        let dupe = to.copy.dupe();
                        let job = part.job;
                        dupe.$(".partNo").text(part.get["PartNumber"]);
                        dupe.$(".jobNo").text(job?.get["JobNumber"])
                            .hide(job?.get["Status"] != 1);
                        dupe.prop("model", part);
                        dupe.hide();
                        to.append(dupe);
                    }
                    to.$(".clone").fadein();
                    loading(false);
                    engi.nav = sync.close;
                }),
                task: task(async valid => {
                    return await await_file(to.$("input"), valid);
                }),
            })),
            merge: $(".merge.popup").ext((merge) => ({
                back: merge.$(".back"),
                next: merge.$(".next"),
                select: merge.$(".back, .next").nav(async function () {
                    let index = merge.to.parts.indexOf(merge.to.part);
                    if ($(this).hasClass("invalid")) return;
                    if (this == merge.back[0]) index -= 1;
                    if (this == merge.next[0]) index += 1;
                    await merge.set_part(merge.to.parts[index]);
                }),
                accept: merge.$(".accept").nav(async function () {
                    if ($(this).hasClass("invalid")) return;
                    await ui.prompts.close(merge, "accept");
                }),
                check: () => {
                    merge.accept.toggleClass("invalid", !!merge.to.parts.find(p =>
                        p.job?.results.find(r => !r.dim.from)
                    ));
                    merge.$(".dim").removeClass("done").addClass("todo");
                    merge.to.$(".dim").each(function () {
                        let from = $(this).prop("model").from;
                        if (from) {
                            $(this).removeClass("todo").addClass("done");
                            merge.from.$(".dim").each(function () {
                                if ($(this).prop("model") == from)
                                    $(this).removeClass("todo").addClass("done");
                            })
                        }
                    });
                },
                from: merge.$(".from").ext((from) => ({
                    parts: null, part: null, pick: null,
                    drawings: from.$(".drawings"),
                    drawing: from.$(".drawing.copy"),
                    dim: from.$(".dim.copy").nav(async function () {
                        if (from.pick || merge.to.pick) return;
                        from.pick = this;
                        await from.$(".dim").not(this)
                            .animate({ opacity: 0 }, 300).promise();
                        let to = await new Promise(resolve => {
                            merge.to.$(".dim").one("click", function () {
                                resolve($(this).prop("model"));
                            });
                            $(this).one("click", () => resolve(null));
                            merge.$(".back, .next").one("click", () => resolve(null));
                        });
                        if (to) to.from = $(this).prop("model");
                        merge.check();
                        await from.$(".dim").not(this)
                            .animate({ opacity: 1 }, 300).promise();
                        from.pick = null;
                    })
                })),
                to: merge.$(".to").ext((to) => ({
                    parts: null, part: null, pick: null,
                    drawings: to.$(".drawings"),
                    drawing: to.$(".drawing.copy"),
                    dim: to.$(".dim.copy").nav(async function () {
                        if (to.pick || merge.from.pick) return;
                        to.pick = this;
                        await to.$(".dim").not(this)
                            .animate({ opacity: 0 }, 300).promise();
                        let from = await new Promise(resolve => {
                            merge.from.$(".dim").one("click", function () {
                                resolve($(this).prop("model"));
                            });
                            $(this).one("click", () => resolve(null));
                            merge.$(".back, .next").one("click", () => resolve(null));
                        });
                        $(this).prop("model").from = from;
                        merge.check();
                        await to.$(".dim").not(this)
                            .animate({ opacity: 1 }, 300).promise();
                        to.pick = null;
                    }),
                })),
                set_part: async (part) => {
                    let index = merge.to.parts.indexOf(part);
                    merge.to.part = part;
                    merge.from.part = merge.from.parts[index];
                    merge.back.toggleClass("invalid", index == 0);
                    merge.next.toggleClass("invalid", index == merge.to.parts.length - 1);

                    await all([
                        merge.to.fadeout(),
                        merge.from.fadeout()
                    ]);
                    merge.to.$(".clone").remove();
                    merge.to.$(".title").text(part.get["PartNumber"] +
                        (part.job.get["Status"] == 1 ? " - " + part.job.get["JobNumber"] : "")
                    );
                    drawings = part.drawings
                        .filter(e => e.dims.find(d => d.results.length > 0))
                        .sort((a, b) => a.mfg.get["ManProcessIndex"] - b.mfg.get["ManProcessIndex"]
                            || a.get["DrawingPageNo"] - b.get["DrawingPageNo"]
                        );
                    for (let drawing of drawings) {
                        let dupe = merge.to.drawing.dupe();
                        let dims = drawing.dims.filter(e => e.results.length > 0);
                        drawing.draw_svg(dupe, dims);
                        dupe.$(".dim").addClass("todo");
                        merge.to.drawings.append(dupe);
                    }

                    part = merge.from.part;
                    merge.from.$(".clone").remove();
                    merge.from.$(".title").text(part.get["PartNumber"] +
                        (part.job?.get["Status"] == 1 ? " - " + part.job.get["JobNumber"] : "")
                    );
                    drawings = part.drawings.sort((a, b) =>
                        a.mfg?.get["ManProcessIndex"] - b.mfg?.get["ManProcessIndex"]
                        || a.get["PdfPageNo"] - b.get["PdfPageNo"]
                    );
                    for (let drawing of drawings) {
                        let dupe = merge.from.drawing.dupe();
                        drawing.draw_svg(dupe);
                        dupe.$(".dim").addClass("todo");
                        merge.from.drawings.append(dupe);
                    }
                    merge.check();
                    await all([
                        merge.to.fadein(),
                        merge.from.fadein()
                    ]);
                },
                load: async (from, to) => {
                    merge.$(".clone").remove();
                    merge.from.parts = from;
                    merge.to.parts = to;
                    await merge.set_part(to[0]);
                }
            })),
            jobs: sync.$(".jobs").nav(async () => {
                let xdfx = sync.from.xdfx;
                let data = xdfx.data;
                let from = sync.from.$(".xdfx").not(".invalid").prop("model");
                let to = sync.to.$(".xdfx").not(".invalid").map(function () {
                    let part = $(this).prop("model");
                    part.dims.map(e => e.from = null);
                    return part;
                }).get();
                if (!from || to.length == 0) return;

                loading(true);
                let parts = await all(to.map(async to => {
                    let query = API("parts/clone");
                    query.req["CopyDocuments"] = true;
                    query.req["PartGUID"] = from.get["GlobalID"];
                    let res = await query.send();

                    let copy = Object.assign({}, to.get);
                    copy["GUID"] = copy["GlobalID"] = res["NewPartGUID"];
                    let part = load_parts([copy])[0];
                    await query_part(part, { do_drawings: true }, () => true);
                    to.from = part;
                    return part;
                }));
                loading(false);

                sync.merge.load(parts, to);
                var res = await ui.prompts.modal(sync.merge);
                if (res != "accept") return;

                loading(true);
                await all(to.map(async to => {
                    let part = to.from;
                    part.job = to.job;

                    /*
                    var query = API("parts/delete");
                    query.req["PartGUIDs"] = part.get["GlobalID"];
                    query.req["DeleteCompletely"] = false;
                    await query.send();
                    */

                    var query = API("jobs/list");
                    query.req["PartGUIDs"] = part.get["GlobalID"];
                    let res = (await query.pages())["Jobs"];

                    data["Parts"][part.get["GlobalID"]] = part.get;

                    if (!part.job) return;
                    let job = Object.assign({}, part.job.get);
                    job["GlobalID"] = res[0]["GUID"];
                    for (let lot of part.job.lots.arr) {
                        lot.get["__GlobalID_LotJobID"] = job["GlobalID"];
                        data["Lots"][lot.get["GlobalID"]] = lot.get;
                    }
                    for (let sample of part.job.samples) {
                        sample.get["__GlobalID_PartInstancePartID"] = part.get["GlobalID"];
                        sample.get["__GlobalID_PartInstanceJobID"] = job["GlobalID"];
                        data["PartInstances"][sample.get["GlobalID"]] = sample.get;
                    }
                    for (let result of part.job.results) {
                        if (!result.dim.from) continue;
                        let from = result.dim.from;
                        result.get["__GlobalID_ActualDimID"] = from.get["GUID"];
                        data["Actuals"][result.get["GlobalID"]] = result.get;
                        if (result.serial) {
                            result.serial.get["__GlobalID_NCRJobID"] = job["GlobalID"];
                            data["NCReports"][result.serial.get["GlobalID"]] = result.serial.get;
                        }
                    }
                    /*
                    let samples = part.job.lots.mfg.samples
                        .sort((a, b) => a.get["SerialNumber"].replace(/\D+/g, '')
                            - b.get["SerialNumber"].replace(/\D+/g, ''));
                    for (let dim of part.mfgs.mfg.dims) {
                        let aql = sample_qty(dim.get["DimTolClass"], samples.length)
                            || +dim.get["DimTolClass"];
                        let plan = samplize(aql, samples.length);
                        for (let i = 0; i < samples.length; i++) {
                            let sample = samples[i];
                            if (!plan.includes(i) && sample.results.find(r => r.dim.from == dim)) {
                                let index = plan.findIndex(j => !samples[j].results.find(r => r.dim.from == dim));
                                if (index > -1) plan[index] = i;
                            }
                        }
                        plan.push(-1);
                        plan.map(index => {
                            let sample = samples[index] || part.job.lots.fpi.samples[0];
                            if (!sample) return;
                            let holder = types.XDFX_Holder();
                            holder["GlobalID"] = UUID();
                            holder["ActualDataPrec"] = dim.get["DimDataPrec"];
                            holder["ActualCode"] = dim.get["DimCode"];
                            holder["ActualGroup"] = dim.get["DimGroup"];
                            holder["ActualLowerTol"] = dim.get["DimLowerTol"];
                            holder["ActualUpperTol"] = dim.get["DimUpperTol"];
                            holder["ActualType"] = dim.get["DimType"];
                            holder["__GlobalID_ActualDimID"] = dim.get["GlobalID"];
                            holder["__GlobalID_ActualInstanceID"] = "740fbcb0-532a-42e9-b420-499df09a2c15";
                            holder["__GlobalID_ActualPartInstanceID"] = sample.get["GlobalID"];
                            data["Actuals"][holder["GlobalID"]] = holder;
                        });
                    }
                    */
                    job["__GlobalID_JobPartID"] = part.get["GUID"];
                    data["WorkOrderLines"][job["GlobalID"]] = job;
                    data["WorkOrderLines"][part.job.get["GlobalID"]] = part.job.get;
                    to.get["PartIsDeleted"] = 1;
                }));

                await xdfx.write();
                let form = new FormData();
                let file = new File([xdfx.blob], xdfx.file.name);
                form.append("files", file);

                var query = API("filestorage/upload");
                query.req = form;
                var res = (await query.send())["GUID"];

                var query = API("parts/importxdf");
                query.req["FileGUID"] = res;
                var res = await query.send();

                if (res && res["IsSuccess"]) {
                    await all(to.map(async to => {
                        var query = API("parts/delete");
                        query.req["PartGUIDs"] = to.get["GlobalID"] + "," + to.from.get["GUID"];
                        query.req["DeleteCompletely"] = false;
                        await query.send();
                    }));
                    ui.message.open("XDFX(s) Synced!");
                } else {
                    ui.message.open("Manual XDFX Upload Required");
                }
                loading(false);
                await sync.from.xdfx.download();
            }),
            open: async () => {
                loading(true);
                engi.nav = null;
                await engi.actions.fadeout();
                await all([
                    engi.gap("5vh"),
                    engi.tile.width("30vh")
                ]);

                sync.$(".clone").remove();
                await sync.fadein();
                loading(false);
                engi.nav = sync.close;
            },
            load: () => {
                from.$(".clone").remove();
                to.$(".clone").remove();
                from.xdfx = null;
                to.xdfx = null;
            },
            close: async () => {
                loading(true);
                engi.nav = null;
                await sync.fadeout();
                await all([
                    engi.gap("15vh"),
                    engi.tile.width("40vh")
                ]);

                loading(false);
                await engi.actions.fadein();
                engi.nav = engi.actions.close;
            }
        }))
    }));
})