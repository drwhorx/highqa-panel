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
            make: actions.$(".make.card").ext((make) => ({
                task: task(async valid => {
                    return await await_file(engi.make.$("input"), valid);
                })
            })).click(async function (e) {
                let res = await actions.make.task.run();
                if (res == "cancelled") return;
                engi.make.open(res[0]);
            }),
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
                engi.card.nav(null, true);
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
                loading(true);
                engi.card.nav(null, true);
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
                loading(true);
                engi.card.nav(null, true);

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
                engi.card.nav(null, true);

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
                if (!make.process.val())
                    return make.process.toggleClass("invalid", true);

                loading(true);
                engi.card.nav(null, true);

                let part = user.part;
                let dueDate = new Date(make.dueDate.val());
                let date = new Date();
                date.setHours(0, 0, 0, 0);
                let jobNo = make.jobNo.val();
                let jobQty = make.jobQty.val();
                let jobGUID = UUID();
                let mfgGUID = make.process.val();
                let job = load_jobs([
                    {
                        "JobWorkOrderID": "0",
                        "JobPartID": part.get["ID"],
                        "JobPOLineID": "0",
                        "JobCustomerID": "0",
                        "JobSupplierID": part.get["PartCustomerID"],
                        "JobInspectionID": "1",
                        "JobContactID": "0",
                        "JobNumber": jobNo,
                        "JobItem": "",
                        "JobPacketRev": "",
                        "JobQuantity": jobQty,
                        "JobStatus": "1",
                        "JobFiles": "0",
                        "JobExtID": "",
                        "JobBarcode": "",
                        "JobNotificationsEnabled": "1",
                        "JobNotificationSettingsXML": "",
                        "Reminder": "",
                        "RecordTitle": jobNo,
                        "JobAQLHeaderMode": "0",
                        "JobAQLHeaderID": "0",
                        "JobInspLevel": "0",
                        "JobPOItemID": "0",
                        "IsInspection": "0",
                        "ID": "1",
                        "GlobalID": jobGUID,
                        "JobActivationDate": date.toHighQADate(),
                        "JobDeliveryDate": dueDate.toHighQADate(),
                        "__GlobalID_JobWorkOrderID": "",
                        "__GlobalID_JobPartID": part.get["GUID"],
                        "__GlobalID_JobPOLineID": "",
                        "__GlobalID_JobCustomerID": "",
                        "__GlobalID_JobSupplierID": part.get["CustomerGUID"],
                        "__GlobalID_JobInspectionID": "E7368263-A199-48B3-B7ED-4BFDE8BBD05D",
                        "__GlobalID_JobContactID": "",
                        "__GlobalID_JobAQLHeaderID": "",
                        "__GlobalID_JobPOItemID": "",
                        "GUID": "",
                        "PartGUID": part.get["GUID"],
                        "Number": jobNo,
                        "ActivationDate": date.toHighQADate(),
                        "DeliveryDate": dueDate.toHighQADate(),
                        "Status": "1"
                    }
                ])[0];
                user.xdfx.data["WorkOrderLines"][jobGUID] = job.get;
                for (let job of raw(user.xdfx.data["WorkOrderLines"])) {
                    if (part.get["GUID"] == job["__GlobalID_JobPartID"] && job["GlobalID"] != jobGUID)
                        delete user.xdfx.data["WorkOrderLines"][job["GlobalID"]];
                }

                let mfg = user.xdfx.data["ManProcesses"][mfgGUID];
                mfg["ManProcessName"] = "IN PROCESS";
                mfg["ManProcessIsFinish"] = "1";

                for (let mfg of part.mfgs.arr) {
                    if (mfg.get["GlobalID"] == mfgGUID) continue;
                    for (let drawing of mfg.drawings)
                        delete user.xdfx.data["Drawings"][drawing["GlobalID"]];
                    for (let dim of mfg.dims)
                        delete user.xdfx.data["Dims"][dim["GlobalID"]];
                    delete user.xdfx.data["ManProcesses"][mfg.get["GlobalID"]];
                }
                part.mfgs.mfg = model.mfg[mfg["GlobalID"]];

                let lotGUID = {
                    fpi: UUID(),
                    mfg: UUID()
                };
                let lots = load_lots([
                    {
                        "GUID": lotGUID.fpi,
                        "GlobalID": lotGUID.fpi,
                        "ID": "1",
                        "IsInspection": "0",
                        "JobGUID": jobGUID,
                        "LotAQLHeaderID": "0",
                        "LotAQLResult": "0",
                        "LotBarcode": "",
                        "LotCodeLetter": "A",
                        "LotContactID": "0",
                        "LotDueDate": dueDate.toHighQADate(),
                        "LotExtID": "0",
                        "LotFiles": "0",
                        "LotHoursPerShift": "0",
                        "LotInspLevel": "1",
                        "LotItemPrice": "0.0000",
                        "LotJobID": "1",
                        "LotNumber": jobNo + " FPI",
                        "LotProgress": "0",
                        "LotQualityLevel": "1",
                        "LotQualityStage": "1",
                        "LotSampleSize": "1",
                        "LotSamplesPerHour": "0",
                        "LotSamplingXML": "",
                        "LotSize": "1",
                        "LotStartDate": date.toHighQADate(),
                        "LotStatus": "1",
                        "Number": jobNo + " FPI",
                        "__GlobalID_LotAQLHeaderID": "",
                        "__GlobalID_LotContactID": "",
                        "__GlobalID_LotJobID": jobGUID
                    },
                    {
                        "GUID": lotGUID.mfg,
                        "GlobalID": lotGUID.mfg,
                        "ID": "1",
                        "IsInspection": "0",
                        "JobGUID": jobGUID,
                        "LotAQLHeaderID": "0",
                        "LotAQLResult": "0",
                        "LotBarcode": "",
                        "LotCodeLetter": "A",
                        "LotContactID": "0",
                        "LotDueDate": dueDate.toHighQADate(),
                        "LotExtID": "0",
                        "LotFiles": "0",
                        "LotHoursPerShift": "0",
                        "LotInspLevel": "1",
                        "LotItemPrice": "0.0000",
                        "LotJobID": "1",
                        "LotNumber": jobNo,
                        "LotProgress": "0",
                        "LotQualityLevel": "1",
                        "LotQualityStage": "1",
                        "LotSampleSize": jobQty,
                        "LotSamplesPerHour": "0",
                        "LotSamplingXML": "",
                        "LotSize": jobQty,
                        "LotStartDate": date.toHighQADate(),
                        "LotStatus": "1",
                        "Number": jobNo,
                        "__GlobalID_LotAQLHeaderID": "",
                        "__GlobalID_LotContactID": "",
                        "__GlobalID_LotJobID": jobGUID
                    }
                ]);
                user.xdfx.data["Lots"][lotGUID.fpi] = lots[0].get;
                user.xdfx.data["Lots"][lotGUID.mfg] = lots[1].get;

                let samples = load_samples(Array.from({ length: jobQty }).map((e, i) => {
                    let sampleGUID = UUID();
                    return user.xdfx.data["PartInstances"][sampleGUID] = {
                        "GUID": sampleGUID,
                        "GlobalID": sampleGUID,
                        "ID": "1",
                        "IsInspection": "0",
                        "LotGUID": lotGUID.mfg,
                        "PartInstanceBarcode": "",
                        "PartInstanceCavityNumber": "0",
                        "PartInstanceComments": "",
                        "PartInstanceContactID": "0",
                        "PartInstanceExport": "0",
                        "PartInstanceExtID": "",
                        "PartInstanceFiles": "0",
                        "PartInstanceFixtureNumber": "",
                        "PartInstanceInspMode": "0",
                        "PartInstanceInspScope": "0",
                        "PartInstanceJobID": "1",
                        "PartInstanceLotID": "1",
                        "PartInstanceMachineNumber": "",
                        "PartInstanceManProcRef": "",
                        "PartInstanceManProcessID": "0",
                        "PartInstanceOperatorName": "",
                        "PartInstancePONumber": "",
                        "PartInstancePartID": part.get["ID"],
                        "PartInstanceQRCode": "",
                        "PartInstanceReportNumber": "",
                        "PartInstanceSequenceNumber": i,
                        "PartInstanceSerialNumber": "# " + i,
                        "PartInstanceStampNumber": "",
                        "PartInstanceStatus": "0",
                        "PartInstanceUsedInAQL": "1",
                        "SerialNumber": "# " + i,
                        "__GlobalID_PartInstanceContactID": "",
                        "__GlobalID_PartInstanceJobID": job.get["GUID"],
                        "__GlobalID_PartInstanceLotID": lotGUID.mfg,
                        "__GlobalID_PartInstanceManProcessID": "",
                        "__GlobalID_PartInstancePartID": part.get["GUID"]
                    };
                }));

                let sampleGUID = UUID();
                let sample = load_samples([
                    {
                        "GUID": sampleGUID,
                        "GlobalID": sampleGUID,
                        "ID": "1",
                        "IsInspection": "0",
                        "LotGUID": lotGUID.fpi,
                        "PartInstanceBarcode": "",
                        "PartInstanceCavityNumber": "0",
                        "PartInstanceComments": "",
                        "PartInstanceContactID": "0",
                        "PartInstanceExport": "0",
                        "PartInstanceExtID": "",
                        "PartInstanceFiles": "0",
                        "PartInstanceFixtureNumber": "",
                        "PartInstanceInspMode": "0",
                        "PartInstanceInspScope": "0",
                        "PartInstanceJobID": "1",
                        "PartInstanceLotID": "1",
                        "PartInstanceMachineNumber": "",
                        "PartInstanceManProcRef": "",
                        "PartInstanceManProcessID": "0",
                        "PartInstanceOperatorName": "",
                        "PartInstancePONumber": "",
                        "PartInstancePartID": part.get["ID"],
                        "PartInstanceQRCode": "",
                        "PartInstanceReportNumber": "",
                        "PartInstanceSequenceNumber": i,
                        "PartInstanceSerialNumber": "FPI 1",
                        "PartInstanceStampNumber": "",
                        "PartInstanceStatus": "0",
                        "PartInstanceUsedInAQL": "1",
                        "SerialNumber": "FPI 1",
                        "__GlobalID_PartInstanceContactID": "",
                        "__GlobalID_PartInstanceJobID": job.get["GUID"],
                        "__GlobalID_PartInstanceLotID": lotGUID.fpi,
                        "__GlobalID_PartInstanceManProcessID": "",
                        "__GlobalID_PartInstancePartID": part.get["GUID"]
                    }
                ]);
                user.xdfx.data["PartInstances"][sampleGUID] = sample[0].get;

                part.mfgs.mfg.dims.map(dim => {
                    let holderGUID = UUID();
                    let holder = load_holders([{
                        
                    }]);
                })
                await all(part.mfgs.mfg.dims.map(async dim => {
                    
                    create.req["DimGUID"] = dim.get["GUID"];
                    create.req["SampleGUIDs"] = sample
                    await create.send();
                }));

                await user.xdfx.download();
                loading(false);
                engi.card.nav(engi.make.close);
                user.xdfx = new XDFX(user.xdfx.file);
                return;

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
            }),
            open: async (file) => {
                loading(true);
                engi.card.nav(null, true);

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

                let res = await make.query.run();
                if (res == "cancelled") return;

                engi.card.nav(null, true);
                engi.tile.pdf.load();
                engi.make.load();

                loading(false);
                await make.fadein();
                engi.card.nav(make.close);
            },
            query: task(async (valid) => {
                let data = user.xdfx.data;
                await user.xdfx.load();
                let guid = raw(data["Parts"])[0]["GlobalID"];
                user.part = model.part[guid];
                return valid();
            }),
            load: () => {
                let mfgs = user.part.mfgs.arr;
                make.process.$("option.clone").remove();
                for (let mfg of mfgs) {
                    let dupe = make.process.copy.dupe();
                    dupe.text(mfg.get["Title"]);
                    dupe.val(mfg.get["GUID"]);
                    dupe.prop("model", mfg);
                    make.process.append(dupe);
                }
                make.$("input").val(null);
                make.process.val("");
            },
            close: async () => {
                loading(true);
                engi.card.nav(null, true);

                await all([
                    engi.tile.pdf.fadeout(),
                    make.fadeout()
                ]);
                make.hide();
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
                engi.card.nav(null, true);

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

                let res = await xdfx.query.run();
                if (res == "cancelled") return;

                engi.card.nav(null, true);
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
                engi.card.nav(null, true);

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
                engi.card.nav(null, true);

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
                engi.card.nav(null, true);

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