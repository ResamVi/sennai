package math

import (
	"math"
	"testing"
)

func TestVectorFromTo(t *testing.T) {
	var tests = []struct {
		name string
		from Point
		to   Point
		want Vector
	}{
		{
			"From origin",
			Point{X: 0, Y: 0},
			Point{X: 1, Y: 1},
			Vector{X: 1, Y: 1},
		},
		{
			"Trivial example",
			Point{X: 1, Y: 0},
			Point{X: 0, Y: 1},
			Vector{X: -1, Y: 1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := VectorFromTo(tt.from, tt.to)
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAngle(t *testing.T) {
	var tests = []struct {
		name string
		v    Vector
		want float64
	}{
		{
			"0 degrees",
			Vector{X: 1, Y: 0},
			0.0,
		},
		{
			"90 degrees",
			Vector{X: 0, Y: 1},
			90.0,
		},
		{
			"180 degrees",
			Vector{X: -1, Y: 0},
			180.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.v.Angle()
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAngleScale(t *testing.T) {
	v := Vector{X: 5, Y: 5}
	v.Scale(0)

	got := v.Angle()
	if got != 0 {
		t.Errorf("got %v, want 0", got)
	}
}

func TestRotate(t *testing.T) {
	var tests = []struct {
		name      string
		v         Vector
		alpha     float64
		tolerance float64
		want      Vector
	}{
		{
			"Rotate by 0 degrees",
			Vector{X: 1, Y: 0},
			0.0,
			0.1,
			Vector{X: 1, Y: 0},
		},
		{
			"Rotate by 90 degrees",
			Vector{X: 1, Y: 0},
			90.0,
			0.1,
			Vector{X: 0, Y: 1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.v.Rotate(tt.alpha)
			if math.Abs(tt.v.X-tt.want.X) > tt.tolerance || math.Abs(tt.v.Y-tt.want.Y) > tt.tolerance {
				t.Errorf("got %v, want %v", tt.v, tt.want)
			}
		})
	}
}
