const invoke = window.__TAURI__?.invoke

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mathjs = math;
const tauri = window.__TAURI__;

const dupe = (el) => {
    let clone = $(el).clone(true, true);
    clone.removeClass("copy");
    clone.addClass("clone");
    return clone;
}

const loading = (bool) => bool ? $("body > .loading").fadein() : $("body > .loading").fadeout();

$(window).on("load", async () => {
    $(".alpha.prompt").click(function (e) {
        if ($(this).is(e.target)) {
            ui.prompts.close();
        }
    });
    alert("v4");
    let update = await tauri.updater.checkUpdate();
    if (update && update.shouldUpdate) {
        let info = update.manifest;
        let node = ui.prompts.updater;
        let date = $.format.date(new Date(info.date.slice(0, 19)), "MMMM D, yyyy")
        node.title.text(`v${info.version} - ${date}`);
        node.notes.text(info.body);
        ui.prompts.open("updater");
        let res = await tauri.updater.installUpdate();
        alert(res.toString());
    }
})

function trackPointer({ start, move, out, end }, target) {
    var id;
    let node = target.nodes()[0];
    $(node)
        .on(`contextmenu`, e => false)

    target
        .on("touchmove", e => e.preventDefault())
        .on("pointerdown", e => {
            id = e.pointerId;
            node.setPointerCapture(id);
        })
        .on(`pointerup pointercancel lostpointercapture pointerout`, (e) => {
            if (e.pointerId !== id && e.pointerType != "mouse") return;
            target.on(`.${id}`, null);
            node.releasePointerCapture(id);
            id = null;
            end && end(e);
        })
        .on(`pointermove`, (e) => {
            if (e.pointerId !== id && e.pointerType != "mouse") return;
            move && move(e);
        });

    start && start(e);
}