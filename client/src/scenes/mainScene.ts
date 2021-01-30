import { Car, Control } from '../car';
import { generateTrack } from '../track';
import { typeOf, contentOf } from '../util';

const ENDPOINT = 'ws://localhost:7999/ws';

// TODO: Reuse for best list
//let info = ['time: ' + Math.floor(time), 'Generation: ' + this.generation_count];
//this.text.setText(info);
//for(let i = 0; i < Math.min(best.length, 30); i++)
        //    info.push(`${this.pad(i+1)} #${this.pad(best[i].index)} | ${best[i].fitness}`);

export default class MainScene extends Phaser.Scene
{
    private dot:        Phaser.Physics.Matter.Image;
    private cursors:    Phaser.Types.Input.Keyboard.CursorKeys; // TODO: Put into dedicated controls module
    private text:       Phaser.GameObjects.Text;
    
    private cars:           Car[]               = [];
    private track:          Phaser.Geom.Point[] = [];
    private hull:           Phaser.Geom.Point[] = [];
    
    private inner:          Phaser.Geom.Point[] = [];
    private outer:          Phaser.Geom.Point[] = [];

    private name: string;

    private generation_count: number = 0;

    private id: number = 0;

    private frames: number = 0;

    private socket: WebSocket;
    
    // Debug
    zoom = 0.05; // 0.3;
    graphics:       Phaser.GameObjects.Graphics;
    circle:         Phaser.Geom.Circle;
    recording:      Array<any> = [];
    left:   number  = 0;
    right:  number  = 0;
    up:     number  = 0;
    down:   number  = 0;
    
    constructor ()
    {
        super('MainScene');
    }

    init(menuInput)
    {
        this.name = menuInput.name;
    }

    preload ()
    {
        this.load.image('car', 'assets/car.png');
        this.load.image('dot', 'assets/dot.png');
    }

    create ()
    {   
        this.socket = new WebSocket(ENDPOINT);
        this.socket.onmessage = ({data}) => this.parseData(data);
        
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
            this.cameras.main.setZoom(this.zoom);
        });

        this.input.on('pointerdown', (pointer) => {
            console.log(this.cars[0].object.x + ", " + this.cars[0].object.y);
        });

        this.input.keyboard.on('keydown-R', () => {
            //[this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
            this.send('newtrack', {});
        });

        this.input.keyboard.on('keydown-B', () => {
            console.log(this.cars[0].object.x, this.cars[0].object.y);
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.dot    = this.matter.add.image(200, 200, 'dot');
        
        this.text = this.add.text(-1080*2, -720*2, '', { font: '96px Courier', color: '#00ff00' });
        this.text.setScrollFactor(0);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        
        [this.track, this.inner, this.outer] = generateTrack(Phaser.Math.RND);
        
        this.cameras.main.setZoom(this.zoom);
    }
    
    update(time, delta)
    {
        this.graphics.clear();

        // Player Controls
        this.controls();

        for(let car of this.cars)
            car.update(this.frames, delta, this.graphics);

        //this.drawTrack();
        this.debug();

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

            case "track":
                this.updateTrack(unpacked);
                break;
            
            case "join":
                this.playerJoined(unpacked);
                break;

            case "leave":
                this.playerLeft(unpacked);
                break;
        }
    }

    space1;
    space2;
    space3;
    sharp;
    smooth;

    initGame(message)
    {
        let initPackage = JSON.parse(message);

        this.id     = initPackage.id;        
        this.track  = initPackage.track;
        
        this.hull       = initPackage.hull;
        this.space1     = initPackage.space1;
        this.space2     = initPackage.space2;
        this.space3     = initPackage.space3;
        this.sharp      = initPackage.sharp;
        this.smooth     = initPackage.smooth;

        for(let car of initPackage.cars)
            this.cars.push(new Car(this, this.track, car.id, car.x, car.y, car.rotation, this.name)); // TODO: Get Name
        
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

    updateTrack(message)
    {
        let data = JSON.parse(message);

        this.track      = data.track;
        this.hull       = data.hull;
        this.space1     = data.space1;
        this.space2     = data.space2;
        this.space3     = data.space3;
        this.sharp      = data.sharp;
        this.smooth     = data.smooth;
    }

    playerJoined(message)
    {
        let car = JSON.parse(message);
        if(car.id === this.id)
            return

        this.cars.push(new Car(this, this.track, car.id, car.x, car.y, car.rotation, "")); // TODO: Get Name
    }

    playerLeft(message)
    {
        let id = JSON.parse(message);

        this.cars[id].destroy();
        this.cars = this.cars.filter((car) => {car.index != id});
    }

    debug()
    {
        
        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        //this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // Track cloud
        /*this.graphics.fillStyle(0x00ff00);
        if(this.track.length != 0)
        {
            for(let p of this.track)
                this.graphics.fillCircle(p.x, p.y, 20);
        }*/

        // Hull
        /*if(this.hull.length != 0)
        {
            this.graphics.lineStyle(2, 0x00ff00)
            this.graphics.strokePoints(this.hull);

            this.graphics.fillStyle(0x00ff00);
            for(let p of this.hull)
                this.graphics.fillCircle(p.x, p.y, 20);
        }*/

        // Space3
        /*if(this.space3 != undefined)
        {
            this.graphics.lineStyle(2, 0x0000ff)
            this.graphics.strokePoints(this.space3);
            
            this.graphics.fillStyle(0x00ff00);
            for(let p of this.space3)
                this.graphics.fillCircle(p.x, p.y, 20);
        }*/

        // Sharp
        if(this.sharp != undefined)
        {
            this.graphics.lineStyle(2, 0xff0000)
            this.graphics.strokePoints(this.sharp);
            
            this.graphics.fillStyle(0xff0000);
            for(let p of this.sharp)
                this.graphics.fillCircle(p.x, p.y, 20);
        }

        // smooth
        if(this.smooth != undefined)
        {
            this.graphics.lineStyle(2, 0xffff00)
            this.graphics.strokePoints(this.smooth);

            this.graphics.fillStyle(0xffff00);
            for(let p of this.smooth)
                this.graphics.fillCircle(p.x, p.y, 20);
        }
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
