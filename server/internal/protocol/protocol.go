// Package protocol contains the details to serialize
// the data to a format understandable by both client and server
//
// Every messages is a string structured as `<prefix>|<data>`
package protocol

import (
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

// Available prefixes
// A prefix is the first part of every message and
// determines how the accompanied payload should be interpreted
// and what actions need to be taken
const (
	INIT      = "init"     // (server -> client) server sends initial data for the client to set up the game (response to HELLO)
	UPDATE    = "update"   // (server -> client) server broadcasts the current game state
	JOIN      = "join"     // (server -> client) server notifies everyone a new player joined
	LEAVE     = "leave"    // (server -> client) server notifies a player has left
	TRACK     = "newtrack" // (server -> client) server sends everyone the new track layout
	COUNTDOWN = "count"    // (server -> client) server counts down to zero before race starts
	CLOSEDOWN = "close"    // (server -> client) server counts down to zero before race will end
	BESTLIST  = "best"     // (server -> client) server sends the ranking
	REST      = "rest"     // (server -> client) server sends the countdown to the next game will start soon
	INPUT     = "input"    // (client -> server) client sends what arrow-keys are pressed
	HELLO     = "hello"    // (client -> server) client introduces himself and tells server his name
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return r.Host == "localhost:7999" || r.Host == "online.resamvi.io"
	},
}

type Conn struct {
	wsCon *websocket.Conn
	mu    sync.Mutex
}

// Upgrade upgrades the HTTP server connection to the WebSocket protocol.
//
// It retuns a connection that delegates everything to
// gorilla's implementation methods BUT allows for concurrent writes (otherwise
// gorilla may panic due to concurrent write to websocket connection, see:
// https://github.com/gorilla/websocket/issues/119)
func Upgrade(w http.ResponseWriter, r *http.Request) (*Conn, error) {
	wsCon, err := upgrader.Upgrade(w, r, nil)

	return &Conn{wsCon: wsCon}, err
}

// Close closes the underlying network connection without sending or waiting for a close message.
func (conn *Conn) Close() error {
	conn.mu.Lock()
	defer conn.mu.Unlock()

	return conn.wsCon.Close()
}

// ReadMessage reads a message sent from the client
func (conn *Conn) ReadMessage() (messageType int, p []byte, err error) {
	return conn.wsCon.ReadMessage()
}

// WriteMessage will transfer messages to the client in compliance with the protocol.
// An error may be returned because a websocket connection
// closed which needs to be handled by the caller (by e.g. closing the handler session)
func (conn *Conn) WriteMessage(typ string, str []byte) error {
	conn.mu.Lock()
	defer conn.mu.Unlock()

	data := append([]byte(typ+"|"), str...)
	return conn.wsCon.WriteMessage(websocket.TextMessage, data)
}

// Parse will extract the content of a message sent by the client
// which complies with the protocol
// TODO: We could convert json to the typed structs here
func Parse(message []byte) (string, []byte) {
	slice := strings.Split(string(message), "|")
	return slice[0], []byte(slice[1])
}
