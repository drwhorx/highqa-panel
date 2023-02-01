$(window).on("load", () => {
    var menu = ui.menu;
    var depts = menu.depts;

    ui.qual = menu.$("> .qual").ext((qual) => ({
        nav: () => qual.actions.open(),
        card: qual.$("> .tile > .card").ext((card) => ({
            tile: card.closest(".tile")
        })).nav(() => qual.nav ? qual.nav() : null),
        tile: qual.$("> .tile").ext((tile) => ({

        })),
        actions: qual.$("> .actions").ext((actions) => ({
            cards: actions.$(".action > .card"),
            open: async function () {
                loading(true);
                qual.nav = null;
                let hide = depts.tiles.not(qual.tile);

                await hide.fadeout();
                await all([
                    menu.gap(0),
                    hide.width(0),
                    qual.gap("15vh"),
                    qual.tile.width("40vh"),
                ]);

                qual.nav = actions.close;
                (async () => {
                    let res = await actions.load();
                    if (res == "cancelled") return;
                    qual.nav = null;

                    loading(false);
                    await actions.fadein();
                    hide.hide();
                    qual.nav = actions.close;
                })();
            },
            query: task(async (valid) => {
                await query_basic(valid);
                return valid();
            }),
            load: async function () {
                return await actions.query.run();
            },
            close: async function () {
                actions.query.cancel();
                loading(true);
                qual.nav = null;
                let show = depts.tiles.not(qual.tile);

                await actions.fadeout();
                actions.hide();
                show.show();
                await all([
                    qual.gap(0),
                    show.width("40vh"),
                    menu.gap("15vh"),
                    qual.tile.width("40vh")
                ]);

                loading(false);
                await show.fadein();
                qual.nav = actions.open;
            },
        })),

        jobs: qual.$("> .jobs").ext((jobs) => ({
            grid: jobs.$(".grid").grid().ext((grid) => ({
                copy: grid.copy.nav(async function () {
                    return await qual.spc.open(this);
                })
            })),
            open: async function () {
                loading(true);
                qual.nav = null;

                await qual.actions.fadeout();
                qual.actions.hide();
                await all([
                    qual.gap("5vh"),
                    qual.tile.width("30vh"),
                ]);

                jobs.load();
                loading(false);
                await jobs.fadein();
                qual.nav = jobs.close;
            },
            load: function () {
                let grid = jobs.grid;
                grid.$("input").val(null);

                grid.rows().remove();
                let sorted = raw(model.job)
                    .filter(e => e.get["PartDeleted"] == 0 && e.get["Status"] == 1)
                    .sort((a, b) => b.get["Number"].replace("22J", "")
                        .localeCompare(a.get["Number"].replace("22J", "")))

                for (let job of sorted) {
                    let part = job.part;
                    let customer = part.customer;
                    let row = grid.copy.dupe();
                    row.$(".jobNo").span(job.get["Number"])
                        .prop("model", job);
                    row.$(".partNo").span(part.get["PartNumber"])
                        .prop("model", part);
                    row.$(".customer").span(customer.get["Name"])
                        .prop("model", customer);
                    row.$(".partName").span(part.get["PartName"])
                        .prop("model", part);
                    row.prop("model", job);
                    grid.append(row);
                }
            },
            close: async function () {
                loading(true);
                qual.nav = null;

                await jobs.fadeout();
                jobs.hide();
                await all([
                    qual.gap("15vh"),
                    qual.tile.width("40vh")
                ]);

                loading(false);
                await qual.actions.fadein();
                qual.nav = qual.actions.close;
            }
        })),

        spc: qual.$("> .spc").ext((spc) => ({
            card: qual.$(".action.spc")
                .nav(async () => await qual.jobs.open()),
            title: spc.$("> .title"),
            loading: spc.$(".loading"),
            groups: spc.$("> .groups").ext((groups) => ({
                copy: groups.$(".group.copy").ext((group) => ({
                    title: group.$("> .title"),
                    row: group.$(".row.copy").ext((row) => ({
                        cell: row.$(".cell.copy").ext((cell) => ({
                            dimReq: cell.$(".dimReq"),
                            svg: cell.$("svg")
                        })).nav(async function () {
                            await ui.prompts.spc.load($(this).prop("model"));
                        })
                    }))
                }))
            })),
            open: async function (row) {
                loading(true);
                qual.nav = null;

                await qual.jobs.fadeout();
                qual.jobs.hide();
                await all([
                    qual.gap("5vh"),
                    qual.tile.width("30vh"),
                ]);

                user.job = $(row).prop("model");
                spc.title.text("SPC: " + user.job.get["Number"]);
                spc.groups.$(".clone").remove();
                spc.loading.hide();
                await spc.fadein();
                loading(false);
                spc.loading.fadein();

                qual.nav = spc.close;
                (async () => {
                    let res = await spc.query.run();
                    if (res == "cancelled") return;

                    qual.nav = null;
                    await spc.loading.fadeout();
                    spc.loading.hide();
                    spc.load();
                    qual.nav = spc.close;
                })();
            },
            query: task(async (valid) => {
                await all([
                    query_job(user.job, { do_drawings: true }, valid)
                ]);
                return valid();
            }),
            load: async function () {
                let ops = user.job.part.ops
                    .filter(o => o.dims.find(d => d.results.length > 0))
                    .sort((a, b) => a.get["Code"].replace(/\D+/g, '')
                        - b.get["Code"].replace(/\D+/g, ''));
                for (let op of ops) {
                    let group = spc.groups.copy.dupe();
                    group.title.text(op.get["Code"] + " - " + op.get["Title"]);
                    let dims = op.dims.filter(e => e.results.length > 0)
                        .sort((a, b) => a.get["DimSort"].localeCompare(b.get["DimSort"]));
                    let row;
                    for (let i in dims) {
                        if (i % 3 == 0) {
                            row = group.row.dupe();
                            group.append(row);
                        }
                        let dim = dims[i];
                        let cell = row.cell.dupe();
                        cell.prop("model", dim);
                        cell.dimReq.text(dim.get["DimNo"] + ": " + dim.get["Requirement"]);
                        row.append(cell);
                    }
                    group.hide();
                    spc.groups.append(group);
                }
                await all(spc.$(".group").map(async function () {
                    await $(this).fadein();
                }).get());
                spc.$(".cell").each(function () {
                    draw_spc($(this).prop("model"), $(this).$("svg"), $(null), $(null), $(null), {
                        no_hover: true, scale: 2
                    });
                });
            },
            close: async function () {
                spc.query.cancel();
                loading(true);
                qual.nav = null;

                await qual.spc.fadeout();
                qual.spc.hide();

                loading(false);
                await qual.jobs.fadein();
                qual.nav = qual.jobs.close;
            }
        })),
        daily: qual.$("> .daily").ext((daily) => ({
            card: qual.$(".action.daily")
                .nav(async () => await daily.open()),
            date: daily.$("> .date").ext((date) => ({
                back: date.$("> .back").click(async () => {
                    loading(true);
                    daily.query.cancel();
                    user.date.setDate(user.date.getDate() - 1);
                    daily.date.current.text($.format.date(user.date, "ddd, MMMM D, yyyy"));
                    await daily.results.fadeout();
                    daily.results.hide();

                    let res = await daily.query.run();
                    if (res == "cancelled") return;

                    daily.load();
                    loading(false);
                    daily.results.show();
                    await daily.results.fadein();
                }),
                next: date.$("> .next").click(async () => {
                    loading(true);
                    daily.query.cancel();
                    user.date.setDate(user.date.getDate() + 1);
                    daily.date.current.text($.format.date(user.date, "ddd, MMMM D, yyyy"));
                    await daily.results.fadeout();

                    let res = await daily.query.run();
                    if (res == "cancelled") return;

                    daily.load();
                    loading(false);
                    await daily.results.fadein();
                }),
                current: date.$("> .current")
            })),
            results: daily.$("> .results").ext((results) => ({
                scroll: results.$("> .scroll"),
                copy: results.$(".group.copy").ext((group) => ({
                    grid: group.$(".grid").grid().ext((grid) => ({
                        dim: grid.$(".cell.dim").nav(async function () {
                            ui.prompts.spc.load($(this).prop("model"))
                        })
                    }))
                }))
            })),
            open: async function () {
                let actions = qual.actions;
                loading(true);
                qual.nav = null;

                await actions.fadeout();
                actions.hide();
                await all([
                    qual.card.tile.width("30vh"),
                    qual.gap("5vh")
                ]);
                user.date = new Date();
                user.date.setHours(0, 0, 0, 0);
                daily.date.current.text($.format.date(user.date, "ddd, MMMM D, yyyy"));
                daily.results.hide();
                await daily.fadein();

                qual.nav = daily.close;
                (async () => {
                    let res = await daily.query.run();
                    if (res == "cancelled") return;
                    daily.load();
                    qual.nav = null;
    
                    loading(false);
                    await daily.results.fadein();
                    qual.nav = daily.close;
                })();
            },
            query: task(async function (valid) {
                await timeout(2000);
                if (!valid()) return;
                model.result = {};
                let res = (await all([
                    all([1, 2, 3, 4].map(async (num) => {
                        let query = API("results/list");
                        let next = new Date(user.date);
                        next.setDate(user.date.getDate() + 1);
                        query.req["Status"] = num;
                        query.req["InspectedDateFrom"] = user.date.toHighQADate();
                        query.req["InspectedDateTo"] = next.toHighQADate();
                        let res = (await query.pages(valid))["Results"];
                        return res.map(e => e["JobGUID"]);
                    })),
                    (async () => {
                        let query = API("ncr/list");
                        let next = new Date(user.date);
                        next.setDate(user.date.getDate() + 1);
                        query.req["CreationDateFrom"] = user.date.toHighQADate();
                        query.req["CreationDateTo"] = next.toHighQADate();
                        let ncrs = (await query.pages(valid))["NCRs"];
                        if (!valid()) return;
                        return all(ncrs
                            .filter(a => a == ncrs.find(b => a["JobGUID"] == b["JobGUID"]))
                            .map(async e =>
                                (await model.job[e["JobGUID"]].get_results(valid))
                                    .filter(a => ncrs.find(b => a["ResNo"] == b["GUID"])
                            )));
                    })()
                ])).flat(2)
                    .filter((a, i, self) => a == self.find(b => a["GUID"] == b["GUID"]));
                if (!valid()) return;

                let dims = await all(res
                    .filter(a => a == res.find(b => a["DimGUID"] == b["DimGUID"]))
                    .map(async e => {
                        let query = API("dims/list");
                        query.req["DimGUIDs"] = e["DimGUID"];
                        return (await query.send())["Dims"][0];
                    }));
                if (!valid()) return;

                let drawings = await all(dims
                    .filter(a => a == dims.find(b => a["DrawingGUID"] == b["DrawingGUID"]))
                    .map(async e => {
                        let query = API("drawings/list");
                        query.req["DrawingGUIDs"] = e["DrawingGUID"];
                        return (await query.send())["Drawings"][0];
                    }));
                if (!valid()) return;

                let files = await all(drawings
                    .filter(a => a == drawings.find(b => a["DrawingFile"] == b["DrawingFile"]))
                    .map(async e => {
                        model.part[e["PartGUID"]].drawings = [];
                        model.part[e["PartGUID"]].files = [];

                        let query1 = API("filestorage/token");
                        let query2 = API("filestorage/download");
                        query1.req["GUID"] = e["DrawingFile"];
                        query2.req["Token"] = (await query1.send())["Token"];
                        if (!valid()) return;
                        let res = await query2.send();
                        if (!valid()) return;
                        return valid() && {
                            "PartGUID": e["PartGUID"],
                            "GUID": e["DrawingFile"],
                            "Blob": res
                        }
                    }));
                if (!valid()) return;

                await load_files(files);
                if (!valid()) return;
                await load_drawings(drawings);
                if (!valid()) return;
                
                await all(res
                    .filter(a => a == res.find(b => a["JobGUID"] == b["JobGUID"]))
                    .map(async e => {
                        let job = model.job[e["JobGUID"]];
                        job.part.ops = [];
                        job.part.dims = [];
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
                        let [get_ops, get_mfgs, get_lots, get_samples, get_ncrs, get_results] = await all([
                            job.part.get_ops(valid),
                            job.part.get_mfgs(valid),
                            job.get_lots(valid),
                            job.get_samples(valid),
                            job.get_ncrs(valid),
                            job.get_results(valid)
                        ]);
                        if (!valid()) return;
                        load_ops(get_ops);
                        load_mfgs(get_mfgs);
                        load_lots(get_lots);
                        load_ncrs(get_ncrs);
                        load_samples(get_samples);

                        let get_dims = await job.part.get_dims(valid);
                        if (!valid()) return;
                        load_dims(get_dims);
                        load_results(get_results);
                    }));
            }),
            load: function () {
                daily.results.$(".clone").remove();
                let results = raw(model.result)
                    .filter(e => new Date(e.get["InspectedDate"]).setHours(0, 0, 0, 0) == +user.date);
                let ops = results.map(e => e.dim.get["ProcedureGUID"])
                    .filter((e, i, self) => self.indexOf(e) == i)
                    .map(e => model.op[e]);
                for (let op of ops) {
                    let group = daily.results.copy.dupe();
                    let job = op.part.job;
                    let data = results.filter(e => e.dim.op == op)
                        .sort((a, b) => a.sample.get["SerialNumber"].match(/\d+/)[0] - b.sample.get["SerialNumber"].match(/\d+/)[0] ||
                            a.dim.get["DimSort"].localeCompare(b.dim.get["DimSort"]));
                    group.prop("model", op);
                    group.$(".jobNo").text(job.get["Number"]);
                    group.$(".partNo").text(job.part.get["PartNumber"]);
                    group.$(".opNo").text(op.get["Code"]);
                    group.$(".opName").text(op.get["Title"]);
                    for (let result of data) {
                        let row = group.grid.copy.dupe();
                        row.prop("model", result);
                        row.$(".cell.dim").prop("model", result.dim);
                        row.$(".dimNo").span(result.dim.get["DimNo"]);
                        row.$(".dimReq").span(result.dim.get["Requirement"]);
                        row.$(".sample").span(result.sample.get["SerialNumber"]);
                        row.$(".operator").span(result.inspector?
                            result.inspector.get["FirstName"] + " " + result.inspector.get["LastName"] : ""
                        );
                        row.$(".status").span(result.get["StatusText"]);
                        group.grid.append(row);
                    }
                    daily.results.scroll.append(group);
                }
                return true;
            },
            close: async function () {
                let actions = qual.actions;
                daily.query.cancel();
                loading(true);
                qual.nav = null;

                await daily.fadeout();
                daily.hide();
                await all([
                    qual.card.tile.width("40vh"),
                    qual.gap("15vh")
                ]);

                loading(false);
                await actions.fadein();
                qual.nav = actions.close;
            }
        }))
    }));
});