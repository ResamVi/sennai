package game

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"

	"gitlab.com/resamvi/sennai/internal/player"
	"gitlab.com/resamvi/sennai/internal/protocol"
	"gitlab.com/resamvi/sennai/pkg/pubsub"
)

// ServeWs should be used and served by a http server to handle websocket requests
func ServeWs(g *Game, w http.ResponseWriter, r *http.Request) {
	log.Println("Request to /ws")

	// change to websocket connection
	conn, err := protocol.Upgrade(w, r)
	if err != nil {
		log.Fatalln("UPGRADE: " + err.Error())
	}
	defer conn.Close()

	// Register on server side
	playerID, sub := g.Connect()
	defer g.Disconnect(playerID, sub)

	// Start playing. Sending (write) state and receiving (read) inputs
	go write(g, sub, conn)
	read(g, conn, playerID)
}

// write will push changes of the game state (being notified thanks to the
// supplied subscription) to the websocket connection to be sent to the client
func write(g *Game, sub *pubsub.Subscription, conn *protocol.Conn) {
	for {
		event := <-sub.Ch

		msg := new(bytes.Buffer)
		err := json.NewEncoder(msg).Encode(event.Payload)
		if err != nil {
			log.Fatalln("WRITE: " + err.Error())
		}

		err = conn.WriteMessage(event.Typ, msg.Bytes())
		if err != nil {
			log.Println(err)
			break
		}

		if event.Typ != protocol.UPDATE {
			log.Printf("SENT: %s - %s\n", event.Typ, msg.String())
		}
	}
}

// read will pull messages from the websocket connection sent from the client
// to parse and act upon them
func read(g *Game, conn *protocol.Conn, playerID int) {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		prefix, payload := protocol.Parse(message)

		switch prefix {
		case protocol.INPUT:
			var input player.Input

			err := json.Unmarshal(payload, &input)
			if err != nil {
				log.Fatalln("INPUT: " + err.Error())
			}

			g.SetPlayerInput(input, playerID)
		case protocol.HELLO:
			var name string

			err := json.Unmarshal(payload, &name)
			if err != nil {
				log.Fatalln("HELLO: " + err.Error())
			}

			g.SetPlayerName(name, playerID)

			// Send init/setup data to client
			// TODO: Use anonymous structs
			msg := toJSON("cars", g.Players())
			msg = appendKey("track", g.Track(), msg)
			msg = appendKey("id", playerID, msg)

			err = conn.WriteMessage(protocol.INIT, msg)
			if err != nil {
				log.Println(err)
				return
			}
		}

		log.Printf("RECEIVED: %s\n", message)
	}
}

// toJSON creates a JSON object with the provided field as key and item as value
func toJSON(field string, item interface{}) []byte {
	m := make(map[string]interface{})
	m[field] = item

	j, err := json.Marshal(m)
	if err != nil {
		log.Fatal("toJSON: " + err.Error())
	}

	return j
}

// appendKey adds a key to the provided json object `data` with `item as value
func appendKey(field string, item interface{}, data []byte) []byte {
	var m map[string]interface{}

	err := json.Unmarshal(data, &m)
	if err != nil {
		log.Fatal("appendKey (unmarshal): " + err.Error())
	}
	m[field] = item

	j, err := json.Marshal(m)
	if err != nil {
		log.Fatal("appendKey: " + err.Error())
	}

	return j
}
