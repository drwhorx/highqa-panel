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

const fast = async () => {
    let time1 = new Date();
    let samples = raw.samples;
    let length = mathjs.ceil(samples.length / 5);
    let groups = Array.from({ length }, (_, i) => samples.slice(i * 5, i * 5 + 5));
    let res = await Promise.all(groups.map(async group => {
        if (group.length == 0) return [];
        let query = API("placeholders/list");
        query.req["SampleGUIDs"] = group.map(res => res.get["GUID"]).join(",");
        return await query.pages();
    }));
    console.log(new Date() - time1)
}

const drawpdf = async (drawing, pageNo) => {
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    let blob = new Blob([drawing.get], { type: "application/pdf" });
    let url = window.URL.createObjectURL(blob);

    let pdf = await pdfjsLib.getDocument(url).promise;

    let canvas = ui.shop.tile.job.pdf;
    let context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    let page = await pdf.getPage(pageNo);
    let viewport = page.getViewport({ scale: 1 });
    page.render({
        canvasContext: context,
        viewport: viewport
    })
}

const dodrawing = async (drawing) => {
    let guid = drawing.get["GUID"];
    let x = 0, y = 0, error = true;
    while (error && x < 50) {
        try {
            await $.ajax({
                url: `http://dghighqa-pc:85/_images/drawings/${guid}/Tiles/Z1/Y001-X${String(++x).padStart(3, "0")}.png`,
                type: 'GET',
            })
            error = false;
        } catch (err) {
        }
    }
    error = true;
    while (error && y < 50) {
        try {
            await $.ajax({
                url: `http://dghighqa-pc:85/_images/drawings/${guid}/Tiles/Z1/Y${String(++y).padStart(3, "0")}-X001.png`,
                type: 'GET',
            })
            error = false;
        } catch (err) {
        }
    }
    console.log(x + "," + y)
}

$.easing.easeBounce = d3.easeBounce;
$.fn.extend({
    pickClass: function (arr) {
        return arr.filter(e => this.hasClass(e))[0];
    },
    $show: function () {
        return this.removeAttr("hidden")
    },
    $hide: function () {
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