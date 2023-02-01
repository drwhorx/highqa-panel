const task = (query) => {
    return {
        promise: null,
        token: null,
        cancel: function () { this.token = null },
        run: function (...args) {
            return this.promise = new Promise(async resolve => {
                var token = this.token = new Date();
                let res = await query(...args, () => token == this.token);
                if (token != this.token) console.log("cancelled");
                resolve(token == this.token ? res : "cancelled");
            });
        }
    }
}

const groups = (length, size) =>
    Array.from({ length: mathjs.ceil(length / size) }, (_, i) => [i * size, i * size + size]);

const clear = (arr) => {
    if (arr) arr.splice(0, arr.length);
    return arr;
}

const unload = (arr, item) => {
    let i = arr.indexOf(item);
    if (i > -1) return arr.splice(i, 1);
}

const query_basic = async (valid) => {
    let res = await all([
        API("jobs/list").pages(),
        API("parts/list").pages(),
        API("companies/list").pages(),
        API("contacts/list").pages()
    ]);
    if (!valid()) return;
    let [get_jobs, get_parts, get_companies, get_contacts] = [
        res[0]["Jobs"], res[1]["Parts"], res[2]["Companies"], res[3]["Contacts"]
    ];
    load_companies(get_companies);
    load_contacts(get_contacts);
    load_parts(get_parts);
    load_jobs(get_jobs);
    return valid();
}

const query_job = async (job, { do_drawings, do_holders }, valid) => {
    job.part.ops = [];
    job.part.dims = [];
    job.part.drawings = [];
    job.part.mfgs = {
        mfg: {},
        fin: {},
        arr: []
    };
    job.lots = {
        fpi: {},
        mfg: {},
        arr: []
    };
    job.ncrs = [];
    job.samples = [];
    let done_drawings;
    if (do_drawings) done_drawings = (async () => {
        let res = await job.part.get_drawings(valid);
        if (!valid()) return;
        let { get_files, get_drawings } = res;
        await load_files(get_files);
        if (!valid()) return;
        await load_drawings(get_drawings);
    })();
    let [get_ops, get_mfgs, get_lots, get_samples, get_ncrs] = await all([
        job.part.get_ops(valid),
        job.part.get_mfgs(valid),
        job.get_lots(valid),
        job.get_samples(valid),
        job.get_ncrs(valid)
    ]);
    if (!valid()) return;
    load_ops(get_ops);
    load_lots(get_lots);
    load_ncrs(get_ncrs);
    let samples = load_samples(get_samples);
    let [get_holders, get_results, get_dims] = await all([
        do_holders ? all(samples.map(e => e.get_holders(valid))) : [],
        all(samples.map(e => e.get_results(valid))),
        job.part.get_dims(valid)
    ]);
    if (!valid()) return;
    await done_drawings;
    if (!valid()) return;
    load_mfgs(get_mfgs);
    load_dims(get_dims);
    if (do_holders) load_holders(get_holders.flat());
    load_results(get_results.flat());
    return valid();
}

const query_part = async (part, { do_drawings }, valid) => {
    part.ops = [];
    part.dims = [];
    part.drawings = [];
    part.mfgs = {
        mfg: {},
        fin: {},
        arr: []
    };
    let done_drawings;
    if (do_drawings) done_drawings = (async () => {
        let res = await part.get_drawings(valid);
        if (!valid()) return;
        let { get_files, get_drawings } = res;
        await load_files(get_files);
        if (!valid()) return;
        await load_drawings(get_drawings);
    })();

    let [get_ops, get_mfgs] = await all([
        part.get_ops(valid),
        part.get_mfgs(valid)
    ]);
    if (!valid()) return;
    load_ops(get_ops);
    let get_dims = await part.get_dims(valid);
    if (!valid()) return;
    await done_drawings;
    if (!valid()) return;
    load_mfgs(get_mfgs);
    load_dims(get_dims);
    return valid();
}

const query_daily = async (results, valid) => {
    
}

const load_companies = function (get_companies) {
    return get_companies.map(res => 
        models.company(res)
    )
}

const load_contacts = function (get_contacts) {
    return get_contacts.map(res => 
        models.contact(res)
    )
}

const load_parts = function (get_parts) {
    return get_parts.map(res => {
        let part = models.part(res);
        part.customer = model.company[res["CustomerGUID"]];
        return part;
    });
}

const load_jobs = function (get_jobs) {
    return get_jobs.map(res => {
        if (!model.part[res["PartGUID"]]) return;
        let job = models.job(res);
        let part = job.part = model.part[res["PartGUID"]];
        part.job = job;
        return job;
    });
}

const load_ops = function (get_ops) {
    return get_ops.map(res => {
        let op = models.op(res);
        let part = op.part = model.part[res["PartGUID"]];
        part?.ops.push(op);
        return op;
    });
}

const load_dims = function (get_dims) {
    return get_dims.map(res => {
        let dim = models.dim(res);
        let op = dim.op = model.op[res["ProcedureGUID"]];
        let mfg = dim.mfg = model.mfg[res["OperationGUID"]];
        let drawing = dim.drawing = model.drawing[res["DrawingGUID"]]
        let part = dim.part = mfg?.part;
        op?.dims.push(dim);
        mfg?.dims.push(dim);
        part?.dims.push(dim);
        drawing?.dims.push(dim);
        return dim;
    });
}

const load_mfgs = function (get_mfgs) {
    return get_mfgs.map(res => {
        let mfg = models.mfg(res);
        let part = mfg.part = model.part[res["PartGUID"]];
        if (part && (res["Title"] == "IN PROCESS" || res["Description"] == "IN PROCESS"))
            part.mfgs.mfg = mfg;
        if (part && res["Title"] == "FINISH")
            part.mfgs.fin = mfg;
        part?.mfgs.arr.push(mfg);
        return mfg;
    });
}

const load_files = function (get_files) {
    for (let res of get_files) {
        let file = models.file(res);
        let part = file.part = model.part[res["PartGUID"]];
        let result = file.result = model.result[res["ResultGUID"]];
        part?.files.push(file);
        result?.files.push(file);
    }

    return all(get_files.map(async res => {
        let file = model.file[res["GUID"]];
        if (res["ResultGUID"]) return file;
        let url = window.URL.createObjectURL(file.get["Blob"]);
        pdfjsLib.disableFontFace = true;
        let pdf = await pdfjsLib.getDocument({
            url, maxImageSize: 2147500037,
            disableFontFace: true
        }).promise;
        file.pdf = pdf;
        return file;
    }));
}

const load_drawings = function (get_drawings) {
    for (let res of get_drawings) {
        let drawing = models.drawing(res);
        let file = drawing.file = model.file[res["DrawingFile"]];
        let part = drawing.part = file.part;
        let mfg = drawing.mfg = model.mfg[res["OperationGUID"]];
        file?.drawings.push(drawing);
        part?.drawings.push(drawing);
        mfg?.drawings.push(drawing);
    }

    return all(get_drawings.map(async res => {
        let drawing = model.drawing[res["GUID"]];
        let canvas = $("<canvas>")[0];
        let page = await drawing.file.pdf.getPage(+drawing.get["PdfPageNo"]);
        let context = canvas.getContext('2d');
        let viewport = page.getViewport({ scale: 4 / 3 });
        drawing.width = canvas.width = viewport.width;
        drawing.height = canvas.height = viewport.height;
        try {
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        } catch (err) {
        }
        drawing.png = canvas.toDataURL("image/png");
        delete canvas;
        return drawing;
    }));
}

const load_lots = function (get_lots) {
    return get_lots.map(res => {
        let lot = models.lot(res);
        let job = lot.job = model.job[res["JobGUID"]];
        if (job && res["Number"].trim() == job.get["Number"].trim())
            job.lots.mfg = lot;
        if (job && res["Number"].includes("FPI"))
            job.lots.fpi = lot;
        job?.lots.arr.push(lot);
        return lot;
    });
}

const load_samples = function (get_samples) {
    return get_samples.map(res => {
        let sample = models.sample(res);
        let lot = sample.lot = model.lot[res["LotGUID"]];
        let job = sample.job = lot.job;
        lot?.samples.push(sample);
        job?.samples.push(sample);
        return sample;
    });
}

const load_ncrs = function (get_ncrs) {
    return get_ncrs.map(res => {
        let ncr = models.ncr(res);
        let job = ncr.job = model.job[res["JobGUID"]];
        job?.ncrs.push(ncr);
        return ncr;
    });
}

const load_holders = function (get_holders) {
    return get_holders.map(res => {
        let holder = models.holder(res);
        let sample = holder.sample = model.sample[res["SampleGUID"]];
        let dim = holder.dim = model.dim[res["DimGUID"]];
        let mfg = holder.mfg = dim?.mfg;
        let lot = holder.lot = sample?.lot;
        let job = holder.job = lot?.job;
        sample?.holders.push(holder);
        dim?.holders.push(holder);
        mfg?.holders.push(holder);
        lot?.holders.push(holder);
        job?.holders.push(holder);
        return holder;
    });
}

const load_results = function (get_results) {
    return get_results.map(res => {
        let result = models.result(res);
        let sample = result.sample = model.sample[res["SampleGUID"]];
        let dim = result.dim = model.dim[res["DimGUID"]];
        if (!dim) console.log(result);
        let mfg = result.mfg = dim.mfg;
        let lot = result.lot = sample.lot;
        let job = result.job = lot.job;
        let serial = model.ncr[res["ResNo"]] || model.ncr[res["Comment"]];
        if (serial) {
            result.serial = model.serial[res["ResNo"]] = serial;
            serial.result = result;
            res["MeasuredByGUID"] = serial.get["CreatedByGUID"];
            res["InspectedDate"] = serial.get["Number"];
        }
        result.inspector = model.contact[res["MeasuredByGUID"]];
        sample?.results.push(result);
        dim?.results.push(result);
        mfg?.results.push(result);
        lot?.results.push(result);
        job?.results.push(result);
        return result;
    });
}

const unload_results = function (results) {
    return results.map(result => {
        unload(result.sample?.results, result);
        unload(result.dim?.results, result);
        unload(result.mfg?.results, result);
        unload(result.lot?.results, result);
        unload(result.job?.results, result);
        delete model.result[result.get["GUID"]];
    });
}

const unload_files = function (files) {
    return files.map(file => {
        unload(file.result?.files, file);
        unload(file.part?.files, file);
        file.drawings.map(e => e.file = null);
        delete model.file[file.get["GUID"]];
    })
}

const await_file = async (input, valid) => {
    return await new Promise(resolve => {
        input.one("change", (e) => {
            resolve(valid() && e.target.files);
        }).trigger("click");
        setTimeout(() => $("body").one("click", () => {
            resolve("cancelled");
        }), 1000);
    });
}