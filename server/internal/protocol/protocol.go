// Package protocol contains the details to serialize
// the data to a format understandable by both client and server
//
// Every messages is a string structured as `<prefix>|<data>`
package protocol

import (
	"strings"

	"github.com/gorilla/websocket"
)

// Available prefixes
// A prefix is the first part of every message and
// determines how the accompanied payload should be interpreted
// and what actions need to be taken
const (
	INIT   = "init"     // (server -> client) server sends initial data for the client to set up the game
	UPDATE = "update"   // (server -> client) server broadcasts the current game state
	JOIN   = "join"     // (server -> client) server notifies everyone a new player joined
	LEAVE  = "leave"    // (server -> client) server notifies a player has left
	TRACK  = "newtrack" // (server -> client) server sends everyone the new track layout
	INPUT  = "input"    // (client -> server) client sends what arrow-keys are pressed
	PLEASE = "trackpls" // (client -> server) client demands a new track should be generated
	HELLO  = "hello"    // (client -> server) client introduces himself and tells server his name
)

// Send will transfer messages to the client in compliance with the protocol.
// An error may be returned because a websocket connection
// closed which needs to be handled by the caller (by e.g. closing the handler session)
func Send(conn *websocket.Conn, typ string, str []byte) error {
	data := append([]byte(typ+"|"), str...)
	return conn.WriteMessage(websocket.TextMessage, data)
}

// Parse will extract the content of a message sent by the client
// which complies with the protocol
// TODO: We could convert json to the typed structs here
func Parse(message []byte) (string, []byte) {
	slice := strings.Split(string(message), "|")
	return slice[0], []byte(slice[1])
}
