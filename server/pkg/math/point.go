// Package math is a collection of algorithms and structures
package math

import (
	"math"
)

// Point is a single point in 2D space
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// MoveBy displaces the point in the direction of the vector
func (p *Point) MoveBy(v Vector) {
	p.X += v.X
	p.Y += v.Y
}

// DistanceTo calculates the distance between two points
func (p Point) DistanceTo(to Point) float64 {
	dx, dy := to.X-p.X, to.Y-p.Y
	return math.Sqrt(dx*dx + dy*dy)
}
