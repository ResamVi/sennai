import { Car, Control } from './car';
import { generateTrack } from './track';
import { typeOf, contentOf } from './util';

export default class MainScene extends Phaser.Scene
{
    private dot:        Phaser.Physics.Matter.Image;
    private cursors:    Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:       Phaser.GameObjects.Text;
    
    private cars:           Car[]               = [];
    private track:          Phaser.Geom.Point[] = [];
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private generation_count: number = 0;

    private id: number = 0;

    private frames: number = 0;

    private socket: WebSocket;

    // Debug
    zoom = 0.18;
    graphics:       Phaser.GameObjects.Graphics;
    circle:         Phaser.Geom.Circle;
    recording:      Array<any> = [];
    left:   number  = 0;
    right:  number  = 0;
    up:     number  = 0;
    down:   number  = 0;
    
    constructor ()
    {
        super('SENNAI');
    }

    preload ()
    {
        // TODO: Put into dedicated scene for loading
        this.load.image('car', 'assets/car.png');
        this.load.image('dot', 'assets/dot.png');
    }

    create ()
    {   
        this.socket = new WebSocket('ws://localhost:7999/ws');
        this.socket.onmessage = ({data}) => this.parseData(data);
        
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
        });

        this.input.keyboard.on('keydown-R', () => {
            [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        });

        this.input.keyboard.on('keydown-B', () => {
            console.log(this.cars[0].object.x, this.cars[0].object.y);
            //console.log(JSON.stringify(this.recording));
        });

        this.cursors = this.input.keyboard.createCursorKeys(); 
        
        this.dot    = this.matter.add.image(200, 200, 'dot');
        
        this.text = this.add.text(-1080*2, -720*2, '', { font: '96px Courier', color: '#00ff00' });
        this.text.setScrollFactor(0);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        
        [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
    }
    
    update(time, delta)
    {
        this.cameras.main.setZoom(this.zoom);
        this.graphics.clear();

        // Player Controls
        this.controls();

        for(let car of this.cars)
            car.update(this.frames, delta, this.graphics);

        this.drawTrack();
        this.debug(time);

        this.frames += 1;
    }

    leftKeyPressed;
    rightKeyPressed;
    upKeyPressed;
    downKeyPressed;

    controls()
    {
        let oldLeft = this.leftKeyPressed;
        let oldRight = this.rightKeyPressed;
        let oldUp = this.upKeyPressed;
        let oldDown = this.downKeyPressed;

        // steer
        if (this.cursors.left.isDown)
            this.leftKeyPressed = true;
        else if (this.cursors.right.isDown)
            this.rightKeyPressed = true;
        else
        {
            this.rightKeyPressed = false;
            this.leftKeyPressed = false;
        }

        if (this.cursors.up.isDown)
            this.upKeyPressed = true;
        else if (this.cursors.down.isDown)
            this.downKeyPressed = true;
        else
        {
            this.upKeyPressed = false;
            this.downKeyPressed = false;
        }

        if (oldLeft !== this.leftKeyPressed || oldRight !== this.rightKeyPressed || oldUp !== this.upKeyPressed || oldDown !== this.downKeyPressed)
        {
            if(this.socket.readyState !== WebSocket.OPEN)
                return
            
            this.send('input', {
                left: this.leftKeyPressed,
                right: this.rightKeyPressed,
                up: this.upKeyPressed,
                down: this.downKeyPressed
            });
        }
    }

    drawTrack()
    {
        // Track line
        this.graphics.lineStyle(2, 0x00ff00);
        this.graphics.strokePoints(this.track);
        
        // Track bounds
        this.graphics.lineStyle(2, 0xff0000)
        this.graphics.strokePoints(this.inner);
        this.graphics.strokePoints(this.outer);
    }

    parseData(payload)
    {
        let unpacked = contentOf(payload);
        switch(typeOf(payload))
        {
            case "init":
                this.initGame(unpacked);
                break;

            case "update":
                this.updateGame(unpacked);
                break;

            case "join":
                this.playerJoined(unpacked);
                break;

            case "leave":
                this.playerLeft(unpacked);
                break;
        }
    }

    initGame(message)
    {
        let initPackage = JSON.parse(message);

        this.id = initPackage.id;
        
        for(let car of initPackage.cars)
            this.cars.push(new Car(this, this.track, car.id, car.x, car.y, car.rotation))
        
        this.cameras.main.startFollow(this.cars[this.id].object, false);
    }

    updateGame(message)
    {
        let data = JSON.parse(message);

        for(let car of data)
        {
            this.cars[car.id].object.x          = car.x;
            this.cars[car.id].object.y          = car.y;
            this.cars[car.id].object.rotation   = car.rotation;
        }
    }

    playerJoined(message)
    {
        let car = JSON.parse(message);
        if(car.id === this.id)
            return

        this.cars.push(new Car(this, this.track, car.id, car.x, car.y, car.rotation));
    }

    playerLeft(message)
    {
        let id = JSON.parse(message);

        this.cars[id].destroy();
        this.cars = this.cars.filter((car) => {car.index != id});
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

        // TODO: Reuse for best list
        let info = ['time: ' + Math.floor(time), 'Generation: ' + this.generation_count];
        
        //for(let i = 0; i < Math.min(best.length, 30); i++)
        //    info.push(`${this.pad(i+1)} #${this.pad(best[i].index)} | ${best[i].fitness}`);

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

    send(type, payload)
    {
        if(this.socket.readyState !== WebSocket.OPEN)
            return
            
        this.socket.send(type + "|" + JSON.stringify(payload));
    }

    pad(str): string
    {
        return str.toString().padStart(2, ' ');
    }
}
