package game

import "fmt"

// Input represents the currently pressed arrow keys of a player
type Input struct {
	Left  bool `json:"Left"`
	Right bool `json:"Right"`
	Up    bool `json:"Up"`
	Down  bool `json:"Down"`
}

// Player represents a connected player
type Player struct {
	ID       int `json:"id"`
	X        int `json:"x"`
	Y        int `json:"y"`
	Rotation int `json:"rotation"`
	input    Input
}

const (
	velocity = 10
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
	inputs := ""
	if p.input.Left {
		inputs += " left "
	}
	if p.input.Right {
		inputs += " right "
	}

	if p.input.Up {
		inputs += " up "
	}

	if p.input.Down {
		inputs += " down "
	}

	return fmt.Sprintf("[%d: (%d, %d) %d°, [%s]]", p.ID, p.X, p.Y, p.Rotation, inputs)
}
