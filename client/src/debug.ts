// Inner/Outer track line
this.graphics.fillStyle(0xff0000);
for(let p of this.outer)
    this.graphics.fillCircle(p.x, p.y, 20);
for(let p of this.inner)
    this.graphics.fillCircle(p.x, p.y, 20);




// Hightlight Neighbour selection and visualize radius where we deem points as "too close" and consequently remove
this.graphics.fillStyle(0x00ff00);
this.graphics.fillCircle(this.interpolated[i].x, this.interpolated[i].y, 100);
for(let k = left_margin; k != right_margin; k = (k + 1) % this.interpolated.length)
{
    this.graphics.fillCircle(this.interpolated[k].x, this.interpolated[k].y, 50);
    this.graphics.strokeCircle(this.interpolated[k].x, this.interpolated[k].y, this.TRACK_WIDTH);
}




// Show points that are withing circle
this.graphics.fillStyle(0x0000ff);
this.circle.setPosition(this.cars.object.x, this.cars.object.y);
for(let p of this.track)
{
    if(this.circle.contains(p.x, p.y))
        this.graphics.fillCircle(p.x, p.y, 20);
}