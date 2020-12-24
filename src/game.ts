import 'phaser';
import { makeHull, centerOfMass, scalePolygon, meanCenter } from './algorithms';

// TODO: Move to util?
let round = function(numb) {
    return Math.round(numb*100)/100;
}

let equal = function(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}

export default class MainScene extends Phaser.Scene
{
    private readonly ENGINEPOWER    = 150;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00034;
    private readonly TRACK_WIDTH    = 8000;
    private readonly TRACK_HEIGHT   = 6000;
    private readonly WHEEL_BASE     = 35;

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

    private rng: Phaser.Math.RandomDataGenerator = Phaser.Math.RND;

    // Debug
    graphics:       Phaser.GameObjects.Graphics;
    
    circle          = new Phaser.Geom.Circle(0, 0, 0);
    rect_filled     = new Phaser.Geom.Rectangle(200, 10, 10, 120);
    rect_outline    = new Phaser.Geom.Rectangle(200, 10, 10, 120);

    zoom = 0.08;
    annotation = [];
    style = { fontFamily: 'Tahoma ', fontSize: 64};
    texts: Phaser.GameObjects.Text[] = [];
    center: Phaser.Geom.Point;
    centre: Phaser.Geom.Point;

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

        this.cameras.main.startFollow(this.dot, false);
        
        // Generate track
        this.generateTrack();
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);

        // Controls
        this.steer();
        this.accelerate();
        this.applyPhysics(delta);
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

        for(let i = 0; i < 40; i++)
        {
            let x = this.rng.between(0, this.TRACK_WIDTH);
            let y = this.rng.between(0, this.TRACK_HEIGHT);
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

        // Calculate center of gravity (we scale off of this point later)
        this.center = centerOfMass(this.track);
        this.centre = meanCenter(this.track);

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
        for(let f = 0; f <= 1; f+= 0.0001)
        {
            let x = Phaser.Math.Interpolation.CatmullRom(xSet, f);
            let y = Phaser.Math.Interpolation.CatmullRom(ySet, f);
            this.interpolated.push(new Phaser.Geom.Point(x, y));
        }
    }

    steer()
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

        // Car
        let range = 20;
        if (this.velocity > 300)
        {
            range = 10;
        }

        if (this.cursors.left.isDown)
        {
            if(this.steer_angle > -range)
            {
                this.steer_angle -= 5;
            }
        }
        else if (this.cursors.right.isDown)
        {
            if(this.steer_angle < range)
            {
                this.steer_angle += 5;
            }
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
            this.acceleration = Math.min(this.acceleration + 1, this.ENGINEPOWER)
        }
        else if (this.cursors.down.isDown) // Braking
        {
            this.acceleration = Math.max(this.acceleration - 5, 0);
        }
        else // Rolling
        {
            this.acceleration = Math.max(this.acceleration - 1, 0);
        }
    }

    applyPhysics(delta)
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
    }

    debug(time, delta)
    {
        this.graphics.clear();
        
        // Track Bounds
        this.graphics.lineStyle(5, 0x0000ff);
        this.graphics.strokeRect(0, 0, this.TRACK_WIDTH, this.TRACK_HEIGHT);

        // Generated Points
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.points)
            this.graphics.fillCircle(p.x, p.y, 20);
        
        // Track
        this.graphics.lineStyle(2, 0x00ff00)
        this.graphics.strokePoints(this.track);

        // Track bounds
        this.graphics.lineStyle(2, 0xffffff);
        let inner = scalePolygon(this.interpolated, this.center, 1.1);
        let outer = scalePolygon(this.interpolated, this.center, 0.9);
        //this.graphics.strokePoints(inner);
        //this.graphics.strokePoints(outer);

        let inner2 = this.trackBounds(this.interpolated, true);
        let outer2 = this.trackBounds(this.interpolated, false);
        this.graphics.lineStyle(2, 0xff0000);
        this.graphics.strokePoints(inner2);
        this.graphics.strokePoints(outer2);

        // Track Corners
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.track)
            this.graphics.fillCircle(p.x, p.y, 20);


        // Added track corners
        this.graphics.fillStyle(0xff0000);
        for(let p of this.additional)
            this.graphics.fillCircle(p.x, p.y, 20);

        // Interpolation
        /*this.graphics.fillStyle(0xffffff);
        for(let p of this.interpolated)
            this.graphics.fillCircle(p.x, p.y, 20);*/

        // Center of Mass
        this.graphics.fillStyle(0x0066ff);
        this.graphics.fillCircle(this.center.x, this.center.y, 20);

        // Mean Mass
        this.graphics.fillStyle(0xffa500);
        this.graphics.fillCircle(this.centre.x, this.centre.y, 20);

        //this.graphics.fillCircle(this.front_wheel.x, this.front_wheel.y, 5);
        //this.graphics.fillCircle(this.rear_wheel.x, this.rear_wheel.y, 5);
        //this.graphics.lineBetween(x, y, x + vec.x, y + vec.y); // Orientation

        

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
        const TRACK_WIDTH = 400;
        
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
    width: 1080,
    height: 720,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
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
