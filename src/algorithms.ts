/* 
 * Convex hull algorithm - Library (TypeScript)
 * 
 * Copyright (c) 2020 Project Nayuki
 * https://www.nayuki.io/page/convex-hull-algorithm
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program (see COPYING.txt and COPYING.LESSER.txt).
 * If not, see <http://www.gnu.org/licenses/>.
 */


// ----------- CONVEX HULL --------------------------

interface Point {
	x: number;
	y: number;
}

export function makeHull<P extends Point>(points: Array<P>): Array<P>
{
	let newPoints: Array<P> = points.slice();
	newPoints.sort(POINT_COMPARATOR);
	let result = makeHullPresorted(newPoints);
	result.push(result[0]);
	return result;
}
	
function makeHullPresorted<P extends Point>(points: Array<P>): Array<P>
{
	if (points.length <= 1)
		return points.slice();
	
	let upperHull: Array<P> = [];
	for (let i = 0; i < points.length; i++)
	{
		const p: P = points[i];
		while (upperHull.length >= 2)
		{
			const q: P = upperHull[upperHull.length - 1];
			const r: P = upperHull[upperHull.length - 2];
			if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x))
				upperHull.pop();
			else
				break;
		}
		upperHull.push(p);
	}
	upperHull.pop();
	
	let lowerHull: Array<P> = [];
	for (let i = points.length - 1; i >= 0; i--)
	{
		const p: P = points[i];
		while (lowerHull.length >= 2)
		{
			const q: P = lowerHull[lowerHull.length - 1];
			const r: P = lowerHull[lowerHull.length - 2];
			if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x))
				lowerHull.pop();
			else
				break;
		}
		lowerHull.push(p);
	}
	lowerHull.pop();
	
	if (upperHull.length == 1 && lowerHull.length == 1 && upperHull[0].x == lowerHull[0].x && upperHull[0].y == lowerHull[0].y)
		return upperHull;
	else
		return upperHull.concat(lowerHull);
}


function POINT_COMPARATOR(a: Point, b: Point): number
{
	if (a.x < b.x)
		return -1;
	else if (a.x > b.x)
		return +1;
	else if (a.y < b.y)
		return -1;
	else if (a.y > b.y)
		return +1;
	else
		return 0;
}

// ----------- CENTER OF MASS --------------------------
/**
 * From here
 * 	https://stackoverflow.com/questions/5271583/center-of-gravity-of-a-polygon
 * 
 * @param points 
 */
export function centerOfMass(points: Phaser.Geom.Point[]): Phaser.Geom.Point
{
	let A = 0;
	for(let i = 0; i < points.length - 1; i++)
	{
		let pCurrent 	= points[i];
		let pNext 		= points[i+1];

		A += pCurrent.x * pNext.y - pNext.x * pCurrent.y
	}
	A *= 0.5;

	let C_x = 0;
	let C_y = 0;
	for(let i = 0; i < points.length - 1; i++)
	{
		let pCurrent 	= points[i];
		let pNext 		= points[i+1];

		C_x += (pCurrent.x + pNext.x) * (pCurrent.x * pNext.y - pNext.x * pCurrent.y)
		C_y += (pCurrent.y + pNext.y) * (pCurrent.x * pNext.y - pNext.x * pCurrent.y)
	}

	C_x *= (1 / (6*A));
	C_y *= (1 / (6*A));

	return new Phaser.Geom.Point(C_x, C_y);
}

export function meanCenter(points: Phaser.Geom.Point[]): Phaser.Geom.Point
{
	let meanX = points.reduce((acc, current) => acc + current.x, 0) / points.length;
	let meanY = points.reduce((acc, current) => acc + current.y, 0) / points.length;

	return new Phaser.Geom.Point(meanX, meanY);
}

/**
 * From here
 * 	https://math.stackexchange.com/questions/125393/how-to-get-the-co-ordinates-of-scaled-down-polygon
 * 
 * @param points 
 * @param center 
 * @param scale 
 */
export function scalePolygon(points: Phaser.Geom.Point[], center: Phaser.Geom.Point, scale: number): Phaser.Geom.Point[]
{
	// Create deep clone we can modify without interference 
	let track = JSON.parse(JSON.stringify(points));

	for(let point of track)
	{
		point.x -= center.x;
		point.y -= center.y;
		
		point.x *= scale;
		point.y *= scale;

		point.x += center.x;
		point.y += center.y;	
	}

	return track;
}
