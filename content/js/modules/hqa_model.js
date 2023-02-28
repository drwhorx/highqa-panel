const user = {
    job: {},
    op: {}
}

const raw = Object.values

const model = {
    contact: {},
    company: {},

    job: {},
    part: {},
    mfg: {},
    op: {},
    dim: {},
    drawing: {},
    file: {},
    lot: {},
    sample: {},
    holder: {},
    result: {},
    ncr: {},
    serial: {},

    load: (model, init) => {
        return model[init.get["GUID"] || init["GlobalID"]] = init;
    }
}

const remove = function (source, arr) {
    return source.filter(e => !arr.includes(e));
}

const models = {
    contact: (init) => model.load(model.contact, {
        get: init,
    }),
    company: (init) => model.load(model.company, {
        get: init,
    }),

    job: (init) => model.load(model.job, {
        get: init,

        part: {},
        lots: {
            fpi: {},
            mfg: {},
            arr: []
        },
        samples: [],
        holders: [],
        results: [],
        ncrs: [],

        customer: {},

        get_lots: async (valid) => {
            let query = API("lots/list");
            query.req["JobGUID"] = init["GUID"];
            return (await query.pages(valid))["Lots"];
        },
        get_samples: async (valid) => {
            let query = API("samples/list");
            query.req["JobGUID"] = init["GUID"];
            return (await query.pages(valid))["Samples"];
        },
        get_results: async (valid) => {
            return (await all([1, 2, 3, 4].map(async num => {
                let query = API("results/list");
                query.req["Status"] = num;
                query.req["JobGUID"] = init["GUID"];
                return (await query.pages(valid))["Results"];
            }))).flat();
        },
        get_holders: async (samples, valid) => {
            let query = API("placeholders/list");
            query.req["SampleGUIDs"] = samples.map(e => e.get["GUID"]).join(",");
            return (await query.pages(valid))["Placeholders"];
        },
        get_ncrs: async (valid) => {
            let query = API("ncr/list");
            query.req["JobGUID"] = init["GUID"];
            return (await query.pages(valid))["NCRs"];
        }
    }),
    part: (init) => model.load(model.part, {
        get: init,
        job: null,

        mfgs: {
            mfg: {},
            fin: {},
            arr: [],
        },
        ops: [],
        dims: [],
        files: [],
        drawings: [],

        customer: {},

        get_ops: async (valid) => {
            let query = API("procedures/list");
            query.req["PartGUID"] = init["GUID"];
            let ops = (await query.pages(valid))["Procedures"];
            ops.forEach(e => e["PartGUID"] = init["GUID"]);
            return ops;
        },
        get_dims: async (valid) => {
            let query = API("dims/list");
            query.req["PartGUID"] = init["GUID"];
            let dims = (await query.pages(valid))["Dims"];
            return valid() && all(dims.map(async res => {
                let query = API("procedures/list");
                query.req["DimGUID"] = res["GUID"];
                query.req["PageSize"] = 1;
                let op = (await query.send())["Procedures"][0];
                if (op) res["ProcedureGUID"] = op["GUID"];
                return res;
            }))
        },
        get_mfgs: async (valid) => {
            let query = API("operations/list");
            query.req["PartGUID"] = init["GUID"];
            return (await query.pages(valid))["Operations"];
        },
        get_drawings: async (valid) => {
            let query = API("drawings/list");
            query.req["PartGUID"] = init["GUID"];
            let get_drawings = (await query.pages(valid))["Drawings"];
            get_drawings.forEach(e => e["PartGUID"] = init["GUID"]);
            if (!valid()) return;
            let drawings = get_drawings
                .filter(a => a == get_drawings.find(b => a["DrawingFile"] == b["DrawingFile"]))
            let get_files = await all(drawings.map(async drawing => {
                let query1 = API("filestorage/token");
                let query2 = API("filestorage/download");
                query1.req["GUID"] = drawing["DrawingFile"];
                query2.req["Token"] = (await query1.send())["Token"];
                if (!valid()) return;
                let res = await query2.send();
                if (!valid()) return;
                return valid() && {
                    "PartGUID": drawing["PartGUID"],
                    "GUID": drawing["DrawingFile"],
                    "Blob": res
                }
            }));
            return valid() && { get_drawings, get_files };
        }
    }),
    mfg: (init) => model.load(model.mfg, {
        get: init,
        part: {},

        drawings: [],
        dims: [],
        holders: [],
        results: []
    }),
    op: (init) => model.load(model.op, {
        get: init,
        part: {},

        dims: []
    }),
    dim: (init) => model.load(model.dim, {
        get: init,
        part: {},
        mfg: {},

        holders: [],
        results: [],

        op: {},

        get_holders: async (valid) => {
            let query = API("placeholders/list");
            query.req["DimGUIDs"] = init["GUID"];
            return (await query.pages(valid))["Placeholders"];
        },

        get_status: (sample) => {
            let dim = model.dim[init["GUID"]];
            let fail = dim.results.find(e => (e.sample == sample || !sample) && e.get["Status"] == 2);
            let done = dim.results.find(e => e.sample == sample || !sample);
            let insp = dim.holders.find(e => e.sample == sample || !sample);
            return fail ? "fail" : (done ? "done" : (insp ? "insp" : null));
        },

        get_result: (sample) => {
            let dim = model.dim[init["GUID"]];
            let fail = dim.results.find(e => e.sample == sample && e.get["Status"] == 2);
            let done = dim.results.find(e => e.sample == sample);
            return sample && (fail || done);
        },

        get_results: (sample) => {
            let dim = model.dim[init["GUID"]];
            return dim.results.filter(e => e.sample == sample);
        },

        places: () => {
            return mathjs.max($.places(init["UpperTol"]), $.places(init["LowerTol"]), $.places(init["Nominal"]));
        },

        is_gdt: () => {
            return [30, 29, 28, 27, 26, 23, 21, 20, 14, 13, 11, 8, 7, 6, 2].includes(init["Type"])
        },

        convert: function (units) {
            if (this.get["TypeText"] == "Surface Finish")
                return {
                    1: { 2: 1 / 0.0254 },
                    2: { 1: 0.0254 },
                }[this.get["Units"]][units] || 1;
            else
                return {
                    1: { 2: 1 / 25.4 },
                    2: { 1: 25.4 },
                    3: { 4: 3.14 / 180 },
                    4: { 3: 180 / 3.14 },
                }[this.get["Units"]][units] || 1;
        }
    }),
    drawing: (init) => model.load(model.drawing, {
        get: init,
        part: {},
        file: {},

        dims: [],
        get_blob: async (valid) => {
            let query1 = API("filestorage/token");
            let query2 = API("filestorage/download");
            query1.req["GUID"] = file["GUID"];
            query2.req["Token"] = (await query1.send())["Token"];
            if (!valid()) return;
            let res = await query2.send();
            return valid() && res;
        },
        draw_svg: (svg, dims) => {
            let drawing = model.drawing[init["GUID"]];
            if (!dims) dims = drawing.dims;

            svg.attr("viewBox", "0 0 " + drawing.width + " " + drawing.height);
            svg.$("image").attr("href", drawing.png);
            svg.prop("model", drawing);

            for (let dim of dims) {
                let dupe = svg.$(".copy.dim").dupe();
                dupe.prop("model", dim);
                let coords = dim.get["ShapeCenter"].split(",");
                let size = dim.get["ShapePoints"].split(",");
                dupe.attr({
                    x: coords[0],
                    y: coords[1],
                    width: size[0],
                    height: size[1]
                }).css({
                    transform: `rotateZ(${360 - dim.get["ShapeRotateAngle"]}deg)`
                });
                dupe.$(".balloon").text(dim.get["DimNo"]);
                svg.append(dupe);
            }
        }
    }),
    file: (init) => model.load(model.file, {
        get: init,
        part: {},

        drawings: []
    }),
    lot: (init) => model.load(model.lot, {
        get: init,
        job: {},

        samples: [],
        holders: [],
        results: []
    }),
    sample: (init) => model.load(model.sample, {
        get: init,
        lot: {},

        holders: [],
        results: [],

        get_holders: async (valid) => {
            let query = API("placeholders/list");
            query.req["SampleGUIDs"] = init["GUID"];
            return (await query.pages(valid))["Placeholders"];
        },
        get_results: async (valid) => {
            return (await all([1, 2, 3, 4].map(async num => {
                let query = API("results/list");
                query.req["Status"] = num;
                query.req["SampleGUID"] = init["GUID"];
                return (await query.pages(valid))["Results"];
            }))).flat();
        }
    }),
    holder: (init) => model.load(model.holder, {
        get: init,
        mfg: {},
        dim: {},
        lot: {},
        sample: {},
    }),
    result: (init) => model.load(model.result, {
        get: init,
        mfg: {},
        dim: {},
        lot: {},
        sample: {},
        files: [],
        serial: null,
        data: {},

        inspector: {},

        get_files: async (valid) => {
            let query = API("results/getattachments");
            query.req["ResultGUID"] = init["GUID"];
            let files = (await query.pages())["Files"];
            if (!valid()) return;

            let res = await all(files.map(async file => {
                let query1 = API("filestorage/token");
                let query2 = API("filestorage/download");
                query1.req["GUID"] = file["GUID"];
                query2.req["Token"] = (await query1.send())["Token"];
                if (!valid()) return;
                let res = await query2.send();
                if (!valid()) return;
                return valid() && {
                    "PartGUID": init["PartGUID"],
                    "ResultGUID": init["GUID"],
                    "GUID": file["GUID"],
                    "Name": file["Name"],
                    "Blob": res
                }
            }));
            return valid() && res;
        }
    }),
    ncr: (init) => model.load(model.ncr, {
        get: init
    })
}

const types = {
    Dim: {
        0: "Unknown",
        1: "Angular",
        2: "Angularity",
        3: "Bilateral X",
        4: "Bilateral Y",
        5: "Bilateral Z",
        6: "Circularity",
        7: "Circular Runout",
        8: "Concentricity",
        9: "Coordinate",
        10: "CS Dist",
        11: "Cylindricity",
        12: "Diameter",
        13: "Flatness",
        14: "Line Profile",
        15: "Linear",
        16: "Width",
        17: "General",
        18: "Square",
        19: "Note",
        20: "Parallelism",
        21: "Perpendicularity",
        22: "Point",
        23: "Point Profile",
        24: "Polar",
        25: "Radial",
        26: "Straightness",
        27: "Surface Profile",
        28: "Symmetry",
        29: "Total Runout",
        30: "True Position",
        31: "Polar Angular",
        32: "Polar Radial",
        33: "Depth",
        34: "Chamfer",
        35: "Thread",
        36: "Surface Finish",
        37: "Welding",
        38: "Counterbore",
        39: "Countersink",
        40: "Fastener",
        41: "Flag Note",
        42: "Custom Bilateral",
        43: "Custom Pass/Fail",
        44: "Spherical Diameter",
        45: "Spherical Radius",
        46: "Edge",
        48: "Arc Length",
        49: "Conical Taper",
        50: "Slope",
        51: "Spotface"
    },
    DimTol: {
        0: "General",
        1: "Tolerance",
        2: "As Limit",
        3: "Basic",
        4: "Reference",
        5: "MIN",
        6: "MAX",
        7: "Tol Class",
    },
    Units: {
        1: "MM",
        2: "IN",
        3: "DEG",
        4: "RAD"
    },
    XDFX_Holder: () => ({
        "ActualAxis": "",
        "ActualBonus": "0.00000000",
        "ActualCode": "2",
        "ActualComment": "",
        "ActualContactID": "0",
        "ActualCp": "0.00000000",
        "ActualCpk": "0.00000000",
        "ActualData": "0.00000000",
        "ActualDataPrec": "3",
        "ActualDeviation": "0.00000000",
        "ActualDeviationExist": "0",
        "ActualDimID": "0",
        "ActualError": "0.00000000",
        "ActualExport": "0",
        "ActualFailedCount": "0",
        "ActualFeature1": "",
        "ActualFeature2": "",
        "ActualFiles": "0",
        "ActualGroup": "137993",
        "ActualInspectDate": null,
        "ActualInstanceID": "0",
        "ActualInventoryID": "0",
        "ActualIsPrimary": "1",
        "ActualIsValid": "0",
        "ActualLowerTol": "3.07300000",
        "ActualLowerTol1": "0.00000000",
        "ActualLowerTolExist": "0",
        "ActualLowerTolValid": "1",
        "ActualMachineID": "0",
        "ActualMeas": "",
        "ActualNominal": "0.00000000",
        "ActualNominalExist": "0",
        "ActualNominalValid": "1",
        "ActualNonConfAttachContactID": "0",
        "ActualNonConfAttachDate": null,
        "ActualNonConformanceID": "0",
        "ActualNotified": "0",
        "ActualNum": "0",
        "ActualOperationID": "0",
        "ActualOutTolExist": "0",
        "ActualPartInstanceID": "0",
        "ActualPp": "0.00000000",
        "ActualPpk": "0.00000000",
        "ActualRange": "0.00000000",
        "ActualResult": "0",
        "ActualReviewed": "0",
        "ActualSPCDataID": "0",
        "ActualSort": "",
        "ActualSource": "1",
        "ActualStatus": "",
        "ActualText": "",
        "ActualTolPrec": "3",
        "ActualType": "12",
        "ActualTypeExist": "0",
        "ActualUnits": "0",
        "ActualUpperTol": "3.07500000",
        "ActualUpperTol1": "0.00000000",
        "ActualUpperTolExist": "0",
        "ActualUpperTolValid": "1",
        "GlobalID": "",
        "ID": "",
        "__GlobalID_ActualContactID": "",
        "__GlobalID_ActualDimID": "",
        "__GlobalID_ActualInstanceID": "",
        "__GlobalID_ActualInventoryID": "",
        "__GlobalID_ActualMachineID": "",
        "__GlobalID_ActualNonConfAttachContactID": "",
        "__GlobalID_ActualNonConformanceID": "",
        "__GlobalID_ActualOperationID": "",
        "__GlobalID_ActualPartInstanceID": "",
        "__GlobalID_ActualSPCDataID": "",
    })
}