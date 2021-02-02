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
	trackwidth      = 400
)

// Track repesents the layout and stores the outline and bounds of a track
type Track struct {
	Outer Outline `json:"outer"`
	Track Outline `json:"track"`
	Inner Outline `json:"inner"`
}

// Outline is a chain of points to create a line
type Outline []math.Point // TODO: should be struct

// New creates a new track
func New() Track {
	outline := Outline{}
	for i := 0; i < pointcount; i++ {
		p := math.Point{X: rand.Float64() * maxwidth, Y: rand.Float64() * maxheight}
		outline.Push(p)
	}

	track := outline.Hull().
		SpaceApart().
		SpaceApart().
		SpaceApart().
		SharpenCorners().
		Smoothen()

	inner, outer := track.Inner(), track.Outer()

	// Remove interfering points
	for _, p1 := range track {

		for k := 0; k < len(inner); k++ {
			p2 := inner[k]

			if p1 == p2 {
				continue
			}

			if p1.DistanceTo(p2)+2 < trackwidth {
				inner.Remove(k)
			}
		}

		for k := 0; k < len(outer); k++ {
			p2 := outer[k]

			if p1 == p2 {
				continue
			}

			if p1.DistanceTo(p2)+2 < trackwidth {
				outer.Remove(k)
			}
		}
	}

	return Track{Inner: inner, Track: track, Outer: outer}
}

// String returns a conscise representation of all points in the track
func (ol Outline) String() string {
	str := "["
	for _, p := range ol {
		str += fmt.Sprintf("(%.1f, %.1f), ", p.X, p.Y)
	}

	return str[:len(str)-2] + "]"
}

// Equal checks if two outlines are equal (sensitive to order of points)
func (ol Outline) Equal(trk Outline) bool {
	if len(ol) != len(trk) {
		return false
	}

	for i := 0; i < len(ol); i++ {
		if ol[i].X != trk[i].X || ol[i].Y != trk[i].Y {
			return false
		}
	}

	return true
}

// Push appends a point to the outline
func (ol *Outline) Push(p math.Point) {
	*ol = append(*ol, p)
}

// Pop removes and returns the last point of the outline
func (ol *Outline) Pop() math.Point {
	point := (*ol)[len(*ol)-1]
	*ol = (*ol)[:len(*ol)-1]
	return point
}

// Remove splices the slice and keeps the order
func (ol *Outline) Remove(i int) {
	*ol = append((*ol)[:i], (*ol)[i+1:]...)
}

// Len is the number of elements in the collection.
// Implementing sort.Interface
func (ol Outline) Len() int {
	return len(ol)
}

// Less reports whether the element with
// index i should sort before the element with index j.
// Implementing sort.Interface
func (ol Outline) Less(i, j int) bool {
	a, b := ol[i], ol[j]

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
func (ol Outline) Swap(i, j int) {
	ol[i], ol[j] = ol[j], ol[i]
}

// Hull returns the convex hull: the minimal amount of points whose outline encompass every other point
func (ol Outline) Hull() Outline {
	sort.Sort(ol)

	upper := Outline{}
	for _, point := range ol {

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

	lower := Outline{}
	for i := len(ol) - 1; i >= 0; i-- {
		point := ol[i]

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

// SpaceApart returns a version of the outline with every point spaced apart by atleast mindistance
func (ol Outline) SpaceApart() Outline {
	modified := make(Outline, 0)

	for _, p1 := range ol {
		for _, p2 := range ol {

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

// SharpenCorners makes the outline more interesting (i.e. curvy) with sharper corners
func (ol Outline) SharpenCorners() Outline {
	modified := make(Outline, 2*len(ol)-2)

	for i := 0; i < len(ol)-1; i++ {
		b := rand.Float64()
		displaceLength := math.Pow(b, difficulty) * maxdisplacement

		displace := math.Vector{X: 1, Y: 0}
		displace.Rotate(rand.Intn(360))
		displace.Scale(displaceLength)

		midpoint := math.Interpolate(ol[i], ol[i+1], 0.5)
		midpoint.MoveBy(displace)

		modified[2*i] = ol[i]
		modified[2*i+1] = midpoint
	}
	modified.Push(modified[0])

	return modified
}

// Smoothen inserts more points between points and interpolates between them
func (ol Outline) Smoothen() Outline {
	xs, ys := ol.xs(), ol.ys()

	modified := make(Outline, 0)
	for f := 0.0; f <= 1; f += 0.005 {
		x := math.CatmullRom(xs, f)
		y := math.CatmullRom(ys, f)
		modified.Push(math.Point{X: x, Y: y})
	}

	return modified
}

// Inner returns the inner track side i.e. a downscaled version
// of the outline
// ————————————————┑
//                 │
// ———— t ————┑    |
//            |    │
// —inner—┑   |    │
//        │   |    │
func (ol Outline) Inner() Outline {
	return ol.bounds(1)
}

// Outer returns the outer track side i.e. a upscaled version
// of the outline
// ————outer———————┑
//                 │
// ———— t ————┑    |
//            |    │
// ———————┑   |    │
//        │   |    │
func (ol Outline) Outer() Outline {
	return ol.bounds(-1)
}

func (ol Outline) bounds(sign int) Outline {
	modified := make(Outline, 0)
	for i := 0; i < len(ol)-1; i++ {
		from, to := ol[i], ol[i+1]

		direction := math.Vector{X: from.X - to.X, Y: from.Y - to.Y}
		direction.Rotate(sign * 90)
		direction.Normalize()
		direction.Scale(trackwidth)

		to.MoveBy(direction)
		modified.Push(to)
	}
	modified.Push(modified[0])

	return modified
}

// xs returns every point's x-value in a slice
func (ol Outline) xs() []float64 {
	result := make([]float64, 0)
	for _, p := range ol {
		result = append(result, p.X)
	}
	return result
}

// xs returns every point's x-value in a slice
func (ol Outline) ys() []float64 {
	result := make([]float64, 0)
	for _, p := range ol {
		result = append(result, p.Y)
	}
	return result
}
