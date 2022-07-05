const all = Promise.all.bind(Promise);
const ui = {};

$(window).on("load", () => {
    ui.menu = $("#console").extend({
        depts: $("#console > .section"),
        revert: async function () {
            let show = ui.menu.depts.not(this);

        }
    });
    ui.engi = $("#console .section.engi").extend({
        tile: $("#console .shop .tile"),
        groups: $("#console .engi .actions").extend({

        })
    });
    ui.shop = $("#console .shop").extend({
        tile: $("#console .shop .tile").extend({
            job: $("#console .shop .tile .job").extend({
                pdf: $("#console .shop .tile .job .pdf"),
                jobNo: $("#console .shop .tile .job .jobNo"),
                partNo: $("#console .shop .tile .job .partNo"),
                customer: $("#console .shop .tile .job .customer")
            })
        }),
        jobs: $("#console .shop .jobview").extend({
            grid: $("#console .shop .jobview .grid").extend({
                copy: $("#console .shop .jobview .grid .content.copy"),
            }),
            open: async function () {
                ui.shop.tile[0].onclick = "";
                loading(true);
                let hide = ui.menu.depts.not(ui.shop);
                await hide.fadeout();
                await all([
                    ui.menu.gap(0),
                    hide.bounce(0),
                    ui.shop.gap("5vh"),
                    ui.shop.tile.bounce("30vh"),
                ]);
                ui.shop.tile[0].onclick = ui.shop.jobs.close;
                let res = await ui.shop.jobs.load();
                if (!res) return;
                ui.shop.tile[0].onclick = "";
                loading(false);
                await ui.shop.jobs.fadein();
                hide.$hide();
                ui.shop.tile[0].onclick = ui.shop.jobs.close;
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
                ui.shop.tile[0].onclick = "";
                loading(true);
                let show = ui.menu.depts.not(ui.shop);
                await ui.shop.jobs.fadeout();
                ui.shop.jobs.$hide();
                show.$show();
                await all([
                    ui.shop.gap(0),
                    show.bounce("40vh"),
                    ui.menu.gap("15vh"),
                    ui.shop.tile.bounce("40vh")
                ]);
                loading(false);
                await show.fadein();
                ui.shop.tile[0].onclick = ui.shop.jobs.open;
            }
        }),
        ops: $("#console .shop .opview").extend({
            grid: $("#console .shop .opview .grid").extend({
                copy: $("#console .shop .opview .grid .content.copy")
            }),
            open: async function (row) {
                ui.shop.tile[0].onclick = "";
                loading(true);
                await ui.shop.jobs.fadeout();
                await ui.shop.tile.bounce("95vh");
                ui.shop.tile[0].onclick = ui.shop.ops.close;
                let res = await ui.shop.ops.load(row);
                if (!res) return;
                ui.shop.tile[0].onclick = "";
                loading(false);
                await ui.shop.ops.fadein();
                ui.shop.jobs.$hide();
                ui.shop.tile[0].onclick = ui.shop.ops.close;
            },
            load: async function (row) {
                let grid = ui.shop.ops.grid;
                let job = user.job = $(row).prop("model");

                let res = await stage2.run();
                if (!res) return console.log("canceled");
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
                ui.shop.tile[0].onclick = "";
                stage2.cancel();
                loading(true);
                await ui.shop.ops.fadeout();
                await ui.shop.tile.bounce("30vh");
                ui.shop.ops.$hide();
                loading(false);
                await ui.shop.jobs.fadein();
                ui.shop.tile[0].onclick = ui.shop.jobs.close;
            }
        }),
        planner: $("#console .shop .planner").extend({
            grid: $("#console .shop .planner .grid").extend({
                copy: $("#console .shop .planner .grid .content.copy")
            }),
            open: async function (row) {
                ui.shop.tile[0].onclick = "";
                loading(true);
                await ui.shop.ops.fadeout();
                await ui.shop.tile.bounce("30vh");
                ui.shop.tile[0].onclick = ui.shop.planner.close;
                let res = await ui.shop.planner.load(row);
                if (!res) return;
                ui.shop.tile[0].onclick = "";
                loading(false);
                await ui.shop.planner.fadein();
                ui.shop.ops.$hide();
                ui.shop.tile[0].onclick = ui.shop.planner.close;
            },
            load: async function (row) {
                let planner = ui.shop.planner;
                let op = user.op = $(row).prop("model")

                let res = await stage3.run();
                if (!res) return console.log("canceled");
                planner.find(".clone").remove();
                let samples = raw.samples
                    .filter(e => e.lot == user.job.lots.mfg)
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
                ui.shop.tile[0].onclick = "";
                stage3.cancel();
                loading(true);
                await ui.shop.planner.fadeout();
                await ui.shop.tile.bounce("95vh");
                ui.shop.planner.$hide();
                loading(false);
                await ui.shop.ops.fadein();
                ui.shop.tile[0].onclick = ui.shop.ops.close;
            }
        })
    });
    ui.qual = $("#console .section.qual").extend({

    });
    ui.planner = $("#planner").extend({

    });
    ui.prompts = $("#prompts").extend({
        popups: $("#prompts .popup"),
        current: "",
        open: async () => {
            ui.prompts.removeAttr("hidden");
            await timeout(50);
            ui.prompts.addClass("pop");
            ui.prompts.popups.addClass("pop");
        },
        close: async () => {
            ui.prompts.removeClass("pop");
            ui.prompts.popups.removeClass("pop");
            await timeout(400);
            ui.prompts.set("");
            ui.prompts.prop("hidden", true);
        },
        set: async (name) => {
            ui.prompts.popups.toggleClass(ui.prompts.current, false);
            ui.prompts.popups.toggleClass(name, true);
            ui.prompts.current = name;
        }
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
        this.$show();
        this.animate({
            opacity: 1
        }, { duration: 300, queue: false })
        return this.animate({
            top: 0
        }, 500, "easeBounce").promise();
    },
    bounce: async function (width) {
        await this.animate({
            width: width
        }, 800, "easeBounce").promise();
        return this.css("display", "");
    },
    linear: function (width) {
        return this.animate({
            width: width
        }, 800).promise();
    },
    gap: async function (gap) {
        await this.animate({
            "gap": gap
        }, 800, "easeBounce").promise();
        return this.css("display", "");
    },
    dupe: function () {
        let clone = $.extend(this.clone(true, true), this);
        clone.removeClass("copy");
        clone.addClass("clone");
        return clone;
    }
})

$(window).on("load", () => {
    expand.init(ui.shop.jobs.grid);

    ui.shop.tile[0].onclick = ui.shop.jobs.open;
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
                        select.$show();
                        select.toggleClass("open", true);
                        option.animate({
                            height: "4.5vh"
                        }, 500, "easeBounce");
                        await options.animate({
                            height: 0
                        }, 500, "easeBounce").promise();
                        columns.$hide();
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
                    columns.$hide();
                    columns.toggleClass("open", false);
                } else if (handle == -1) {
                    select.toggleClass("open", false);
                    await options.animate({
                        height: 0
                    }, 500, "easeBounce").promise();
                    select.$hide();
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
                selects.$hide();
            });
            expand.append(column);
        });
        table.find("thead").append(expand);
        table.prop("expand", expand);
    }
}