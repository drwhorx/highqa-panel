$(window).on("load", () => {
    $("#planner .content .left").click(async function () {
        let el = $("#spc_canvas1");
        let svg = d3.select("#spc_canvas1");
        svg.selectAll("*").remove();

        ui.prompts.set("spc");
        d3.selectAll("#spc_prompt svg").selectAll("*").remove();
        $("#spc_prompt .stat, #spc_tip .stat").text("")
        await ui.prompts.open();

        let dim = $(this).prop("model");
        $("#spc_prompt .dimNo").text("SPC: Dim #" + dim.get["DimNo"]);
        $("#spc_prompt .dimReq").text(dim.get["Requirement"]);
        
        let results = dim.results
            .sort((a, b) => new Date(a.get["InspectedDate"]) - new Date(b.get["InspectedDate"]));
        if (results.length == 0) return;
        let calc = spc.data(results.map(e => e.get["Data"]), dim.get["UpperTol"], dim.get["LowerTol"]);
        
        $("#spc_prompt .stat.cpk").text(calc.cpk.toFixed(4));
        $("#spc_prompt .stat.ppk").text(calc.ppk.toFixed(4));
        $("#spc_prompt .stat.xbar").text(calc.x_bar.toFixed(4));
        $("#spc_prompt .stat.uclx").text(calc.uclx.toFixed(4));
        $("#spc_prompt .stat.lclx").text(calc.lclx.toFixed(4));

        $("#spc_prompt .stat.rbar").text(calc.r_bar.toFixed(4));
        $("#spc_prompt .stat.uclr").text(calc.uclr.toFixed(4));
        $("#spc_prompt .stat.lclr").text(calc.lclr.toFixed(4));
        
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