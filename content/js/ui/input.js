$(window).on("load", () => {
    ui.input = $(".input.popup").ext((input) => ({
        open: async function () {
            sample = user.sample;
            input.scale = 1;
            input.controls.zoom();
            input.drawings.$(".clone").remove();
            let drawings = raw.drawings.sort((a, b) =>
                a.get["Title"].localeCompare(b.get["Title"])
                || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
            for (let drawing of drawings) {
                let dupe1 = ui.input.drawings.copy.dupe();
                dupe1.$("img").attr("src", drawing.png);
                for (let dim of user.op.dims) {
                    let dupe2 = dupe1.$(".copy.dim").dupe();
                    let holder = dim.holders.find(e => e.sample == sample);
                    let result = dim.results.find(e => e.sample == sample);
                    if (!holder && !result) continue;
                    if (result) {
                        if (result.get["Status"] == 2)
                            dupe2.addClass("fail");
                        else
                            dupe2.addClass("done");
                    } else if (holder) {
                        dupe2.addClass("insp");
                    }
                    dupe2.prop("model", dim);
                    let coords = dim.get["ShapeCenter"].split(",");
                    let size = dim.get["ShapePoints"].split(",");
                    let factor = 58.5 / drawing.height;
                    dupe2.css({
                        left: (coords[0] * factor + 3.8) + "vh",
                        top: (coords[1] * factor + 3.8) + "vh",
                        width: (size[0] * factor) + "vh",
                        height: (size[1] * factor) + "vh"
                    })
                    dupe1.$(".dims").append(dupe2)
                }
                input.drawings.append(dupe1);
            }
            input.info.jobNo.text(user.job.get["Number"] + " - " + user.job.part.get["PartNumber"]);
            input.info.opNo.text(user.op.get["Code"] + " - " + user.op.get["Title"]);
            input.info.sampleNo.text("Sample " + user.sample.get["SerialNumber"]);
            input.info.loginName.text(user.login.get["FirstName"] + " " + user.login.get["LastName"])
            ui.prompts.open("input");
        },
        info: input.$(".info1, .info2").ext((info) => ({
            jobNo: info.$(".jobNo"),
            opNo: info.$(".opNo"),
            sampleNo: info.$(".sampleNo"),
            loginName: info.$(".loginName"),
        })),
        drawings: input.$(".drawings").ext((drawings) => ({
            refresh: async () => {
                let res1 = await all([1, 2, 3, 4].map(async (num) => {
                    let query = API("results/list");
                    query.req["SampleGUID"] = user.sample.get["GUID"];
                    query.req["Status"] = num;
                    return (await query.pages())["Results"];
                }));
                let query = API("ncr/list");
                query.req[""]
            },
            copy: drawings.$(".drawing").ext((drawing) => ({
                data: drawing.$(".data").ext((data) => ({
                    display: data.$(".display"),
                    number: data.$(".number").nav(function () {
                        let text = $(this).text();
                        data.display.text(data.display.text() + text);
                        data.accept.toggleClass("invalid", isNaN(data.display.text()));
                    }),
                    clear: data.$(".clear").nav(function () {
                        data.display.text("");
                        data.accept.toggleClass("invalid", true);
                    }),
                    accept: data.$(".accept").nav(async function () {
                        if ($(this).hasClass("invalid")) return;
                        let dim = data.prop("dim");
                        let model = dim.prop("model")
                        let sample = user.sample;
                        let login = user.login;
                        let number = data.display.text();
                        query = API("ncr/set");
                        query.req["InputNCR"] = {
                            "GUID": "",
                            "JobGUID": user.job.get["GUID"],
                            "LotGUID": "",
                            "Number": new Date().toISOString().slice(0, -1) + "0000-04:00",
                            "Status": 0,
                            "CreationDate": null,
                            "CreatedByGUID": login.get["GUID"],
                            "ResponseDate": null,
                            "AssignedToGUID": "",
                            "WorkCellGUID": "",
                            "InspCenterGUID": "",
                            "BarcodeID": "",
                            "ERPID": "",
                            "Comments": ""
                        }
                        let ncr = (await query.send())["OutputNCR"];

                        query = API("results/bulkload");
                        query.req["SampleGUID"] = sample.get["GUID"];
                        query.req["IgnoreInvalidLines"] = true;
                        query.req["InputResults"] = [
                            {
                                "DimGUID": model.get["GUID"],
                                "ResNo": ncr["GUID"],
                                "MeasuredByGUID": login.get["GUID"],
                                "Data": number,
                                "UpperTol": "",
                                "LowerTol": "",
                                "Deviation": "",
                                "OutTol": "",
                                "Bonus": 0,
                                "Axis": "",
                                "Feature1": "",
                                "Feature2": "",
                                "Result": 0,
                                "NeedsCalculation": true
                            }
                        ]
                        let success = await query.send();

                        let res = (await all([1, 2, 3, 4].map(async () => {
                            query = API("results/list");
                            query.req["SampleGUID"] = sample.get["GUID"];
                            return (await query.pages())["Results"];
                        }))).flat(2);
                        let output = res.find(e => e["ResNo"] == ncr["GUID"])
                        dim.removeClass("insp pass fail");
                        if (output["Status"] == 2)
                            dim.addClass("fail");
                        else
                            dim.addClass("done");

                        data.cancel.click();
                    }),
                    more: data.$(".more").nav(async function () {

                    }),
                    cancel: data.$(".cancel").nav(async function () {
                        await data.fadeout();
                        await all([
                            data.width("0"),
                            drawing.gap("0")
                        ]);
                        data.hide();
                        drawing.$(".dim").animate({
                            opacity: 1
                        }, 300);
                        data.prop("dim").prop("hold", false);
                        data.accept.toggleClass("invalid", true);
                    }),
                })),
                dims: drawing.$(".dims").ext((dims) => ({
                    copy: dims.$(".dim").nav(async function () {
                        if ($(this).prop("hold")) return;
                        $(this).prop("hold", true);
                        await drawing.$(".dim").not(this).animate({
                            opacity: 0
                        }, 300).promise();
                        drawing.data.show();
                        await all([
                            drawing.data.width("24vh"),
                            drawing.gap("2vh")
                        ]);
                        drawing.data.display.text("");
                        drawing.data.fadein();
                        drawing.data.prop("dim", $(this));
                    })
                })),
            }))
        })),
        scale: 1,
        controls: input.$(".controls").ext((controls) => ({
            zoom: () => {
                input.drawings.$(".pdf, .dims").css("transform", `scale(${input.scale})`)
            },
            zoomin: controls.$(".zoomin").nav(() => {
                input.scale += 0.25; controls.zoom();
            }),
            zoomfit: controls.$(".zoomfit").nav(() => {
                input.scale = 1; controls.zoom();
            }),
            zoomout: controls.$(".zoomout").nav(() => {
                input.scale -= 0.25; controls.zoom();
            }),
            serialize: controls.$(".serialize").nav(() => {

            }),
        }))
    }));
});