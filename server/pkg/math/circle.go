package math

// Circle represents a circle
type Circle struct {
	X      float64
	Y      float64
	Radius float64
}

// Contains returns true if the coordinates are within the circle, otherwise false.
func (c Circle) Contains(p Point) bool {

	left, right := c.X-c.Radius, c.X+c.Radius
	top, bottom := c.Y+c.Radius, c.Y-c.Radius

	if left <= p.X && p.X <= right && bottom <= p.Y && p.Y <= top {
		dx := (c.X - p.X) * (c.X - p.X)
		dy := (c.Y - p.Y) * (c.Y - p.Y)

		return (dx + dy) <= (c.Radius * c.Radius)
	}

	return false
}
