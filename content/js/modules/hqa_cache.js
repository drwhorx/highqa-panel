const tree = (queries, final) => {
    return {
        queries: queries,
        final: final,
        token: null,
        promise: null,
        cancel: function () { this.token = null },
        run: function () {
            let group = this;
            var token = this.token = new Date();
            let init;
            for (let name in queries) {
                let query = queries[name];
                query.recur = async function () {
                    await init;
                    let res = {}; let out = {};
                    for (let name in this.parents)
                        res[name] = await this.parents[name].promise
                    if (token == group.token)
                        out = await query.run(res, () => token == group.token);
                    if (token == group.token)
                        return out;
                }
            }
            init = (async () => {
                for (let name in queries)
                    queries[name].promise = queries[name].recur();
            })();
            return this.promise = final.promise;
        }
    }
}

const filter = (source, arr) => arr.reduce((obj, key) => ({ ...obj, [key]: source[key] }), {});

let get_jobs = {
    run: async () => {
        return (await API("jobs/list").pages())["Jobs"];
    },
}
let get_parts = {
    run: async () => {
        return (await API("parts/list").pages())["Parts"];
    },
}
let get_ops = {
    run: async () => {
        return (await API("procedures/list").pages())["Procedures"];
    },
}
let get_companies = {
    run: async () => {
        return (await API("companies/list").pages())["Companies"];
    },
}
let get_contacts = {
    run: async () => {
        return (await API("contacts/list").pages())["Contacts"];
    },
}

let load_jobs = {
    parents: { get_jobs, get_parts, get_companies },
    run: ({ get_jobs, get_parts, get_companies }) => {
        for (let res of get_companies) {
            model.company[res["GUID"]] = models.company(res);
        }
        for (let res of get_parts) {
            let part = model.part[res["GUID"]] = models.part(res);
            part.customer = model.company[res["CustomerGUID"]];
        }
        for (let res of get_jobs) {
            if (!model.part[res["PartGUID"]] ||  res["Status"] != 1) continue;
            let job = model.job[res["GUID"]] = models.job(res);
            let part = job.part = model.part[res["PartGUID"]];
            part.job = job;
        }
        raw.jobs = Object.values(model.job);
        raw.parts = Object.values(model.part);
        raw.companies = Object.values(model.company);
        return model.job;
    },
}

let load_ops = {
    parents: { get_ops },
    run: ({ get_ops }) => {
        for (let res of get_ops)
            model.op[res["GUID"]] = models.op(res);
        raw.ops = Object.values(model.op);
        return model.op;
    },
}

const stage1 = tree({
    get_parts,
    get_jobs,
    get_ops,
    get_companies,
    get_contacts,
    load_jobs,
    load_ops
}, load_jobs);

let get_mfgs = {
    run: async () => {
        let query = API("operations/list");
        query.req["PartGUID"] = user.job.get["PartGUID"];
        return (await query.pages())["Operations"];
    },
}
let get_dims = {
    run: async () => {
        let query = API("dims/list");
        query.req["PartGUID"] = user.job.get["PartGUID"];
        return (await query.pages())["Dims"];
    },
}
let get_drawings = {
    run: async () => {
        let query = API("drawings/list");
        query.req["PartGUID"] = user.job.get["PartGUID"];
        return (await query.pages())["Drawings"];
    },
}

let load_files = {
    parents: { get_drawings },
    run: async ({ get_drawings }, valid) => {
        raw.drawings = get_drawings;
        let query1 = API("filestorage/token");
        let query2 = API("filestorage/download");
        let files = {};
        for (let res of get_drawings) {
            if (files[res["DrawingFile"]]) continue;
            query1.req["GUID"] = res["DrawingFile"];
            query2.req["Token"] = (await query1.send())["Token"];
            if (!valid()) return;
            let file = await query2.send();
            if (!valid()) return;
            files[res["DrawingFile"]] = file;
        }
        for (let file in files) {
            model.file[file] = models.file(files[file]);
        }
        for (let res of get_drawings) {
            let drawing = model.drawing[res["GUID"]] = models.drawing(res);
            let file = model.file[res["DrawingFile"]] = models.file(files[res["DrawingFile"]]);
            drawing.file = file;
            file.drawings.push(drawing);
        }
        raw.drawings = Object.values(model.drawing);
        raw.files = Object.values(model.file);
    },
}
let dim_ops = {
    parents: { get_dims, get_ops },
    run: async ({ get_dims }, valid) => {
        await Promise.all(get_dims.map(async dim => {
            let query = API("procedures/list");
            query.req["DimGUID"] = dim["GUID"];
            let op = (await query.send())["Procedures"][0]
            if (!valid() || !op) return;
            dim["ProcedureGUID"] = op["GUID"];
            model.op[op["GUID"]].get = op;
        }));
    },
}

let get_lots = {
    run: async (_, valid) => {
        let query = API("lots/list");
        query.req["JobGUID"] = user.job.get["GUID"];
        return (await query.pages(valid))["Lots"];
    },
}
let get_samples = {
    run: async (_, valid) => {
        let query = API("samples/list");
        query.req["JobGUID"] = user.job.get["GUID"];
        return (await query.pages(valid))["Samples"];
    },
}
let get_holders = {
    parents: { get_samples },
    run: async ({ get_samples }, valid) => {
        var size = 5;
        let length = mathjs.ceil(get_samples.length / size);
        let groups = Array.from({ length }, (_, i) => get_samples.slice(i * size, i * size + size));
        let res = await Promise.all(groups.map(async group => {
            if (group.length == 0) return [];
            let query = API("placeholders/list");
            query.req["SampleGUIDs"] = group.map(res => res["GUID"]).join(",");
            return (await query.pages())["Placeholders"];
        }));
        return res.flat();
    },
}
let get_results = {
    run: async (_, valid) => {
        let query = API("results/list");
        query.req["JobGUID"] = user.job.get["GUID"];
        for (let i = 1; i <= 4; i++) {
            query.req["Status"] = i;
            await query.pages(valid);
        }
        return query.res["Results"];
    },
}

const stage2 = tree({
    get_mfgs,
    get_dims,
    get_drawings,
    load_files,
    dim_ops,
    get_lots,
    get_samples,
    get_holders,
    get_results
}, load_ops);

let load_job = {
    parents: {
        get_mfgs, get_dims, dim_ops,
        get_lots, get_samples, get_holders, get_results, get_contacts
    },
    run: async ({
        get_mfgs, get_dims, dim_ops,
        get_lots, get_samples, get_holders, get_results, get_contacts
    }) => {
        model.contact = {};
        model.mfg = {};
        model.dim = {};
        model.lot = {};
        model.sample = {};
        model.holder = {};
        model.result = {};

        for (let op of raw.ops) {
            op.dims = [];
        }

        for (let res of get_contacts) {
            model.contact[res["GUID"]] = models.contact(res);
        }

        let part = user.job.part;
        part.job = user.job;

        for (let res of get_mfgs) {
            let mfg = model.mfg[res["GUID"]] = models.mfg(res);
            mfg.part = part;
            if (res["Title"].trim() == "IN PROCESS")
                part.mfgs.mfg = mfg;
            if (res["Title"].trim() == "FINISH")
                part.mfgs.fin = mfg;
        }

        for (let res of get_dims) {
            let dim = model.dim[res["GUID"]] = models.dim(res);
            let op = dim.op = model.op[res["ProcedureGUID"]];
            let mfg = dim.mfg = model.mfg[res["OperationGUID"]];
            if (op) op.dims.push(dim);
            if (mfg) mfg.dims.push(dim);
            dim.part = part;
        }

        for (let res of get_lots) {
            let lot = model.lot[res["GUID"]] = models.lot(res);
            lot.job = user.job;
            if (res["Number"].trim() == user.job.get["Number"].trim())
                user.job.lots.mfg = lot;
            if (res["Number"].includes("FPI"))
                user.job.lots.fpi = lot;
        }

        for (let res of get_samples) {
            let sample = model.sample[res["GUID"]] = models.sample(res);
            let lot = sample.lot = model.lot[res["LotGUID"]];
            lot.samples.push(sample);
        }

        for (let res of get_holders) {
            let holder = model.holder[res["GUID"]] = models.holder(res);
            let sample = holder.sample = model.sample[res["SampleGUID"]];
            let dim = holder.dim = model.dim[res["DimGUID"]];
            let mfg = holder.mfg = dim.mfg;
            let lot = holder.lot = sample.lot;
            sample.holders.push(holder);
            dim.holders.push(holder);
            mfg.holders.push(holder);
            lot.holders.push(holder);
        }

        for (let res of get_results) {
            let result = model.result[res["GUID"]] = models.result(res);
            let sample = result.sample = model.sample[res["SampleGUID"]];
            let dim = result.dim = model.dim[res["DimGUID"]];
            let mfg = result.mfg = dim.mfg;
            let lot = result.lot = sample.lot;
            result.inspector = model.contact[res["MeasuredByGUID"]];
            sample.results.push(result);
            dim.results.push(result);
            mfg.results.push(result);
            lot.results.push(result);
        }

        raw.mfgs = Object.values(model.mfg);
        raw.dims = Object.values(model.dim);
        raw.lots = Object.values(model.lot);
        raw.samples = Object.values(model.sample);
        raw.holders = Object.values(model.holder);
        raw.results = Object.values(model.result);

        return raw;
    }
}

const stage3 = tree({
    load_job
}, load_job);