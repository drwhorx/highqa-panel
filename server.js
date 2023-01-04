var fs = require("fs");
var express = require('express');
var app = express();
var server = require('http').createServer(app);

app.use(express.static('./content'))
app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/content/index.html');
});
server.listen(8080);