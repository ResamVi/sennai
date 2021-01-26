package game

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"gitlab.com/resamvi/sennai/pkg/pubsub"
	"gitlab.com/resamvi/sennai/pkg/util"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return r.Host == "localhost:7999" || r.Host == "online.resamvi.io"
	},
}

// ServeWs should be used and served by a http server to handle websocket requests
func ServeWs(g *Game, w http.ResponseWriter, r *http.Request) {
	log.Println("Request to /ws")

	// change to websocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatalln(err)
	}
	defer conn.Close()

	// Register on server side
	playerID, sub := g.Connect()
	defer g.Disconnect(playerID, sub)

	// Send init/setup data to client
	var msg []byte

	msg, err = util.ToJSON("cars", g.Clients(), msg)
	if err != nil {
		log.Fatalln(err)
	}

	msg, err = util.AppendKey("id", playerID, msg)
	if err != nil {
		log.Fatalln(err)
	}

	err = send(conn, initevent, string(msg))
	if err != nil {
		log.Println(err)
		return
	}

	// Start playing. Sending (write) state and receiving (read) inputs
	go write(g, sub, conn)
	read(g, conn, playerID)
}

// write will push changes of the game state (being notified thanks to the
// supplied subscription) to the websocket connection to be sent to the client
func write(g *Game, sub *pubsub.Subscription, conn *websocket.Conn) {
	for {
		msg := new(bytes.Buffer)

		event := <-sub.Ch

		err := json.NewEncoder(msg).Encode(event.Payload)
		if err != nil {
			log.Fatalln(err)
		}

		err = send(conn, event.Typ, msg.String())
		if err != nil {
			log.Println(err)
			break
		}
	}
}

// read will pull messages from the websocket connection sent from the client
// to parse and act upon them
func read(g *Game, conn *websocket.Conn, playerID int) {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		slice := strings.Split(string(message), "|")
		event, payload := slice[0], slice[1]

		switch event {
		case inputevent:
			parseInput(g, payload, playerID)
		}

		log.Printf("RECEIVED: %s\n", message)
	}
}

func parseInput(g *Game, payload string, playerID int) {

	var input Input

	err := json.Unmarshal([]byte(payload), &input)
	if err != nil {
		log.Fatalln(err)
	}

	g.SetPlayerInput(input, playerID)
}

// helper function to send messages according to the protocol
// messages according to protocol are structured as `<eventtype>|<data>`
//
// an error may be returned because a websocket connection
// closed which needs to be handled by the caller
func send(conn *websocket.Conn, typ string, str string) error {
	return conn.WriteMessage(websocket.TextMessage, []byte(typ+"|"+str))
}
