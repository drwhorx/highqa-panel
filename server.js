var fs = require("fs")
var express = require('express');
var app = express();
var server = require('http').createServer(app);

app.use(express.static('./'))
app.get('/*', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    res.sendFile(__dirname + '/release.json');
});
server.listen(8080);