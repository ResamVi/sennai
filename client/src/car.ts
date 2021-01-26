import { round, vector } from './util';

import { TRACK_WIDTH } from './track';

/**
 * Snapshot of which buttons to press
 * for one update()-cycle or frame
 */
export class Control
{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;

    constructor()
    {
        this.left = false;
        this.right = false;
        this.up = false;
        this.down = false;
    }
}

export class Car // extend matter.image
{
    // Constants
    private readonly POWER          = 5;
    private readonly BRAKEPOWER     = 50;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00016;
    private readonly WHEEL_BASE     = 35;
    private readonly RATES          = [4,  4,  4,  4, 4, 3, 2, 2, 1, 1]; // How fast we can steer to one direction
    private readonly RANGES         = [10, 10, 10, 5, 5, 3, 2, 2, 1, 1]; // How far we can steer in one direction
    
    // Public
    public index:      number;
    
    // Private
    private car: Phaser.Physics.Matter.Image;
    private front_wheel: Phaser.Math.Vector2;
    private rear_wheel: Phaser.Math.Vector2;
    
    private track: Phaser.Geom.Point[];

    private circle: Phaser.Geom.Circle;

    private velocity: number        = 0;
    private acceleration: number    = 0;
    private steer_angle: number     = 0;

    private progress: Set<Phaser.Geom.Point> = new Set();
    private last_progress: number;

    private name: string;
    private text:       Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, track: Phaser.Geom.Point[], index: number, x: number, y: number, rotation: number, name: string)
    {
        this.track = track;
        this.index = index;
        this.name = name;

        // Put Player on track and point him in right direction
        this.car = scene.matter.add.image(x, y, 'car');
        this.car.setRotation(rotation); // TODO: Track currently hardcoded

        // Circle determines when we go out of track
        this.circle = new Phaser.Geom.Circle(this.car.x, this.car.y, TRACK_WIDTH + 50);

        // Display car info
        this.text = scene.add.text(this.car.x, this.car.y, this.name, { font: '64px Courier', color: '#ffffff' }).setOrigin(0.5);
        this.text.setScrollFactor(1);
    }

    public destroy()
    {
        this.car.destroy();
        this.text.destroy();
    }

    public update(frames: number, delta: number, graphics: Phaser.GameObjects.Graphics)
    {
        //this.steer(user_control);
        this.physics(delta);
        this.track_progress(frames); // TODO: Rename to out of bounds
        
        this.drawName(graphics);
    }

    get object(): Phaser.Physics.Matter.Image
    {
        return this.car;
    }

    private steer(control: Control)
    {
        let r       = Math.min(this.velocity/2400, 1.0); // We say 2400 is the max velocity most reach
        let rate    = Phaser.Math.Interpolation.Linear(this.RATES, r);
        let range   = Phaser.Math.Interpolation.Linear(this.RANGES, r);

        if (control.left)
        {
            if(this.steer_angle > 0) // When steering right to left make transition snappier
                this.steer_angle = 0;

            if(this.steer_angle > -range)
                this.steer_angle -= rate;
        }
        else if (control.right)
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
    
    
        if (control.up) // Accelerating
        {
            this.acceleration = this.acceleration + this.POWER;
        }
        if (control.down) // Braking
        {
            this.acceleration -= this.BRAKEPOWER;
            
            if(this.acceleration < 0)
                this.acceleration = 0;
        }
        
        if (!control.down && !control.up) // Rolling
        {
            this.acceleration = Math.max(this.acceleration - 8, 0);
        }
    }

    private physics(delta)
    {
        let friction_force  = round(this.velocity * this.FRICTION);
        let drag_force      = round(this.velocity * this.velocity * this.DRAG);

        this.velocity += this.acceleration;
        this.velocity += friction_force + drag_force;
        
        // We reduce velocity when we are too far out of track
        this.circle.setPosition(this.car.x, this.car.y);
        let points: Array<Phaser.Geom.Point> = [];
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
                points.push(p);
        }

        if(points.length == 0)
            this.acceleration *= 0.5;

        let position = new Phaser.Math.Vector2(this.car.x, this.car.y);

        this.front_wheel = position.clone().add(       this.direction().scale(this.WHEEL_BASE / 2));
        this.rear_wheel  = position.clone().subtract(  this.direction().scale(this.WHEEL_BASE / 2));

        this.front_wheel  .add(this.direction().scale(delta/1000 * this.velocity).rotate(this.steer_angle * Math.PI/180));
        this.rear_wheel   .add(this.direction().scale(delta/1000 * this.velocity));
    
        let carHeading  = this.front_wheel.clone().subtract(this.rear_wheel).rotate(-Math.PI/2).normalize();
        let carLocation = this.front_wheel.clone().add(     this.rear_wheel).scale(0.5);

        this.car.rotation = carHeading.angle();
        this.car.setPosition(carLocation.x, carLocation.y);
    }

    
    private track_progress(frames) // TODO: Change to fitness
    {
        this.circle.setPosition(this.car.x, this.car.y);
        
        let length = this.progress.size;
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
                this.progress.add(p);
        }

        if(length < this.progress.size)
            this.last_progress = frames;

        let delta = frames - this.last_progress;
        //if(delta > this.URGENCY)
        //    this._stopped = true;
    }

    private drawName(graphics: Phaser.GameObjects.Graphics)
    {
        this.text.setPosition(this.car.x, this.car.y-100);

        // this.graphics.strokeCircle(this.cars.object.x, this.cars.object.y, TRACK_WIDTH + 50);
    }

    /**
     * returns unit vector in the direction of the car's heading
     */
    private direction()
    {
        let [originX, originY] = [this.car.getCenter().x, this.car.getCenter().y];
        let [targetX, targetY] = [this.car.getBottomCenter().x, this.car.getBottomCenter().y]

        return new Phaser.Math.Vector2(targetX - originX, targetY - originY).normalize();
    }
}