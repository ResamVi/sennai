import 'phaser';
import { generateTrack, TRACK_WIDTH } from './track';

// TODO: Move to util?
let round = function(numb) {
    return Math.round(numb*100)/100;
}

export default class MainScene extends Phaser.Scene
{
    private readonly POWER          = 5;
    private readonly BRAKEPOWER     = 50;
    private readonly FRICTION       = -0.02;
    private readonly DRAG           = -0.00016;
    private readonly WHEEL_BASE     = 35;

    private readonly RATES    = [4,  4,  4,  4, 4, 3, 2, 2, 1, 1]; // How fast we can steer to one direction
    private readonly RANGES   = [10, 10, 10, 5, 5, 3, 2, 2, 1, 1]; // How far we can steer in one direction

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

    private track:          Phaser.Geom.Point[] = [];
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private circle: Phaser.Geom.Circle;
    private progress: Set<Phaser.Geom.Point> = new Set();

    // Debug
    graphics:       Phaser.GameObjects.Graphics;
    zoom = 0.18;
    
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
            //this.texts.forEach(t => t.setAlpha(0));
            [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.d_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.w_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.s_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.a_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);        
        
        this.dot    = this.matter.add.image(200, 200, 'dot');
        
        this.text = this.add.text(-1080*2, -720*2, '', { font: '256px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        
        
        [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        
        // Put Player on track
        this.player = this.matter.add.image(this.track[0].x, this.track[0].y, 'car');
        this.player.setRotation(this.vector(this.track[0], this.track[1]).angle() + Math.PI/2);
        
        this.circle = new Phaser.Geom.Circle(this.player.x, this.player.y, TRACK_WIDTH + 50);
        
        this.cameras.main.startFollow(this.player, false);
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);

        // Controls
        this.spectate();
        this.steer();
        this.accelerate();
        this.trackProgress();
        this.applyPhysics(time, delta);
        this.drawTrack()
        
        this.debug(time, delta);
        //this.cameras.main.setAngle(-this.player.angle + 180);
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
        let r       = Math.min(this.velocity/2400, 1.0); // We say 2400 is the max velocity most reach
        let rate    = Phaser.Math.Interpolation.Linear(this.RATES, r);
        let range   = Phaser.Math.Interpolation.Linear(this.RANGES, r);

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
            this.acceleration -= this.BRAKEPOWER;
            
            if(this.acceleration < 0)
                this.acceleration = 0;
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
        
        // We reduce velocity when we are too far out of track
        let points = [];
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
                points.push(p);
        }

        if(points.length == 0)
            this.acceleration *= 0.5;

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

    trackProgress()
    {
        console.log(this.progress);
        console.log(this.progress.size);
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
            {
                this.progress.add(p);
            }
        }
    }

    drawTrack()
    {
        this.graphics.clear();

        // Track line
        this.graphics.lineStyle(2, 0x00ff00)
        this.graphics.strokePoints(this.track);
        
        // Track bounds
        this.graphics.lineStyle(2, 0xff0000)
        this.graphics.strokePoints(this.inner);
        this.graphics.strokePoints(this.outer);
    }

    debug(time, delta)
    {
        
        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        //this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // Track Corners
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.track)
            this.graphics.fillCircle(p.x, p.y, 20);
          
        this.graphics.strokeCircle(this.player.x, this.player.y, TRACK_WIDTH + 50);

        this.graphics.fillStyle(0x0000ff);
        this.circle.setPosition(this.player.x, this.player.y);
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
            {
                this.graphics.fillCircle(p.x, p.y, 20);
            }

        }

        // Inner/Outer track line
        //this.graphics.fillStyle(0xff0000);
        //for(let p of this.outer)
        //    this.graphics.fillCircle(p.x, p.y, 20);
        //for(let p of this.inner)
        //    this.graphics.fillCircle(p.x, p.y, 20);

        // Hightlight Neighbour selection and visualize radius where we deem points as "too close" and consequently remove
        //this.graphics.fillStyle(0x00ff00);
        //this.graphics.fillCircle(this.interpolated[i].x, this.interpolated[i].y, 100);
        //for(let k = left_margin; k != right_margin; k = (k + 1) % this.interpolated.length)
        //{
        //    this.graphics.fillCircle(this.interpolated[k].x, this.interpolated[k].y, 50);
        //    this.graphics.strokeCircle(this.interpolated[k].x, this.interpolated[k].y, this.TRACK_WIDTH);
        //}

        this.text.setText([
            //'x: '       + round(this.player.x),
            //'y: '       + round(this.player.y),
            //'v: '       + round(vel.x) + ', ' + round(vel.y),
            //'a: '       + round(accel.x) + ', ' + round(accel.x),
            //'angle: '   + this.steer_angle,
            //'velocity: '+ round(this.velocity),
            //'accel: '   + round(this.acceleration),
            //'fps: '     + round(this.game.loop.actualFps),
            'time: '        + round(time) / 1000,
            'progress: '    + round(this.progress.size/this.track.length)*100 + '%',
            //'delta: '   + round(delta)
        ]);
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

    /**
     * Returns the vector starting at `from` and pointing to `to`
     */
    vector(from: Phaser.Geom.Point, to: Phaser.Geom.Point)
    {
        return new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
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
