const all = Promise.all.bind(Promise);
const ui = {};

$(window).on("load", () => {
    ui.menu = $("#console").extend({
        depts: $("#console > .section"),
    });
    ui.engi = $("#console .section.engi").extend({
        tile: $("#console .shop .tile"),
        groups: $("#console .engi .actions").extend({

        })
    });
    ui.shop = $("#console .shop").extend({
        card: $("#console .shop .tile .card").extend({
            nav: function (nav) { this[0].onclick = nav }
        }),
        tile: $("#console .shop .tile").extend({

        }),
        job: $("#console .shop .tile .job").extend({
            pdf: $("#console .shop .tile .job canvas.pdf").extend({
                div: $("#console .shop .tile .job div.pdf")
            }),
            jobNo: $("#console .shop .tile .job .jobNo"),
            partNo: $("#console .shop .tile .job .partNo"),
            customer: $("#console .shop .tile .job .customer")
        }),
        op: $("#console .shop .tile .op").extend({
            jobNo: $("#console .shop .tile .op .jobNo"),
            partNo: $("#console .shop .tile .op .partNo"),
            opNo: $("#console .shop .tile .op .opNo"),
            opName: $("#console .shop .tile .op .opName"),
        }),
        jobs: $("#console .shop .jobview").extend({
            grid: $("#console .shop .jobview .grid").extend({
                copy: $("#console .shop .jobview .grid .content.copy"),
            }),
            open: async function () {
                loading(true);
                ui.shop.card.nav("");
                let hide = ui.menu.depts.not(ui.shop);

                await hide.fadeout();
                await all([
                    ui.menu.gap(0),
                    hide.width(0),
                    ui.shop.gap("5vh"),
                    ui.shop.tile.width("30vh"),
                ]);

                ui.shop.card.nav(ui.shop.jobs.close);
                let res = await ui.shop.jobs.load();
                if (!res) return;
                ui.shop.card.nav("");

                loading(false);
                await ui.shop.jobs.fadein();
                hide.hide();
                ui.shop.card.nav(ui.shop.jobs.close);
            },
            load: async function () {
                let grid = ui.shop.jobs.grid;

                let res = await stage1.run();
                if (!res) return console.log("canceled");
                grid.find(".content.clone").remove();
                let jobs = raw.jobs
                    .sort((a, b) => b.get["Number"].localeCompare(a.get["Number"]))

                for (let job of jobs) {
                    let part = job.part;
                    let customer = part.customer;
                    let row = dupe(grid.copy);
                    row.find(".jobNo").text(job.get["Number"])
                        .prop("model", job);
                    row.find(".partNo").text(part.get["PartNumber"])
                        .prop("model", part);
                    row.find(".customer").text(customer.get["Name"])
                        .prop("model", customer);
                    row.find(".partName").text(part.get["PartName"])
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
                ui.shop.card.nav("");
                let show = ui.menu.depts.not(ui.shop);

                await ui.shop.jobs.fadeout();
                ui.shop.jobs.hide();
                show.show();
                await all([
                    ui.shop.gap(0),
                    show.width("40vh"),
                    ui.menu.gap("15vh"),
                    ui.shop.tile.width("40vh")
                ]);

                loading(false);
                await show.fadein();
                ui.shop.card.nav(ui.shop.jobs.open);
            }
        }),
        ops: $("#console .shop .opview").extend({
            grid: $("#console .shop .opview .grid").extend({
                copy: $("#console .shop .opview .grid .content.copy")
            }),
            open: async function (row) {
                loading(true);
                ui.shop.card.nav("");

                await ui.shop.jobs.fadeout();
                await all([
                    ui.shop.tile.width("95vh"),
                    ui.shop.card.height("15vh"),
                    ui.shop.tile.gap("5vh"),
                    ui.shop.job.height("62.5vh")
                ]);

                ui.shop.card.nav(ui.shop.ops.close);
                let res = await ui.shop.ops.load(row);
                if (!res) return;
                ui.shop.card.nav("");

                loading(false);
                ui.shop.job.fadein();
                await ui.shop.ops.fadein();
                ui.shop.jobs.hide();
                ui.shop.card.nav(ui.shop.ops.close);
            },
            load: async function (row) {
                let grid = ui.shop.ops.grid;
                let job = user.job = $(row).prop("model");

                let res = await stage2.run();
                if (!res) return console.log("canceled");
                (async () => {
                    let res = await load_files.promise;
                    if (!res) return;
                    ui.shop.job.find(".pdf.clone").remove();
                    let drawings = raw.drawings.sort((a, b) =>
                        a.get["Title"].localeCompare(b.get["Title"])
                        || a.get["PdfPageNo"] - b.get["PdfPageNo"]);
                    let canvases = await all(drawings.map(async (res) => {
                        let canvas = ui.shop.job.pdf.dupe();
                        await drawpdf(res.file, res.get["PdfPageNo"], canvas[0]);
                        return canvas;
                    }));
                    for (let canvas of canvases) {
                        canvas.div.append(canvas);
                    }
                    ui.shop.job.pdf.div.fadein();
                })();
                ui.shop.job.jobNo.text("Job #: " + job.get["Number"]);
                ui.shop.job.partNo.text("Part #: " + job.part.get["PartNumber"]);

                grid.find(".content.clone").remove();
                let ops = raw.ops
                    .filter(o => o.get["PartGUID"] == job.get["PartGUID"])
                    .sort((a, b) => a.get["Number"] - b.get["Number"])
                for (let op of ops) {
                    let row = dupe(grid.copy);
                    row.find(".opNo").text(op.get["Code"]);
                    row.find(".opName").text(op.get["Title"]);
                    row.prop("model", op);
                    grid.append(row);
                }
                return res;
            },
            close: async function () {
                stage2.cancel();
                loading(true);
                ui.shop.card.nav("");

                await all([
                    ui.shop.job.fadeout(),
                    ui.shop.ops.fadeout()
                ]);
                ui.shop.job.hide();
                ui.shop.job.pdf.div.hide();
                ui.shop.ops.hide();
                await all([
                    ui.shop.card.height("82.5vh"),
                    ui.shop.tile.gap(0),
                    ui.shop.tile.width("30vh")
                ])

                loading(false);
                await ui.shop.jobs.fadein();
                ui.shop.card.nav(ui.shop.jobs.close);
            }
        }),
        planner: $("#console .shop .planner").extend({
            grid: $("#console .shop .planner .grid").extend({
                copy: $("#console .shop .planner .grid .content.copy")
            }),
            open: async function (row) {
                loading(true);
                ui.shop.card.nav("");

                await all([
                    ui.shop.ops.fadeout(),
                    ui.shop.job.fadeout()
                ]);
                ui.shop.job.hide();
                await all([
                    ui.shop.tile.width("30vh"),
                    ui.shop.card.height("30vh"),
                    ui.shop.op.height("43.5vh")
                ]);

                ui.shop.card.nav(ui.shop.planner.close);
                let res = await ui.shop.planner.load(row);
                if (!res) return;
                ui.shop.card.nav("");

                loading(false);
                await all([
                    ui.shop.planner.fadein(),
                    ui.shop.op.fadein()
                ]);
                ui.shop.ops.hide();
                ui.shop.card.nav(ui.shop.planner.close);
            },
            load: async function (row) {
                let planner = ui.shop.planner;
                let job = user.job;
                let op = user.op = $(row).prop("model")

                let res = await stage3.run();
                if (!res) return console.log("canceled");
                ui.shop.op.jobNo.text(job.get["Number"]);
                ui.shop.op.partNo.text(job.part.get["PartNumber"]);
                ui.shop.op.opNo.text(op.get["Code"]);
                ui.shop.op.opName.text(op.get["Title"]);

                planner.find(".clone").remove();
                let samples = raw.samples
                    .filter(e => e.lot == job.lots.mfg)
                    .sort((a, b) => a.get["SerialNumber"].match(/\d+/)[0]
                        - b.get["SerialNumber"].match(/\d+/)[0]);
                let dims = op.dims
                    .sort((a, b) => a.get["DimSort"].localeCompare(b.get["DimSort"]));

                for (let i = 0; i < samples.length; i++) {
                    let row = planner.find("tr.top");
                    let cell = dupe(row.find(".sample.copy"));
                    cell.text(samples[i].get["SerialNumber"]);
                    cell.click(() => window.open("http://dghighqa-pc:85/search?objectgid=" + samples[i].get["GUID"]))
                    row.append(cell);
                }
                let $samples = planner.find(".sample.clone");

                for (let i = 0; i < dims.length; i++) {
                    let row = dupe(planner.grid.copy);
                    let dim = dims[i];
                    row.find(".dimNo").text(dim.get["DimNo"]);
                    row.find(".dimReq").text(dim.get["Requirement"]);
                    row.find(".left").prop("model", dim);

                    for (let j = 0; j < samples.length; j++) {
                        let cell = dupe(row.find(".plan.copy"));
                        let holder = dim.holders.find(e => e.sample == samples[j]);
                        let result = dim.results.find(e => e.sample == samples[j])
                        if (holder)
                            cell.addClass("insp");
                        if (result) {
                            if (result.get["Status"] == 2)
                                cell.addClass("fail");
                            else
                                cell.addClass("done");
                        }
                        cell.prop("tbl_dim", row.find(".left"));
                        cell.prop("tbl_samp", $samples[j]);
                        cell.prop("model", result || holder);
                        row.append(cell);
                    }
                    $("#planner").append(row);
                }
                return res;
            },
            close: async function () {
                stage3.cancel();
                loading(true);
                ui.shop.card.nav("");

                await all([
                    ui.shop.planner.fadeout(),
                    ui.shop.op.fadeout()
                ]);
                ui.shop.op.hide();
                ui.shop.planner.hide();
                await all([
                    ui.shop.tile.width("95vh"),
                    ui.shop.card.height("15vh")
                ]);

                loading(false);
                await all([
                    ui.shop.ops.fadein(),
                    ui.shop.job.fadein()
                ]);
                ui.shop.card.nav(ui.shop.ops.close);
            }
        })
    });
    ui.qual = $("#console .section.qual").extend({

    });
    ui.planner = $("#planner").extend({

    });
    ui.prompts = $(".alpha.prompt").extend({
        popups: $(".alpha.prompt .popup"),
        open: async (name) => {
            await all([
                ui.prompts.fadein(),
                ui.prompts.find(".popup." + name).fadein()
            ]);
        },
        close: async () => {
            await all([
                ui.prompts.fadeout(),
                ui.prompts.popups.fadeout()
            ]);
            ui.prompts.popups.hide()
            ui.prompts.hide();
        },
        spc: $(".spc.popup"),
        updater: $(".updater.popup").extend({
            title: $(".updater.popup .title"),
            notes: $(".updater.popup .notes"),
            loading: $(".updater.popup .loading")
        })
    });
    ui.messages = $("#messages").extend({

    });
});

$.fn.extend({
    fadeout: async function () {
        this.css({
            opacity: 1,
            top: 0
        });
        let res = await this.animate({
            opacity: 0,
            top: "2vh"
        }, 300).promise();
        return res;
    },
    fadein: function () {
        this.css({
            opacity: 0,
            top: "-5vh"
        });
        this.show();
        this.animate({
            opacity: 1
        }, { duration: 300, queue: false })
        return this.animate({
            top: 0
        }, 500, "easeBounce").promise();
    },
    width: async function (width) {
        await this.animate({ width }, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css("overflow", "")
        }).promise();
        return this.css("display", "")
    },
    height: async function (height) {
        await this.animate({ height }, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css("overflow", "")
        }).promise();
        return this.css("display", "")
    },
    gap: async function (gap) {
        await this.animate({
            "gap": gap
        }, 800, "easeBounce").promise();
        return this.css("display", "");
    },
    dupe: function () {
        let clone1 = $(this[0]).clone(true, true);
        let clone2 = $.extend({}, this);
        let clone = $.extend(clone2, clone1);
        clone.removeClass("copy");
        clone.addClass("clone");
        return clone;
    }
})

$(window).on("load", () => {
    expand.init(ui.shop.jobs.grid);

    ui.shop.card.nav(ui.shop.jobs.open)
    ui.shop.jobs.grid.copy.click(function () {
        ui.shop.ops.open(this);
    });
    ui.shop.ops.grid.copy.click(function () {
        ui.shop.planner.open(this);
    });

    $("#edit_prompt .content.copy").click(async (e) => {
        let target = $(e.target).is("tr") ? $(e.target) : $(e.target.parentNode);
        $("#planner .pick").removeClass("insp done fail");
        $("#planner .pick").addClass(target.pickClass(["insp", "done", "fail"]));
        $("#planner .pick").removeClass("pick");

        sidebar.off("info", "edit", "seri");
        prompt.off();
    });
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