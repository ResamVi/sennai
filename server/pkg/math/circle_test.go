package math

import (
	"testing"
)

func TestContains(t *testing.T) {
	var tests = []struct {
		name string
		c    Circle
		p    Point
		want bool
	}{
		{
			"Is inside",
			Circle{X: 0, Y: 0, Radius: 5},
			Point{X: 1, Y: 1},
			true,
		},
		{
			"Is Outside",
			Circle{X: 0, Y: 0, Radius: 5},
			Point{X: 6, Y: 0},
			false,
		},
		{
			"On the edge",
			Circle{X: 0, Y: 0, Radius: 5},
			Point{X: 5, Y: 0},
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.c.Contains(tt.p)
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}
