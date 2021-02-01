package game

import "fmt"

// Input represents the currently pressed arrow keys of a player
type Input struct {
	Left  bool `json:"left"`
	Right bool `json:"right"`
	Up    bool `json:"up"`
	Down  bool `json:"down"`
}

// Player represents a connected player
type Player struct {
	Name     string `json:"name"`
	ID       int    `json:"id"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Rotation int    `json:"rotation"`
	input    Input
}

const (
	velocity = 100
)

// Update will calculate the next position of
// the player to be shown on the next game cycle
func (p *Player) Update() {
	dx := 0
	if p.input.Left {
		dx = -velocity
	} else if p.input.Right {
		dx = velocity
	}

	dy := 0
	if p.input.Up {
		dy = -velocity
	} else if p.input.Down {
		dy = velocity
	}

	p.X += dx
	p.Y += dy
}

func (p Player) String() string {
	return fmt.Sprintf("[%d.: %s - (%d, %d) %d°", p.ID, p.Name, p.X, p.Y, p.Rotation)
}
