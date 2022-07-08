const spc = {
    e2: 1.5 * mathjs.gamma(0.5),
    d2: 1.1283791670955123,
    d3: 0.8525122415123741,
    D3: 0,
    D4: 3.2665579081190517,
    data: (arr, usl, lsl) => {
        let out = {
            x_bar: mathjs.mean(arr),
            x_sig: mathjs.std(arr),
            usl: usl,
            lsl: lsl
        }
        out.mr = arr.map((e, i) => mathjs.abs(e - arr[i - 1])).splice(1);
        out.r_bar = mathjs.mean(out.mr);
        out.r_sig = mathjs.std(out.mr);
        out.s_hat = out.r_bar / spc.d2;
        out.cpk = mathjs.min(usl - out.x_bar, out.x_bar - lsl) / (3 * out.s_hat);
        out.ppk = mathjs.min(usl - out.x_bar, out.x_bar - lsl) / (3 * out.x_sig);
        out.uclx = out.x_bar + spc.e2 * out.r_bar;
        out.lclx = out.x_bar - spc.e2 * out.r_bar;
        out.uclr = spc.D4 * out.r_bar;
        out.lclr = spc.D3 * out.r_bar;
        return out;
    },
    pdf: (x, u, s) => {
        return (1 / (s * mathjs.sqrt(2 * mathjs.pi))) * mathjs.exp((-1 / 2) * mathjs.pow((x - u) / s, 2))
    }
}

const draw_spc = async (results, calc, x_chart, x_hist, r_chart, r_hist) => {
    let dim = results[0].dim;
    let colors = [
        "white", "white", "#ff0f0f", "#ff0f0f", "#7CC2FF"
    ]
    let dashes = [
        0, 0, 5, 5, 0
    ];
    d3.selectAll($([$(x_chart)[0], $(r_chart)[0], $(x_hist)[0], $(r_hist)[0]])).selectAll("*").remove();
    (async () => {
        let charts = d3.selectAll($([$(x_chart)[0], $(r_chart)[0]]));
        charts.data(["x_chart", "r_chart"]);
        charts.each(async function (chart_type, i) {
            let svg = d3.select(this);
            if (!svg) return;
            let is_r = chart_type == "r_chart";
            let is_x = chart_type == "x_chart";

            let length = is_r ? results.length - 1 : results.length;
            let ucl = is_r ? calc.uclr : calc.uclx;
            let lcl = is_r ? calc.lclr : calc.lclx;
            let bar = is_r ? calc.r_bar : calc.x_bar;
            let sig = is_r ? calc.r_sig : calc.x_sig;
            let dist = ucl - bar;
            let range =
                is_r ? [-0.25 * ucl, 1.25 * ucl]
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
                .style("stroke-width", 0.5)
                .style("stroke-dasharray", (d, i) => dashes[i])
                .style("stroke-dashoffset", 5)
                .style("stroke", (d, i) => d === null ? "transparent" : colors[i]);

            let path = svg.append("path")
                .datum(plot)
                .style("fill", "none")
                .style("stroke-width", 1)
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
                .attr("r", 2)
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
            circ.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("cy", d => y(d.y));

            let line = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", 100)
                .style("stroke-width", 0.5)
                .style("stroke", "#00ffe7")
                .style("opacity", 0)

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
                    $("#spc_tip").css("left", e.pageX + 10);
                    if (plotY > bar) {
                        $("#spc_tip").css("top", "");
                        $("#spc_tip").css("bottom", window.innerHeight - e.pageY + 30);
                    } else {
                        $("#spc_tip").css("top", e.pageY + 30);
                        $("#spc_tip").css("bottom", "");
                    }

                    let result = d3.select(point).data()[0].model;
                    $("#spc_tip .data").text(result.get["Data"].toFixed(4));
                    $("#spc_tip .sample").text(result.sample.get["SerialNumber"]);
                    $("#spc_tip .status").text(result.get["StatusText"]);
                    $("#spc_tip .inspector").text(result.inspector.get["FirstName"] + " " + result.inspector.get["LastName"]);
                    $("#spc_tip .timestamp").text($.format.date(result.get["InspectedDate"], "E MM/dd/yyyy hh:mma"));
                    $("#spc_tip").show();
                },
                end: (e) => {
                    line.style("opacity", 0);
                    circ.style("fill", "#7CC2FF");
                    $("#spc_tip").hide();
                }
            }, svg)
        });

        let hists = d3.selectAll($([$(x_hist)[0], $(r_hist)[0]]));
        hists.data(["x_hist", "r_hist"]);
        hists.each(async function (chart_type, i) {
            let svg = d3.select(this);
            if (!svg) return;
            let is_r = chart_type == "r_hist";
            let is_x = chart_type == "x_hist";

            let ucl = is_r ? calc.uclr : calc.uclx;
            let lcl = is_r ? calc.lclr : calc.lclx;
            let bar = is_r ? calc.r_bar : calc.x_bar;
            let sig = is_r ? calc.r_sig : calc.x_sig;
            let dist = ucl - bar;
            let height =
                is_r ? ucl / 6 : dist / 3;
            let range =
                is_r ? [-0.25 * ucl, 1.25 * ucl]
                    : [bar - 1.5 * dist, bar + 1.5 * dist];
            let limit_data =
                is_r ? [ucl, lcl, null, null, bar]
                    : [ucl, lcl, calc.usl, calc.lsl, bar];
            let plot =
                is_r ? results.map((model, i) => ({ x: i + 1, y: calc.mr[i - 1], model: model })).slice(1)
                    : results.map((model, i) => ({ x: i + 1, y: model.get["Data"], model: model }));
            let chart =
                is_r ? d3.select(r_chart)
                    : d3.select(x_chart);

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
                .domain([0, mathjs.max(d3.max(bins, d => d.length), spc.pdf(0, 0, sig) * length * dist / 3)])
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
                .style("stroke-width", 0.5)
                .style("stroke", "#7CC2FF")
            let bell = svg.append("path")
                .datum(domain._data)
                .style("fill", "none")
                .style("stroke-width", 0.5)
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
                .style("stroke-width", 0.5)
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
            bell.transition()
                .duration(500)
                .ease(d3.easeBounce)
                .attr("d", d3.line()
                    .x(d => x(spc.pdf(d, bar, sig) * length * dist / 3))
                    .y(d => y(d))
                );

            let line = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 93.75)
                .attr("y1", 0)
                .attr("y2", 0)
                .style("stroke-width", 0.5)
                .style("stroke", "#00ffe7")
                .style("opacity", 0)
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
                    $("#spc_tip").css("left", e.pageX + 10);
                    if (plotY > bar) {
                        $("#spc_tip").css("top", "");
                        $("#spc_tip").css("bottom", window.innerHeight - e.pageY + 30);
                    } else {
                        $("#spc_tip").css("top", e.pageY + 30);
                        $("#spc_tip").css("bottom", "");
                    }
                    $("#spc_tip").toggleClass("hover", true);
                },
                end: (e) => {
                    let circ = chart.property("circ");
                    line.style("opacity", 0);
                    circ.style("fill", "#7CC2FF");
                    rect.style("fill", "#41a6ff");
                    $("#spc_tip").toggleClass("hover", false);
                }
            }, svg)
        });
    })();
}