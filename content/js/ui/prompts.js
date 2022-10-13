const all = Promise.all.bind(Promise);
const ui = {};

$(window).on("load", () => {
    ui.title = $("#title").ext((title) => ({
        name: title.$(".name")
    }))
    ui.menu = $("#console").ext((menu) => ({
        depts: menu.$("> .section").ext((depts) => ({
            tiles: depts.$("> .tile")
        })),
    }));
    var menu = ui.menu;
    var depts = menu.depts;

    ui.jobs = menu.$("> .jobs").ext((jobs) => ({
        grid: jobs.$(".grid").grid().ext((grid) => ({
            copy: grid.copy.click(function () {
                return shop.ops.open(this);
            })
        })),
    }));
    ui.engi = menu.$("> .engi").ext((engi) => ({
        tile: engi.$("> .tile"),
        actions: engi.$("> .actions").ext((actions) => ({

        }))
    }));
    ui.shop = menu.$("> .shop").ext((shop) => ({
        tile: shop.$("> .tile").extend({

        }),

        card: shop.$("> .tile > .card").ext((card) => ({

        })).nav(() => shop.jobs.open()),

        info1: shop.$("> .tile > .info1").ext((info1) => ({
            pdf: info1.$("img.pdf").ext((pdf) => ({
                div: info1.$("div.pdf"),
                loading: info1.$(".loading"),
                load: async function () {
                    pdf.div.hide();
                    pdf.loading.fadein();

                    let res = await load_files.promise;
                    if (!res) return;

                    let drawings = raw.drawings.sort((a, b) =>
                        a.get["Title"].localeCompare(b.get["Title"])
                        || a.get["PdfPageNo"] - b.get["PdfPageNo"]);

                    let imgs = drawings.map((drawing, i) => {
                        let img = pdf.dupe();
                        img.attr("src", drawing.png);
                        img.attr("tab-index", i);
                        return img;
                    });

                    for (let img of imgs) {
                        img.div.append(img);
                    }
                    await pdf.loading.fadeout();
                    pdf.loading.hide();
                    pdf.div.fadein();
                }
            })),
            jobNo: info1.$(".jobNo"),
            partNo: info1.$(".partNo")
        })),

        info2: shop.$("> .tile > .info2").ext((info2) => ({
            jobNo: info2.$(".jobNo"),
            partNo: info2.$(".partNo"),
            opNo: info2.$(".opNo"),
            opName: info2.$(".opName"),
            reload: info2.$(".reload").nav(() => {
                shop.planner.reload();
            })
        })),

        jobs: shop.$("> .jobs").ext((jobs) => ({
            grid: jobs.$(".grid").grid().ext((grid) => ({
                copy: grid.copy.nav(async function () {
                    return await shop.ops.open(this);
                })
            })),
            open: async function () {
                loading(true);
                shop.card.nav();
                let hide = depts.tiles.not(shop.tile);

                await hide.fadeout();
                await all([
                    menu.gap(0),
                    hide.width(0),
                    shop.gap("5vh"),
                    shop.tile.width("30vh"),
                ]);

                shop.card.nav(jobs.close);
                let res = await jobs.load();
                if (!res) return;
                shop.card.nav();

                loading(false);
                await jobs.fadein();
                hide.hide();
                shop.card.nav(jobs.close);
            },
            load: async function () {
                let grid = jobs.grid;

                let res = await stage1.run();
                if (!res) return console.log("canceled");
                grid.rows().remove();
                let sorted = raw.jobs
                    .sort((a, b) => b.get["Number"].replace("22J", "")
                        .localeCompare(a.get["Number"].replace("22J", "")))

                for (let job of sorted) {
                    let part = job.part;
                    let customer = part.customer;
                    let row = dupe(grid.copy);
                    row.$(".jobNo").text(job.get["Number"])
                        .prop("model", job);
                    row.$(".partNo").text(part.get["PartNumber"])
                        .prop("model", part);
                    row.$(".customer").text(customer.get["Name"])
                        .prop("model", customer);
                    row.$(".partName").text(part.get["PartName"])
                        .prop("model", part);
                    row.prop("model", job);
                    grid.append(row);
                }

                /*
                let parts = [...new Set(raw.jobs.map(e => e.part))]
                    .sort((a, b) => a.get["PartNumber"].localeCompare(b.get["PartNumber"]))
                let customers = [...new Set(raw.customers)]
                    .sort((a, b) => a.get["Name"].localeCompare(b.get["Name"]));
                expand.load(grid.find(".top .partNo"), parts.map(e => e.get["PartNumber"]), parts);
                expand.load(grid.find(".top .customer"), customers.map(e => e.get["Name"]), customers);
                */
                return res;
            },
            close: async function () {
                stage1.cancel();
                loading(true);
                shop.card.nav();
                let show = depts.tiles.not(shop.tile);

                await jobs.fadeout();
                jobs.hide();
                show.show();
                await all([
                    shop.gap(0),
                    show.width("40vh"),
                    menu.gap("15vh"),
                    shop.tile.width("40vh")
                ]);
                show.css("width", "")

                loading(false);
                await show.fadein();
                shop.card.nav(jobs.open);
            }
        })),
        ops: shop.$("> .ops").ext((ops) => ({
            grid: ops.$(".grid").grid().ext((grid) => ({
                copy: grid.copy.click(function () {
                    return shop.planner.open($(this).prop("model"));
                })
            })),
            open: async function (row) {
                loading(true);
                shop.card.nav();

                await shop.jobs.fadeout();
                shop.jobs.hide();
                await all([
                    shop.tile.width("95vh"),
                    shop.card.height("17.5vh"),
                    shop.tile.gap("2.5vh")
                ]);

                shop.card.nav(ops.close);
                let res = await ops.load(row);
                if (!res) return;
                shop.card.nav();

                loading(false);
                shop.info1.fadein();
                await ops.fadein();
                shop.card.nav(ops.close);
            },
            load: async function (row) {
                let grid = ops.grid;
                let job = user.job = $(row).prop("model");

                let res = await stage2.run();
                if (!res) return console.log("canceled");
                shop.info1.pdf.load();
                shop.info1.jobNo.text("Job #: " + job.get["Number"]);
                shop.info1.partNo.text("Part #: " + job.part.get["PartNumber"]);

                grid.rows().remove();
                shop.info1.$(".pdf.clone").remove();
                let sorted = raw.ops
                    .filter(o => o.get["PartGUID"] == job.get["PartGUID"])
                    .sort((a, b) => a.get["Number"] - b.get["Number"])
                for (let op of sorted) {
                    let row = dupe(grid.copy);
                    row.$(".opNo").text(op.get["Code"]);
                    row.$(".opName").text(op.get["Title"]);
                    row.prop("model", op);
                    grid.append(row);
                }
                return res;
            },
            close: async function () {
                stage2.cancel();
                loading(true);
                shop.card.nav();

                await all([
                    shop.info1.fadeout(),
                    ops.fadeout()
                ]);
                shop.info1.hide();
                shop.info1.pdf.div.hide();
                ops.hide();
                await all([
                    shop.card.height("85vh"),
                    shop.tile.gap(0),
                    shop.tile.width("30vh")
                ])

                loading(false);
                await shop.jobs.fadein();
                shop.card.nav(shop.jobs.close);
            }
        })),
        planner: shop.$("> .planner").ext((planner) => ({
            grid: planner.$(".grid").ext((grid) => ({
                copy: grid.$(".content.copy"),
                dim: grid.$(".content .left").nav(async function () {
                    d3.selectAll(".spc.popup svg").selectAll("*").remove();
                    $(".spc.popup .stat, #spc_tip .stat").text("")
                    ui.prompts.open("spc");
        
                    let dim = $(this).prop("model");
                    ui.prompts.spc.$(".dimNo").text("SPC: Dim #" + dim.get["DimNo"]);
                    ui.prompts.spc.$(".dimReq").text(dim.get["Requirement"]);
        
                    let results = dim.results
                        .sort((a, b) => new Date(a.get["InspectedDate"]) - new Date(b.get["InspectedDate"]));
                    if (results.length == 0) return;
                    let calc = spc.data(results.map(e => e.get["Data"]), dim.get);
        
                    ui.prompts.spc.$(".stat.cpk").text(calc.cpk.toFixed(4));
                    ui.prompts.spc.$(".stat.ppk").text(calc.ppk.toFixed(4));
                    ui.prompts.spc.$(".stat.xbar").text(calc.x_bar.toFixed(4));
                    ui.prompts.spc.$(".stat.uclx").text(calc.uclx.toFixed(4));
                    ui.prompts.spc.$(".stat.lclx").text(calc.lclx.toFixed(4));
        
                    ui.prompts.spc.$(".stat.rbar").text(calc.r_bar.toFixed(4));
                    ui.prompts.spc.$(".stat.uclr").text(calc.uclr.toFixed(4));
                    ui.prompts.spc.$(".stat.lclr").text(calc.lclr.toFixed(4));
        
                    await timeout(400)
        
                    draw_spc(results, calc, "#spc_canvas1", "#spc_canvas2", "#spc_canvas3", "#spc_canvas4");
                }),
                sample: grid.$(".sample").nav(async function () {
                    let sample = $(this).prop("model");
                    user.sample = sample
                    if (!user.login) return ui.prompts.open("login");
                    loading(true);
                    let res = await load_files.promise;
                    if (!res) return false;
                    loading(false);
                    ui.input.open(sample);
                }),
                plan: grid.$(".plan").hover(function (e) {
                    let tbl_samp = $(this).prop("tbl_samp");
                    $(tbl_samp).addClass("hover");
                }, async (e) => {
                    grid.$(".hover").removeClass("hover")
                })
            })),
            open: async function (row) {
                loading(true);
                shop.card.nav();
    
                await all([
                    shop.ops.fadeout(),
                    shop.info1.fadeout()
                ]);
                shop.info1.hide();
                shop.ops.hide();
                await all([
                    shop.tile.width("30vh"),
                    shop.card.height("30vh"),
                    shop.info2.height("48.5vh")
                ]);
    
                shop.card.nav(planner.close);
                shop.info2.fadein();
                let res = await planner.load(row);
                if (!res) return;
                shop.card.nav();
    
                loading(false);
                await planner.fadein();
                shop.card.nav(planner.close);
            },
            load: async function (op) {
                let job = user.job;
                user.op = op;
                shop.info2.jobNo.text(job.get["Number"]);
                shop.info2.partNo.text(job.part.get["PartNumber"]);
                shop.info2.opNo.text(op.get["Code"]);
                shop.info2.opName.text(op.get["Title"]);
    
                let res = await stage3.run();
                if (!res) return console.log("canceled");
    
                planner.$(".clone").remove();
                let cols = raw.samples
                    .filter(e => e.lot == job.lots.mfg)
                    .sort((a, b) => a.get["SerialNumber"].match(/\d+/)[0]
                        - b.get["SerialNumber"].match(/\d+/)[0]);
                let rows = op.dims
                    .sort((a, b) => a.get["DimSort"].localeCompare(b.get["DimSort"]));
    
                for (let i = 0; i < cols.length; i++) {
                    let row = planner.$("tr.top");
                    let cell = row.$(".sample.copy").dupe();
                    cell.text(cols[i].get["SerialNumber"]);
                    cell.prop("model", cols[i])
                    //cell.click(() => window.open("http://dghighqa-pc:85/search?objectgid=" + cols[i].get["GUID"]))
                    row.append(cell);
                }
                let headers = planner.find(".sample.clone");
    
                for (let i = 0; i < rows.length; i++) {
                    let row = dupe(planner.grid.copy);
                    let dim = rows[i];
                    row.$(".dimNo").text(dim.get["DimNo"]);
                    row.$(".dimReq").text(dim.get["Requirement"]);
                    row.$(".left").prop("model", dim);
    
                    for (let j = 0; j < cols.length; j++) {
                        let cell = dupe(row.$(".plan.copy"));
                        let holder = dim.holders.find(e => e.sample == cols[j]);
                        let result = dim.results.find(e => e.sample == cols[j]);
                        if (result) {
                            if (result.get["Status"] == 2)
                                cell.addClass("fail");
                            else
                                cell.addClass("done");
                        } else if (holder) {
                            cell.addClass("insp");
                        }
                        cell.prop("tbl_dim", row.$(".left"));
                        cell.prop("tbl_samp", headers[j]);
                        cell.prop("model", result || holder);
                        row.append(cell);
                    }
                    planner.grid.append(row);
                }
                return res;
            },
            close: async function () {
                stage3.cancel();
                loading(true);
                shop.card.nav();
    
                await all([
                    planner.fadeout(),
                    shop.info2.fadeout()
                ]);
                shop.info2.hide();
                planner.hide();
                await all([
                    shop.tile.width("95vh"),
                    shop.card.height("17.5vh")
                ]);
    
                loading(false);
                await all([
                    shop.ops.fadein(),
                    shop.info1.fadein()
                ]);
                shop.card.nav(shop.ops.close);
            }
        }))
    }));
    ui.qual = menu.$("> .qual").ext((qual) => ({
        card: qual.$("> .tile > .card").ext((card) => ({

        })).nav(() => qual.actions.open()),
        tile: qual.$("> .tile").ext((tile) => ({

        })),
        actions: qual.$("> .actions").ext((actions) => ({
            cards: actions.$(".action > .card"),
            open: async function () {
                loading(true);
                qual.card.nav();
                let hide = depts.tiles.not(qual.tile);

                await hide.fadeout();
                await all([
                    menu.gap(0),
                    hide.width(0),
                    qual.gap("15vh"),
                    qual.tile.width("40vh"),
                ]);

                qual.card.nav(actions.close);
                let res = await actions.load();
                if (!res) return;
                qual.card.nav();

                loading(false);
                await actions.fadein();
                hide.hide();
                qual.card.nav(actions.close);
            },
            load: async function () {
                return await stage1.run();
            },
            close: async function () {
                stage1.cancel();
                loading(true);
                qual.card.nav();
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
                qual.card.nav(actions.open);
            },
        })),
        daily: qual.$("> .daily").ext((daily) => ({
            date: daily.$("> .date").ext((date) => ({
                back: date.$("> .back"),
                next: date.$("> .next"),
                current: date.$("> .current")
            })),
            open: async function () {
                let actions = qual.actions;
                loading(true);
                qual.card.nav();

                await actions.fadeout();
                actions.hide();

                qual.card.nav(daily.close);
                let res = await daily.load();
                if (!res) return;
                qual.card.nav();

                loading(false);
                await daily.fadein();
                qual.card.nav(daily.close);
            },
            load: async function () {
                return {};
            },
            close: async function () {
                let actions = qual.actions;
                stage2.cancel();
                loading(true);
                qual.card.nav();

                await daily.fadeout();
                daily.hide();

                loading(false);
                await actions.fadein();
                qual.card.nav(actions.close);
            }
        })).nav(() => qual.daily.open()),
        minitab: qual.$("> .minitab").ext((minitab) => ({
            jobs: menu.$("> .jobs").ext((jobs) => ({
                grid: jobs.$(".grid").grid(),
                open: async function () {
                    let actions = qual.actions;
                    loading(true);
                    qual.card.nav();

                    await actions.fadeout();
                    actions.hide();

                    qual.card.nav(minitab.close);
                    let res = await minitab.load();
                    if (!res) return;
                    qual.card.nav();

                    loading(false);
                    await minitab.fadein();
                    qual.card.nav(minitab.close);
                },
                load: async function () {
                    return {};
                },
                close: async function () {
                    let actions = qual.actions;
                    stage2.cancel();
                    loading(true);
                    qual.card.nav();

                    await minitab.fadeout();
                    minitab.hide();

                    loading(false);
                    await actions.fadein();
                    qual.card.nav(actions.close);
                },
            }))
        })).nav(() => qual.minitab.open())
    }));
    ui.prompts = $(".popup").ext((prompts) => ({
        open: async (name) => {
            prompts[name].alpha.fadein()
        },
        close: async (name) => {
            console.log(prompts[name].alpha)
            await prompts[name].alpha.fadeout()
            prompts[name].alpha.hide()
        },
        escape: async function (e) {
            if ($(this).is(e.target)) {
                $(this).fadeout();
                $(this).hide();
            }
        },
        spc: $(".spc.popup").ext((spc) => ({
            alpha: spc.closest(".alpha").nav(function (e) {
                prompts.escape.bind(this, e)();
            })
        })),
        updater: $(".updater.popup").ext((updater) => ({
            alpha: updater.closest(".alpha"),
            title: updater.$(".title"),
            notes: updater.$(".notes"),
            loading: updater.$(".loading")
        })),
        message: $(".message.popup").ext((message) => ({
            alpha: message.closest(".alpha").nav(function (e) {
                prompts.escape.bind(this, e)();
            })
        })),
        input: $(".input.popup").ext((input) => ({
            alpha: input.closest(".alpha").nav(function (e) {
                prompts.escape.bind(this, e)();
            })
        })),
        login: $(".login.popup").ext((login) => ({
            alpha: login.closest(".alpha").nav(function (e) {
                prompts.escape.bind(this, e)();
            })
        })),
        serialize: $(".serialize.popup").ext((serialize) => ({
            alpha: serialize.closest(".alpha").nav(function (e) {
                prompts.escape.bind(this, e)();
            })
        }))
    }));
});

$(window).on("load", () => {

});

const expand = {
    open: (el) => {
        el.find(".select").toggleClass("open", true)
    },
    load: (th, arr, map) => {
        let select = th.prop("select");
        select.find(".option.clone").remove();
        for (let i in arr) {
            let option = dupe(select.find(".option.copy"));
            option.text(arr[i]);
            option.prop("value", map[i]);
            option.click(e => {
                console.log(option.prop("value"));
                select.toggleClass("open", false);
            });
            select.append(option);
        }
    },
    init: (table) => {
        let header = table.find(".top");
        let expand = dupe(".expand.copy");
        let th = header.find("td, th");
        $.each(th, function (i) {
            let column = dupe(expand.find(".column.copy"));
            let select = column.find(".select")
            column.toggleClass("left", $(this).hasClass("left"));
            $(this).prop("select", select);
            var handle = -1;
            $(this).mousedown(e => {
                let option = select.find(".option");
                let columns = expand.find(".select").not(select);
                let options = columns.find(".option");
                e.stopPropagation();
                if (e.which != 1) return;
                if (!select.hasClass("open")) {
                    handle = setTimeout(async () => {
                        select.show();
                        select.toggleClass("open", true);
                        option.animate({
                            height: "4.5vh"
                        }, 500, "easeBounce");
                        await options.animate({
                            height: 0
                        }, 500, "easeBounce").promise();
                        columns.hide();
                        columns.toggleClass("open", false);
                    }, 500);
                }
            });
            $(this).mouseup(async e => {
                let option = select.find(".option");
                let columns = expand.find(".select").not(select);
                let options = expand.find(".option");
                e.stopPropagation();
                if (e.which != 1) return;
                clearTimeout(handle);
                if (!select.hasClass("open")) {
                    let sort = ((select.prop("sort") || 0) + 1) % 3;
                    th.removeClass("sortup sortdown");
                    $(this).toggleClass("sortup", sort == 1);
                    $(this).toggleClass("sortdown", sort == 2);
                    select.prop("sort", sort);
                    columns.prop("sort", 0);
                    handle = -1
                    await options.animate({
                        height: 0
                    }, 500, "easeBounce").promise();
                    columns.hide();
                    columns.toggleClass("open", false);
                } else if (handle == -1) {
                    select.toggleClass("open", false);
                    await options.animate({
                        height: 0
                    }, 500, "easeBounce").promise();
                    select.hide();
                }
                handle = -1;
            });
            $(window).mousedown(async e => {
                let selects = expand.find(".select");
                let options = expand.find(".option");
                selects.toggleClass("open", false);
                await options.animate({
                    height: "0px"
                }, 500, "easeBounce").promise();
                selects.hide();
            });
            expand.append(column);
        });
        table.find("thead").append(expand);
        table.prop("expand", expand);
    }
}