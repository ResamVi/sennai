import 'phaser';

let graphics: any;
let line: Phaser.Geom.Line;

let round = function(numb) {
    return Math.round(numb*100)/100;
}

export default class MainScene extends Phaser.Scene
{
    private player:         Phaser.Physics.Matter.Sprite[] = []; // TODO: Bundle all objects into worlds module
    private cursors:        Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:           Phaser.GameObjects.Text;
    
    
    private acceleration:   Phaser.Math.Vector2             = new Phaser.Math.Vector2(0, 0);
    private velocity:       Phaser.Math.Vector2             = new Phaser.Math.Vector2(0, 0);
    private position:       Phaser.Math.Vector2             = new Phaser.Math.Vector2(100, 100);
    private F_drive:        number                          = 0;

    private readonly ENGINEFORCE    = 100;
    private readonly BRAKEFORCE     = 250;

    /**
     * Using values from a Tesla Model S
     * 
     * Constants from: 
     *  https://en.wikipedia.org/wiki/Automobile_drag_coefficient
     *  https://www.school-for-champions.com/science/friction_rolling_coefficient.htm
     *  https://en.wikipedia.org/wiki/Tesla_Model_S
     * 
     * Formulas mainly from:
     *  https://asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html
     * 
     */
    private readonly C_d            = 0.37; // Drag coefficient
    private readonly rho            = 1.2;  // Air density (kg/m³)
    private readonly A              = 2.34; // Frontal area of car (m²)
    private readonly M              = 2250; // Mass (kg)
    
    private readonly C_drag         = 0.5 * this.C_d * this.A * this.rho;
    private readonly C_rr           = 0.02; // Asphalt
    
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
    }

    create ()
    {
        //this.add.image(987 * 5, 427 * 5, 'track').setScale(10);
        this.add.image(1120, 1120, 'grid');
        
        //this.player = this.matter.add.sprite(5870, 4080, 'car');
        for(let i = 0; i < 4; i++) {
            this.player[i] = this.matter.add.sprite(this.position.x, this.position.y + i*100, 'car'); // TODO: Set friction to 0
            this.player[i].setAngle(90);
        }

        
        this.text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);

        //this.matter.world.setBounds(0, 0, 987 * 10, 427 * 10);
        this.matter.world.setBounds(0, 0, 2240, 2240);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.startFollow(this.player[0], false);
        
        line = new Phaser.Geom.Line(0, 0, 0, 0);
        graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
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
            this.F_drive = this.ENGINEFORCE;
        }
        else if (this.cursors.down.isDown)
        {
            this.F_drive = -this.BRAKEFORCE;
        }
        else {
            this.F_drive = 0;
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
        this.position.add(this.velocity);                               // p = p + dt * v
        
        this.player[0].setPosition(this.position.x, this.position.y);

        this.debug(time, delta, this.acceleration, this.velocity);
    }

    debug(time, delta, accel, vel)
    {
        let [originX, originY] = [this.player[0].getCenter().x, this.player[0].getCenter().y];
        let [targetX, targetY] = [this.player[0].getTopCenter().x, this.player[0].getTopCenter().y]
        line.setTo(originX, originY, targetX, targetY);

        graphics.clear();
        graphics.strokeLineShape(line);

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
            'x: '       + round(this.player[0].x),
            'y: '       + round(this.player[0].y),
            'v: '       + round(vel.x) + ', ' + round(vel.y),
            'a: '       + round(accel.x) + ', ' + round(accel.x),
            'velocity: '+ round(vel.length()),
            'accel: '   + round(accel.length()),
            'fps: '     + round(this.game.loop.actualFps),
            'time: '    + round(time),
            'delta: '   + round(delta)
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
