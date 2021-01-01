import 'phaser';
import { Car, Control } from './car';
import { generateTrack } from './track';
import { generate_population, parent_selection, crossover, POPULATION_SIZE, ELIMINIATION_AMOUNT  } from './ai';

export default class MainScene extends Phaser.Scene
{
    private dot:        Phaser.Physics.Matter.Image;
    private cursors:    Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:       Phaser.GameObjects.Text;
    
    private controls: Control;
    
    private w_key: Phaser.Input.Keyboard.Key;
    private s_key: Phaser.Input.Keyboard.Key;
    private a_key: Phaser.Input.Keyboard.Key;
    private d_key: Phaser.Input.Keyboard.Key;
    
    private cars:           Car[]               = [];
    private track:          Phaser.Geom.Point[] = [];
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private generation_count: number = 0;
    private round_start: number       = 0;

    // Debug
    zoom = 0.18;
    graphics:       Phaser.GameObjects.Graphics;
    circle:         Phaser.Geom.Circle;
    recording:      Array<any> = [];
    left:   number  = 0;
    right:  number  = 0;
    up:     number  = 0;
    down:   number  = 0;

    allStopped = false;
    
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
            [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        });

        this.input.keyboard.on('keydown-M', () => {
            console.log(JSON.stringify(this.recording));
        });
        
        this.controls   = new Control();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.d_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.w_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.s_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.a_key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);        
        
        this.dot    = this.matter.add.image(200, 200, 'dot');
        
        this.text = this.add.text(-1080*2, -720*2, '', { font: '96px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        
        [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        
        
        let population = generate_population(Phaser.Math.RND)
        this.cars = [];
        for(let i = 0; i < POPULATION_SIZE; i++)
            this.cars[i]       = new Car(this, this.track, i, population[i]);
        

        this.cameras.main.startFollow(this.dot, false);
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);
        this.graphics.clear();

        // Player Controls
        this.spectate();
        //this.steer();
        //this.record(time);
        //this.accelerate();

        for(let car of this.cars)
            car.update(this.roundTime(time), delta, this.controls, this.graphics);

        let everyoneStopped = this.cars.reduce((prev, curr) => !prev ? false : curr.stopped, true);
        if(everyoneStopped)
            this.next_generation(time);

        this.drawTrack();

        this.debug(time);
    }

    spectate()
    {
        // Camera
        if(this.w_key.isDown)
            this.dot.y -= 50;

        if(this.s_key.isDown)
            this.dot.y += 50;

        if(this.a_key.isDown)
            this.dot.x -= 50;

        if(this.d_key.isDown)
            this.dot.x += 50;
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

    record(time: number)
    {
        // Keep track of duration
        if(this.cursors.left.isDown)
            this.left = this.cursors.left.getDuration();
        if(this.cursors.right.isDown)
            this.right = this.cursors.right.getDuration();
        if(this.cursors.up.isDown)
            this.up = this.cursors.up.getDuration();
        if(this.cursors.down.isDown)
            this.down = this.cursors.down.getDuration();

        // On key release, when the key-press-duration was measured: store
        if (this.cursors.left.isUp && this.left > 0)
        {
            let item = [time - this.left, "left", this.left];
            this.recording.push(item);
            this.left = 0;
        }
        
        if (this.cursors.right.isUp && this.right > 0)
        {
            let item = [time - this.left, "right", this.right];
            this.recording.push(item);
            this.right = 0;
        }
        
        if (this.cursors.up.isUp && this.up > 0)
        {
            let item = [time - this.up, "up", this.up];
            this.recording.push(item);
            this.up = 0;
        }

        if (this.cursors.down.isUp && this.down > 0)
        {
            let item = [time - this.down, "down", this.down];
            this.recording.push(item);
            this.down = 0;
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

    next_generation(time)
    {   
        let best_perfomers = this.cars.sort((a, b) => b.fitness - a.fitness);
        let worst_performers = best_perfomers.slice(best_perfomers.length - ELIMINIATION_AMOUNT );

        for(let i = 0; i < ELIMINIATION_AMOUNT; i++)
        {
            let mom = parent_selection(this.cars);
            let dad = parent_selection(this.cars);
            
            for(let car of worst_performers)
            {
                let kid_dna = crossover(mom.dna, dad.dna);
                car.replaceDNA(mom, dad, kid_dna);
            }
        }

        for(let car of this.cars)
        {
            car.restart();

        }

        this.generation_count++;
        this.round_start = time;
    }

    debug(time)
    {
        
        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        //this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // Track Corners
        this.graphics.fillStyle(0x00ff00);
        for(let p of this.track)
            this.graphics.fillCircle(p.x, p.y, 20);

        let best = [];
        let info = ['time: ' + Math.floor(time), 'round_time: ' + this.roundTime(time), 'Generation: ' + this.generation_count];
        best = this.cars.sort((a, b) => b.fitness - a.fitness);
        
        for(let i = 0; i < best.length; i++)
            info.push(`${this.pad(i+1)} #${this.pad(best[i].index)} | ${best[i].fitness}`);

        this.text.setText(info);
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

    roundTime(time: number): number
    {
        return Math.floor(time - this.round_start);
    }

    pad(str): string
    {
        return str.toString().padStart(2, ' ');
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
            enabled: false,
            debug: true,
            gravity: { x: 0, y: 0 }
        }
    }
};

const game = new Phaser.Game(config);
