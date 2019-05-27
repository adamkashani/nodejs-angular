"use strict";
exports.__esModule = true;
var Message = /** @class */ (function () {
    function Message(content, isBroadcast, sender) {
        if (isBroadcast === void 0) { isBroadcast = false; }
        this.content = content;
        this.isBroadcast = isBroadcast;
        this.sender = sender;
    }
    return Message;
}());
exports.Message = Message;
