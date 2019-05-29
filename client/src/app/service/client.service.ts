import { Injectable } from '@angular/core';
import { Message } from '../models/message';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebSocketSubject } from 'rxjs/observable/dom/WebSocketSubject';
import { Observable } from 'rxjs';
import { CanActivate } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class ClientService implements CanActivate {


  // TODO שיהיה אםפשר להפעיל רק כאשר ישלך תוקן קיים
  canActivate(route: import("@angular/router").ActivatedRouteSnapshot, state: import("@angular/router").RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  // to send the mesaage
  clientName: string;

  urlLogin: string = 'http://localhost:8080/login';
  //string = name user chet , all the message between clients
  mapChat: Map<string, Array<Message>> = new Map();

  serverMessages: Array<Message> = [];

  listOfUsers: Set<string> = new Set();

  token: string;

  isBroadcast: boolean = true;

  public sender = '';

  public socket$: WebSocketSubject<Message>;

  constructor(private httpClient: HttpClient) {

    this.token = sessionStorage.getItem('token')
    this.sender = sessionStorage.getItem('userName')
    if (this.token) {
      if (this.socket$) {
        this.onLogin();
        this.isBroadcast = false;
      }
    }


    // this.listOfUsers.push('almog')
    // this.listOfUsers.push('adam')
    // this.listOfUsers.push('israel')
  }

  onLogin() {
    this.socket$ = new WebSocketSubject(`ws://localhost:1001?token=${this.token}`);
    this.socket$
      .subscribe(
        (message) => {
          //when the new client connctiont to the websocket
          if (message.isBroadcast) {
            this.listOfUsers.add(message.sender)
          } else {
            // read ho send the message
            let chatList = this.mapChat.get(message.sender);
            if (chatList) {
              //אולי נשמור פה רק את תוכן ההודעה שנישלחה
              chatList.push(message)
            } else {
              let chatList = new Array<Message>();
              chatList.push(message)
              this.mapChat.set(message.sender, chatList);
            }
          }
        },
        (err) => console.error(err),
        () => console.warn('Completed!')
      );
  }

  addMyMessage(myMessage: string) {
    let listMessage = this.mapChat.get(this.clientName)
    if (listMessage) {
      listMessage.push(new Message(this.sender, myMessage, false, this.clientName))
    } else {
      listMessage = new Array<Message>();
      listMessage.push(new Message(this.sender, this.sender + " : " + myMessage, false, this.clientName))
      this.mapChat.set(this.clientName, listMessage);
    }
  }

  login(userName: string) {
    console.log(userName)
    // let headers = new HttpHeaders();
    // headers = headers.set('Content-Type', 'application/json');
    return this.httpClient.post(this.urlLogin, { 'name': userName }, { responseType: 'text' });
  }
}
