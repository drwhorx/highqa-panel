$(window).on("load", () => {
    var menu = ui.menu;
    var depts = menu.depts;

    ui.engi = menu.$("> .engi").ext((engi) => ({
        tile: engi.$("> .tile").ext((tile) => ({
            pdf: tile.$("> .pdf").ext((pdf) => ({
                partNo: pdf.$(".partNo"),
                loading: pdf.$(".loading"),
                copy: pdf.$(".copy.pdf"),
                div: pdf.$(".scroll"),
                load: async function () {
                    let drawings = user.part.drawings.sort((a, b) =>
                        a.get["Title"].localeCompare(b.get["Title"])
                        || a.get["PdfPageNo"] - b.get["PdfPageNo"]);

                    drawings.map((drawing, i) => {
                        let img = pdf.copy.dupe();
                        img.attr("src", drawing.png);
                        img.attr("tab-index", i);
                        pdf.div.append(img)
                        return img;
                    });

                    await pdf.loading.fadeout();
                    pdf.loading.hide();
                    pdf.div.fadein();
                }
            }))
        })),

        card: engi.$("> .tile > .card").ext((card) => ({

        })).nav(() => engi.actions.open()),

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
                engi.card.nav();
                let hide = depts.tiles.not(engi.tile);

                await hide.fadeout();
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
                engi.card.nav(actions.close);
            },

            close: async function () {
                actions.xdfx.task.cancel();
                loading(true);
                engi.card.nav();
                let show = depts.tiles.not(engi.tile);

                await actions.fadeout();
                actions.hide();
                show.show();
                await all([
                    engi.gap(0),
                    show.width("40vh"),
                    menu.gap("15vh"),
                    engi.tile.width("40vh")
                ]);

                loading(false);
                await show.fadein();
                engi.card.nav(actions.open);
            },
        })),

        parts: engi.$("> .parts").ext((parts) => ({
            grid: parts.$(".grid").grid(),
            open: async (action) => {
                let actions = engi.actions;
                actions.xdfx.task.cancel();
                loading(true);
                engi.card.nav();

                await actions.fadeout();
                actions.hide();
                await all([
                    engi.tile.width("30vh"),
                    engi.gap("5vh")
                ]);

                parts.load(action);
                loading(false);
                await parts.fadein();
                engi.card.nav(parts.close);
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
                engi.card.nav();

                await parts.fadeout();
                parts.hide();
                await all([
                    engi.tile.width("40vh"),
                    engi.gap("15vh")
                ]);

                loading(false);
                await engi.actions.fadein();
                engi.card.nav(engi.actions.close);
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
                engi.card.nav();

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
                let job = load_jobs([res])[0];
                await query_job(job, {}, () => true);

                let mfg = part.mfgs.arr.find(e => e.get["Title"] == make.process.val());
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

                ui.prompts.message.load("Job Created!");
                ui.prompts.open(ui.prompts.message);
                loading(false);
                engi.card.nav(engi.make.close);
            }),
            open: async (row) => {
                loading(true);
                engi.card.nav();

                await engi.parts.fadeout();
                engi.parts.hide();
                await all([
                    engi.tile.width("110vh"),
                    engi.card.height("17.5vh"),
                    engi.tile.gap("2.5vh")
                ]);

                user.part = $(row).prop("model");
                engi.tile.pdf.partNo.text("Part #: " + user.part.get["PartNumber"]);
                engi.tile.pdf.$(".pdf.clone").remove();
                engi.tile.pdf.div.hide();
                engi.tile.pdf.loading.fadein();
                engi.tile.pdf.fadein();

                engi.card.nav(make.close);
                let res = await make.query.run();
                if (res == "cancelled") return;

                engi.card.nav();
                engi.tile.pdf.load();
                engi.make.load();

                loading(false);
                await make.fadein();
                engi.card.nav(make.close);
            },
            query: task(async (valid) => {
                await query_part(user.part, { do_drawings: true }, valid);
                return valid();
            }),
            load: () => {
                let mfgs = user.part.mfgs.arr;
                make.process.$("option.clone").remove();
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
                make.query.cancel();
                loading(true);
                engi.card.nav();

                await all([
                    engi.tile.pdf.fadeout(),
                    make.fadeout()
                ]);
                make.hide();
                engi.tile.pdf.hide();
                engi.tile.pdf.div.hide();
                await all([
                    engi.tile.width("30vh"),
                    engi.card.height("85vh"),
                    engi.tile.gap(0)
                ])

                loading(false);
                await engi.parts.fadein();
                engi.card.nav(engi.parts.close);
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
                let a = $("<a>")
                    .attr("href", await user.xdfx.write())
                    .attr("download", user.xdfx.file.name.slice(0, -5) + "-Modified.xdfx")
                    .css("display", "none")
                a[0].click();
                a.remove();
            }),
            open: async (file) => {
                loading(true);
                engi.card.nav();

                await engi.actions.fadeout();
                engi.actions.hide();
                await all([
                    engi.tile.width("110vh"),
                    engi.card.height("17.5vh"),
                    engi.tile.gap("2.5vh"),
                    engi.gap("5vh")
                ]);

                user.xdfx = await new XDFX(file);
                let data = user.xdfx.data;

                engi.tile.pdf.partNo.text("Part #: " + raw(data["Parts"])[0]["PartNumber"]);
                engi.tile.pdf.$(".pdf.clone").remove();
                engi.tile.pdf.div.hide();
                engi.tile.pdf.loading.fadein();
                engi.tile.pdf.fadein();

                engi.card.nav(xdfx.close);
                let res = await xdfx.query.run();
                if (res == "cancelled") return;

                engi.card.nav();
                engi.tile.pdf.load();
                engi.xdfx.load();

                loading(false);
                await xdfx.fadein();
                engi.card.nav(xdfx.close);
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
                loading(true);
                engi.card.nav();

                await all([
                    engi.tile.pdf.fadeout(),
                    xdfx.fadeout()
                ]);
                xdfx.hide();
                engi.tile.pdf.hide();
                engi.tile.pdf.div.hide();
                await all([
                    engi.tile.width("40vh"),
                    engi.card.height("85vh"),
                    engi.tile.gap("0"),
                    engi.gap("15vh")
                ])

                loading(false);
                await engi.actions.fadein();
                engi.card.nav(engi.actions.close);
            }
        })),
        sync: engi.$("> .sync").ext((sync) => ({
            from: sync.$(".from").ext((from) => ({
                xdfx: null, part: null, job: null,
                copy: from.$(".copy.xdfx"),
                add: from.$(".add").click(async () => {
                    let res = await from.task.run();
                    if (res == "cancelled") return;
                    from.xdfx = await new XDFX(res[0]);
                    await from.xdfx.load();
                    from.part = from.xdfx.model[0];
                    from.job = from.part.job;
                    
                    from.$(".clone").remove();
                    let dupe = from.copy.dupe();
                    dupe.$(".partNo").text(from.part["PartNumber"]);
                    dupe.$(".jobNo").text(from.job["JobNumber"]);
                    dupe.hide();
                    from.append(dupe);
                    dupe.fadein();
                }),
                task: task(async valid => {
                    return await await_file(from.$("input"), valid);
                })
            })),
            to: sync.$(".to").ext((to) => ({
                xdfx: null, parts: null, job: null,
                copy: to.$(".copy.xdfx"),
                add: to.$(".add").click(async () => {
                    let res = await to.task.run();
                    if (res == "cancelled") return;
                    to.xdfx = await new XDFX(res[0]);
                    
                    to.$(".clone").remove();
                    to.parts = raw(to.xdfx.data["Parts"]);
                    to.jobs = raw(to.xdfx.data["WorkOrderLines"]);
                    for (let part of to.parts) {
                        let dupe = to.copy.dupe();
                        let job = to.jobs.find(e => e["__GlobalID_JobPartID"] == part["GlobalID"]);
                        dupe.$(".partNo").text(part["PartNumber"]);
                        dupe.$(".jobNo").text(job && job["JobNumber"]);
                        dupe.hide();
                        to.append(dupe);
                    }
                    to.$(".clone").fadein();
                }),
                task: task(async valid => {
                    return await await_file(to.$("input"), valid);
                }),
            })),
            accept: sync.$(".accept").nav(async () => {
                let data = from.xdfx.data;
                let master = from.part;
                let job = from.job;
                let dims = raw(data["Dims"]).filter(e => e["__GlobalID_DimPartID"] == master["GlobalID"]);
                
                for (let res of to.parts) {
                    let part = model.part[res["GUID"]];
                    for (let dim of dims) {
                        let copy = raw(data["Dims"]).find(e => 
                            e["__GlobalID_DimManProcessID"] == mfg["GlobalID"] && e["DimSort"] == dim["DimSort"]);
                        if (!copy) {
                            
                            copy = Object.assign({}, dim);
                            copy["__GlobalID_DimManProcessID"] = mfg["GlobalID"];
                            copy["__GlobalID_DimPartID"] = part["GlobalID"];
                        }
                    }
                }


                let url = await to.xdfx.write();
                window.open(url, "_blank");
            }),
            open: async () => {
                loading(true);
                engi.card.nav();

                await engi.actions.fadeout();
                engi.actions.hide();
                await all([
                    engi.gap("5vh"),
                    engi.tile.width("30vh")
                ]);

                await sync.fadein();
                loading(false);
                engi.card.nav(sync.close);
            },
            load: () => {
                from.$(".clone").remove();
                to.$(".clone").remove();
                from.xdfx = null;
                to.xdfx = null;
            },
            close: async () => {
                loading(true);
                engi.card.nav();

                await sync.fadeout();
                sync.hide();
                await all([
                    engi.gap("15vh"),
                    engi.tile.width("40vh")
                ]);

                loading(false);
                await engi.actions.fadein();
                engi.card.nav(engi.actions.close);
            }
        }))
    }));
})