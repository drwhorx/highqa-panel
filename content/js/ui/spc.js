const spc_consts = {
    e2: 1.5 * mathjs.gamma(0.5),
    d2: 1.1283791670955123,
    d3: 0.8525122415123741,
    D3: 0,
    D4: 3.2665579081190517,

    pdf: (x, u, s) => {
        return (1 / (s * mathjs.sqrt(2 * mathjs.pi))) * mathjs.exp((-1 / 2) * mathjs.pow((x - u) / s, 2))
    }
}

const spc_data = (dim) => {
    let results = dim.results
        .sort((a, b) => new Date(a.get["InspectedDate"]) - new Date(b.get["InspectedDate"]))
        .filter((r1, i, self) => r1 == self.findLast(r2 => r1.sample == r2.sample));
    let arr = results.map(e => e.get["Data"]);
    let mean = (dim.get["UpperTol"] + dim.get["LowerTol"]) / 2;
    let out = {
        x_bar: mathjs.mean(arr.length == 0 ? [mean] : arr),
        x_sig: mathjs.std(arr.length == 0 ? [0] : arr),
        usl: dim.get["UpperTol"],
        lsl: dim.get["LowerTol"],
        arr, results
    }
    out.mr = arr.map((e, i) => mathjs.abs(e - arr[i - 1])).splice(1);
    out.r_bar = mathjs.mean(out.mr.length == 0 ? [0] : out.mr);
    out.r_sig = mathjs.std(out.mr.length == 0 ? [0] : out.mr);
    out.s_hat = out.r_bar / spc_consts.d2;
    if (dim.is_gdt()) out.zmin = dim.get["UpperTol"] - out.x_bar
    else out.zmin = {
        /*
        0: dim["Nominal"] - out.x_bar, // N/A
        3: dim["Nominal"] - out.x_bar, // Basic
        4: dim["Nominal"] - out.x_bar, // Reference
        */
        1: mathjs.min(dim.get["UpperTol"] - out.x_bar, out.x_bar - dim.get["LowerTol"]) + dim.get["Nominal"], // Tolerance
        2: mathjs.min(dim.get["UpperTol"] - out.x_bar, out.x_bar - dim.get["LowerTol"]), // As Limit
        5: out.x_bar - dim.get["LowerTol"], // MIN
        6: dim.get["UpperTol"] - out.x_bar, // MAX
    }[dim.get["TolType"]];

    out.cpk = out.zmin / (3 * out.s_hat);
    out.ppk = out.zmin / (3 * out.x_sig);
    out.uclx = out.x_bar + spc_consts.e2 * out.r_bar;
    out.lclx = out.x_bar - spc_consts.e2 * out.r_bar;
    out.uclr = spc_consts.D4 * out.r_bar;
    out.lclr = spc_consts.D3 * out.r_bar;
    return out;
}
let colors = [
    "white", "white", "#ff0f0f", "#ff0f0f", "#7CC2FF"
]
let dashes = [
    0, 0, 5, 5, 0
];

const spc_recent = (results) => {
    return results.filter(r1 =>
        r1 == results.findLast(r2 => r1.sample == r2.sample)
    )
}

const draw_spc = async (dim, x_chart, x_hist, r_chart, r_hist, options = {}) => {
    let calc = spc_data(dim);
    let results = calc.results;
    let charts = d3.selectAll($([x_chart[0], r_chart[0]]));
    charts.data(["x_chart", "r_chart"].filter((e, i) => charts.nodes()[i]));

    let hists = d3.selectAll($([x_hist[0], r_hist[0]]));
    hists.data(["x_hist", "r_hist"].filter((e, i) => hists.nodes()[i]));

    let { no_hover, scale = 1, tip = $("#spc_tip") } = options;

    return all([
        all(charts.each(async function (chart_type, i) {
            let svg = d3.select(this);
            if (!svg) return;
            let is_r = chart_type == "r_chart";
            let is_x = chart_type == "x_chart";

            let length = is_r ? results.length - 1 : results.length;
            let ucl = is_r ? calc.uclr : calc.uclx;
            let lcl = is_r ? calc.lclr : calc.lclx;
            let bar = is_r ? calc.r_bar : calc.x_bar;
            let sig = is_r ? calc.r_sig : calc.x_sig;
            let dist = mathjs.max(is_r ? ucl / 2 : ucl - bar, 0.000000001);
            let range =
                is_r ? [-0.5 * dist, 2.5 * dist]
                    : [bar - 1.5 * dist, bar + 1.5 * dist];
            let limit_data =
                is_r ? [ucl, lcl, null, null, bar]
                    : [ucl, lcl, calc.usl, calc.lsl, bar];
            let plot =
                is_r ? results.map((model, i) => ({ x: i + 1, y: calc.mr[i - 1], model: model })).slice(1)
                    : results.map((model, i) => ({ x: i + 1, y: model.get["Data"], model: model }));

            let y = d3.scaleLinear()
                .domain(range)
                .range([100, 0]);
            let x = d3.scaleLinear()
                .domain([1, results.length])
                .range([10, 240]);

            let limits = svg.append('g')
                .selectAll("line")
                .data(limit_data)
                .enter()
                .append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", (d) => y(d))
                .attr("y2", (d) => y(d))
                .style("stroke-width", 0.5 * scale)
                .style("stroke-dasharray", (d, i) => dashes[i])
                .style("stroke-dashoffset", 5)
                .style("stroke", (d, i) => d === null ? "transparent" : colors[i]);

            let path = svg.append("path")
                .datum(plot)
                .style("fill", "none")
                .style("stroke-width", 1 * scale)
                .style("stroke", "#41a6ff")
                .attr("d", d3.line()
                    .x(d => x(0))
                    .y(d => y(bar))
                );
            let circ = svg.append('g')
                .selectAll("dot")
                .data(plot)
                .enter()
                .append("circle")
                .attr("cx", d => x(0))
                .attr("cy", d => y(bar))
                .attr("r", 2 * scale)
                .style("fill", "#7CC2FF")
                .property("model", d => d.model);
            svg.property("circ", circ);

            limits.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("x2", 250).end();
            path.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("d", d3.line()
                    .x(d => x(d.x))
                    .y(d => y(bar))
                );
            await circ.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("cx", d => x(d.x)).end();

            path.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("d", d3.line()
                    .x(d => x(d.x))
                    .y(d => y(d.y))
                );
            await circ.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("cy", d => y(d.y)).end();

            let line = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", 100)
                .style("stroke-width", 0.5)
                .style("stroke", "#00ffe7")
                .style("opacity", 0)

            if (no_hover) return;
            trackPointer({
                move: (e) => {
                    let svgX = d3.pointer(e)[0];
                    let svgY = d3.pointer(e)[1];
                    circ.style("fill", "#7CC2FF");
                    let plotX = x.invert(svgX);
                    let plotY = y.invert(svgY);
                    let bisect = d3.bisector((d, x) => $(d).attr("cx") - x).center;
                    let point = circ.nodes()[bisect(circ.nodes(), svgX)];
                    d3.select(point).style("fill", "white");

                    line.attr("x1", svgX);
                    line.attr("x2", svgX);
                    line.style("opacity", 1);

                    let data = d3.select(point).data()[0];
                    if (!data) return;
                    let result = data.model;

                    tip.css("left", e.pageX + 10);
                    if (plotY > bar) {
                        tip.css("top", "");
                        tip.css("bottom", window.innerHeight - e.pageY + 30);
                    } else {
                        tip.css("top", e.pageY + 30);
                        tip.css("bottom", "");
                    }

                    tip.$(".data").span($.fixed(data.y, dim.places()));
                    tip.$(".sample").span(result.sample.get["SerialNumber"]);
                    tip.$(".status").span(result.get["StatusText"]);
                    tip.$(".inspector").span(result.inspector ?
                        result.inspector?.get["FirstName"] + " " + result.inspector?.get["LastName"] : "");
                    tip.$(".timestamp").span(result.get["InspectedDate"] ?
                        $.format.date(result.get["InspectedDate"], "E MM/dd/yyyy h:mma") : "");
                    
                    tip.$(".serial").span(result?.data["S/N"]);
                    tip.$(".serial").closest(".row").show(!!result?.data["S/N"]);
                    tip.$(".comment").span(result?.data["Comments"]);
                    tip.$(".comment").closest(".row").show(!!result?.data["Comments"]);
                    tip.show();

                    let cy = y.invert($(point).attr("cy"));
                    let spread = cy - bar;
                    let height = 0.5 * (dist + mathjs.abs(spread))
                    dist = mathjs.max(is_r ? ucl / 2 : ucl - bar, 0.000000001, is_r ? cy / 2 : 0);
                    range = is_r ? [-0.5 * dist, 2.5 * dist] :
                        [mathjs.min(bar - dist - 0.5 * height, bar + spread - 0.5 * height, bar - 1.5 * dist),
                            mathjs.max(bar + spread + 0.5 * height, bar + dist + 0.5 * height, bar + 1.5 * dist)]

                    y = d3.scaleLinear()
                        .domain(range)
                        .range([100, 0]);

                    circ.attr("cy", d => y(d.y));

                    path.attr("d", d3.line()
                        .x(d => x(d.x))
                        .y(d => y(d.y))
                    );

                    limits.attr("y1", (d) => y(d))
                        .attr("y2", (d) => y(d))
                },
                end: (e) => {
                    line.style("opacity", 0);
                    circ.style("fill", "#7CC2FF");
                    tip.hide();

                    dist = mathjs.max(is_r ? ucl / 2 : ucl - bar, 0.000000001);
                    range =
                        is_r ? [-0.5 * dist, 2.5 * dist]
                            : [bar - 1.5 * dist, bar + 1.5 * dist];

                    y = d3.scaleLinear()
                        .domain(range)
                        .range([100, 0]);

                    circ.attr("cy", d => y(d.y));

                    path.attr("d", d3.line()
                        .x(d => x(d.x))
                        .y(d => y(d.y))
                    );

                    limits.attr("y1", (d) => y(d))
                        .attr("y2", (d) => y(d))
                }
            }, svg)
        })),
        all(hists.each(async function (chart_type, i) {
            let svg = d3.select(this);
            if (!svg) return;
            let is_r = chart_type == "r_hist";
            let is_x = chart_type == "x_hist";

            let ucl = is_r ? calc.uclr : calc.uclx;
            let lcl = is_r ? calc.lclr : calc.lclx;
            let bar = is_r ? calc.r_bar : calc.x_bar;
            let sig = is_r ? calc.r_sig : calc.x_sig;
            let dist = mathjs.max(is_r ? ucl / 2 : ucl - bar, 0.000000001);
            let height = dist / 3;
            let range =
                is_r ? [-0.5 * dist, 2.5 * dist]
                    : [bar - 1.5 * dist, bar + 1.5 * dist];
            let limit_data =
                is_r ? [ucl, lcl, null, null, bar]
                    : [ucl, lcl, calc.usl, calc.lsl, bar];
            let plot =
                is_r ? results.map((model, i) => ({ x: i + 1, y: calc.mr[i - 1], model: model })).slice(1)
                    : results.map((model, i) => ({ x: i + 1, y: model.get["Data"], model: model }));
            let chart =
                is_r ? d3.select(r_chart[0])
                    : d3.select(x_chart[0]);

            let length = plot.length;
            let hist = d3.histogram()
                .value(d => d.y)
                .domain([lcl, ucl])
                .thresholds(d3.range(lcl, ucl, height));
            let bins = hist(plot);
            let y = d3.scaleLinear()
                .domain(range)
                .range([100, 0]);
            let x = d3.scaleLinear()
                .domain([0, mathjs.max(d3.max(bins, d => d.length), spc_consts.pdf(0, 0, sig) * length * height)])
                .range([0, 80]);

            let domain = mathjs.range(lcl, ucl, 2 * dist / 50, true);
            let rect = svg.selectAll("rect")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", -.5)
                .attr("y", d => y(d.x1))
                .attr("width", 0)
                .attr("height", d => y(d.x0) - y(d.x1))
                .style("fill", "#41a6ff")
                .style("stroke-width", 0.5 * scale)
                .style("stroke", "#7CC2FF")
            let bell = svg.append("path")
                .datum(domain._data)
                .style("fill", "none")
                .style("stroke-width", 0.5 * scale)
                .style("stroke", "#00ffe7")
                .attr("d", d3.line()
                    .x(d => x(0))
                    .y(d => y(bar))
                );
            let limits = svg.append('g')
                .selectAll("line")
                .data(limit_data)
                .enter()
                .append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", (d) => y(d))
                .attr("y2", (d) => y(d))
                .style("stroke-width", 0.5 * scale)
                .style("stroke-dasharray", (d, i) => dashes[i])
                .style("stroke-dashoffset", 5)
                .style("stroke", (d, i) => d === null ? "transparent" : colors[i]);

            limits.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("x2", 93.75).end();
            await bell.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("d", d3.line()
                    .x(d => x(0))
                    .y(d => y(d))
                ).end();

            rect.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("width", d => x(d.length));
            await bell.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("d", d3.line()
                    .x(d => x(spc_consts.pdf(d, bar, sig) * length * height))
                    .y(d => y(d))
                ).end();

            let line = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 93.75)
                .attr("y1", 0)
                .attr("y2", 0)
                .style("stroke-width", 0.5)
                .style("stroke", "#00ffe7")
                .style("opacity", 0);

            if (no_hover) return;
            trackPointer({
                move: (e) => {
                    let svgX = d3.pointer(e)[0];
                    let svgY = d3.pointer(e)[1];
                    let plotX = x.invert(svgX);
                    let plotY = y.invert(svgY);
                    let circ = chart.property("circ");

                    circ.style("fill", "#7CC2FF");
                    rect.style("fill", "#41a6ff");

                    let bisect = d3.bisector((d, x) => (d.x1 + d.x0) / 2 - x).center;
                    let index = bisect(bins, plotY);
                    let points = bins[index].map(d0 => circ.nodes()[d0.x - (is_r ? 2 : 1)]);
                    d3.selectAll(points).style("fill", "white");
                    let rects = rect.nodes()[index];
                    d3.select(rects).style("fill", "#7CC2FF");

                    line.attr("y1", svgY);
                    line.attr("y2", svgY);
                    line.style("opacity", 1);
                },
                end: (e) => {
                    let circ = chart.property("circ");
                    line.style("opacity", 0);
                    circ.style("fill", "#7CC2FF");
                    rect.style("fill", "#41a6ff");
                }
            }, svg)
        }))
    ])
}