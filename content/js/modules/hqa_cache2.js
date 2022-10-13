let get_jobs = {
    run: async (_, valid) => {
        let res = (await API("jobs/list").pages())["Jobs"];
        if (!valid()) return;
    },
}
let get_parts = {
    run: async (_, valid) => {
        let res = (await API("parts/list").pages())["Parts"];
    },
}
let get_ops = {
    run: async (_, valid) => {
        let res = (await API("procedures/list").pages())["Procedures"];
    },
}
let get_companies = {
    run: async (_, valid) => {
        let res = (await API("companies/list").pages())["Companies"];
    },
}
let get_contacts = {
    run: async (_, valid) => {
        let res = (await API("contacts/list").pages())["Contacts"];
    },
}