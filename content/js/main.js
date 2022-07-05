const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mathjs = math;

const dupe = (el) => {
    let clone = $(el).clone(true, true);
    clone.removeClass("copy");
    clone.addClass("clone");
    return clone;
}

const loading = (bool) => $("#progress").toggleClass("pop", bool)

$(window).on("load", () => {
    $(".alpha.prompt").click(function (e) {
        if ($(this).is(e.target)) {
            ui.prompts.close();
        }
    })
})