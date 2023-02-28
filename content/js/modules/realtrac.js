const RealTrac = {
    get: async (query, params = []) => {
        let res = await new Promise(resolve => {
            socket.emit("sql", query, params, resolve);
        });
        return res.recordsets?.length == 1 ? res.recordset : (res.recordsets || res);
    },
    procedure: async (name, input = [], output = []) => {
        let res = await new Promise(resolve => {
            socket.emit("sql_procedure", name, input, output, resolve);
        });
        return res;
    },
    get_jobs: async function () {
        return await this.get(
            "SELECT * FROM dbo.Job"
        )
    },
    get_stations: async function () {
        return await this.get(
            "SELECT * FROM dbo.WorkStation"
        )
    },
    get_active_jobs: async function () {
        return await this.get(
            "SELECT dbo.Job.*, dbo.Part.name AS partName, dbo.FileAttachment.imageSnapShot FROM dbo.Job "
                + "LEFT JOIN dbo.Part ON dbo.Job.part_id = dbo.Part.id "
                + "LEFT JOIN dbo.FileAttachment ON dbo.Part.primaryFileAttachment_id = dbo.FileAttachment.id "
                + "WHERE dbo.Job.closed <> 1 AND dbo.Job.paused <> 1"
        )
    },
    get_job_ops: async function ({ jobID }) {
        if (jobID) return await this.get(
            "SELECT * FROM dbo.Router WHERE job_id = @jobID",
            [{ name: "jobID", type: "int", value: jobID }]
        );
    },
    get_current_logins: async function () {
        return await this.get("SELECT * FROM dbo.TimeCard WHERE endDateTime < '1/2/1950'");
    },
    get_employee_exts: async function () {
        return await this.get(
            "SELECT dbo.Employee.*, myImage FROM dbo.Employee LEFT JOIN dbo.EmployeeExt ON dbo.EmployeeExt.employee_id = dbo.Employee.id"
        );
    },
    get_employee_sessions: async function (employeeID) {
        return await this.get(
            "SELECT * FROM dbo.Session WHERE employee_id = @employeeID AND endDateTime < '1/2/1950'",
            [{ name: "employeeID", type: "int", value: employeeID }]
        );
    },
    get_employee_logins: async function (employeeID) {
        return await this.get(
            "SELECT * FROM dbo.TimeCard WHERE employee_id = @employeeID AND endDateTime < '1/2/1950'",
            [{ name: "employeeID", type: "int", value: employeeID }]
        );
    },
    get_op_sessions: async function ({ opID }) {
        if (opID) return await this.get(
            "SELECT * FROM dbo.Session WHERE router_id = @opID",
            [{ name: "opID", type: "int", value: opID }]
        );
    },
    get_current_sessions: async function () {
        return await this.get("SELECT * FROM dbo.Session WHERE endDateTime < '1/2/1950'");
    },
    get_job: async function ({ jobNo, jobID }) {
        if (jobID) return (await this.get(
            "SELECT * FROM dbo.Job WHERE id = @jobID",
            [{ name: "jobID", type: "int", value: jobID }]
        ))[0]
        if (jobNo) return await this.get(
            "SELECT * FROM dbo.Job WHERE numberStr = @jobNo",
            [{ name: "jobNo", type: "str", value: jobNo }]
        )
    },
    get_part: async function ({ partID }) {
        if (partID) return (await this.get(
            "SELECT * FROM dbo.Part WHERE id = @partID",
            [{ name: "partID", type: "int", value: partID }]
        ))[0]
    },
    get_op: async function ({ opID }) {
        if (opID) return (await this.get(
            "SELECT * FROM dbo.Router WHERE id = @opID",
            [{ name: "opID", type: "int", value: opID }]
        ))[0]
    },
    get_center: async function ({ centerID }) {
        if (centerID) return (await this.get(
            "SELECT * FROM dbo.WorkCenter WHERE id = @centerID",
            [{ name: "centerID", type: "int", value: centerID }]
        ))[0]
    },
    get_employee: async function ({ employeeID, employeeNo }) {
        if (employeeID) return (await this.get(
            "SELECT * FROM dbo.Employee WHERE id = @employeeID",
            [{ name: "employeeID", type: "int", value: employeeID }]
        ))[0]
        if (employeeNo) return (await this.get(
            "SELECT * FROM dbo.Employee WHERE number = @employeeNo",
            [{ name: "employeeNo", type: "int", value: employeeNo }]
        ))[0]
    },
    get_station: async function ({ stationID }) {
        if (stationID) return (await this.get(
            "SELECT * FROM dbo.WorkStation WHERE id = @stationID",
            [{ name: "stationID", type: "int", value: stationID }]
        ))[0]
    },
    get_session: async function ({ sessionID }) {
        if (sessionID) return (await this.get(
            "SELECT * FROM dbo.Session WHERE id = @sessionID",
            [{ name: "sessionID", type: "int", value: sessionID }]
        ))[0]
    },
    get_customer: async function ({ customerID }) {
        if (customerID) return (await this.get(
            "SELECT * FROM dbo.Customer WHERE id = @customerID",
            [{ name: "customerID", type: "int", value: customerID }]
        ))[0]
    },
    get_file: async function ({ fileID }) {
        if (fileID) return (await this.get(
            "SELECT * FROM dbo.FileAttachment WHERE id = @fileID",
            [{ name: "fileID", type: "int", value: fileID }]
        ))[0]
    },
    punch_in_employee: async function ({ employeeID }) {
        if (employeeID) return (await this.procedure(
            "Timecard_LoginEmployee",
            [
                { name: "user_id", type: "int", value: 0 },
                { name: "employee_id", type: "int", value: employeeID }
            ]
        ))
    },
    punch_out_employee: async function ({ employeeID }) {
        if (employeeID) return (await this.procedure(
            "Timecard_LogoutEmployee",
            [
                { name: "user_id", type: "int", value: 0 },
                { name: "employee_id", type: "int", value: employeeID },
                { name: "editedBy_id", type: "int", value: 0 }
            ]
        ))
    },
    add_new_session: async function ({ employeeID, routerID, stationID }) {
        if (employeeID && routerID && stationID) return (await this.procedure(
            "Set_Session_LoginEmployee_v2",
            [
                { name: "user_id", type: "int", value: 0 },
                { name: "employee_id", type: "int", value: employeeID },
                { name: "routerID", type: "int", value: routerID },
                { name: "workStationId", type: "int", value: stationID },
                { name: "specialLoginType", type: "int", value: 0 },
                { name: "employeeSpecialOp", type: "int", value: 0 }
            ]
        )).returnValue
    },
    set_session_qty: async function ({ sessionID, good, scrap }) {
        if (sessionID <= 0 || !sessionID) return;
        if (sessionID && good !== undefined) return await this.get(
            "UPDATE dbo.Session SET pieceCount = @good WHERE id = @sessionID",
            [
                { name: "sessionID", type: "int", value: sessionID },
                { name: "good", type: "int", value: good }
            ]
        )
        if (sessionID && scrap !== undefined) return await this.get(
            "UPDATE dbo.Session SET scrapCount = @scrap WHERE id = @sessionID",
            [
                { name: "sessionID", type: "int", value: sessionID },
                { name: "scrap", type: "int", value: scrap }
            ]
        )
    },
    set_session_break: async function ({ sessionID, toBreak }) {
        if (sessionID) return (await this.procedure(
            "Set_SessionToRunOrBreak",
            [
                { name: "session_id", type: "int", value: sessionID },
                { name: "status", type: "int", value: toBreak ? 2 : 1 }
            ]
        ))
    },
    set_session_end: async function ({ sessionID, closeOp }) {
        if (!sessionID) return;
        let session = await this.get_session({ sessionID });
        let op = await this.get_op({ opID: session.router_id });
        return (await this.procedure(
            "Set_Session_LogoutEmployee",
            [
                { name: "user_id", type: "int", value: 0 },
                { name: "session_id", type: "int", value: sessionID },
                { name: "employee_id", type: "int", value: session.employee_id },
                {
                    name: "operationClosed", type: "int",
                    value: +(closeOp === undefined ? new Date(op.dateClosed) > new Date("1/2/1950") : closeOp)
                },
                { name: "scrapCount", type: "int", value: session.scrapCount },
                { name: "pieceCount", type: "int", value: session.pieceCount },
                { name: "ncObservation", type: "int", value: session.ncObservation },
                { name: "comment", type: "str", value: session.comment },
                { name: "IsSetupOp", type: "int", value: session.isSetupOp }
            ]
        ))
    },
    set_session_comment: async function ({ sessionID, comment }) {
        if (sessionID) return await this.get(
            "UPDATE dbo.Session SET comment = @comment WHERE id = @sessionID",
            [
                { name: "sessionID", type: "int", value: sessionID },
                { name: "comment", type: "str", value: comment }
            ]
        )
    }
}