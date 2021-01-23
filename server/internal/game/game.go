package game

import (
	"log"
	"math/rand"
	"sync"
	"time"

	"gitlab.com/resamvi/sennai/pkg/pubsub"
)

const buffersize = 10

// used to categorize data sent between client and server
// appended to messages to supply context
const (
	noevent     = ""
	initevent   = "init"
	updateevent = "update"
	joinevent   = "join"
	leaveevent  = "leave"

	inputevent = "input"
)

// Game maintains a reference to all connected players
type Game struct {
	clients sync.Map
	clock   *time.Ticker
	events  *pubsub.Pubsub
}

// New creates a new game
func New() *Game {
	return &Game{
		clients: sync.Map{},
		clock:   time.NewTicker(30 * time.Millisecond),
		events:  pubsub.New(),
	}
}

// Run starts listening to client connection requests
func (g *Game) Run() {
	for {
		select {
		case <-g.clock.C:
			g.Update()
			g.events.Publish(updateevent, g.Clients())
		}
	}
}

// Update calculates the next frame given from the previous state and the registered inputs
// Consider a call to Update a heart beat with each call being a game cycle
func (g *Game) Update() {
	g.clients.Range(func(k interface{}, v interface{}) bool {
		player := v.(*Player)
		player.Update()

		return true
	})
	//fmt.Printf("%v\n", g.Clients())
}

// Connect registers a new connection to the game.
// It returns the assigned playerID of this connection as well as
// a channel to receive the latest game events that occured
func (g *Game) Connect() (int, *pubsub.Subscription) {
	id := -1
	for i := 0; ; i++ {
		if _, ok := g.clients.Load(i); !ok {
			id = i
			break
		}
	}

	player := Player{
		ID:       id,
		X:        4 + rand.Intn(50), // TODO: This is hardcoded from a track
		Y:        880 + rand.Intn(50),
		Rotation: 7,
		input:    Input{Left: false, Right: false, Up: false, Down: false},
	}
	g.clients.Store(id, &player)

	g.events.Publish(joinevent, player)
	sub := g.events.Subscribe()

	log.Println("New Connection with id:", id)
	return id, sub
}

// Disconnect cleans up after client leaves
func (g *Game) Disconnect(id int, sub *pubsub.Subscription) {
	g.clients.Delete(id)
	g.events.Publish(leaveevent, id)
	sub.Unsubscribe()

	log.Println("Disonnected client id:", id)
}

// SetPlayerInput is used when an input command from a player
// is registered and applied on the next game cycle
func (g *Game) SetPlayerInput(input Input, playerID int) {
	player, ok := g.clients.Load(playerID)

	if !ok {
		log.Fatalf("setting input for unknown playerID: %d", playerID)
	}

	new := player.(*Player)
	new.input = input

	g.clients.Store(playerID, new)
}

// Clients returns the currently connected clients as a slice
func (g *Game) Clients() []Player {
	result := make([]Player, 0)
	g.clients.Range(func(k interface{}, v interface{}) bool {
		item := *v.(*Player)
		result = append(result, item)
		return true
	})

	return result
}
