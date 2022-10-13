$(window).on("load", () => {
    ui.login = $(".login.popup").ext((login) => ({
        display: login.$(".display"),
        number: login.$(".number").nav(function () {
            let text = $(this).text();
            if (login.display.text() == "Clock ID") login.display.text("");
            login.display.text(login.display.text() + text);
            login.accept.toggleClass("invalid", 
                raw.contacts.find(e => e.get["EmployeeID"] == login.display.text())
            );
        }),
        clear: login.$(".clear").nav(function () {
            login.display.text("");
            login.accept.toggleClass("invalid", true);
        }),
        accept: login.$(".accept").nav(async function () {
            if ($(this).hasClass("invalid")) return;
            login = user.login = raw.contacts.find(e => e.get["EmployeeID"] == login.display.text());
            ui.title.name.text(login.get["FirstName"] + " " + login.get["LastName"])
            await ui.prompts.close("login");
            ui.input.open();
        })
    }))
});