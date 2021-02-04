package player

import (
	"fmt"

	"gitlab.com/resamvi/sennai/pkg/math"
)

// Input represents the currently pressed arrow keys of a player
type Input struct {
	Left  bool `json:"left"`
	Right bool `json:"right"`
	Up    bool `json:"up"`
	Down  bool `json:"down"`
}

// Player represents a connected player
type Player struct {
	Name     string      `json:"name"`
	ID       int         `json:"id"`
	X        float64     `json:"x"`
	Y        float64     `json:"y"`
	Rotation float64     `json:"rotation"`
	Front    math.Point  // TODO: lowercase
	Back     math.Point  // TODO: lowercase
	Dir      math.Vector // TODO: remove
	velocity math.Vector
	Input    Input
}

const (
	velocity    = 100
	turnspeed   = 5.0 // amount that front wheel turns
	wheelbase   = 40  // distance from front to rear wheel
	enginepower = 5.0 // power to accelerate

)

// New creates a new player pointing at the right direction on the track
func New(id int, start math.Point, next math.Point) Player {
	return Player{
		Name:     "<Loading>",
		ID:       id,
		X:        start.X,
		Y:        start.Y,
		Rotation: math.VectorFromTo(start, next).Angle(),
		Input:    Input{Left: false, Right: false, Up: false, Down: false},
	}
}

// Update will calculate the next position of
// the player to be shown on the next game cycle
func (p *Player) Update() {

	// Translate input
	steerangle := 0.0
	if p.Input.Left {
		steerangle = -turnspeed
	} else if p.Input.Right {
		steerangle = turnspeed
	}

	acceleration := math.Vector{X: 0, Y: 0}
	if p.Input.Up {
		acceleration = p.Direction()
		acceleration.Scale(enginepower)
	}

	// Calculate
	p.velocity.X += acceleration.X
	p.velocity.Y += acceleration.Y
	p.Rotation += steerangle

	// Apply
	p.X += p.velocity.X
	p.Y += p.velocity.Y

	p.Front.X = p.X + math.Cos(p.Rotation)*(wheelbase/2)
	p.Front.Y = p.Y + math.Sin(p.Rotation)*(wheelbase/2)

	p.Back.X = p.X + math.Cos(p.Rotation)*(-wheelbase/2)
	p.Back.Y = p.Y + math.Sin(p.Rotation)*(-wheelbase/2)

	p.Dir = p.Direction()
}

// Direction returns a vector pointing into the direction
// the player is heading
func (p Player) Direction() math.Vector {
	v := math.Vector{X: p.Front.X - p.X, Y: p.Front.Y - p.Y}
	v.Normalize()
	return v
}

func (p Player) String() string {
	return fmt.Sprintf("[%d.: %s - (%.1f, %.1f) %.1f°", p.ID, p.Name, p.X, p.Y, p.Rotation)
}
