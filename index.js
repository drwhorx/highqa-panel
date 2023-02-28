var fs = require("fs");
const sql = require('mssql');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
    maxHttpBufferSize: 9e9
});
var rtrac = sql.connect("SERVER=tcp:192.168.111.215\\REALTRACSQL;UID=realtracsql;PWD=realtracsql;DATABASE=Realtrac;TrustServerCertificate=true");

app.use(express.static('./content'));
app.get('/', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.sendFile(__dirname + '/content/index.html');
});

io.on("connection", async client => {
    client.on('sql', async (query, data = [], callback) => {
        rtrac = await rtrac;
        try {
            let res = rtrac.request();
            for (let param of data)
                res = res.input(param.name, {
                    "str": sql.VarChar,
                    "int": sql.Int,
                    "float": sql.Float,
                    "datetime": sql.DateTime,
                    "date": sql.Date
                }[param.type], param.value)
            callback(await res.query(query));
        } catch (e) {
            callback(e);
        }
    });
    client.on('sql_procedure', async (name, input, output, callback) => {
        rtrac = await rtrac;
        try {
            let res = rtrac.request();
            for (let param of input)
                res = res.input(param.name, {
                    "str": sql.VarChar,
                    "int": sql.Int,
                    "float": sql.Float,
                    "datetime": sql.DateTime,
                    "date": sql.Date
                }[param.type], param.value)
            for (let param of output)
                res = res.output(param.name, {
                    "str": sql.VarChar,
                    "int": sql.Int,
                    "float": sql.Float,
                    "datetime": sql.DateTime,
                    "date": sql.Date
                }[param.type])
            callback(await res.execute(name));
        } catch (e) {
            callback(e);
        }
    })
});
server.listen(8080);
console.log("server live");