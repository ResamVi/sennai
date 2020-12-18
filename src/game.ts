import 'phaser';
import Spline from 'cubic-spline';

let round = function(numb) {
    return Math.round(numb*100)/100;
}

export default class MainScene extends Phaser.Scene
{

    /**
     * Torque curve of a Ferrari 458 Italia
     *  https://www.automobile-catalog.com/curve/2014/1227470/ferrari_458_italia.html
     */
    private readonly _rpm = [
        1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100,
        2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 
        3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400, 4500,
        4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700,
        5800, 5900, 6000, 6100, 6200, 6300, 6400, 6500, 6600, 6700, 6800, 6900,
        7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900, 8000, 8100,
        8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 9000
    ];

    private readonly _torque = [
        240, 272.7, 300, 323.1, 342.9, 360, 375, 388.2, 400, 410.5, 420, 428.6,
        436.4, 443.5, 450, 456, 461.5, 466.7, 471.4, 475.9, 480, 483.9, 487.5,
        490.9, 494.1, 497.1, 500, 502.7, 505.3, 507.7, 510, 512.2, 514.3, 516.3,
        518.2, 520, 521.7, 523.4, 525, 526.5, 528, 529.4, 530.8, 532.1, 533.3, 534.5,
        535.7, 536.8, 537.9, 539, 540, 539.9, 539.6, 539.1, 538.4, 537.5, 536.4, 535.2,
        533.7, 532, 530.1, 528, 525.7, 523.3, 520.6, 517.7, 514.7, 511.4, 507.9, 504.3,
        500.4, 496.4, 492.1, 487.6, 483, 477.5, 471.9, 466.5, 461.2, 456, 450.9, 
    ];

    /**
     * Using values from a Ferrari F430
     * 
     * Constants from: 
     *  https://en.wikipedia.org/wiki/Automobile_drag_coefficient
     *  http://hpwizard.com/tire-friction-coefficient.html
     *  https://www.school-for-champions.com/science/friction_rolling_coefficient.htm
     *  https://www.ferrarichat.com/forum/threads/ferrari-430-coefficient-of-drag-and-frontal-area.144326/
     *      
     * Formulas mainly from:
     *  https://asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html
     *  https://www.engineeringtoolbox.com/cars-power-torque-d_1784.html
     *  https://x-engineer.org/automotive-engineering/chassis/vehicle-dynamics/calculate-wheel-torque-engine/
     * 
     */
    private readonly C_d            = 0.34; // Drag coefficient
    private readonly rho            = 1.2;  // Air density (kg/m³)
    private readonly A              = 1.90; // Frontal area of car (m²)
    private readonly M              = 2250; // Mass (kg)
    
    private readonly C_drag         = 0.5 * this.C_d * this.A * this.rho;
    private readonly C_rr           = 0.02; // Asphalt

    /**
     *       Center of Gravity (CG)
     *         _____________
     *        //    ||    \ \
     *  _____//_____CG_____\ \___       _
     *  )  _        |       _    \      |
     *  |_/ \_______|______/ \___|      | h
     * ___\_/_______|______\_/______    ⊥
     *     <---b--->|<---c-->
     *     <-------L-------->
     */
    //private readonly L  = 2.65; // Wheelbase (m)
    //private readonly h  = 0.73; // height of CG (m) - estimate from looking at diagrams
    //private readonly c  = this.L * 0.52;
    //private readonly b  = this.L * 0.48;

    //private readonly mu             = 1.5;  // coefficient of friction
    //private readonly g              = 9.81; // Gravity (m/s²)
    //private readonly W              = this.M * this.g; // Weight (N)
    //private readonly W_front        = (this.c/this.L) * this .W // Front-wheel load
    //private readonly W_rear         = (this.b/this.L) * this .W // Rear-wheel load
    
    /**
     * Gear Ratios of a the F136 V8 engine inside a Ferrari 458 Italia
     *  https://www.driverside.com/specs/ferrari-458_italia-2012-30960-54122-0
     */
    private readonly gear_ratio         = [3.08, 2.19, 1.63, 1.29, 1.03, 0.84, 0.69];
    private readonly gear_maxSpeed      = [5.00, 7.00, 9.00, 11.0, 13.0, 15.0, 20.0]

    /**
     * 235/35R20 Tyre
     *  Using https://tiresize.com/tyre-size-calculator/
     */
    private readonly wheel_radius       = 0.67; // (m)
    private readonly wheel_weight       = 10.2; // (kg)
    private readonly transm_efficiency  = 0.05; // Arbitrary value so game feels balanced

    private gear:           number  = 0;
    private torque_curve:   Spline  = new Spline(this._rpm, this._torque);

    private player:         Phaser.Physics.Matter.Sprite[] = []; // TODO: Bundle all objects into worlds module
    private cursors:        Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:           Phaser.GameObjects.Text;

    private rpm:            number                          = 0;

    private acceleration:   Phaser.Math.Vector2             = new Phaser.Math.Vector2(0, 0);
    private velocity:       Phaser.Math.Vector2             = new Phaser.Math.Vector2(0, 0);
    private position:       Phaser.Math.Vector2             = new Phaser.Math.Vector2(100, 100);
    private F_drive:        number                          = 0;

    private readonly ENGINEFORCE    = 100;
    private readonly BRAKEFORCE     = 800;

    private w_key: Phaser.Input.Keyboard.Key;
    private s_key: Phaser.Input.Keyboard.Key;

    // Debug
    private graphics:       Phaser.GameObjects.Graphics;
    private tire:           Phaser.GameObjects.Image;
    
    circle          = new Phaser.Geom.Circle(0, 0, 0);
    rect_filled     = new Phaser.Geom.Rectangle(200, 10, 10, 120);
    rect_outline    = new Phaser.Geom.Rectangle(200, 10, 10, 120);

    constructor ()
    {
        super('demo');
    }

    preload ()
    {
        // TODO: Put into dedicated scene for loading
        this.load.image('car', 'assets/car.png');
        this.load.image('grid', 'assets/grid.png');
        this.load.image('track', 'assets/track.png');
        this.load.image('tire', 'assets/tire.png');
    }

    create ()
    {
        //this.add.image(987 * 5, 427 * 5, 'track').setScale(10);
        //this.player = this.matter.add.sprite(5870, 4080, 'car');
        //this.matter.world.setBounds(0, 0, 987 * 10, 427 * 10);

        this.input.on('pointerdown', function (pointer) {
            console.log(`(${pointer.x}, ${pointer.y})`);
        });

        // Shift gears
        this.input.keyboard.on('keyup-W', () => {
            if(this.gear < this.gear_ratio.length - 1) {
                this.gear++;
                this.rpm = this.velocity.length() / this.gear_ratio[this.gear];
                console.log(this.rpm);
            }
        });

        this.input.keyboard.on('keyup-S', () => {
            if(this.gear > 0) {
                this.gear--;
            }
        });

        this.w_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.s_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

        this.add.image(1120, 1120, 'grid');
        
        this.tire = this.add.image(290, 70, 'tire');
        this.tire.setScrollFactor(0);
        
        for(let i = 0; i < 4; i++) {
            this.player[i] = this.matter.add.sprite(this.position.x, this.position.y + i*100, 'car'); // TODO: Set friction to 0
            this.player[i].setAngle(90);
        }
        
        this.text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);

        this.matter.world.setBounds(0, 0, 2240, 2240);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.startFollow(this.player[0], false);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 1, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        this.graphics.setScrollFactor(0);
    }

    update(time, delta)
    {
        // Controls
        this.steer();
        this.accelerate();

        //this.cameras.main.setAngle(-this.player.angle - 90);
        this.applyPhysics(time, delta);
    }

    steer()
    {
        if (this.cursors.left.isDown)
        {
            this.player[0].setAngularVelocity(-0.05);
        }
        else if (this.cursors.right.isDown)
        {
            this.player[0].setAngularVelocity(0.05);
        }
        else
        {
            this.player[0].setAngularVelocity(0);
        }
    }

    accelerate()
    {
        if (this.cursors.up.isDown)
        {
            //this.F_drive = this.ENGINEFORCE;

            if(this.rpm < 9000)
            {
                this.rpm += 100;
            }

            this.F_drive = this.torque_curve.at(this.rpm) * this.gear_ratio[this.gear] * this.transm_efficiency / this.wheel_radius;
            console.log(this.rpm / this.gear_ratio[this.gear] * (1/60) * 2 * Math.PI * this.wheel_radius + " m/s");

            //this.F_drive = (this.rpm/this.maxRpm) * this.gear_maxSpeed[this.gear];
        }
        else if (this.cursors.down.isDown)
        {
            this.F_drive = -this.BRAKEFORCE;
        }
        else {
            this.F_drive = 0;

            if(this.rpm >= 100) {
                this.rpm -= 100;
            }
        }
    }

    applyPhysics(time, delta)
    {   
        let F_traction      = this.direction()      .scale(this.F_drive);
        let F_drag          = this.velocity.clone() .scale(-this.C_drag * this.velocity.length());
        let F_rollresist    = this.velocity.clone() .scale(-this.C_rr);

        let F_longitudinal  = F_traction.add(F_drag).add(F_rollresist); // F_long = F_traction + F_drag + F_rr

        // Avoid going in reverse when braking 
        if(this.F_drive == -this.BRAKEFORCE && this.velocity.length() < 0.2)
        {
            F_longitudinal  = Phaser.Math.Vector2.ZERO;
            this.velocity   = Phaser.Math.Vector2.ZERO;
        }

        this.acceleration   = F_longitudinal.scale(1 / this.M);         // a = F/M
        this.velocity.add(this.acceleration);                           // v = v + dt * a
        this.position.add(this.velocity);                           // p = p + dt * v
        
        this.player[0].setPosition(this.position.x, this.position.y);

        this.debug(time, delta, this.acceleration, this.velocity);
    }

    debug(time, delta, accel, vel)
    {
        let x   = this.cameras.main.centerX;
        let y   = this.cameras.main.centerY;
        let vec = this.direction().scale(50);

        this.rect_filled.height = vel.length() * 5;

        this.tire.rotation += this.rpm * 2 * Math.PI * (1/60) * (delta/1000);

        this.graphics.clear();
        
        this.graphics.lineBetween(x, y, x + vec.x, y + vec.y); // Orientation
        this.graphics.fillRectShape(this.rect_filled); // Velocity gauge
        this.graphics.strokeRectShape(this.rect_outline); // Velocity gauge

        /*
        console.log("Accel");
        console.log(accel);
        
        console.log("Velocity");
        console.log(this.velocity);

        console.log("Position");
        console.log(position);

        console.log("Position delta");
        console.log(velocity.scale(delta));

        console.log("Direction");
        console.log(this.direction());
        
        console.log("Traction");
        console.log(F_traction);

        console.log("Drag");
        console.log(F_drag);

        console.log("Rollresist");
        console.log(F_rollresist);

        console.log("Longitudinal");
        console.log(F_longitudinal);
        */

        this.text.setText([
            //'x: '       + round(this.player[0].x),
            //'y: '       + round(this.player[0].y),
            //'v: '       + round(vel.x) + ', ' + round(vel.y),
            //'a: '       + round(accel.x) + ', ' + round(accel.x),
            'velocity: '+ round(vel.length()),
            'accel: '   + round(accel.length()),
            'rpm: '     + round(this.rpm),
            'gear: '    + round(this.gear),
            //'fps: '     + round(this.game.loop.actualFps),
            //'time: '    + round(time),
            //'delta: '   + round(delta)
        ]);
    }

    /**
     * returns unit vector in the direction of the car's heading
     */
    direction()
    {
        let [originX, originY] = [this.player[0].getCenter().x, this.player[0].getCenter().y];
        let [targetX, targetY] = [this.player[0].getTopCenter().x, this.player[0].getTopCenter().y]

        return new Phaser.Math.Vector2(targetX - originX, targetY - originY).normalize();
    }

    /**
     * Angular velocity of the engine
     */
    angular_velocity()
    {

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
    physics: {
        default: 'matter',
        matter: { 
            debug: true,
            gravity: {
                x: 0,
                y: 0
            }
        }
    }

};

const game = new Phaser.Game(config);
