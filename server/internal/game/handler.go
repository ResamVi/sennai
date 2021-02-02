package game

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"gitlab.com/resamvi/sennai/internal/protocol"
	"gitlab.com/resamvi/sennai/internal/track"
	"gitlab.com/resamvi/sennai/pkg/pubsub"
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
	msg := toJSON("cars", g.Clients())
	msg = appendKey("id", playerID, msg)

	inner, t, outer := track.New() // TODO: debug
	msg = appendKey("track", t, msg)
	msg = appendKey("inner", inner, msg)
	msg = appendKey("outer", outer, msg)

	err = protocol.Send(conn, protocol.INIT, msg)
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
		event := <-sub.Ch

		msg := new(bytes.Buffer)
		err := json.NewEncoder(msg).Encode(event.Payload)
		if err != nil {
			log.Fatalln(err)
		}

		err = protocol.Send(conn, event.Typ, msg.Bytes())
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

		prefix, payload := protocol.Parse(message)

		switch prefix {
		case protocol.INPUT:
			var input Input

			err := json.Unmarshal(payload, &input)
			if err != nil {
				log.Fatalln(err)
			}

			g.SetPlayerInput(input, playerID)
		case protocol.PLEASE: // TODO: Remove. Do not give players the ability to change the map
			//g.ChangeTrack()

			inner, t, outer := track.New()
			msg := toJSON("track", t)
			msg = appendKey("inner", inner, msg)
			msg = appendKey("outer", outer, msg)

			err = protocol.Send(conn, protocol.TRACK, msg)
			if err != nil {
				log.Println(err)
				return
			}
		case protocol.HELLO:
			var name string

			err := json.Unmarshal(payload, &name)
			if err != nil {
				log.Fatalln("HELLO: " + err.Error())
			}

			g.SetPlayerName(name, playerID)
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
		log.Fatal(err)
	}
	m[field] = item

	j, err := json.Marshal(m)
	if err != nil {
		log.Fatal("appendKey: " + err.Error())
	}

	return j
}
