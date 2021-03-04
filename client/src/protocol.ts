/**
 * Package protocol contains the details to serialize
 * the data to a format understandable by both client and server
 * 
 * Every messages is a string structured as `<prefix>|<data>`
 */
const Protocol = {    
    /**
     * Available prefixes
     * A prefix is the first part of every message and
     * determines how the accompanied payload should be interpreted
     * and what actions need to be taken
     */
    INIT:       "init",         // (server -> client) server sends initial data for the client to set up the game (response to HELLO)
    UPDATE:     "update",       // (server -> client) server broadcasts the current game state
    JOIN:       "join",         // (server -> client) server notifies everyone a new player joined
    LEAVE:      "leave",        // (server -> client) server notifies a player has left
    TRACK:      "newtrack",     // (server -> client) server sends everyone the new track layout
    COUNTDOWN:  "count",        // (server -> client) server counts down to zero before race starts
    CLOSEDOWN:  "close",        // (server -> client) server counts down to zero before race will end
    BESTLIST:   "best",         // (server -> client) server sends the ranking
    REST:       "rest",         // (server -> client) server sends the countdown to the next game will start soon
    INPUT:      "input",        // (client -> server) client sends what arrow-keys are pressed
    HELLO:      "hello",        // (client -> server) client introduces himself and tells server his name

    /**
     * send will transfer messages to the server in compliance with the protocol.
     * Messages according to protocol are structured as `<prefix>|<data>`
     */
    send: function(socket: WebSocket, type: string, payload: any)
    {
        if(socket.readyState !== WebSocket.OPEN)
            return
            
        socket.send(type + "|" + JSON.stringify(payload));
    },

    /**
     * parse will extract the content of a message sent by the client
     * which complies with the protocol
     */
    parse: function(message): [string, any]
    {
        return [message.split("|")[0], JSON.parse(message.split("|")[1])];
    }
}



export default Protocol;