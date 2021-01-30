package math

import "math"

// Vector is a 2D vector representation
type Vector struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Len returns the length of this vector
func (v Vector) Len() float64 {
	dx, dy := float64(v.X), float64(v.Y)
	return math.Sqrt(dx*dx + dy*dy)
}

// Normalize makes the vector a unit length vector (magnitude of 1) in the same direction
func (v *Vector) Normalize() {
	factor := v.Len()
	v.X /= factor
	v.Y /= factor
}

// Scale scales this Vector by the given value
func (v *Vector) Scale(factor float64) {
	v.X *= factor
	v.Y *= factor
}

// Rotate rotates the vector by `alpha` degrees anti-clockwise
func (v *Vector) Rotate(alpha int) {
	rad := float64(alpha) * (math.Pi / 180.0)

	cos, sin := math.Cos(rad), math.Sin(rad)

	newX := cos*v.X - sin*v.Y
	newY := sin*v.X + cos*v.Y

	v.X, v.Y = newX, newY
}

// Opposite returns the vector with the negative of every component
func (v Vector) Opposite() Vector {
	return Vector{X: -v.X, Y: -v.Y}
}
