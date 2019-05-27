export class Message {
    constructor(
        public content: string,
        public isBroadcast = false,
        public sender: string,
        // public clientNameToSend:string,
        public myName: string
    ) { }
}