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

// the client map string the client name or token 
const webSockets: Set<WebSocket> = new Set();

let number: number = 0;

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

function createMessage(content: string, isBroadcast = false, sender = 'NS', clientName?: any): string {
    return JSON.stringify(new Message(content, isBroadcast, clientName, sender));
}


wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {

    const extWs = ws as ExtWebSocket;

    extWs.isAlive = true;

    ws.on('pong', () => {
        extWs.isAlive = true;
    });
    //connection is up, let's add a simple simple event
    ws.on('message', (msg: string) => {

        console.log(' the CLIENTS size  : ', CLIENTS.size)

        // from string to obj message
        const message = JSON.parse(msg) as Message;
        // get the client we wont to send the message 
        let webSocket = CLIENTS.get(message.clientName);
        console.log('the message ', message)
        // CLIENTS.forEach((value, key) => {
        //     console.log(`the key from client : ${key}`)
        //     console.log(`the value from client : ${value}`)
        //     if (key === message.clientName) {
        //         console.log('in if key === message.clientName')
        //         webSocket = value;
        //     }
        // })
        console.log('from webSocket clients', webSocket)
        if (webSocket != null) {
            webSocket = webSocket as WebSocket;
            console.log(`from message.sender :  ${message.sender}  to message.clientName :  ${message.clientName}`)
            webSocket.send(JSON.stringify(message))
        } else {
            // if the client not exsis on this server  publish to all instanse 
            redisPub.publish('message', JSON.stringify(message))
        }
        ws.send(createMessage(`You sent -> ${message.content}`, message.isBroadcast));
        // if the message not send to client in sec braek
    });

    //get the token from url 
    let url = request.url as string;
    console.log(`from web socket connction url :  ${url}`)
    let token = url.substring(8, url.length);
    console.log(`from web socket connction token value ${token}`)
    //get the client name conncted from redis 
    redisClient.GET(token, (err, result) => {
        let senderName = result
        console.log(`the result from redis get user by token : ${result}`)
        //insert new client to map clients

        setTimeout(() => {
            CLIENTS.set(senderName, ws)
        }, 2000);

        // send for client the user name connctions
        setTimeout(() => {
            wss.clients.forEach(client => {
                if (client != ws) {
                    console.log(createMessage(`user name connect : ${senderName}`, true, senderName, ''))
                    client.send(createMessage(`user name connect : ${senderName}`, true, senderName, ''))
                }
            })
        }, 2000);
        //create message to send 
        let message = createMessage('', true, senderName, '');
        //for server 2 to for publis the new user is connect
        redisPub.publish('add-user', JSON.stringify(message))
    })

    //send immediatly a feedback to the incoming connection    
    // ws.send(createMessage('Hi there, I am a WebSocket server'), (error) => {
    //     console.log(error)
    // });

    //send list of client to the new user 
    CLIENTS.forEach((value, key) => {
        ws.send(createMessage('', true, key, ''), (error) => {
            console.log(error)
        })
    });

    ws.on('error', (err) => {
        let socketDisconnected = err.target;
        CLIENTS.forEach((value, key) => {
            if (value === ws) {
                CLIENTS.delete(key);

                // TODO צריך לידאוג כאן לישלוח הודעה ללקוחות ולימחוק את אותו יוזר שהיתנתק ישלנו כבר את השם שלו שזה בעצם המפתח במתודה 

            }
        })
        console.warn(`Client disconnected - reason: ${err}`);
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

//start webSocket server
server.listen(process.env.PORT || 1001, () => {
    console.log(`Server started on port webSocket  ${server.address().port} :)`);
});


//redis sub 
redisSub.on("message", (channel, data) => {
    console.log("redisSub on message : the channel = " + channel + ' the data : ' + data);
    const message = JSON.parse(data) as Message;
    // setTimeout(() => {
    if (channel === 'message') {
        console.log(`from channel add=user : ${data}`)
        let toSendMessage = CLIENTS.get(message.clientName)
        if (toSendMessage) {
            toSendMessage.send(JSON.stringify(message))
        }
    } else if (channel === 'add-user') {
        let senderSocket = CLIENTS.get(message.sender)
        //if the client not exists hare push for all client the client connctions 
        if (!senderSocket) {
            console.log(`from channel add-user : ${data}`)
            console.log(`from channel add-user wss.clients :`, wss.clients)
            wss.clients.forEach(element => {
                if (element !== senderSocket) {
                    element.send(JSON.stringify(message));
                }
            })
        }
    }
    // }, 1000);
})
//start listen events
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
        console.log("login api users redis : ", reply);
        // return list from redis
        reply.forEach(element => {
            if (element === name) {
                result = true;
            }
        })
        console.log(`login the result from redis ${result}`)
        if (result == true) {
            let token = jwt.sign({ username: name }, 'shhhhh');
            //insert the token key and value the user name
            redisClient.set(token, name);
            console.log(`from api login token value ${token}`)
            response.cookie('token', token);
            response.send(token)
            return;
        } else {
            // לבדוק איך אפשר לשנות סטטוס לריספונס הבעיה שכול הפונקציות איסכרוניות ולכן אי אפשר לקבוע כאן תסטטוס 
            response.status(404)
            response.send(`the user name ${name} not exists`)
            return;
        }
    });
})

app.listen(8080, () => {
    console.log(`Server started on port 8080 rest api`)
})