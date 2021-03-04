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

// Phase describes the overall context of the current game
type Phase int

const (
	// STARTING is a brief moment in which the game state is reset
	STARTING = iota

	// COUNTDOWN while the countdown is ticking players are kept in place
	COUNTDOWN

	// RACE players are racing to the finish line
	RACE

	// CLOSING a player has finished the race and a remainder countdown starts
	CLOSING

	// FINISHED The standings are shown and a new track is loaded
	FINISHED
)

const (
	// time until race start -  (countdownstart of e.g. 99 starts counting from 9.9s)
	countdownstart = 70

	// time until race finish after first reached end (in deci-seconds)
	closedownstart = 50

	// time (in s) in which the bestlist is displayed and until next race starts
	restperiodlength = 6
)

// Game maintains a reference to all connected players
type Game struct {
	players      sync.Map
	clock        *time.Ticker
	events       *pubsub.Pubsub
	track        track.Track
	phase        Phase
	starttime    time.Time
	roundsplayed int
}

// New creates a new game
func New() *Game {
	return &Game{
		players:      sync.Map{},
		clock:        time.NewTicker(30 * time.Millisecond),
		events:       pubsub.New(),
		track:        track.New(),
		phase:        STARTING,
		roundsplayed: 0,
	}
}

// Run starts listening to client connection requests
func (g *Game) Run() {
	for {
		select {
		case <-g.clock.C:

			// Do not run the game if no players are online
			if len(g.Players()) == 0 {
				continue
			}

			g.Update()

			if g.phase == FINISHED {
				g.events.Publish(protocol.BESTLIST, g.Bestlist())
			} else {
				g.events.Publish(protocol.UPDATE, g.Players())
			}
		}
	}
}

// Update calculates the next frame given from the previous state and the registered inputs
// Consider a call to Update a heart beat with each call being a game cycle
func (g *Game) Update() {
	if g.phase == STARTING {
		g.ResetAll()
		g.Countdown()
		g.phase = COUNTDOWN
	}

	// Don't move players in these phases
	if g.phase == COUNTDOWN || g.phase == FINISHED {
		return
	}

	g.players.Range(func(k interface{}, v interface{}) bool {
		player := v.(*player.Player)

		circle := math.Circle{X: player.X, Y: player.Y, Radius: track.Trackwidth}
		pointsTouching := make([]int, 0)
		for i, p := range g.track.Center {
			if circle.Contains(p) {
				pointsTouching = append(pointsTouching, i)
			}
		}
		player.Update(pointsTouching)

		if g.phase == RACE && player.Progress == 100 {
			g.Closedown()
			g.phase = CLOSING
		}

		if player.FinishTime == 0 && player.Progress == 100 {
			player.FinishTime = time.Since(g.starttime)
		}

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

	// TODO: Calculate start position here
	// TODO: Create progress slice here

	player := player.New(id, g.track.Center[10], g.track.Center[11], len(g.track.Center))
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

// Countdown declares the remaining seconds until the race begins and players can move
// Transitions game from phase COUNTDOWN -> RACE
func (g *Game) Countdown() {
	g.startCount(countdownstart, COUNTDOWN, RACE, 100*time.Millisecond, func() {
		g.starttime = time.Now()
	}, protocol.COUNTDOWN)
}

// Closedown declares the remaining time the race continues after the first player has crossed the finish line
// Transitions game from phase CLOSING -> FINISHED
func (g *Game) Closedown() {
	g.startCount(closedownstart, CLOSING, FINISHED, 100*time.Millisecond, g.Restperiod, protocol.CLOSEDOWN)
}

// Restperiod declares the remaining time the bestlist is shown and a new race will begin
// Transitions game from phase FINISHED -> STARTING
func (g *Game) Restperiod() {
	g.startCount(restperiodlength, FINISHED, STARTING, 1*time.Second, g.ChangeTrack, protocol.REST)
}

// Starts a countdown starting at `startAt` and going down to zero. While countdown the game's phase is in `currentPhase` and
// will be at `endPhase` after the countdown completes. On completion `onFinish` will be called. All clients will be notified of the count
// labelled by the protocol prefix `publishType`
func (g *Game) startCount(startAt int, currentPhase Phase, endPhase Phase, tickInterval time.Duration, onFinish func(), publishType string) {
	count := startAt
	g.phase = currentPhase

	go func() {
		for range time.Tick(tickInterval) {
			count--

			if count < 0 {
				g.phase = endPhase
				onFinish()
				break
			}

			g.events.Publish(publishType, count)
		}
	}()
}

// ChangeTrack changes the track of the game
func (g *Game) ChangeTrack() {
	g.track = track.New()
	g.events.Publish(protocol.TRACK, g.track)
}

// Standing is an entry of the bestlist
type Standing struct {
	Name       string  `json:"name"`
	FinishTime int64   `json:"finishTime"`
	Progress   float64 `json:"progress"`
}

// Bestlist returns the sorted and viewable race standings of this round
// has to be sorted and formatted by the client
func (g *Game) Bestlist() []Standing {
	list := make([]Standing, 0)
	g.players.Range(func(k interface{}, v interface{}) bool {
		player := v.(*player.Player)

		standing := Standing{
			Name:       player.Name,
			FinishTime: player.FinishTime.Milliseconds(),
			Progress:   player.Progress,
		}

		list = append(list, standing)

		return true
	})

	return list
}

// Track returns the currently used track layout
func (g *Game) Track() track.Track {
	return g.track
}

// ResetAll resets every player back to the start
func (g *Game) ResetAll() {
	g.players.Range(func(k interface{}, v interface{}) bool {
		player := v.(*player.Player)
		player.Reset(g.track.Center[10], g.track.Center[11], len(g.track.Center))
		// TODO: Start Point should be part of track
		return true
	})
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
