import { Injectable } from '@angular/core';
import { Message } from '../models/message';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebSocketSubject } from 'rxjs/observable/dom/WebSocketSubject';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ClientService {

  userName: string;
  urlLogin: string = 'http://localhost:8080/login';
  //string = name user chet , all the message between clients
  mapChet: Map<string, Array<Message>> = new Map();

  serverMessages: Array<Message> = [];

  listOfUsers: Array<string> = [];

  token: string;

  isBroadcast: boolean = true;

  public sender = '';

  public socket$: WebSocketSubject<Message>;

  constructor(private httpClient: HttpClient) {
    this.token = sessionStorage.getItem('token')
    if (this.token) {
      if (this.socket$) {
        this.onLogin();
      }
    }

  }

  onLogin() {
    this.socket$ = new WebSocketSubject(`ws://localhost:1001?token=${this.token}`);
    this.socket$
      .subscribe(
        (message) => {
          //when the new client connctiont to the websocket
          if (message.isBroadcast) {
            this.listOfUsers.push(message.sender)
            // read ho send the message
            let chetList = this.mapChet.get(message.sender);
            if (chetList) {
              //אולי נשמור פה רק את תוכן ההודעה שנישלחה
              chetList.push(message)
            } else {
              let chetList = new Array<Message>();
              chetList.push(message)
              this.mapChet.set(message.sender, chetList);
            }
          } else {
            this.serverMessages.push(message);
            // read ho send the message
            let chetList = this.mapChet.get(message.sender);
            //אולי נשמור פה רק את תוכן ההודעה שנישלחה
            chetList.push(message)
          }
        },
        (err) => console.error(err),
        () => console.warn('Completed!')
      );
  }

  login(userName: string) {
    console.log(userName)
    // let headers = new HttpHeaders();
    // headers = headers.set('Content-Type', 'application/json');
    return this.httpClient.post(this.urlLogin, { 'name': userName }, { responseType: 'text' });
  }

  getUserName(): string {
    return this.userName;
  }
}
