export class Message {
    constructor(
        public content: string,
        public isBroadcast = false,
        public sender: string,
        //toekn
        public myName: string
    ) { }
}