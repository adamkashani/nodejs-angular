"use strict";
exports.__esModule = true;
var express = require("express");
var http = require("http");
var WebSocket = require("ws");
var message_1 = require("./message");
var app = express();
//initialize a simple http server
var server = http.createServer(app);
//initialize the WebSocket server instance
var wss = new WebSocket.Server({ server: server });
function createMessage(content, isBroadcast, sender) {
    if (isBroadcast === void 0) { isBroadcast = false; }
    if (sender === void 0) { sender = 'NS'; }
    return JSON.stringify(new message_1.Message(content, isBroadcast, sender));
}
wss.on('connection', function (ws) {
    ws.eventNames();
    var extWs = ws;
    extWs.isAlive = true;
    ws.on('pong', function () {
        extWs.isAlive = true;
    });
    //connection is up, let's add a simple simple event
    ws.on('message', function (msg) {
        var message = JSON.parse(msg);
        setTimeout(function () {
            if (message.isBroadcast) {
                //send back the message to the other clients
                wss.clients
                    .forEach(function (client) {
                        if (client != ws) {
                            console.log(client);
                            client.send(createMessage(message.content, true, message.sender));
                        }
                    });
            }
            ws.send(createMessage("You sent -> " + message.content, message.isBroadcast));
        }, 1000);
    });
    //send immediatly a feedback to the incoming connection    
    ws.send(createMessage('Hi there, I am a WebSocket server'));
    ws.on('error', function (err) {
        console.warn("Client disconnected - reason: " + err);
        wss.clients;
    });
});
setInterval(function () {
    wss.clients.forEach(function (ws) {
        var extWs = ws;
        if (!extWs.isAlive)
            return ws.terminate();
        extWs.isAlive = false;
        ws.ping(null, undefined);
    });
}, 10000);
//start our server
server.listen(process.env.PORT || 8999, function () {
    console.log("Server started on port " + server.address().port + " :)");
});
