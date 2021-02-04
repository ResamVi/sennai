package math

import "math"

// Interpolate returns the linear interpolation point between the two given points,
// where t is between [0.0, 1.0]
func Interpolate(a, b Point, t float64) Point {

	result := Point{}

	result.X = a.X + ((b.X - a.X) * t)
	result.Y = a.Y + ((b.Y - a.Y) * t)

	return result
}

// InterpolateVector - TODO: we could use an interface instead
func InterpolateVector(a, b Vector, t float64) Vector {
	result := Vector{}

	result.X = a.X + ((b.X - a.X) * t)
	result.Y = a.Y + ((b.Y - a.Y) * t)

	return result
}

// CatmullRom implements the the Catmull-Rom interpolation method.
// with v being the input array of values to interpolate between
// and k the percentage of interpolation, between 0 and 1
func CatmullRom(v []float64, k float64) float64 {
	m := len(v) - 1
	f := float64(m) * k
	i := int(math.Floor(f))

	if v[0] == v[m] {
		if k < 0 {
			f = float64(m) * (1 + k)
			i = int(math.Floor(f))
		}

		return catmullromHelper(f-float64(i), v[(i-1+m)%m], v[i], v[(i+1)%m], v[(i+2)%m])
	}

	if k < 0 {
		return v[0] - (catmullromHelper(-f, v[0], v[0], v[1], v[1]) - v[0])
	}

	if k > 1 {
		return v[m] - (catmullromHelper(f-float64(m), v[m], v[m], v[m-1], v[m-1]) - v[m])
	}

	x1 := 0
	if i > 0 {
		x1 = i - 1
	}

	x2 := i + 1
	if m < i+1 {
		x2 = m
	}

	x3 := i + 2
	if m < i+2 {
		x3 = m
	}

	return catmullromHelper(f-float64(i), v[x1], v[i], v[x2], v[x3])
}

// Calculates a Catmull-Rom value from the given points, based on an alpha of 0.5
func catmullromHelper(t, p0, p1, p2, p3 float64) float64 {
	v0 := (p2 - p0) * 0.5
	v1 := (p3 - p1) * 0.5
	t2 := t * t
	t3 := t * t2

	return (2*p1-2*p2+v0+v1)*t3 + (-3*p1+3*p2-2*v0-v1)*t2 + v0*t + p1
}
