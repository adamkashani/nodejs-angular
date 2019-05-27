export class Message {
    constructor(
        public sender: string,
        public content: string,
        public isBroadcast = false,
        public receiver:string,
    ) { }
}