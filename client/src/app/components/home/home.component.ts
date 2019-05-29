import { Component, OnInit } from '@angular/core';
import { ClientService } from 'src/app/service/client.service';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(public clientService: ClientService) { }

  ngOnInit() {
     this.clientService.onLogin();
     this.clientService.listOfUsers
     this.clientService.isBroadcast = false;
  }

  // to change the chaet text 
  changeChatClient(clientName: string) {
    let serverMessages = this.clientService.mapChet.get(clientName)
    this.clientService.serverMessages = serverMessages;
    this.clientService.sender = clientName
  } 

}
