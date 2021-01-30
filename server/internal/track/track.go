// Package track contains track-generation logic
package track

import (
	"fmt"
	"math/rand"
	"sort"

	"gitlab.com/resamvi/sennai/pkg/math"
)

const (
	pointcount = 40 // has to be >=2
	iterations = 3

	maxwidth    = 8000.0
	maxheight   = 6000.0
	mindistance = 1500.0

	difficulty      = 1
	maxdisplacement = 800
)

// Track stores the outline of a track
type Track []math.Point

// String returns a conscise representation of all points in the track
func (t Track) String() string {
	str := "["
	for _, p := range t {
		str += fmt.Sprintf("(%.1f, %.1f), ", p.X, p.Y)
	}

	return str[:len(str)-2] + "]"
}

// Push appends a point to the track
func (t *Track) Push(p math.Point) {
	*t = append(*t, p)
}

// Pop removes and returns the last point of the track
func (t *Track) Pop() math.Point {
	point := (*t)[len(*t)-1]
	*t = (*t)[:len(*t)-1]
	return point
}

// Len is the number of elements in the collection.
// Implementing sort.Interface
func (t Track) Len() int {
	return len(t)
}

// Less reports whether the element with
// index i should sort before the element with index j.
// Implementing sort.Interface
func (t Track) Less(i, j int) bool {
	a, b := t[i], t[j]

	if a.X < b.X {
		return true
	}

	if a.X > b.X {
		return false
	}

	if a.Y < b.Y {
		return true
	}

	if a.Y > b.Y {
		return false
	}

	return false
}

// Swap swaps the elements with indexes i and j.
// Implementing sort.Interface
func (t Track) Swap(i, j int) {
	t[i], t[j] = t[j], t[i]
}

// New creates a new track
func New() Track {
	track := Track{}
	for i := 0; i < pointcount; i++ {
		p := math.Point{X: rand.Float64() * maxwidth, Y: rand.Float64() * maxheight}
		track.Push(p)
	}

	/*finished := track.Hull().
	SpaceApart().
	SpaceApart().
	SpaceApart().
	SharpenCorners().
	Smoothen()*/

	return track
}

// Generate creates a new track and returns the same track if seed is the same
func Generate() Track {
	track := Track{}
	for i := 0; i < pointcount; i++ {
		p := math.Point{X: rand.Float64() * maxwidth, Y: rand.Float64() * maxheight}
		track.Push(p)
	}

	finished := track.Hull().
		SpaceApart().
		SpaceApart().
		SpaceApart().
		SharpenCorners().
		Smoothen()

	return finished
}

// Hull returns the convex hull: the minimal amount of points that encompass every point of the track inside it
func (t Track) Hull() Track {
	sort.Sort(t)

	upper := Track{}
	for _, point := range t {

		for len(upper) >= 2 {
			u, v := upper[len(upper)-1], upper[len(upper)-2]

			if (u.X-v.X)*(point.Y-v.Y) >= (u.Y-v.Y)*(point.X-v.X) {
				upper.Pop()
			} else {
				break
			}
		}
		upper.Push(point)
	}
	upper.Pop()

	lower := Track{}
	for i := len(t) - 1; i >= 0; i-- {
		point := t[i]

		for len(lower) >= 2 {
			u, v := lower[len(lower)-1], lower[len(lower)-2]

			if (u.X-v.X)*(point.Y-v.Y) >= (u.Y-v.Y)*(point.X-v.X) {
				lower.Pop()
			} else {
				break
			}
		}
		lower.Push(point)
	}
	lower.Pop()

	lower.Push(upper[0])
	return append(upper, lower...)
}

// SpaceApart returns a version of the track with every point spaced apart by atleast mindistance
func (t Track) SpaceApart() Track {
	modified := make(Track, 0)

	for _, p1 := range t {
		for _, p2 := range t {

			if p1 == p2 {
				continue
			}

			dist := p1.DistanceTo(p2)
			if dist < mindistance {
				displace := math.Vector{X: p1.X - p2.X, Y: p1.Y - p2.Y}
				displace.Normalize()
				displace.Scale(mindistance - dist)

				p1.MoveBy(displace)
				p2.MoveBy(displace.Opposite())
			}

		}
		modified.Push(p1)
	}

	return modified
}

// SharpenCorners makes the track more interesting with sharper corners
func (t Track) SharpenCorners() Track {
	modified := make(Track, 2*len(t))

	for i := 0; i < len(t)-1; i++ {
		b := rand.Float64()
		displaceLength := math.Pow(b, difficulty) * maxdisplacement

		displace := math.Vector{X: 1, Y: 0}
		displace.Rotate(rand.Intn(360))
		displace.Scale(displaceLength)

		midpoint := math.Interpolate(t[i], t[i+1], 0.5)
		midpoint.MoveBy(displace)

		modified[2*i] = t[i]
		modified[2*i+1] = midpoint
	}

	modified.Push(modified[0])
	return modified
}

// Smoothen inserts more points between corners and interpolates between them
func (t Track) Smoothen() Track {
	xs, ys := t.xs(), t.ys()

	modified := make(Track, 0)
	for f := 0.0; f <= 1; f += 0.005 {
		x := math.CatmullRom(xs, f)
		y := math.CatmullRom(ys, f)
		modified.Push(math.Point{X: x, Y: y})
	}

	return modified
}

// xs returns every point's x-value in a slice
func (t Track) xs() []float64 {
	result := make([]float64, 0)
	for _, p := range t {
		result = append(result, p.X)
	}
	return result
}

// xs returns every point's x-value in a slice
func (t Track) ys() []float64 {
	result := make([]float64, 0)
	for _, p := range t {
		result = append(result, p.Y)
	}
	return result
}
