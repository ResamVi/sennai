package math

import "math"

// PI is a mathematical constant
const PI = math.Pi

// Pow returns x**y, the base-x exponential of y.
func Pow(x, y float64) float64 {
	return math.Pow(x, y)
}

// Floor returns the greatest integer value <= x
func Floor(x float64) float64 {
	return math.Floor(x)
}

// Cos returns the cosine of the degree argument alpha
func Cos(alpha float64) float64 {
	rad := float64(alpha) * (math.Pi / 180.0)

	return math.Cos(rad)
}

// Sin returns the sine of the degree argument alpha
func Sin(alpha float64) float64 {
	rad := float64(alpha) * (math.Pi / 180.0)

	return math.Sin(rad)
}
