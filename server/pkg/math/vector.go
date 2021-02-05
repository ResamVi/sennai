package math

import "math"

// Vector is a 2D vector representation
type Vector struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// VectorFromTo returns the vector starting at `from` and pointing to `to`
func VectorFromTo(from Point, to Point) Vector {
	return Vector{X: to.X - from.X, Y: to.Y - from.Y}
}

// Len returns the length of this vector
func (v Vector) Len() float64 {
	dx, dy := v.X, v.Y
	return math.Sqrt(dx*dx + dy*dy)
}

// Angle returns the angle between this Vector, and the positive x-axis, given in degrees
func (v Vector) Angle() float64 {
	angle := math.Atan2(v.Y, v.X)
	if angle < 0 {
		angle += 2 * math.Pi
	}

	return angle * (180 / math.Pi)
}

// Opposite returns the vector with the negative of every component
func (v Vector) Opposite() Vector {
	return Vector{X: -v.X, Y: -v.Y}
}

// Dot calculates the dot product of this Vector and the given Vector.
func (v Vector) Dot(w Vector) float64 {
	return v.X*w.X + v.Y*w.Y
}

// Add does component-wise addition
func (v *Vector) Add(w Vector) {
	v.X += w.X
	v.Y += w.Y
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

// Rotate rotates the vector by `alpha` degrees clockwise
func (v *Vector) Rotate(alpha float64) {
	rad := alpha * (math.Pi / 180.0)

	cos, sin := math.Cos(rad), math.Sin(rad)

	newX := cos*v.X - sin*v.Y
	newY := sin*v.X + cos*v.Y

	v.X, v.Y = newX, newY
}
