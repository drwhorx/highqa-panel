const test1 = async () => {
    let res = (await API("ncr/list").pages())["NCRs"];
    console.log(res);
    let ser = res.filter(e => {
        try {
            return new Date(e["Number"]).toHighQADate() == e["Number"]
                && e["CreationDate"] === null
        } catch (e) { }
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
        } catch (e) { };
        return oof;
    }));
    console.log(done.map(e => e && e["OutputNCR"]));
}

const test2 = async () => {
    let ncrs = (await all(
        raw(model.job).map(e => e.get_ncrs(() => true))
    )).flat(2).filter(e => {
        try {
            return new Date(e["Number"]).toHighQADate().slice(0, -6) == e["Number"].slice(0, -6)
        } catch (e) { }
    });
    let res = (await all(
        raw(model.job).map(e => e.get_results(() => true))
    )).flat(2).filter(a =>
        ncrs.find(b => a["ResNo"] == b["GUID"])
    );
    console.log(res);
    console.log(ncrs);
}

const test3 = async () => {
    let from = ui.engi.sync.from.part;
    let to = ui.engi.sync.to.parts[0];
    


    let results = from.job.results;

    for (let result of results) {
        let oldDim = result.dim;
        let newDim = to.mfgs.mfg.dims.find(e => e.get["DimSort"] == oldDim.get["DimSort"]);
        if (!newDim) {
            console.log("No Dim: " + result.get["GUID"]);
            continue;
        };

        let oldSample = result.sample;
        let newSample = to.job.samples.find(e => oldSample.get["SerialNumber"].startsWith(e.get["SerialNumber"]));
        if (!newSample) {
            console.log("No Sample: " + result.get["GUID"]);
            continue;
        };

        result.get["ActualDimID"] = newDim.get["ID"];
        result.get["__GlobalID_ActualDimID"] = newDim.get["GlobalID"];
        
        result.get["ActualPartInstanceID"] = newSample.get["ID"];
        result.get["__GlobalID_ActualPartInstanceID"] = newSample.get["GlobalID"];

        let serial = result.serial;
        if (serial)
            serial.get["__GlobalID_NCRJobID"] = to.job.get["GlobalID"];

        ui.engi.sync.to.xdfx.data["Actuals"][result.get["GUID"]] = result.get;
        if (serial) 
            ui.engi.sync.to.xdfx.data["NCReports"][serial.get["GUID"]] = serial.get;

        console.log("Converted: " + result.get["GUID"]);
    }
}

const test4 = async () => {
    let dims = Array.from({length: 100}).map((e, i) => ({
        "DimNo": i + 100,
        "Type": i,
        "Multiplier": 1,
        "Nominal": 1.1,
        "UpperTol": 1.2,
        "LowerTol": 1.0,
        "TolType": i,
        "Note": "",
        "Units": i
    }));
    let query = API("dims/bulkload");
    query.req["InputDims"] = dims;
    query.req["IgnoreInvalidLines"] = true;
    query.req["PartGUID"] = "234d4415-e083-4932-8b17-e8c782b4967a";
    await query.send();
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