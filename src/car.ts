import { round, vector } from './util';

import { TRACK_WIDTH } from './track';

export class Control
{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export class Car
{
    // Constants
    private readonly POWER          = 5;
    private readonly BRAKEPOWER     = 50;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00016;
    private readonly WHEEL_BASE     = 35;
    private readonly RATES          = [4,  4,  4,  4, 4, 3, 2, 2, 1, 1]; // How fast we can steer to one direction
    private readonly RANGES         = [10, 10, 10, 5, 5, 3, 2, 2, 1, 1]; // How far we can steer in one direction
    
    // Publicly accessed
    private car: Phaser.Physics.Matter.Image;
    
    // Private
    private front_wheel: Phaser.Math.Vector2;
    private rear_wheel: Phaser.Math.Vector2;
    
    private track: Phaser.Geom.Point[];

    private circle: Phaser.Geom.Circle;

    private velocity: number        = 0;
    private acceleration: number    = 0;
    private steer_angle: number     = 0;


    constructor(scene: Phaser.Scene, track: Phaser.Geom.Point[])
    {
        // Put Player on track and point him in right direction
        this.car = scene.matter.add.image(track[0].x, track[0].y, 'car');
        this.car.setRotation(vector(track[0], track[1]).angle() + Math.PI/2);

        this.circle = new Phaser.Geom.Circle(this.car.x, this.car.y, TRACK_WIDTH + 50);

        this.track = track;
    }

    public update(time, delta, control: Control)
    {
        this.inputs(control);
        this.physics(time, delta);
    }

    get object(): Phaser.Physics.Matter.Image
    {
        return this.car;
    }

    private inputs(control: Control)
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
        else if (control.down) // Braking
        {
            this.acceleration -= this.BRAKEPOWER;
            
            if(this.acceleration < 0)
                this.acceleration = 0;
        }
        else // Rolling
        {
            this.acceleration = Math.max(this.acceleration - 8, 0);
        }
    }

    private physics(time, delta)
    {
        let friction_force  = round(this.velocity * this.FRICTION);
        let drag_force      = round(this.velocity * this.velocity * this.DRAG);

        this.velocity += this.acceleration;
        this.velocity += friction_force + drag_force;
        
        // We reduce velocity when we are too far out of track
        this.circle.setPosition(this.car.x, this.car.y);
        let points = [];
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

        (window as any).data1.push({x: round(time)/1000, y: this.velocity});
        //(window as any).data2.push({x: round(time)/1000, y: this.acceleration});
        //(window as any).data3.push({x: round(time)/1000, y: -drag_force});
        //(window as any).data4.push({x: round(time)/1000, y: -friction_force});
        (window as any).myChart.update();
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