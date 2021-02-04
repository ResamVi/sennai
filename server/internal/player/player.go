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
	Head     math.Vector // TODO: remove
	velocity math.Vector
	Input    Input
}

const (
	velocity    = 100
	turnspeed   = 5       // amount that front wheel turns
	wheelbase   = 40      // distance from front to rear wheel
	enginepower = 5.0     // power to accelerate
	brakepower  = -2.0    // power to brake
	friction    = -0.009  // force applied by the ground
	drag        = -0.0015 // wind resistance
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
// https://engineeringdotnet.blogspot.com/2010/04/simple-2d-car-physics-in-games.html
func (p *Player) Update() {

	// Translate input
	steerangle := 0
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

	if p.Input.Down {
		acceleration = p.Direction()
		acceleration.Scale(brakepower)
	}

	// Apply drag and friction
	frictionForce := p.velocity
	frictionForce.Scale(friction)

	dragForce := p.velocity
	dragForce.Scale(p.velocity.Len() * drag)

	acceleration.Add(frictionForce)
	acceleration.Add(dragForce)

	p.velocity.Add(acceleration)

	// Calculate next position
	frontWheel := math.Point{X: p.X + math.Cos(p.Rotation)*(wheelbase/2), Y: p.Y + math.Sin(p.Rotation)*(wheelbase/2)}
	rearWheel := math.Point{X: p.X + math.Cos(p.Rotation)*(-wheelbase/2), Y: p.Y + math.Sin(p.Rotation)*(-wheelbase/2)}

	cpy := p.velocity
	rearWheel.Add(cpy)

	cpy.Rotate(steerangle) // Apply steering to front wheel
	frontWheel.Add(cpy)

	newHeading := math.Vector{X: frontWheel.X - rearWheel.X, Y: frontWheel.Y - rearWheel.Y}
	newHeading.Normalize()

	// Do not allow reversing
	if p.velocity.Dot(newHeading) < 0 {
		p.velocity = math.Vector{X: 0, Y: 0}
	}

	// Move
	p.Rotation = newHeading.Angle()
	p.X += p.velocity.X
	p.Y += p.velocity.Y

	// Debug
	p.Front = frontWheel
	p.Back = rearWheel
	p.Head = newHeading
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
