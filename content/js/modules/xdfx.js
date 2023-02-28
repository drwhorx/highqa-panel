class XDFX {
    data = {}
    constructor(file) {
        return (async () => {
            this.file = file;
            let unzip = new JSZip();
            let zip = this.zip = await unzip.loadAsync(file);
            for (let name in zip.files) {
                if (!name.startsWith("Data\\")) continue;
                let text = await zip.files[name].async("text");
                let json;
                try {
                    json = JSON.parse(text.slice(1));
                } catch (err) {
                    json = JSON.parse(text);
                }
                let items = this.data[name.slice(5, -5)] =
                    json.items.map(e => e.reduce((a, b, i) => {
                        a[json.fields[i].name] = b;
                        return a;
                    }, {}));
                if (json.fields.find(e => e.name == "GlobalID"))
                    this.data[name.slice(5, -5)] = items.reduce((a, b) => {
                        a[b["GlobalID"]] = b;
                        return a;
                    }, {});
            }
            return this;
        })();
    }
    async write() {
        for (let name in this.data) {
            let text = await this.zip.file("Data\\" + name + ".json").async("text");
            let json;
            try {
                json = JSON.parse(text.slice(1));
            } catch (err) {
                json = JSON.parse(text);
            }
            let fields = json.fields;
            let data = this.data[name];
            if (!Array.isArray(data)) data = raw(data);
            json.items = data.map(e => fields.map(f => e[f.name]));
            this.zip.file("Data\\" + name + ".json", JSON.stringify(json));
        }
        let blob = this.blob = await this.zip.generateAsync({ type: "blob" });
        return URL.createObjectURL(blob);
    }
    async load() {
        this.model = this.parts();
        this.jobs();

        this.ops();
        this.mfgs();

        await this.files();
        await this.drawings();

        this.dims();
        this.lots();
        this.samples();
        await this.ncrs();
        this.holders();
        this.results();
    }
    async download() {
        download(await this.write(), this.file.name.slice(0, -5) + "-Modified.xdfx");
    }
    parts() {
        let parts = raw(this.data["Parts"]);
        parts.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["CustomerGUID"] = e["__GlobalID_PartCustomerID"];
        });
        return load_parts(parts);
    }
    jobs() {
        let jobs = raw(this.data["WorkOrderLines"]);
        jobs.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["PartGUID"] = e["__GlobalID_JobPartID"];
            e["Number"] = e["JobNumber"];
            e["ActivationDate"] = e["JobActivationDate"];
            e["DeliveryDate"] = e["JobDeliveryDate"];
            e["Status"] = e["JobStatus"];
        });
        return load_jobs(jobs);
    }
    mfgs() {
        let mfgs = raw(this.data["ManProcesses"]);
        mfgs.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["PartGUID"] = e["__GlobalID_ManProcessPartID"];
            e["ERPID"] = e["ManProcessExtID"];
            e["Title"] = e["ManProcessName"];
            e["Description"] = e["ManProcessComments"];
        });
        return load_mfgs(mfgs);
    }
    ops() {
        let ops = raw(this.data["Operations"]);
        ops.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["PartGUID"] = e["__GlobalID_OperationPartID"];
        });
        return load_ops(ops);
    }
    async files() {
        let files = await all(raw(this.data["Drawings"])
            .filter((a, i, self) => i == self.findIndex(b => a["Drawing"] == b["Drawing"]))
            .map(async a => {
                let file = raw(this.data["Files"]).find(b => a["Drawing"] == b["FolderID"]);
                file["GUID"] = file["GlobalID"];
                file["PartGUID"] = a["__GlobalID_DrawingPartID"];
                file["Blob"] = await raw(this.zip.files).find(e => e.name.includes(file["GlobalID"])).async("blob");
                return file;
            }));
        return await load_files(files);
    }
    async drawings() {
        let drawings = raw(this.data["Drawings"]);
        drawings.forEach(e => {
            let file = raw(this.data["Files"]).find(b => e["Drawing"] == b["FolderID"]);
            e["GUID"] = e["GlobalID"];
            e["PartGUID"] = e["__GlobalID_DrawingPartID"];
            e["OperationGUID"] = e["__GlobalID_DrawingManProcessID"];
            e["DrawingFile"] = file["GlobalID"];
            e["Title"] = e["DrawingNumber"];
            e["SheetName"] = e["DrawingSheetName"];
            e["PdfPageNo"] = e["DrawingPdfPage"];
        });
        return await load_drawings(drawings);
    }
    dims() {
        let dims = raw(this.data["Dims"]);
        dims.forEach(e => {
            e["GUID"] = e["GlobalID"];
            let link = raw(this.data["OperationDimLinks"]).find(b => b["__GlobalID_LinkDimID"] == e["GlobalID"]);
            e["ProcedureGUID"] = link && link["__GlobalID_LinkOperationID"];
            e["OperationGUID"] = e["__GlobalID_DimManProcessID"];
            e["DrawingGUID"] = e["__GlobalID_DimDrawingID"];
            e["PartGUID"] = e["__GlobalID_DimPartID"];
            e["UpperTol"] = e["DimUpperTol"];
            e["LowerTol"] = e["DimLowerTol"];
            e["Nominal"] = e["DimData"];
            e["TypeText"] = types.Dim[e["DimType"]];
            e["TolTypeText"] = types.DimTol[e["DimTolType"]];
            e["Units"] = e["DimUnits"];
        });
        return load_dims(dims);
    }
    lots() {
        let lots = raw(this.data["Lots"]);
        lots.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["JobGUID"] = e["__GlobalID_LotJobID"];
            e["Number"] = e["LotNumber"];
        });
        return load_lots(lots);
    }
    samples() {
        let samples = raw(this.data["PartInstances"]);
        samples.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["LotGUID"] = e["__GlobalID_PartInstanceLotID"];
            e["SerialNumber"] = e["PartInstanceSerialNumber"];
        });
        return load_samples(samples);
    }
    async ncrs() {
        let ncrs = raw(this.data["NCReports"]);
        let res = (await all(raw(this.data["WorkOrderLines"])
            .map(async e => {
                let query = API("ncr/list");
                query.req["JobGUID"] = e["GlobalID"];
                return (await query.pages())["NCRs"];
            }))).flat();
        ncrs.forEach(e => {
            let ncr = res.find(b => b["GUID"] == e["GlobalID"]);
            e["GUID"] = e["GlobalID"];
            e["JobGUID"] = e["__GlobalID_NCRJobID"];
            e["LotGUID"] = e["__GlobalID_NCRLotID"];
            e["ERPID"] = e["NCRExtID"];
            e["CreationDate"] = e["NCRCreateDate"];
            e["Number"] = e["NCRNumber"];
            e["CreatedByGUID"] = ncr?.CreatedByGUID;
        });
        return load_ncrs(ncrs);
    }
    holders() {
        let holders = raw(this.data["Actuals"])
            .filter(e => e["ActualResult"] == 0);
        holders.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["SampleGUID"] = e["__GlobalID_ActualPartInstanceID"];
            e["DimGUID"] = e["__GlobalID_ActualDimID"];
            e["ResNo"] = e["ActualCode"];
        });
        return load_holders(holders);
    }
    results() {
        let results = raw(this.data["Actuals"])
            .filter(e => e["ActualResult"] != 0);
        results.forEach(e => {
            e["GUID"] = e["GlobalID"];
            e["SampleGUID"] = e["__GlobalID_ActualPartInstanceID"];
            e["DimGUID"] = e["__GlobalID_ActualDimID"];
            e["InspectedDate"] = e["ActualInspectDate"];
            e["MeasuredByGUID"] = e["__GlobalID_ActualContactID"];
            e["Status"] = e["ActualStatus"];
            e["ResNo"] = e["ActualCode"];
        });
        return load_results(results);
    }
}

var UUID = (function () {
    var lut = []; for (var i = 0; i < 256; i++) { lut[i] = (i < 16 ? '0' : '') + (i).toString(16); }
    return function () {
        var d0 = Math.random() * 0xffffffff | 0;
        var d1 = Math.random() * 0xffffffff | 0;
        var d2 = Math.random() * 0xffffffff | 0;
        var d3 = Math.random() * 0xffffffff | 0;
        return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
            lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
            lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
            lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
    }
})();

const op_colors = [
    "-128",
    "-7278960",
    "-8355585",
    "-7114533",
    "-2252579",
    "-32640",
    "-16256",
]