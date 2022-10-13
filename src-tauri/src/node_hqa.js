const route = "http://dghighqa-pc:1015/api/";

const copy = (data) => JSON.parse(JSON.stringify(data));
const axios = require("axios").default;
var bearer = "";

class POST {
    req; res; path;
    constructor(path, req) {
        this.path = path;
        this.req = req;
        return this;
    }
    async send() {
        let success;
        while (!success) {
            if (this.path != "auth/token")
                bearer = await this.bearer();
            try {
                return this.res = (await axios.post(
                    route + this.path,
                    this.req,
                    {
                        headers: {
                            Authorization: bearer
                        }
                    }
                )).data;
            } catch (e) {
                console.log(e);
                bearer = ""
            }
        }
    }
    async pdf() {
        let success;
        while (!success) {
            if (this.path != "auth/token")
                bearer = await this.bearer();
            try {
                return this.res = (await axios.post(
                    route + this.path,
                    this.req,
                    {
                        responseType: "arraybuffer",
                        responseEncoding: "binary",
                        headers: {
                            Authorization: bearer
                        }
                    }
                )).data;
            } catch (e) {
                bearer = ""
            }
        }
    }
    async append() {
        if (!this.res) return await this.send();
        let dupe = await new POST(this.path, this.req).send();
        let key = Object.keys(dupe).find(e => e != "NextPage");
        this.res[key].push(...dupe[key]);
        this.res["NextPage"] = dupe["NextPage"];
        return this.res;
    }
    async pages(valid) {
        await this.append();
        while (this.res["NextPage"] && (!valid || valid())) {
            this.req["Page"] = this.res["NextPage"];
            await this.append();
        }
        this.req["Page"] = ""
        return this.res;
    }
    async bearer() {
        if (!bearer) {
            let post = new POST("auth/token", {
                "Username": "APIFULL",
                "Password": "APIFULL"
            });
            bearer = "Bearer " + (await post.send())["AccessToken"];
        }
        return bearer;
    }
}

const APIreq = {
    "parts/list": {
        "PartName": "",
        "PartNumber": "",
        "Revision": "",
        "LastModificationDateFrom": null,
        "LastModificationDateTo": null,
        "PartGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "parts/get": {
        "PartGUID": "",
    },
    "jobs/list": {
        "PartGUIDs": "",
        "Number": "",
        "Status": -1,
        "JobGUIDs": "",
        "ActivationDateFrom": null,
        "ActivationDateTo": null,
        "DeliveryDateFrom": null,
        "DeliveryDateTo": null,
        "Page": "",
        "PageSize": 0
    },
    "lots/list": {
        "Number": "",
        "PartGUID": "",
        "JobGUID": "",
        "Status": -1,
        "AcceptanceStatus": "",
        "LotGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "samples/list": {
        "PartGUID": "",
        "LotGUID": "",
        "JobGUID": "",
        "SerialNumber": "",
        "Status": -1,
        "SampleGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "dims/list": {
        "PartGUID": "",
        "OperationGUIDs": "",
        "DimGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "dims/bulkload": {
        "PartGUID": "",
        "IgnoreInvalidLines": false,
        "InputDims": []
    },
    "results/list": {
        "SampleGUID": "",
        "JobGUID": "",
        "Status": 0,
        "ResultGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "results/bulkload": {
        "SampleGUID": "",
        "IgnoreInvalidLines": true,
        "InputResults": []
    },
    "procedures/list": {
        "Code": "",
        "Title": "",
        "DimGUID": "",
        "ProcedureGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "placeholders/list": {
        "DimGUIDs": "",
        "SampleGUIDs": "",
        "PlaceholderGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "placeholders/create": {
        "DimGUID": "",
        "SampleGUIDs": "",
    },
    "placeholders/delete": {
        "GUID": "",
        "DimGUID": "",
        "SampleGUIDs": ""
    },
    "operations/list": {
        "PartGUID": "",
        "Code": "",
        "Title": "",
        "WorkCellGUID": "",
        "MachineGUID": "",
        "OperationGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "gages/list": {
        "GageID": "",
        "Name": "",
        "GageGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "contacts/list": {
        "GageID": "",
        "Name": "",
        "GageGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "companies/list": {
        "AccountType": 0,
        "Name": "",
        "CompanyGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "drawings/list": {
        "PartGUID": "",
        "DrawingGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "filestorage/token": {
        "GUID": ""
    },
    "filestorage/download": {
        "Token": ""
    }
}

const API = (path) => {
    return new (class extends POST {
        path = path;
        req = { ...APIreq[path] } || {};
    })();
}

module.exports = {
    POST, APIreq, API
}