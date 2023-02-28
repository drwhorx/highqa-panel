const invoke = window.__TAURI__?.invoke

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const socket = io("http://localhost:8080");
const mathjs = math;
const tauri = window.__TAURI__;

const dupe = (el) => {
    let clone = $(el).clone(true, true);
    clone.removeClass("copy");
    clone.addClass("clone");
    return clone;
}

const loading = async (bool) => {
    if (bool)
        await $("#loading").fadein()
    else {
        await $("#loading").fadeout();
        $("#loading").hide();
    }
};

Date.prototype.toHighQADate = function () {
    let date = new Date(this);
    let offset = date.getTimezoneOffset();
    let hours = ("" + ((offset / 60) / 100).toFixed(2)).slice(2);
    let mins = ("" + ((offset % 60) / 100).toFixed(2)).slice(2);
    date.setHours(this.getHours() - hours);
    date.setMinutes(this.getMinutes() - mins);
    return date.toISOString().slice(0, -1) + "0000-" + hours + ":" + mins;
}

function trackPointer({ start, move, out, end }, target) {
    var id;
    let node = target.nodes()[0];
    $(node)
        .on(`contextmenu`, e => false);
    $(node)
        .on("touchmove pointerdown pointerup pointercancel pointerleave lostpointercapture pointermove", null);

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

function download(url, name) {
    let a = $("<a>")
        .attr("href", url)
        .attr("download", name)
        .css("display", "none")
    a[0].click();
    a.remove();
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
    },
    places: function (num) {
        return +num === NaN ? null : mathjs.max(
            (+(mathjs.abs(num % 1)).toFixed(8) + "").length - 2, 0
        );
    },
    fixed: function (num, min) {
        return +num === NaN ? null : (+num).toFixed(mathjs.max(min, $.places(num)))
    }
})

$.easing.easeBounce = d3.easeBounce;
$.easing.easeCircle = d3.easeCircleInOut;

$.fn.extend({
    ext: function (init) {
        if (!init) return this;
        let obj = init(this);
        obj.inits = [...(this.inits || []), init];
        obj.exts = [...(this.exts || []), ...Object.values(obj)];
        if (this.length == 1) this.prop("obj", this.extend(obj));
        this.dupe = function () {
            let clone = this.clone(true, true);
            let ext = init(clone);
            clone.removeClass("copy");
            clone.addClass("clone");
            return clone.extend(ext);
        }
        this.prop("html", this.html());
        return this.extend(obj);
    },
    split: function (init) {
        let obj = init(this);
        for (let name in obj)
            this.append(obj[name].addClass(name));
        return this.extend(obj);
    },
    $: function (selector) {
        if (selector.includes(".copy"))
            return this.find(selector)
        else
            return this.find(selector).not(".copy")
    },

    fadeout: async function (retain) {
        this.css({
            opacity: 1,
            top: 0
        });
        await this.animate({
            opacity: 0,
            top: "2vh"
        }, 300).promise();
        if (!retain) {
            this.hide();
            this.css({
                opacity: "",
                top: ""
            });
        }
    },
    fadein: async function () {
        this.css({
            opacity: 0,
            top: "-5vh"
        });
        this.show();
        await all([
            this.animate({ opacity: 1 }, {
                duration: 300,
                queue: false
            }).promise(),
            this.animate({ top: 0 }, {
                duration: 500,
                easing: "easeBounce",
                queue: false,
                step: () => this.css({
                    display: "",
                    overflow: ""
                })
            }).promise()
        ]);
        return this.css({
            display: "",
            overflow: "",
            opacity: "",
            top: ""
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
        clone.removeClass("copy");
        clone.addClass("clone");
        return clone;
    },
    nav: function (nav = () => { }, clear) {
        if (!nav) nav = () => { };
        for (let el of this) {
            $(el).off("click");
            var ignore = false;
            $(el).click(async function (e) {
                if (ignore) return;
                ignore = true;
                await nav.bind(this, e)();
                ignore = false;
            });
        }
        return this;
    },
    grid: function () {
        return this.extend({
            head: this.$(".row.head").ext((top) => ({
                copy: top.$(".cell.copy")
            })),
            rows: () => this.$(".content.clone"),
            copy: this.$(".content.copy").ext((row) => ({
                copy: row.$(".cell.copy")
            })),
            append: (items) => {
                if (this.$(".row.fill")[0]) this.$(".row.fill").before(items)
                else $(this).append(items);
            }
        })
    },
    span: function (text) {
        return this.html($("<span>").text(text))
    },
    token: function () {
        let token = new Date();
        this.prop("token", token);
        return token;
    },
    pickClass: function (arr) {
        return arr.filter(e => this.hasClass(e))[0];
    },
    show: function (toggle) {
        if (toggle === undefined || toggle) {
            this.removeAttr("hidden");
        }
        else this.hide();
    },
    hide: function (toggle) {
        if (toggle === undefined || toggle) {
            this.attr("hidden", true);
            this.prop("hidden", true);
        } else {
            this.show();
        }
    },
    reset: function () {
        this.find(".clone").remove();
        this.removeAttr("style");
        this.find("*").removeAttr("style");
    }
})

$(window).on("load", function () {
    $(".grid > .row.head > .cell > input").on("input", function (e) {
        let val = e?.target?.value || $(this).val();
        let cell = $(this).closest(".cell");
        let grid = $(this).closest(".grid");
        let cls = Array.from(cell[0].classList).find(e => e != "cell" && e != "left");
        grid.$(".row.clone .cell." + cls).each(function () {
            if ($(this).text().toLowerCase().includes(val.toLowerCase()))
                $(this).closest(".row").show();
            else
                $(this).closest(".row").hide();
        });
    });
    $("input.display[type=\"date\"]").each(function () {
        $(this).attr("type", "text");
        $(this).keyup(function () {
            let val = $(this).val().replace(/\D+/g, '');
            arr = [val.slice(0, 2), val.slice(2, 4), val.slice(4, 8)].filter(e => !!e);
            $(this).val(arr.join("/"));
        });
    });
    $("input, textarea").on("focus", function () {
        ui.focused = this;
    })
    $(".clicky.toggle").each(function () {
        $(this).val(!$(this).hasClass("invalid"));
    }).on("click", function () {
        $(this).val(!$(this).val());
        $(this).toggleClass("invalid", !$(this).val());
    });
})