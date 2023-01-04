$(window).on("load", () => {
    ui.quantity = $(".quantity.popup").ext((quantity) => ({
        display: quantity.$(".display").on("input", function (e) {
            let val = e?.target?.value || $(this).val();
            let length = user.job.lots.mfg.samples.length
            quantity.accept.toggleClass("invalid", isNaN(val) || val.trim() === "" || val <= 0 || val > length);
        }),
        number: quantity.$(".number").nav(function () {
            let text = $(this).text();
            quantity.display.val(quantity.display.val() + text);
            quantity.display.trigger("input");
        }),
        clear: quantity.$(".clear").nav(function () {
            quantity.display.val("");
            quantity.accept.toggleClass("invalid", true);
        }),
        accept: quantity.$(".accept").nav(async function () {
            if ($(this).hasClass("invalid")) return;
            let fixed = +quantity.display.val();
            let dims = user.op.dims;
            let samples = user.job.lots.mfg.samples
                .sort((a, b) => a.get["SerialNumber"].replace(/\D+/g, '')
                    - b.get["SerialNumber"].replace(/\D+/g, ''));

            let index = mathjs.max(samples.findLastIndex(
                e => e.results.find(r => dims.includes(r.dim))), 0);
            let sample = samples[index];

            loading(true);
            await all(dims.map(async dim => {
                let aql = sample_qty(dim.get["TolClass"], fixed)
                    || +dim.get["TolClass"] || dim.holders.length;
                let next = !!sample.results.find(r => r.dim == dim);
                let complete = samples.filter(e => e.results.find(
                    r => r.dim == dim)).length;
                let todo = aql - complete;
                let possible = fixed - index - next;
                await all(
                    samples.slice(index + next).map(async sample => {
                        let query = API("placeholders/delete");
                        query.req["DimGUID"] = dim.get["GUID"];
                        query.req["SampleGUIDs"] = sample.get["GUID"];
                        await query.send();
                    })
                );
                await all(
                    samplize(todo, possible).map(async i => {
                        let sample = samples[index + i + next];
                        let query = API("placeholders/create");
                        query.req["DimGUID"] = dim.get["GUID"];
                        query.req["SampleGUIDs"] = sample.get["GUID"];
                        await query.send();
                    })
                );
            }));
            
            clear(user.job.holders);
            clear(user.job.lots.fpi?.holders);
            clear(user.job.lots.mfg?.holders);
            user.job.samples.map(e => clear(e.holders));
            dims.map(e => clear(e.holders));
            let holders = (await all(
                user.job.samples.map(e => e.get_holders())
            )).flat();
            load_holders(holders);

            ui.shop.planner.load();
            loading(false);
            await ui.prompts.close(quantity, "accept");
        })
    }))
});