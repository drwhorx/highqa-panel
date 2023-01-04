$(window).on("load", () => {
    ui.login = $(".login.popup").ext((login) => ({
        display: login.$(".display").on("input", function (e) {
            let val = e?.target?.value || $(this).val();
            login.accept.toggleClass("invalid", 
                !raw(model.contact).find(e => e.get["EmployeeID"] == val) || val.trim() === ""
            );
        }),
        number: login.$(".number").nav(function () {
            let text = $(this).text();
            login.display.val(login.display.val() + text);
            login.display.trigger("input");
        }),
        clear: login.$(".clear").nav(function () {
            login.display.val("");
            login.accept.toggleClass("invalid", true);
        }),
        accept: login.$(".accept").nav(async function () {
            if ($(this).hasClass("invalid")) return;
            let contact = user.login = raw(model.contact).find(e => e.get["EmployeeID"] == login.display.val());
            ui.title.name.text(contact.get["FirstName"] + " " + contact.get["LastName"])
            await ui.prompts.close(login, "accept");
        })
    }))
});