var fs = require("fs")
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static('./content'));
app.get('/', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    res.sendFile(__dirname + '/content/index.html');
});

io.on("connection", socket => {
    socket.on("sql", sql => console.log("sql"))
});
server.listen(8080);