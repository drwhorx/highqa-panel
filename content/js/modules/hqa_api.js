const route = "http://dghighqa-pc:1015/api/";

const copy = (data) => JSON.parse(JSON.stringify(data));

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
                document.bearer = await this.bearer();
            try {
                this.res = await $.ajax({
                    url: route + this.path,
                    type: 'POST',
                    data: JSON.stringify(this.req),
                    contentType: "application/json; charset=utf-8",
                    xhrFields: this.path == "filestorage/download" ? ({
                        responseType: 'blob'
                    }) : null,
                    success: () => success = true,
                    headers: {
                        Authorization: document.bearer
                    }
                });
            } catch (err) {
                await timeout(500);
            }
            if (!success)
                document.bearer = "";
            else
                return this.res;
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
        if (!document.bearer) {
            let post = new POST("auth/token", {
                "Username": "APIFULL",
                "Password": "APIFULL"
            });
            document.bearer = "Bearer " + (await post.send())["AccessToken"];
        }
        return document.bearer;
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
    "parts/clone": {
        "PartGUID": "",
        "CopyMaterials": false,
        "CopyResults": false,
        "CopyReports": false,
        "CopyDocuments": false,
        "CopyDefaultSettings": false
    },
    "parts/delete": {
        "PartGUIDs": "",
        "DeleteCompletely": false
    },
    "parts/set": {
        "InputPart": {
            "GUID": "",
            "PartNumber": "",
            "PartName": "",
            "PartRevisionLevel": "",
            "PartComments": "",
            "CustomerGUID": "",
            "File": "",
            "ERPID": "",
            "BarcodeID": "",
            "PartCategoryGUID": ""
        }
    },
    "jobs/set": {
        "InputJob": {
            "GUID": "",
            "PartGUID": "",
            "Number": "",
            "Title": "",
            "Revision": "",
            "Quantity": 0,
            "Status": 0,
            "ActivationDate": null,
            "DeliveryDate": null,
            "ERPID": "",
            "BarcodeID": "",
            "AQLMode": 0,
            "AQLTableGUID": "",
            "InspectionLevel": 0
        }
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
    "lots/set": {
        "InputLot": {
            "GUID": "",
            "JobGUID": "",
            "Number": "",
            "Status": 0,
            "StartDate": null,
            "DueDate": null,
            "Size": 0,
            "ERPID": "",
            "BarcodeID": "",
            "SamplesPerHour": 0,
            "HoursPerShift": 0,
            "QualityStage": 0,
            "QualityLevel": 0,
            "AQLTableGUID": "",
            "InspectionLevel": 0
        }
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
    "samples/set": {
        "AddPlaceholders": false,
        "InputSample": {
            "GUID": "",
            "PartGUID": "",
            "LotGUID": "",
            "JobGUID": "",
            "SerialNumber": "",
            "CavityNumber": 0,
            "MachineNumber": "",
            "FixtureNumber": "",
            "Status": 0,
            "ERPID": "",
            "BarcodeID": ""
        }
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
    "results/delete": {
        "ResultGUIDs": "",
    },
    "results/bulkload": {
        "SampleGUID": "",
        "IgnoreInvalidLines": true,
        "InputResults": []
    },
    "results/getattachments": {
        "ResultGUID": ""
    },
    "results/addattachments": {
        "ResultGUID": "",
        "Files": ""
    },
    "ncr/list": {
        "JobGUID": "",
        "LotGUID": "",
        "Status": 0,
        "CreationDateFrom": null,
        "CreationDateTo": null,
        "ResponseDateFrom": null,
        "ResponseDateTo": null,
        "Number": "",
        "SampleGUIDs": "",
        "NCRGUIDs": "",
        "Page": "",
        "PageSize": 0
    },
    "ncr/set": {
        "InputNCR": {
            "GUID": "",
            "JobGUID": "",
            "LotGUID": "",
            "Number": "",
            "Status": 0,
            "CreationDate": null,
            "CreatedByGUID": "",
            "ResponseDate": null,
            "AssignedToGUID": "",
            "WorkCellGUID": "",
            "InspCenterGUID": "",
            "BarcodeID": "",
            "ERPID": "",
            "Comments": ""
        }
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
    "operations/set": {
        "CopyOperationGUID": "",
        "DimGUIDs": "",
        "InputOperation": {
            "GUID": "",
            "PartGUID": "",
            "WorkCellGUID": "",
            "MachineGUID": "",
            "Code": "",
            "Title": "",
            "Description": "",
            "ERPID": "",
            "BarcodeID": ""
        }
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