$(window).on("load", () => {
    ui.serialize = $(".serialize.popup").ext((serialize) => ({
        grid: serialize.$(".grid").grid().ext((grid) => ({
            copy: grid.copy.click(function () {
                return serialize.close(this);
            })
        })),
        open: async function () {
            
        }
    }));
});