import { makeHull } from './algorithms';

const MAX_WIDTH      = 8000;
const MAX_HEIGHT     = 6000;
const MARGIN         = 10;
export const TRACK_WIDTH    = 400;

let equal = function(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}

export function generateTrack(rng: Phaser.Math.RandomDataGenerator): Phaser.Geom.Point[][]
{
    let track: Phaser.Geom.Point[] = [];
    
    let points = [];
    for(let i = 0; i < 40; i++)
    {
        let x = rng.between(0, MAX_WIDTH);
        let y = rng.between(0, MAX_HEIGHT);
        points.push(new Phaser.Geom.Point(x, y));
    }
    track = makeHull(points);
    
    // Separate close points
    let separateApart = () => {
        let MAX_DISTANCE = 1500;
        for(let p1 of track)
        {
            for(let p2 of track)
            {
                if(equal(p1, p2))
                    continue;
                
                let distance = Phaser.Math.Distance.BetweenPoints(p1, p2);
                if(distance < MAX_DISTANCE)
                {
                    let displace = new Phaser.Math.Vector2(p1.x - p2.x, p1.y - p2.y);
                    displace.normalize();
                    displace.scale(MAX_DISTANCE - distance);
                    
                    p1.setTo(p1.x + displace.x, p1.y + displace.y);
                    p2.setTo(p2.x - displace.x, p2.y - displace.y);
                }
            }
        }
    }
    
    let ITERATIONS = 3;
    for(let i = 0; i < ITERATIONS; i++)
        separateApart();

    // Make track more interesting with sharper corners
    let DIFFICULTY = 1;
    let MAX_DISPLACEMENT = 800;

    let interestingTrack = [];
    for(let i = 0; i < track.length - 1; i++)
    {
        let b = rng.frac();
        let displacementLength = Math.pow(b, DIFFICULTY) * MAX_DISPLACEMENT;
        
        let displace = Phaser.Math.Vector2.ONE.clone();
        displace.rotate(rng.rotation())
        displace.scale(displacementLength);

        let midpoint = Phaser.Geom.Point.Interpolate(track[i], track[(i+1)], 0.5); 
        midpoint.setTo(midpoint.x + displace.x, midpoint.y + displace.y);
        
        interestingTrack[2*i]       = track[i];
        interestingTrack[2*i + 1]   = midpoint;
    }
    interestingTrack.push(track[0]); // End with the start point again
    track = interestingTrack;

    // Annotate corners with angle
    /*for(let current = 0; current < this.track.length; current++)
    {
        let previous    = current-1 < 0 ? this.track.length-1 : current-1;
        let next        = (current+1) % this.track.length;

        let [pPrev, pCurr, pNext] = [this.track[previous], this.track[current], this.track[next]];

        let angle = Math.atan2(pPrev.y - pCurr.y, pPrev.x - pCurr.x) - Math.atan2(pNext.y - pCurr.y, pNext.x - pCurr.x);
        let rotation = angle * (360/(2 * Math.PI));
        this.annotation.push([pCurr.x, pCurr.y, rotation.toString()]);
    }
    
    for(let txt of this.annotation)
    {
        let t = this.add.text(txt[0], txt[1], txt[2], this.style);
        this.texts.push(t);
    }
    */

    // Smooth out track
    let xSet = track.map(p => p.x);
    let ySet = track.map(p => p.y);
    let smoothTrack = [];
    for(let f = 0; f <= 1; f+= 0.005)
    {
        let x = Phaser.Math.Interpolation.CatmullRom(xSet, f);
        let y = Phaser.Math.Interpolation.CatmullRom(ySet, f);
        smoothTrack.push(new Phaser.Geom.Point(x, y));
    }
    track = smoothTrack;


    // Get inner and outer track line
    let inner = trackBounds(track, true);
    let outer = trackBounds(track, false);

    // Remove interfering points
    // Select range of neighbouring points of the track we will compare the distance 
    // and check if they get to close to inner/outer bounds points
    console.assert(track.length == inner.length && inner.length == outer.length,
        "There are always equal amounts of points in middle/inner/outer tracks");

    for(let i = 0; i < track.length; i++)
    {
        // We only check on a select few neighbours if they come too close to any inside/outside track points
        let left_margin     = (i - MARGIN) < 0 ? (i - MARGIN) + track.length : (i - MARGIN);
        let right_margin    = (i + MARGIN) % track.length;

        for(let j = left_margin; j != right_margin; j = (j + 1) % track.length)
        {
            let point = track[j];
            
            // We selectively remove elements from this.inner and this.outer (depending on track characteristics)
            // So initally where this.interpolated == this.inner == this.outer
            // We cannot assume this anymore
            for(let k = 0; k < inner.length; k++)
            {
                let inner_point = inner[k];
                let inner_distance = Phaser.Math.Distance.Between(point.x, point.y, inner_point.x, inner_point.y);
                if(inner_distance + 2 < TRACK_WIDTH) // lenient margin before we classify point "too close"
                {
                    inner.splice(k, 1); // Remove it
                    //this.tooclose.push(inner_point);
                }
            }
                
            for(let k = 0; k < outer.length; k++)
            {
                let outer_point = outer[k];
                let outer_distance = Phaser.Math.Distance.Between(point.x, point.y, outer_point.x, outer_point.y);
                if(outer_distance + 2 < TRACK_WIDTH)
                {
                    outer.splice(k, 1); // Remove it
                    //this.tooclose.push(outer_point);
                }
            }
        }    
    }
    inner.push(inner[0]);
    outer.push(outer[0]);
    track.push(track[0]);

    return [track, inner, outer];
}

/**
 * 				p (if inner: false)
 *              ^ 
 *              |
 * from --------> to
 *              |
 *              p (if inner: true)
 * 
 * For each point of the track
 * 
 * @param points 
 */
function trackBounds(points: Phaser.Geom.Point[], inner: boolean): Phaser.Geom.Point[]
{   
    let sign = inner ? 1 : -1;
    
    let result = [];
    for(let i = 0; i < points.length - 1; i++)
    {
        let from 	= points[i];
        let to		= points[i+1];

        let direction 	= new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
        let right_angle = direction.rotate(sign * Math.PI/2).normalize().scale(TRACK_WIDTH);
        
        let p = new Phaser.Geom.Point(to.x + right_angle.x, to.y + right_angle.y);
        //this.drawArrow(to, p);

        result.push(p);
    }
    result.push(result[0]); // End with the start point again

    return result;
}