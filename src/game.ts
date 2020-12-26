import 'phaser';
import { makeHull } from './algorithms';

// TODO: Move to util?
let round = function(numb) {
    return Math.round(numb*100)/100;
}

let equal = function(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}

export default class MainScene extends Phaser.Scene
{
    private readonly POWER          = 5;
    private readonly BRAKEPOWER     = 50;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00016;
    private readonly MAX_WIDTH      = 8000;
    private readonly MAX_HEIGHT     = 6000;
    private readonly WHEEL_BASE     = 35;
    private readonly TRACK_WIDTH    = 400;
    private readonly MARGIN         = 10;

    private player:     Phaser.Physics.Matter.Image; // TODO: Bundle all objects into worlds module
    private dot:        Phaser.Physics.Matter.Image; // TODO: Bundle all objects into worlds module
    private cursors:    Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:       Phaser.GameObjects.Text;

    private velocity        = 0;
    private acceleration    = 0;

    private w_key: Phaser.Input.Keyboard.Key;
    private s_key: Phaser.Input.Keyboard.Key;
    private a_key: Phaser.Input.Keyboard.Key;
    private d_key: Phaser.Input.Keyboard.Key;

    private front_wheel: Phaser.Math.Vector2;
    private rear_wheel: Phaser.Math.Vector2;
    private steer_angle     = 0;

    private points:         Phaser.Geom.Point[] = [];
    private track:          Phaser.Geom.Point[] = [];
    private additional:     Phaser.Geom.Point[] = []; // TODO: Remove: Debug Purpose
    private interpolated:   Phaser.Geom.Point[] = [];
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private rng: Phaser.Math.RandomDataGenerator = Phaser.Math.RND;

    // Debug
    graphics:       Phaser.GameObjects.Graphics;
    
    circle          = new Phaser.Geom.Circle(0, 0, 0);
    rect_filled     = new Phaser.Geom.Rectangle(200, 10, 10, 120);
    rect_outline    = new Phaser.Geom.Rectangle(200, 10, 10, 120);

    zoom = 0.28;
    annotation = [];
    style = { fontFamily: 'Tahoma ', fontSize: 64};
    texts: Phaser.GameObjects.Text[] = [];
    center: Phaser.Geom.Point;
    centre: Phaser.Geom.Point;
    tooclose: Phaser.Geom.Point[] = [];
    tone: Phaser.Sound.BaseSound;
    music: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('SENNAI');
    }

    preload ()
    {
        // TODO: Put into dedicated scene for loading
        this.load.image('car', 'assets/car.png');
        this.load.image('grid', 'assets/grid.png');
        this.load.image('track', 'assets/track.png');
        this.load.image('dot', 'assets/dot.png');
    }

    create ()
    {
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
        });

        this.input.keyboard.on('keydown-R', () => {
            this.texts.forEach(t => t.setAlpha(0));
            this.generateTrack();
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.d_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.w_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.s_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.a_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);        
        
        this.player = this.matter.add.image(100, 100, 'car');
        this.dot    = this.matter.add.image(200, 200, 'dot');

        this.text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);

        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);

        this.cameras.main.startFollow(this.player, false);
        
        // Generate track
        this.generateTrack();
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);

        // Controls
        this.spectate();
        this.steer();
        this.accelerate();
        this.applyPhysics(time, delta);
        this.debug(time, delta);

        //this.cameras.main.setAngle(-this.player.angle + 180);
    }
    
    // TODO: Separate into other module
    generateTrack()
    {
        this.additional     = [];
        this.interpolated   = [];
        this.points         = [];
        this.annotation     = [];
        this.track          = [];
        this.inner          = [];
        this.outer          = [];

        for(let i = 0; i < 40; i++)
        {
            let x = this.rng.between(0, this.MAX_WIDTH);
            let y = this.rng.between(0, this.MAX_HEIGHT);
            this.points.push(new Phaser.Geom.Point(x, y));
        }
        this.track = makeHull(this.points);
        
        // Separate close points
        let separateApart = () => {
            let MAX_DISTANCE = 1500;
            for(let p1 of this.track)
            {
                for(let p2 of this.track)
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

        let newTrack = [];
        for(let i = 0; i < this.track.length - 1; i++)
        {
            let b = this.rng.frac();
            let displacementLength = Math.pow(b, DIFFICULTY) * MAX_DISPLACEMENT;
            
            let displace = Phaser.Math.Vector2.ONE.clone();
            displace.rotate(this.rng.rotation())
            displace.scale(displacementLength);

            let midpoint = Phaser.Geom.Point.Interpolate(this.track[i], this.track[(i+1)], 0.5); 
            midpoint.setTo(midpoint.x + displace.x, midpoint.y + displace.y);
            
            newTrack[2*i]       = this.track[i];
            newTrack[2*i + 1]   = midpoint;
            
            this.additional.push(midpoint); // TODO: Remove: Debug Purpose
        }
        newTrack.push(this.track[0]); // End with the start point again
        
        this.track = newTrack;

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
        let xSet = this.track.map(p => p.x);
        let ySet = this.track.map(p => p.y);
        for(let f = 0; f <= 1; f+= 0.005)
        {
            let x = Phaser.Math.Interpolation.CatmullRom(xSet, f);
            let y = Phaser.Math.Interpolation.CatmullRom(ySet, f);
            this.interpolated.push(new Phaser.Geom.Point(x, y));
        }

        // Get inner and outer track line
        this.inner = this.trackBounds(this.interpolated, true);
        this.outer = this.trackBounds(this.interpolated, false);

        // Remove interfering points
        // Select range of neighbouring points of the track we will compare the distance 
        // and check if they get to close to inner/outer bounds points
        console.assert(this.interpolated.length == this.inner.length && this.inner.length == this.outer.length,
            "There are always equal amounts of points in middle/inner/outer tracks");

        for(let i = 0; i < this.interpolated.length; i++)
        {
            // We only check on a select few neighbours if they come too close to any inside/outside track points
            let left_margin     = (i - this.MARGIN) < 0 ? (i - this.MARGIN) + this.interpolated.length : (i - this.MARGIN);
            let right_margin    = (i + this.MARGIN) % this.interpolated.length;

            for(let j = left_margin; j != right_margin; j = (j + 1) % this.interpolated.length)
            {
                let point = this.interpolated[j];
                
                // We selectively remove elements from this.inner and this.outer (depending on track characteristics)
                // So initally where this.interpolated == this.inner == this.outer
                // We cannot assume this anymore
                for(let k = 0; k < this.inner.length; k++)
                {
                    let inner_point = this.inner[k];
                    let inner_distance = Phaser.Math.Distance.Between(point.x, point.y, inner_point.x, inner_point.y);
                    if(inner_distance + 2 < this.TRACK_WIDTH) // lenient margin before we classify point "too close"
                    {
                        this.inner.splice(k, 1); // Remove it
                        this.tooclose.push(inner_point);
                    }
                }
                 
                for(let k = 0; k < this.outer.length; k++)
                {
                    let outer_point = this.outer[k];
                    let outer_distance = Phaser.Math.Distance.Between(point.x, point.y, outer_point.x, outer_point.y);
                    if(outer_distance + 2 < this.TRACK_WIDTH)
                    {
                        this.outer.splice(k, 1); // Remove it
                        this.tooclose.push(outer_point);
                    }
                }
            }    
        }
    }

    spectate()
    {
        // Camera
        if(this.w_key.isDown)
        {
            this.dot.y -= 50;
        }

        if(this.s_key.isDown)
        {
            this.dot.y += 50;
        }

        if(this.a_key.isDown)
        {
            this.dot.x -= 50;
        }

        if(this.d_key.isDown)
        {
            this.dot.x += 50;
        }
    }

    steer()
    {
        // Car
        let rates    = [5,  5,  4,  4, 4, 3, 2, 2, 1, 1]; // How fast we can steer to one direction
        let ranges   = [20, 20, 10, 5, 5, 3, 2, 2, 1, 1]; // How far we can steer in one direction

        let r       = Math.min(this.velocity/2400, 1.0); // We say 2400 is the max velocity most reach
        let rate    = Phaser.Math.Interpolation.Linear(rates, r);
        let range   = Phaser.Math.Interpolation.Linear(ranges, r);

        console.log(round(this.velocity) + ": " + round(r) + " | " + round(rate) + " | " + round(range));

        /*if (this.velocity > 600)
        {
            range = 10;
            rate = 2;
        }*/

        if (this.cursors.left.isDown)
        {
            if(this.steer_angle > 0) // When steering right to left make transition snappier
                this.steer_angle = 0;

            if(this.steer_angle > -range)
                this.steer_angle -= rate;
        }
        else if (this.cursors.right.isDown)
        {
            if(this.steer_angle < 0) // When steering left to right make transition snappier
                this.steer_angle = 0;

            if(this.steer_angle < range)
                this.steer_angle += rate;
        }
        else
        {
            this.steer_angle = 0;
        }
    }

    accelerate()
    {
        if (this.cursors.up.isDown) // Accelerating
        {
            this.acceleration = this.acceleration + this.POWER;
        }
        else if (this.cursors.down.isDown) // Braking
        {
            this.acceleration = Math.max(this.acceleration - this.BRAKEPOWER, 0);
        }
        else // Rolling
        {
            this.acceleration = Math.max(this.acceleration - 8, 0);
        }
    }

    applyPhysics(time, delta)
    {
        let friction_force  = round(this.velocity * this.FRICTION);
        let drag_force      = round(this.velocity * this.velocity * this.DRAG);

        this.velocity += this.acceleration;
        this.velocity += friction_force + drag_force;
        
        let position = new Phaser.Math.Vector2(this.player.x, this.player.y);

        this.front_wheel = position.clone().add(       this.direction().scale(this.WHEEL_BASE / 2));
        this.rear_wheel  = position.clone().subtract(  this.direction().scale(this.WHEEL_BASE / 2));

        this.front_wheel  .add(this.direction().scale(delta/1000 * this.velocity).rotate(this.steer_angle * Math.PI/180));
        this.rear_wheel   .add(this.direction().scale(delta/1000 * this.velocity));
    
        let carHeading  = this.front_wheel.clone().subtract(this.rear_wheel).rotate(-Math.PI/2).normalize();
        let carLocation = this.front_wheel.clone().add(     this.rear_wheel).scale(0.5);

        this.player.rotation = carHeading.angle();

        this.player.setPosition(carLocation.x, carLocation.y);

        (window as any).data1.push({x: round(time)/1000, y: this.velocity});
        //(window as any).data2.push({x: round(time)/1000, y: this.acceleration});
        //(window as any).data3.push({x: round(time)/1000, y: -drag_force});
        //(window as any).data4.push({x: round(time)/1000, y: -friction_force});
        (window as any).myChart.update();
    }

    debug(time, delta)
    {
        this.graphics.clear();
        
        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // Generated Points
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.points)
            this.graphics.fillCircle(p.x, p.y, 20);
        
        // Track line
        this.graphics.lineStyle(2, 0x00ff00)
        this.graphics.strokePoints(this.track);

        // Track Corners
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.track)
            this.graphics.fillCircle(p.x, p.y, 20);

        // Added track corners
        this.graphics.fillStyle(0xff0000);
        for(let p of this.additional)
            this.graphics.fillCircle(p.x, p.y, 20);

        // Interpolated track
        this.graphics.fillStyle(0xffffff);
        for(let p of this.interpolated)
            this.graphics.fillCircle(p.x, p.y, 20);
            
        // Inner/Outer track line
        this.graphics.fillStyle(0xff0000);
        for(let p of this.outer)
            this.graphics.fillCircle(p.x, p.y, 20);

        for(let p of this.inner)
            this.graphics.fillCircle(p.x, p.y, 20);

        //console.log(this.tooclose);

        /*this.graphics.fillStyle(0x800080);
        for(let p of this.tooclose)
            this.graphics.fillCircle(p.x, p.y, 20);*/

        // Hightlight Neighbour selection and visualize radius where we deem points as "too close" and consequently remove
        //this.graphics.fillStyle(0x00ff00);
        //this.graphics.fillCircle(this.interpolated[i].x, this.interpolated[i].y, 100);
        //for(let k = left_margin; k != right_margin; k = (k + 1) % this.interpolated.length)
        //{
        //    this.graphics.fillCircle(this.interpolated[k].x, this.interpolated[k].y, 50);
        //    this.graphics.strokeCircle(this.interpolated[k].x, this.interpolated[k].y, this.TRACK_WIDTH);
        //}

        //this.text.setText([
            //'x: '       + round(this.player.x),
            //'y: '       + round(this.player.y),
            //'v: '       + round(vel.x) + ', ' + round(vel.y),
            //'a: '       + round(accel.x) + ', ' + round(accel.x),
            //'angle: '   + this.steer_angle,
            //'velocity: '+ round(this.velocity),
            //'accel: '   + round(this.acceleration),
            //'fps: '     + round(this.game.loop.actualFps),
            //'time: '    + round(time),
            //'delta: '   + round(delta)
        //]);
    }

    trackBounds(points: Phaser.Geom.Point[], inner: boolean): Phaser.Geom.Point[]
    {   
        let sign = inner ? 1 : -1;
        
        let result = [];
        for(let i = 0; i < points.length - 1; i++)
        {
            let from 	= points[i];
            let to		= points[i+1];

            let direction 	= new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
            let right_angle = direction.rotate(sign * Math.PI/2).normalize().scale(this.TRACK_WIDTH);
            
            let p = new Phaser.Geom.Point(to.x + right_angle.x, to.y + right_angle.y);
            //this.drawArrow(to, p);

            result.push(p);
        }
        result.push(result[0]); // End with the start point again

        return result;
    }

    /**
     * For debugging purposes
     * 
     * @param from 
     * @param to 
     */
    drawArrow(from: Phaser.Geom.Point, to: Phaser.Geom.Point)
    {
        const LINE_WIDTH = 50;
        
        this.graphics.lineStyle(10, 0xffa500)
        this.graphics.lineBetween(from.x, from.y, to.x, to.y);
        
        let direction   = new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
        let arrowhead1  = direction.clone().rotate(Math.PI/2 - Math.PI/4).normalize().scale(LINE_WIDTH);
        let arrowhead2  = direction.clone().rotate(-Math.PI/2 + Math.PI/4).normalize().scale(LINE_WIDTH);
        this.graphics.lineBetween(to.x, to.y, to.x + arrowhead1.x, to.y + arrowhead1.y);
        this.graphics.lineBetween(to.x, to.y, to.x + arrowhead2.x, to.y + arrowhead2.y);
    }

    /**
     * returns unit vector in the direction of the car's heading
     */
    direction()
    {
        let [originX, originY] = [this.player.getCenter().x, this.player.getCenter().y];
        let [targetX, targetY] = [this.player.getBottomCenter().x, this.player.getBottomCenter().y]

        return new Phaser.Math.Vector2(targetX - originX, targetY - originY).normalize();
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    parent: 'game',
    width: 1080,
    height: 720,
    //scale: {
    //    mode: Phaser.Scale.FIT,
    //    autoCenter: Phaser.Scale.CENTER_BOTH
    //},
    scene: [MainScene],
    seed: ["Wow"],
    physics: {
        default: 'matter',
        matter: { 
            debug: true,
            gravity: { x: 0, y: 0 }
        }
    }
};

const game = new Phaser.Game(config);
