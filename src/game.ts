import 'phaser';

let round = function(numb) {
    return Math.round(numb*100)/100;
}

export default class MainScene extends Phaser.Scene
{

    private readonly ENGINEPOWER    = 150;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00034;

    private player:         Phaser.Physics.Matter.Image[] = []; // TODO: Bundle all objects into worlds module
    private cursors:        Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:           Phaser.GameObjects.Text;

    private wheel_base: number  = 35;

    private velocity        = 0;
    private acceleration    = 0;

    private w_key: Phaser.Input.Keyboard.Key;
    private s_key: Phaser.Input.Keyboard.Key;
    private a_key: Phaser.Input.Keyboard.Key;
    private d_key: Phaser.Input.Keyboard.Key;

    private front_wheel: Phaser.Math.Vector2;
    private rear_wheel: Phaser.Math.Vector2;
    private steer_angle: number = 0;

    // Debug
    private graphics:       Phaser.GameObjects.Graphics;
    
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
    }

    create ()
    {
        //this.add.image(987 * 5, 427 * 5, 'track').setScale(10);
        //this.player = this.matter.add.sprite(5870, 4080, 'car');
        //this.matter.world.setBounds(0, 0, 987 * 10, 427 * 10);

        this.input.on('pointerdown', function (pointer) {
            console.log(`(${pointer.x}, ${pointer.y})`);
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.d_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.w_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.s_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.a_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);        
        
        this.add.image(1120, 1120, 'grid');
        
        for(let i = 0; i < 4; i++) {
            this.player[i] = this.matter.add.image(100, 100 + i*100, 'car'); // TODO: Set friction to 0
        }

        this.text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);

        this.graphics = this.add.graphics({ lineStyle: { width: 1, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        this.graphics.setScrollFactor(0);
        
        this.matter.world.setBounds(0, 0, 2240, 2240);

        this.cameras.main.startFollow(this.player[0], false);
    }

    update(time, delta)
    {
        // Controls
        this.steer();
        this.accelerate();
        this.applyPhysics(delta);
        this.debug(time, delta);

        this.cameras.main.setAngle(-this.player[0].angle + 180);
    }

    steer()
    {
        // Camera
        if(this.w_key.isDown)
        {
            this.cameras.main.y += 10;
        }

        if(this.s_key.isDown)
        {
            this.cameras.main.y -= 10;
        }

        if(this.a_key.isDown)
        {
            this.cameras.main.x += 10;
        }

        if(this.d_key.isDown)
        {
            this.cameras.main.x -= 10;
        }

        // Car
        let range = 20;
        if (this.velocity > 300){
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
        
        let position = new Phaser.Math.Vector2(this.player[0].x, this.player[0].y);

        this.front_wheel = position.clone().add(       this.direction().scale(this.wheel_base / 2));
        this.rear_wheel  = position.clone().subtract(  this.direction().scale(this.wheel_base / 2));

        this.front_wheel  .add(this.direction().scale(delta/1000 * this.velocity).rotate(this.steer_angle * Math.PI/180));
        this.rear_wheel   .add(this.direction().scale(delta/1000 * this.velocity));
    
        let carHeading  = this.front_wheel.clone().subtract(this.rear_wheel).rotate(-Math.PI/2).normalize();
        let carLocation = this.front_wheel.clone().add(     this.rear_wheel).scale(0.5);

        this.player[0].rotation = carHeading.angle();

        this.player[0].setPosition(carLocation.x, carLocation.y);
    }

    debug(time, delta,)
    {
        let x   = this.player[0].x;
        let y   = this.player[0].y;
        let vec = this.direction().scale(50);

        this.graphics.clear();
        
        this.graphics.fillCircle(this.front_wheel.x, this.front_wheel.y, 5);
        this.graphics.fillCircle(this.rear_wheel.x, this.rear_wheel.y, 5);
        this.graphics.lineBetween(x, y, x + vec.x, y + vec.y); // Orientation
        this.graphics.fillRectShape(this.rect_filled); // Velocity gauge
        this.graphics.strokeRectShape(this.rect_outline); // Velocity gauge

        this.text.setText([
            //'x: '       + round(this.player[0].x),
            //'y: '       + round(this.player[0].y),
            //'v: '       + round(vel.x) + ', ' + round(vel.y),
            //'a: '       + round(accel.x) + ', ' + round(accel.x),
            'angle: '   + this.steer_angle,
            'velocity: '+ round(this.velocity),
            'accel: '   + round(this.acceleration),
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
        let [targetX, targetY] = [this.player[0].getBottomCenter().x, this.player[0].getBottomCenter().y]

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
