const test2 = () => {
    $("#planner .clone").remove();
    for (let i = 0; i < 20; i++) {
        let row = $("#planner tr.top");
        let cell = dupe(row.find(".sample.copy"));
        $(cell).text(i + 1);
        row.append(cell);
    }
    let headers = $("#planner .sample.clone");

    for (let i = 0; i < 30; i++) {
        let row = dupe("#planner tr.copy")
        let done = mathjs.random() < .4;
        let samples = samplize(mathjs.floor(mathjs.random() * 20 + 1), 20)
        for (let j = 0; j < 20; j++) {
            let cell = dupe(row.find(".plan.copy"));
            if (samples.includes(j)) {
                if (done) cell.addClass(mathjs.random() < .1 ? "fail" : "done");
                else cell.addClass("insp");
            }
            cell.prop("tbl_dim", row.find(".left"));
            cell.prop("tbl_samp", headers[j]);
            row.append(cell);
        }
        $("#planner").append(row);
    }
}

const test5 = async () => {
    /*
    var y_data = [1.3644,1.3641,1.3638,1.3646,1.3646,1.364,1.3642,1.3642,1.3641,1.3646,1.3646,1.3647,1.3648,1.3647,1.3642,1.3646,1.3642,1.3646,1.3643,1.3645,1.3641,1.3641,1.3646,1.3644,1.3641,1.3641,1.3641,1.3643]
    length = y_data.length
    var x_data = Array.from({ length }, (_, i) => i + 1);
    draw_spc(x_data, y_data, 1.363, 1.365);
    */

    let length = mathjs.random() * 40 + 10;
    var x_data = Array.from({ length }, (_, i) => i + 1);
    var usl = mathjs.random() * 2 + 1.001;
    var lsl = usl - .002;
    var y_data = Array.from({ length }, (_, i) => usl + 0.0005 - mathjs.random() * 0.003);

    draw_spc(x_data, y_data, usl, lsl);
    //draw_hist(x_data, y_data, usl, lsl);
}

const drawpdf = async (drawing, pageNo, canvas) => {
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./js/lib/pdf.worker.js";
 
    let url = window.URL.createObjectURL(drawing.get);
    console.log(url)
    let pdf = await pdfjsLib.getDocument({ url, maxImageSize: 2147500037 }).promise;
    let page = await pdf.getPage(pageNo);
    let context = canvas.getContext('2d');

    try {
        let viewport = page.getViewport({ scale: 1 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        return await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    } catch (err) {
    }
}

$.easing.easeBounce = d3.easeBounce;
$.fn.extend({
    pickClass: function (arr) {
        return arr.filter(e => this.hasClass(e))[0];
    },
    show: function () {
        return this.removeAttr("hidden")
    },
    hide: function () {
        return this.prop("hidden", true)
    }
})

/*
$(window).on("load", () => {
    $("#console .tile").click(async function () {
        let hide = $("#console .tile").not(this);
        let menu = $("#console");
        let dept = $(this).pickClass(["engi", "shop", "qual"]);
        let sect = $("#console .section." + dept);

        $("#console").css("justify-content", 
            dept == "engi" ? "right" : "");

        if ($(this).hasClass("pop")) {
            await sect.fadeout();
            menu.css("gap", 0);
            hide.removeAttr("hidden");
            
            sect.prop("hidden", true);
            menu.gap("15vh");
            $(this).bounce("40vh");
            await hide.bounce("40vh");

            await hide.fadein();
            $(this).removeClass("pop");
        } else {
            await hide.fadeout();
            menu.gap(0);
            $(this).bounce("30vh");
            await hide.bounce(0);

            hide.prop("hidden", true);
            sect.removeAttr("hidden");
            menu.css("gap", "5vh");
            
            await sect.fadein();
            $(this).addClass("pop");
        }
    });
});
*/