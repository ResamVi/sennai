package math

import "math"

// Pow returns x**y, the base-x exponential of y.
// TODO: Move
func Pow(x, y float64) float64 {
	return math.Pow(x, y)
}

// Floor returns the greatest integer value <= x
func Floor(x float64) float64 {
	return math.Floor(x)
}