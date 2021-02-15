package player

import (
	"fmt"
	"time"

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
	Name       string  `json:"name"`
	ID         int     `json:"id"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	Rotation   float64 `json:"rotation"`
	Progress   float64 `json:"progress"` // Progress gives the progress in the range of 0 and 100
	FinishTime time.Duration
	Input      Input
	inside     []int // indices to points of the track that are in range of the player
	velocity   math.Vector
	passed     []bool
}

var (
	turnspeed        = 4.0     // amount that front wheel turns
	wheelbase        = 40.0    // distance from front to rear wheel
	enginepower      = 7.0     // power to accelerate
	brakepower       = -2.0    // power to brake
	ontrackfriction  = -0.06   // friction force applied by the asphalt ground
	offtrackfriction = -0.3    // friction force applied by sand ground
	drag             = -0.0015 // wind resistance
	traction         = 0.00001 // drift factor (1 = basically on rails)
	maxskip          = 30      // player may skip this many points by going offtrack
)

// New creates a new player pointing at the right direction on the track
func New(id int, start math.Point, next math.Point, length int) Player {
	return Player{
		Name:     "<Loading>",
		ID:       id,
		X:        start.X,
		Y:        start.Y,
		Rotation: math.VectorFromTo(start, next).Angle(),
		Progress: 0,
		Input:    Input{Left: false, Right: false, Up: false, Down: false},
		passed:   make([]bool, length),
	}
}

// Update will calculate the next position of
// the player to be shown on the next game cycle
// https://engineeringdotnet.blogspot.com/2010/04/simple-2d-car-physics-in-games.html
func (p *Player) Update(points []int) {
	p.physics()
	p.progress(points)
}

// Reset teleports and alignts the player back to the track
func (p *Player) Reset(start math.Point, next math.Point, length int) {
	p.X = start.X
	p.Y = start.Y
	p.Progress = 0
	p.Rotation = math.VectorFromTo(start, next).Angle()
	p.passed = make([]bool, length)
}

func (p *Player) physics() {
	// Translate input
	steerangle := 0.0
	if p.Input.Left {
		steerangle = -turnspeed
	} else if p.Input.Right {
		steerangle = turnspeed
	}

	acceleration := math.Vector{X: 0, Y: 0}
	if p.Input.Up {
		acceleration = p.direction()
		acceleration.Scale(enginepower)
	}

	if p.Input.Down {
		acceleration = p.direction()
		acceleration.Scale(brakepower)
	}

	// Apply drag and friction
	frictionForce := p.velocity
	if p.isOffroad() {
		frictionForce.Scale(offtrackfriction)
	} else {
		frictionForce.Scale(ontrackfriction)
	}

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
	newHeading.Scale(p.velocity.Len())

	p.velocity = math.InterpolateVector(p.velocity, newHeading, traction)

	// Do not allow reversing
	if p.velocity.Dot(newHeading) < 0 {
		p.velocity.Scale(0)
	}

	// Move
	if newHeading.Len() != 0 {
		p.Rotation = newHeading.Angle()
	}
	p.X += p.velocity.X
	p.Y += p.velocity.Y
}

// get a list of indexes into the track slice that we mark as "passed" to track progress
func (p *Player) progress(points []int) {
	for _, v := range points {
		p.passed[v] = true
	}

	p.inside = points
	p.Progress = math.Floor((p.furthest() / float64(len(p.passed)-1)) * 100)
}

// TODO: Fix ending
func (p Player) furthest() float64 {
	max, skipped := 0, 0
	for i := 0; i < len(p.passed); i++ {
		if p.passed[i] {
			max = i
			skipped = 0
		} else {
			skipped++
		}

		if skipped > maxskip {
			break
		}
	}

	return float64(max)
}

// direction returns a vector pointing into the direction
// the player is heading
func (p Player) direction() math.Vector {
	v := math.Vector{X: 1, Y: 0}
	v.Rotate(p.Rotation)
	return v
}

func (p Player) isOffroad() bool {
	return len(p.inside) == 0
}

func (p Player) String() string {
	return fmt.Sprintf("[%d.: %s - (%.1f, %.1f) %.1f° %.1f%%", p.ID, p.Name, p.X, p.Y, p.Rotation, p.Progress)
}
