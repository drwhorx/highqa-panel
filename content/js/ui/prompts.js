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

    ui.prompts = $(".popup").ext((prompts) => ({
        open: async (prompt) => {
            await prompt.closest(".alpha").fadein();
        },
        close: async (prompt, reason) => {
            let alpha = prompt.closest(".alpha");
            if (prompt.escape) await prompt.escape();
            await alpha.fadeout();
            if (prompt.resolve) prompt.resolve(reason);
            alpha.hide();
        },
        modal: async (prompt) => {
            return await new Promise(resolve => {
                prompts.open(prompt);
                prompt.resolve = resolve;
            });
        },
        alpha: prompts.closest(".alpha").nav(async function (e) {
            if ($(this).is(e.target)) {
                let obj = $(this).$("> .popup").prop("obj") || $(this).$("> .popup");
                prompts.close(obj, "cancel");
            }
        }),
        updater: $(".updater.popup").ext((updater) => ({
            title: updater.$(".title"),
            notes: updater.$(".notes"),
            loading: updater.$(".loading")
        })),
        message: $(".message.popup").ext((message) => ({
            text: message.$(".text"),
            options: message.$(".options"),
            load: function (text, options) {
                message.text.text(text);
                if (options) message.options.show();
                else message.options.hide();
            },
            accept: message.$(".accept").nav(async () => {
                await ui.prompts.close(message, "accept");
            }),
            cancel: message.$(".cancel").nav(async () => {
                await ui.prompts.close(message, "cancel");
            })
        })),
        spc: $(".spc.popup").ext((spc) => ({
            dim: null,
            dimNo: spc.$(".dimNo").nav(async () => {
                user.sample = null;
                user.job = spc.dim.part.job;
                user.op = spc.dim.op;
                await ui.input.open(spc.dim);
            }),
            load: async (dim) => {
                spc.dim = dim;
                spc.$(".dimNo").text("SPC: Dim #" + dim.get["DimNo"]);
                spc.$(".dimReq").text(dim.get["Requirement"]);

                let calc = spc_data(dim);

                spc.$(".stat.cpk").text((calc.cpk > 1000 ? Infinity : calc.cpk).toFixed(4));
                spc.$(".stat.ppk").text((calc.ppk > 1000 ? Infinity : calc.ppk).toFixed(4));
                spc.$(".stat.xbar").text(calc.x_bar.toFixed(4));
                spc.$(".stat.uclx").text(calc.uclx.toFixed(4));
                spc.$(".stat.lclx").text(calc.lclx.toFixed(4));

                spc.$(".stat.rbar").text(calc.r_bar.toFixed(4));
                spc.$(".stat.uclr").text(calc.uclr.toFixed(4));
                spc.$(".stat.lclr").text(calc.lclr.toFixed(4));

                d3.selectAll("#spc_canvas1, #spc_canvas2, #spc_canvas3, #spc_canvas4").selectAll("*").remove();
                d3.selectAll("#spc_canvas1, #spc_canvas2, #spc_canvas3, #spc_canvas4")
                    .on("touchmove pointerdown pointerup pointercancel pointerleave lostpointercapture pointermove", null);
                spc.$(".spc_tip").hide();
                ui.input.closest(".alpha").insertBefore(ui.prompts.spc.closest(".alpha"));
                await ui.prompts.open(spc);
                await draw_spc(dim, $("#spc_canvas1"), $("#spc_canvas2"), $("#spc_canvas3"), $("#spc_canvas4"));
            }
        })),
        input: $(".input.popup"),
        login: $(".login.popup"),
        more: $(".more.popup").ext((more) => ({
            comments: more.$(".comments"),
            serial: more.$(".serial"),
            escape: () => {
                user.serial = more.serial.val();
                user.comments = more.comments.val();
                ui.input.drawings.$(".serial").text("S/N: " + (user.serial || "Not Selected"));
                ui.input.drawings.$(".serial").toggleClass("pulsate", !!user.serial);
                (async () => {
                    await ui.keyboard.fadeout();
                    ui.keyboard.hide();
                })();
            }
        }))
    }));
    ui.keyboard = $(".section.keyboard").ext((keyboard) => ({
        caps: keyboard.$(".caps").nav(() => {
            for (let letter of keyboard.letters) {
                let text = $(letter).text();
                $(letter).text($(letter).attr("cap") || text.toUpperCase());
                $(letter).attr("cap", text);
            }
        }),
        clear: keyboard.$(".clear").nav(() => {
            $(ui.focused).val("");
            $(ui.focused).trigger("input");
        }),
        space: keyboard.$(".space").nav(() => {
            let focus = $(ui.focused);
            focus.val(focus.val() + " ");
            focus.trigger("input");
        }),
        letters: keyboard.$(".letter").nav(function () {
            let focus = $(ui.focused);
            focus.val(focus.val() + $(this).text());
            focus.trigger("input");
        }),
    }))
});