package track

import (
	"testing"

	"gitlab.com/resamvi/sennai/pkg/math"
)

func TestEquals(t *testing.T) {
	var tests = []struct {
		name string
		trk1 Outline
		trk2 Outline
		want bool
	}{
		{
			"Empty track",
			Outline{},
			Outline{},
			true,
		},
		{
			"Equal track",
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 3, Y: 3}},
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 3, Y: 3}},
			true,
		},
		{
			"Inequal track",
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 2, Y: 2}, math.Point{X: 3, Y: 3}},
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 3, Y: 3}},
			false,
		},
		{
			"Equal track but order wrong",
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 2, Y: 2}},
			Outline{math.Point{X: 2, Y: 2}, math.Point{X: 1, Y: 1}},
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.trk1.Equal(tt.trk2)
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRemove(t *testing.T) {
	var tests = []struct {
		name  string
		trk   Outline
		index int
		want  Outline
	}{
		{
			"Remove one element",
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 2, Y: 2}, math.Point{X: 3, Y: 3}},
			1,
			Outline{math.Point{X: 1, Y: 1}, math.Point{X: 3, Y: 3}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.trk.Remove(tt.index)
			if !tt.trk.Equal(tt.want) {
				t.Errorf("got %v, want %v", t, tt.want)
			}
		})
	}
}
