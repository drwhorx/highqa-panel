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

const loading = (bool) => {
    if (bool) $("body > .loading").fadein()
    else $("body > .loading").fadeout()
};

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
        .on(`pointerup pointercancel pointerleave lostpointercapture`, (e) => {
            if (e.pointerId !== id && e.pointerType != "mouse") return;
            target.on(`.${id}`, null);
            node.releasePointerCapture(id);
            id = null;
            end && end(e);
        })
        .on(`pointermove`, (e) => {
            if (e.pointerId !== id && e.pointerType != "mouse") return;
            id = e.pointerId;
            move && move(e);
        });

    start && start(e);
}

$.extend({
    section: function (obj) {
        let { width, height, classes, css } = obj || {};
        return $("<div>")
            .addClass("section")
            .addClass(classes)
            .css(css || {})
            .css({
                width, height
            });
    }
})

$.fn.extend({
    ext: function (init) {
        if (!init) return this;
        let obj = init(this);
        obj.inits = [...(this.inits || []), init];
        obj.exts = [...(this.exts || []), ...Object.values(obj)];
        this.prop("obj", obj);
        return this.extend(obj);
    },
    split: function (init) {
        let obj = init(this);
        for (let name in obj)
            this.append(obj[name].addClass(name));
        return this.extend(obj);
    },
    $: function (selector) {
        return this.find(selector)
    },

    fadeout: function () {
        this.css({
            opacity: 1,
            top: 0
        });
        return this.animate({
            opacity: 0,
            top: "2vh"
        }, 300).promise();
    },
    fadein: async function () {
        this.css({
            opacity: 0,
            top: "-5vh"
        });
        this.show();
        this.animate({ opacity: 1 }, {
            duration: 300,
            queue: false
        })
        await this.animate({ top: 0 }, {
            duration: 500,
            easing: "easeBounce",
            queue: false,
            step: () => this.css({
                "display": "",
                "overflow": ""
            })
        }).promise();
        return this.css({
            "display": "",
            "overflow": ""
        })
    },
    bounce: async function (css) {
        await this.animate(css, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css({
                "display": "",
                "overflow": ""
            })
        }).promise();
        return this.css({
            "display": "",
            "overflow": ""
        })
    },
    width: async function (width) {
        await this.animate({ width }, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css({
                "display": "",
                "overflow": ""
            })
        }).promise();
        return this.css({
            "display": "",
            "overflow": ""
        })
    },
    height: async function (height) {
        await this.animate({ height }, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css({
                "display": "",
                "overflow": ""
            })
        }).promise();
        return this.css({
            "display": "",
            "overflow": ""
        })
    },
    gap: async function (gap) {
        await this.animate({ gap }, {
            duration: 800,
            easing: "easeBounce",
            queue: false,
            step: () => this.css({
                "display": "",
                "overflow": ""
            })
        }).promise();
        return this.css({
            "display": "",
            "overflow": ""
        })
    },
    dupe: function () {
        let clone = $(this[0]).clone(true, true);
        for (let init of (this.inits || [])) {
            clone = clone.ext(init);
        }
        clone.removeClass("copy");
        clone.addClass("clone");
        return clone;
    },
    nav: function (nav = () => {}) {
        for (let el of this) {
            $(el).off("click");
            $(el).click(async function (e) {
                if ($(this).prop("ignore")) return;
                $(this).prop("ignore", true);
                await nav.bind(this, e)();
                $(this).prop("ignore", false);
            });
        }
        return this;
    },
    grid: function () {
        return this.extend({
            top: this.$("tr.top").ext((top) => ({
                copy: top.$(".copy")
            })),
            rows: () => this.$(".content.clone"),
            copy: this.$(".content.copy")
        })
    },
    token: function () {
        let token = new Date();
        this.prop("token", token);
        return token;
    }
})