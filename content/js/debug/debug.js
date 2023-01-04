const test = async () => {
    let job = user.job;
    let part = job.part;
    let fpi = job.lots.fpi;
    let mfg = job.lots.mfg;
    let dims = part.mfgs.mfg.dims;
    let set = API("samples/set");

    samples = fpi.samples.map(e => e.get["GUID"]);
    for (let dim of dims) {
        let create = API("placeholders/create");
        create.req["DimGUID"] = dim.get["GUID"];
        create.req["SampleGUIDs"] = samples.join(",")
        await create.send();
    }

    samples = mfg.samples.map(e => e.get)
        .sort((a, b) => a["SerialNumber"].slice(1) - b["SerialNumber"].slice(1));
    for (let dim of dims) {
        let qty = sample_qty(dim.get["TolClass"], samples.length) || parseInt(dim.get["TolClass"]);
        if (!qty) return;
        let plan = samplize(qty, samples.length).map(e => samples[e]["GUID"]);
        let create = API("placeholders/create");
        create.req["DimGUID"] = dim.get["GUID"];
        create.req["SampleGUIDs"] = plan.join(",");
        await create.send();
    }
    console.log("done");
}

const test2 = async () => {
    let xdfx = await new XDFX($("#debug1").prop("files")[0]);
    console.log(await xdfx.write())
    //let dims = parse.parseFromString(await folder.files["Dims.xml"].async("text"), "text/xml");
}

const test3 = async () => {
    ui.input.scale = 1;
    ui.input.drawings.$(".clone").remove();
    let drawings = raw(model.drawing).sort((a, b) =>
        a.get["Title"].localeCompare(b.get["Title"])
        || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
    for (let drawing of drawings) {
        let dupe1 = ui.input.drawings.copy.dupe();
        dupe1.$("img").attr("src", drawing.png);
        for (let dim of user.op.dims) {
            let dupe2 = dupe1.$(".copy.dim").dupe();
            dupe2.prop("model", dim);
            let coords = dim.get["ShapeCenter"].split(",");
            let size = dim.get["ShapePoints"].split(",");
            let factor = 58.5 / drawing.height;
            dupe2.css({
                left: (coords[0] * factor + 3.9) + "vh",
                top: (coords[1] * factor + 3.9) + "vh",
                width: (size[0] * factor) + "vh",
                height: (size[1] * factor) + "vh"
            })
            dupe1.$(".dims").append(dupe2)
        }
        ui.input.drawings.append(dupe1);
    }
    ui.prompts.open(ui.prompts.input);
}

const test4 = async () => {
    let res = (await API("ncr/list").pages())["NCRs"];
    console.log(res);
    let ser = res.filter(e => {
        try {
            return new Date(e["Number"]).toHighQADate() == e["Number"]
                && e["CreationDate"] === null
        } catch (e) {}
    });
    let done = await all(ser.map(async one => {
        let query = API("ncr/set");
        query.req["InputNCR"] = {
            "GUID": one["GUID"],
            "JobGUID": one["JobGUID"],
            "LotGUID": one["LotGUID"],
            "Number": one["Number"],
            "Status": one["Status"],
            "CreationDate": one["Number"],
            "CreatedByGUID": one["CreatedByGUID"],
            "ResponseDate": one["ResponseDate"],
            "AssignedToGUID": one["AssignedToGUID"],
            "WorkCellGUID": one["WorkCellGUID"],
            "InspCenterGUID": one["InspCenterGUID"],
            "BarcodeID": one["BarcodeID"],
            "ERPID": one["ERPID"],
            "Comments": one["Comments"]
        };
        let oof;
        try {
            oof = await query.send();
        } catch (e) {};
        return oof;
    }));
    console.log(done.map(e => e && e["OutputNCR"]));
}

const drawpdf = async (pdf, pageNo, canvas) => {
    let page = await pdf.getPage(pageNo);
    let context = canvas.getContext('2d');

    try {
        let viewport = page.getViewport({ scale: 4 / 3 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        return await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    } catch (err) {
    }
}


/*
$(window).on("load", () => {
    $("#console .tile").click(async function () {
        let hide = $("#console .tile").not(this);
        let menu = $("#console");
        let dept = $(this).pickClass(["engi", "shop", "qual"]);
        let sect = $("#console .section." + dept);

        $("#console").css("justify-content", 
            dept == "engi" ? "right" : "");

        if ($(this).hasClass("pop")) {
            await sect.fadeout();
            menu.css("gap", 0);
            hide.removeAttr("hidden");
            
            sect.prop("hidden", true);
            menu.gap("15vh");
            $(this).bounce("40vh");
            await hide.bounce("40vh");

            await hide.fadein();
            $(this).removeClass("pop");
        } else {
            await hide.fadeout();
            menu.gap(0);
            $(this).bounce("30vh");
            await hide.bounce(0);

            hide.prop("hidden", true);
            sect.removeAttr("hidden");
            menu.css("gap", "5vh");
            
            await sect.fadein();
            $(this).addClass("pop");
        }
    });
});
*/