export class Message {
    constructor(
        public content: string,
        public isBroadcast: boolean,
        public token: string,
        public sender: string
    ) { }
}

