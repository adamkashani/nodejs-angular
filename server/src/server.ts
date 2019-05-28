import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as redis from 'redis';
import { Message } from './message';
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { error } from 'util';
import * as bodyParser from "body-parser"; // pull information from HTML POST (express4)
import * as cookieParser from "cookie-parser";
import { SSL_OP_NO_COMPRESSION } from 'constants'
// import * as socketio from "socket.io";

// create redis client
const redisClient = redis.createClient();
const redisPub = redis.createClient();
const redisSub = redis.createClient();


const app = express();

//initialize a simple http server
const server = http.createServer(app);

//body parser to json
app.use(bodyParser.json());

//use cookie parser middleware
app.use(cookieParser());
// app.use(cookieParser("SECRET_GOES_HERE"));

//enable Access-Control-Allow-Origin for angular
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
// the client map string the client name or token 
const CLIENTS: Map<string, WebSocket> = new Map();
// token to get the name of user
const clientToken: Map<string, string> = new Map();

let number: number = 0;

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

function createMessage(content: string, isBroadcast = false, sender = 'NS', clientName?: any): string {
    return JSON.stringify(new Message(content, isBroadcast, sender, clientName));
}


wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
    console.log('ws.url : ' + ws.url);
    ws.url
    console.log('full path' + wss.path);
    // console.log('path start with token' + wss.path.startsWith('token'));
    console.log(request.rawHeaders);
    // let num = wss.path.indexOf('token=')
    // let str = wss.path.slice(num);
    // console.log(`the token : ${str}`)

    // console.log(request.cookies.token);
    // CLIENTS.set('almog' + number, ws);
    // number++;
    console.log('ws.eventNames : ' + ws.eventNames());
    console.log('CLIENTS.keys map : ' + CLIENTS.keys.toString());

    const extWs = ws as ExtWebSocket;

    extWs.isAlive = true;

    ws.on('pong', () => {
        extWs.isAlive = true;
    });

    //connection is up, let's add a simple simple event
    ws.on('message', (msg: string) => {
        // from string to obj message
        const message = JSON.parse(msg) as Message;
        setTimeout(() => {
            if (message.isBroadcast) {
                //send back the message to the other clients
                wss.clients
                    .forEach(client => {
                        if (client != ws) {
                            console.log(client)
                            client.send(createMessage(message.content, true, message.sender, message.myName));
                            // client.send(createMessage(JSON.stringify(client), true, message.sender));
                        }
                    });
            }
            ws.send(createMessage(`You sent -> ${message.content}`, message.isBroadcast));
            // if the message not send to client in sec braek
        }, 1000);
    });

    //send immediatly a feedback to the incoming connection    
    ws.send(createMessage('Hi there, I am a WebSocket server'), (error) => {
        console.log(error)
    });

    ws.on('error', (err) => {
        console.warn(`Client disconnected - reason: ${err}`);
        // wss.clients
    })
});


// run all the sockets client and remove if the client not connect 
// TODO remove from CLIENTS the web socket 
setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {

        const extWs = ws as ExtWebSocket;

        if (!extWs.isAlive) return ws.terminate();

        extWs.isAlive = false;
        ws.ping(null, undefined);
    });
}, 10000);

//start our server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port webSockey ${server.address().port} :)`);
});


//redis sub 
redisSub.on("message", (channel, data) => {
    console.log(channel + 'the data : ' + data);

    if (channel === 'add-user') {
        console.log(`from channel add-user : ${data}`)
        // wss.emit()
    } else if (channel === 'message') {
        const message = JSON.parse(data) as Message;
        console.log(`from channel add=user : ${data}`)
    }

})
redisSub.subscribe("add-user");
redisSub.subscribe("message");

redisSub.on("subscribe", function (channel, count) {
    console.log("Subscribed to " + channel + ". Now subscribed to " + count + " channel(s).");
});

//redis pub
setInterval(function () {
    let no = Math.floor(Math.random() * 100);
    redisPub.publish('add-user', `Generated Chat random no ${no}` );
}, 5000);


// create api for login 
app.post('/login', (request, response) => {

    // let cookieToken = request.cookies.token;

    // if (cookieToken = ! null) {
    //     response.sendStatus(403);
    //     response.send("the client alredy loggin ")
    // }


    console.log(request.body)
    let name: string = request.body.name;
    console.log(request.cookies);
    console.log(name);
    let result: boolean;
    redisClient.lrange('usersName', 0, -1, function (err, reply) {
        console.log(reply);
        // return list from redis
        reply.forEach(element => {
            if (element === name) {
                result = true;
            }
        })
        console.log(`the result from redis ${result}`)
        if (result == true) {
            //return token or create 
            let token = jwt.sign({ username: name }, 'shhhhh');
            //insert the token key and value the user name
            redisClient.set(token, name);
            // response.cookie('token', token);
            response.send(token)
            console.log(response)
            return;
        } else {
            // לבדוק איך אפשר לשנות סטטוס לריספונס הבעיה שכול הפונקציות איסכרוניות ולכן אי אפשר לקבוע כאן תסטטוס 
            response.status(404)
            response.send(`the user name ${name} not exists`)
            console.log(response)
            return;
        }
    });
})

app.get('/test', (req, res) => {
    let token = req.cookies.token;
    console.log(`the token value ${token}`)
    redisClient.GET(token, (error, replt) => {
        console.log(replt)
        console.log(error)
    })

})

app.listen(8080, () => {
    console.log(`Server started on port 8080 rest api`)
})