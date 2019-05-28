import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as redis from 'redis';
import { Message } from './message';
import * as jwt from "jsonwebtoken";
import * as bodyParser from "body-parser"; // pull information from HTML POST (express4)
import * as cookieParser from "cookie-parser";

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

    const extWs = ws as ExtWebSocket;

    extWs.isAlive = true;

    ws.on('pong', () => {
        extWs.isAlive = true;
    });

    //connection is up, let's add a simple simple event
    ws.on('message', (msg: string) => {
        // from string to obj message
        const message = JSON.parse(msg) as Message;
        let webSocket = CLIENTS.get(message.sender)
        if (webSocket) {
            webSocket.send(message)
        } else {
            redisPub.publish('message', JSON.stringify(message))
        }

        // console.log("request url on message",request.url)
        // setTimeout(() => {
        //     if (message.isBroadcast) {
        //         //send back the message to the other clients
        //         wss.clients
        //             .forEach(client => {
        //                 if (client != ws) {
        //                     // console.log(client)
        //                     client.send(createMessage(message.content, true, message.sender, message.token));
        //                     // client.send(createMessage(JSON.stringify(client), true, message.sender));
        //                 }
        //             });
        //     }
        ws.send(createMessage(`You sent -> ${message.content}`, message.isBroadcast));
        // if the message not send to client in sec braek
    });

    //get the token from url 
    let url = request.url as string;
    let str = url.substring(8, url.length);
    console.log(`token : ${str}`)
    //get the client name conncted from redis 

    redisClient.GET(str, (err, reply) => {
        let senderName = reply
        console.log(reply)
        CLIENTS.set(senderName, ws)
        // send for client the user name connctions
        wss.clients.forEach(element => {
            element.send(createMessage(`user name connect : ${senderName}`, true, senderName, ''))
        })
        redisPub.publish('add-user', senderName)
    })



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
server.listen(process.env.PORT || 1001, () => {
    console.log(`Server started on port webSockey ${server.address().port} :)`);
});


//redis sub 
redisSub.on("message", (channel, data) => {
    console.log(channel + 'the data : ' + data);

    if (channel === 'add-user') {
        // console.log(`from channel add-user : ${data}`)
        // wss.emit()
    } else if (channel === 'message') {
        const message = JSON.parse(data) as Message;
        // console.log(`from channel add=user : ${data}`)
    }

})
redisSub.subscribe("add-user");
redisSub.subscribe("message");

redisSub.on("subscribe", function (channel, count) {
    console.log("Subscribed to " + channel + ". Now subscribed to " + count + " channel(s).");
});

// create api for login 
app.post('/login', (request, response) => {
    let name: string = request.body.name;
    let result: boolean;
    redisClient.lrange('users', 0, -1, function (err, reply) {
        console.log("users redis : ", reply);
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
            response.cookie('token', token);
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

app.listen(8080, () => {
    console.log(`Server started on port 8080 rest api`)
})