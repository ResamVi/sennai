import 'phaser';
import { Car, Control } from './car';
import { generateTrack, TRACK_WIDTH } from './track';
import { round } from './util';

export default class MainScene extends Phaser.Scene
{
    private dot:        Phaser.Physics.Matter.Image;
    private cursors:    Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:       Phaser.GameObjects.Text;
    
    private cars: Car;
    private controls: Control;

    private w_key: Phaser.Input.Keyboard.Key;
    private s_key: Phaser.Input.Keyboard.Key;
    private a_key: Phaser.Input.Keyboard.Key;
    private d_key: Phaser.Input.Keyboard.Key;

    private track:          Phaser.Geom.Point[] = [];
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private progress: Set<Phaser.Geom.Point> = new Set();

    // Debug
    graphics:       Phaser.GameObjects.Graphics;
    zoom = 0.18;
    circle:         Phaser.Geom.Circle;
    
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
        
        this.cars       = new Car(this, this.track);
        this.controls   = new Control();
        this.circle     = new Phaser.Geom.Circle(this.cars.object.x, this.cars.object.y, TRACK_WIDTH + 50);

        this.cameras.main.startFollow(this.cars.object, false);
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);
        this.graphics.clear();

        // Controls
        this.spectate();
        this.steer();
        this.accelerate();
        this.trackProgress();
        
        this.cars.update(time, delta, this.controls);
        
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
        if (this.cursors.left.isDown)
        {
            this.controls.left  = true;
            this.controls.right = false;
        }
        else if (this.cursors.right.isDown)
        {
            this.controls.right = true;
            this.controls.left  = false;
        }
        else
        {
            this.controls.left  = false;
            this.controls.right = false;
        }
    }

    accelerate()
    {
        if (this.cursors.up.isDown) // Accelerating
        {
            this.controls.up    = true;
            this.controls.down  = false;
        }
        else if (this.cursors.down.isDown) // Braking
        {
            this.controls.down  = true;
            this.controls.up    = false;
        }
        else // Rolling
        {
            this.controls.down = false;
            this.controls.up = false;
        }
    }

    trackProgress()
    {
        this.circle.setPosition(this.cars.object.x, this.cars.object.y);
        
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
          
        this.graphics.strokeCircle(this.cars.object.x, this.cars.object.y, TRACK_WIDTH + 50);

        this.graphics.fillStyle(0x0000ff);
        this.circle.setPosition(this.cars.object.x, this.cars.object.y);
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
