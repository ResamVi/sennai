// Package game contains the rules and entities of the domain
// The domain of this game is an arcade racing sim
package game

import (
	"log"
	"sync"
	"time"

	"gitlab.com/resamvi/sennai/internal/player"
	"gitlab.com/resamvi/sennai/internal/protocol"
	"gitlab.com/resamvi/sennai/internal/track"
	"gitlab.com/resamvi/sennai/pkg/math"
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
			g.events.Publish(protocol.UPDATE, g.Players())
		}
	}
}

// Update calculates the next frame given from the previous state and the registered inputs
// Consider a call to Update a heart beat with each call being a game cycle
func (g *Game) Update() {
	g.players.Range(func(k interface{}, v interface{}) bool {
		player := v.(*player.Player)

		circle := math.Circle{X: player.X, Y: player.Y, Radius: track.Trackwidth}
		pointsTouching := make([]int, 0)
		points := make([]math.Point, 0)
		for i, p := range g.track.Track {
			if circle.Contains(p) {
				pointsTouching = append(pointsTouching, i)
				points = append(points, p)
			}
		}
		player.Update(pointsTouching)

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

	player := player.New(id, g.track.Track[10], g.track.Track[11], len(g.track.Track))
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
func (g *Game) SetPlayerInput(input player.Input, playerID int) {
	p, ok := g.players.Load(playerID)

	if !ok {
		log.Fatalf("setting input for unknown playerID: %d", playerID)
	}

	new := p.(*player.Player)
	new.Input = input // TODO: Should be done by player

	g.players.Store(playerID, new)
}

// SetPlayerName is used when the player has chosen a name
// that is to be displayed on his nametag
func (g *Game) SetPlayerName(name string, playerID int) {
	p, ok := g.players.Load(playerID)

	if !ok {
		log.Fatalf("setting name for unknown playerID: %d", playerID)
	}

	modified := p.(*player.Player)
	modified.Name = name

	g.players.Store(playerID, p)
	g.events.Publish(protocol.JOIN, modified)
}

// Track returns the currently used track layout
func (g *Game) Track() track.Track {
	return g.track
}

//func (g Game) FinishRound() {
// if player.progress > 80% && max(player.progress) == 100
//}

// ChangeTrack changes the track of the game
func (g *Game) ChangeTrack() {
	g.track = track.New()
	g.events.Publish(protocol.TRACK, g.track)
}

// Players returns the currently connected clients as a slice
func (g *Game) Players() []player.Player {
	result := make([]player.Player, 0)
	g.players.Range(func(k interface{}, v interface{}) bool {
		item := *v.(*player.Player)
		result = append(result, item)
		return true
	})

	return result
}
