// Package game contains the rules and entities of the domain
// The domain of this game is an arcade racing sim
package game

import (
	"log"
	"math/rand"
	"sync"
	"time"

	"gitlab.com/resamvi/sennai/internal/protocol"
	"gitlab.com/resamvi/sennai/internal/track"
	"gitlab.com/resamvi/sennai/pkg/pubsub"
)

const buffersize = 50

// Game maintains a reference to all connected players
type Game struct {
	players sync.Map
	clock   *time.Ticker
	events  *pubsub.Pubsub
	track   track.Track
}

// New creates a new game
func New() *Game {
	return &Game{
		players: sync.Map{},
		clock:   time.NewTicker(30 * time.Millisecond),
		events:  pubsub.New(),
		track:   track.New(),
	}
}

// Run starts listening to client connection requests
func (g *Game) Run() {
	for {
		select {
		case <-g.clock.C:
			g.Update()
			g.events.Publish(protocol.UPDATE, g.Clients())
		}
	}
}

// Update calculates the next frame given from the previous state and the registered inputs
// Consider a call to Update a heart beat with each call being a game cycle
func (g *Game) Update() {
	g.players.Range(func(k interface{}, v interface{}) bool {
		player := v.(*Player)
		player.Update()

		return true
	})
}

// Connect registers a new connection to the game.
// It returns the assigned playerID of this connection as well as
// a channel to receive the latest game events that occured
func (g *Game) Connect() (int, *pubsub.Subscription) {
	id := -1
	for i := 0; ; i++ {
		if _, ok := g.players.Load(i); !ok {
			id = i
			break
		}
	}

	player := Player{
		Name:     "<Loading>",
		ID:       id,
		X:        4 + rand.Intn(50), // TODO: This is hardcoded from a track
		Y:        880 + rand.Intn(50),
		Rotation: 7,
		input:    Input{Left: false, Right: false, Up: false, Down: false},
	}
	g.players.Store(id, &player)

	sub := g.events.Subscribe()

	log.Println("New Connection with id:", id)
	return id, sub
}

// Disconnect cleans up after client leaves
func (g *Game) Disconnect(id int, sub *pubsub.Subscription) {
	g.players.Delete(id)
	g.events.Publish(protocol.LEAVE, id)
	sub.Unsubscribe()

	log.Println("Disonnected client id:", id)
}

// SetPlayerInput is used when an input command from a player
// is registered and applied on the next game cycle
func (g *Game) SetPlayerInput(input Input, playerID int) {
	player, ok := g.players.Load(playerID)

	if !ok {
		log.Fatalf("setting input for unknown playerID: %d", playerID)
	}

	new := player.(*Player)
	new.input = input

	g.players.Store(playerID, new)
}

// SetPlayerName is used when the player has chosen a name
// that is to be displayed on his nametag
func (g *Game) SetPlayerName(name string, playerID int) {
	player, ok := g.players.Load(playerID)

	if !ok {
		log.Fatalf("setting name for unknown playerID: %d", playerID)
	}

	p := player.(*Player)
	p.Name = name

	g.players.Store(playerID, p)
	g.events.Publish(protocol.JOIN, player)
}

// Track returns the currently used track layout
func (g *Game) Track() track.Track {
	return g.track
}

// ChangeTrack changes the track of the game
func (g *Game) ChangeTrack() {
	g.track = track.New()
	g.events.Publish(protocol.TRACK, g.track)
}

// Clients returns the currently connected clients as a slice
func (g *Game) Clients() []Player {
	result := make([]Player, 0)
	g.players.Range(func(k interface{}, v interface{}) bool {
		item := *v.(*Player)
		result = append(result, item)
		return true
	})

	return result
}
