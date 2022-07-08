$(window).on("load", () => {
    $("#planner .content .left").click(async function () {
        d3.selectAll(".spc.popup svg").selectAll("*").remove();
        $(".spc.popup .stat, #spc_tip .stat").text("")
        ui.prompts.open("spc");

        let dim = $(this).prop("model");
        ui.prompts.spc.find(".dimNo").text("SPC: Dim #" + dim.get["DimNo"]);
        ui.prompts.spc.find(".dimReq").text(dim.get["Requirement"]);
        
        let results = dim.results
            .sort((a, b) => new Date(a.get["InspectedDate"]) - new Date(b.get["InspectedDate"]));
        if (results.length == 0) return;
        let calc = spc.data(results.map(e => e.get["Data"]), dim.get["UpperTol"], dim.get["LowerTol"]);
        
        ui.prompts.spc.find(".stat.cpk").text(calc.cpk.toFixed(4));
        ui.prompts.spc.find(".stat.ppk").text(calc.ppk.toFixed(4));
        ui.prompts.spc.find(".stat.xbar").text(calc.x_bar.toFixed(4));
        ui.prompts.spc.find(".stat.uclx").text(calc.uclx.toFixed(4));
        ui.prompts.spc.find(".stat.lclx").text(calc.lclx.toFixed(4));

        ui.prompts.spc.find(".stat.rbar").text(calc.r_bar.toFixed(4));
        ui.prompts.spc.find(".stat.uclr").text(calc.uclr.toFixed(4));
        ui.prompts.spc.find(".stat.lclr").text(calc.lclr.toFixed(4));
        
        await timeout(400)

        draw_spc(results, calc, "#spc_canvas1", "#spc_canvas2", "#spc_canvas3", "#spc_canvas4");
    });

    var dragging = false;
    var action = true;
    $("#planner .plan").mousedown(function (e) {
        if (e.button != 0) return;
        dragging = true;
        action = $(this).toggleClass("pick").hasClass("pick");
        /*
        if ($(".plan.pick").length == 0)
            sidebar.off("info", "edit", "seri");
        else
            sidebar.nil("info", "edit", "seri");
        */
        return false;
    }).mouseover(function () {
        if (dragging) {
            $(this).toggleClass("pick", action)
            if (action) return;
            /*
            if ($(".plan.pick").length == 0)
                sidebar.off("info", "edit", "seri");
            else
                sidebar.nil("info", "edit", "seri");
            */
        };
    }).bind("promptstart", function () {
        return false;
    });
    $(document).mouseup(function () {
        dragging = false;
    });

    $("#planner .plan").hover(function (e) {
        let tbl_samp = $(this).prop("tbl_samp");
        $(tbl_samp).addClass("hover");
    }, async (e) => {
        $("#planner .hover").removeClass("hover")
    });
})