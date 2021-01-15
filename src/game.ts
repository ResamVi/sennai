import 'phaser';
import { Car, Control } from './car';
import { generateTrack } from './track';
import { generate_population, parent_selection, crossover, mutate, NEW_SPAWNS, START_POPULATION  } from './ai';

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

    private next_index: number = 0;

    private frames: number = 0;

    // Debug
    zoom = 0.18;
    graphics:       Phaser.GameObjects.Graphics;
    circle:         Phaser.Geom.Circle;
    recording:      Array<any> = [];
    left:   number  = 0;
    right:  number  = 0;
    up:     number  = 0;
    down:   number  = 0;

    speed: number = 1;
    
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

        this.load.json('ai', 'ai/0.json');
    }

    create ()
    {   
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
        });

        this.input.keyboard.on('keydown-R', () => {
            [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        });

        this.input.keyboard.on('keydown-B', () => {
            console.log(JSON.stringify(this.recording));
        });
        
        this.input.keyboard.on('keydown-M', () => {
            this.speed += 1;
        });

        this.input.keyboard.on('keydown-N', () => {
            this.speed -= 1;
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
        
        let ai = this.cache.json.get('ai');

        let population = generate_population(Phaser.Math.RND)
        this.cars = [];
        for(;this.next_index < 1; this.next_index++) // USP
            this.cars[this.next_index]       = new Car(this, this.track, this.next_index, ai);

        this.cameras.main.startFollow(this.cars[0].object, false); // USP
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);
        this.graphics.clear();

        // Player Controls
        this.spectate();
        this.steer(); // USP
        this.record(time);
        this.accelerate();

        for(let car of this.cars)
        {
            for(let i = 0; i < this.speed; i++)
                car.update(this.frames, delta, this.controls, this.graphics);
        }

        //let everyoneStopped = this.cars.reduce((prev, curr) => !prev ? false : curr.stopped, true);
        //if(everyoneStopped)
        //    this.next_generation(time);

        this.drawTrack();
        this.debug(time);

        this.frames += 1;
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
        // Keep track of duration (counted in total frames)
        if(this.cursors.left.isDown)
            this.left += 1;
        if(this.cursors.right.isDown)
            this.right += 1;
        if(this.cursors.up.isDown)
            this.up += 1;
        if(this.cursors.down.isDown)
            this.down += 1;

        // On key release, when the key-press-duration was measured: store
        if (this.cursors.left.isUp && this.left > 0)
        {
            let item = [this.frames - this.left, "left", this.left];
            this.recording.push(item);
            this.left = 0;
        }
        
        if (this.cursors.right.isUp && this.right > 0)
        {
            let item = [this.frames - this.right, "right", this.right];
            this.recording.push(item);
            this.right = 0;
        }
        
        if (this.cursors.up.isUp && this.up > 0)
        {
            let item = [this.frames - this.up, "up", this.up];
            this.recording.push(item);
            this.up = 0;
        }

        if (this.cursors.down.isUp && this.down > 0)
        {
            let item = [this.frames - this.down, "down", this.down];
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
        
        if (this.cursors.down.isDown) // Braking
        {
            this.controls.down  = true;
            this.controls.up    = false;
        }
        
        if(!this.cursors.down.isDown && !this.cursors.up.isDown) // Rolling
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
        for(let i = 0; i < NEW_SPAWNS; i++)
        {
            let mom = parent_selection(this.cars);
            let dad = parent_selection(this.cars);
            
            let kid_dna = crossover(mom.dna, dad.dna);
            
            this.cars.push(new Car(this, this.track, this.next_index, kid_dna))
            // TODO: Reference to mom and dad

            this.next_index++;
        }

        for(let car of this.cars)
        {
            if(Math.random() < 0.7)
                mutate(car.dna);
        }
        
        for(let car of this.cars)
        {
            //(window as any).data1.push({x: this.generation_count, y: car.fitness});
            //(window as any).myChart.update();
            car.age();
            car.restart();
        }

        // Remove cars of old age
        this.cars = this.cars.filter(car => car.current_age < 3);

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
        
        for(let i = 0; i < Math.min(best.length, 30); i++)
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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
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
