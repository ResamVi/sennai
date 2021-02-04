import { Car } from '../car';
import Protocol from '../protocol';

const ENDPOINT = 'wss://online.resamvi.io/ws';

export default class MainScene extends Phaser.Scene
{
    // keys to control player
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys; 
    
    // currently pressed keys by the player
    private leftKeyPressed:     boolean;
    private rightKeyPressed:    boolean;
    private upKeyPressed:       boolean;
    private downKeyPressed:     boolean;
    
    // UI element to list the current leaders
    private scoreboard: Phaser.GameObjects.Text;
    
    // every player in the game
    private cars: Car[] = [];
    
    // track to drive on
    private track;
    
    // bounds of track
    private inner;
    private outer;

    // displayed on the nametag
    private name: string;

    // which car that represents us and we will follow with the camera
    private id: number = 0;

    // conection to the server
    private socket: WebSocket;
    
    // Debug
    zoom = 0.3;
    graphics:       Phaser.GameObjects.Graphics;
    
    constructor ()
    {
        super('MainScene');
    }

    // init is called when switching from startScene -> mainScene
    // and transfers any inputted data to be used and displayed
    init(menuInput)
    {
        if(menuInput.name !== undefined)
        {
            this.name = menuInput.name;
        }
        else
        {
            this.name = 'Default';
        }
    }

    preload ()
    {
        this.load.image('car', 'assets/car.png');
        this.load.image('dot', 'assets/dot.png');
    }

    create ()
    {   
        this.socket = new WebSocket(ENDPOINT);
        this.socket.onmessage = ({data}) => this.read(data);
        this.socket.onopen = () => Protocol.send(this.socket, Protocol.HELLO, this.name);
        
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
            this.cameras.main.setZoom(this.zoom);
        });

        this.input.keyboard.on('keydown-B', () => {
            console.log(this.cars[0].x, this.cars[0].y);
        });

        // request to generate a new map TODO: Remove
        this.input.keyboard.on('keydown-R', () => {
            Protocol.send(this.socket, Protocol.PLEASE, {});
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        
        // TODO: Implement scoreboard
        this.scoreboard = this.add.text(-1080*2, -720*2, '', { font: '96px Courier', color: '#00ff00' });
        this.scoreboard.setScrollFactor(0);
        
        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 } },);
        
        this.cameras.main.setZoom(this.zoom);
    }
    
    update()
    {
        this.graphics.clear();

        this.controls();

        //this.drawTrack();
        this.debug();
    }

    // controls sends player inputs to the server
    // they are sent in such a way that only a *change* in input is reported to the server
    controls()
    {
        let oldLeft = this.leftKeyPressed;
        let oldRight = this.rightKeyPressed;
        let oldUp = this.upKeyPressed;
        let oldDown = this.downKeyPressed;

        // steer
        this.leftKeyPressed = this.cursors.left.isDown;
        this.rightKeyPressed = this.cursors.right.isDown;
        this.upKeyPressed = this.cursors.up.isDown;
        this.downKeyPressed = this.cursors.down.isDown;

        if (oldLeft !== this.leftKeyPressed || oldRight !== this.rightKeyPressed || oldUp !== this.upKeyPressed || oldDown !== this.downKeyPressed)
        {
            if(this.socket.readyState !== WebSocket.OPEN)
                return
            
            Protocol.send(this.socket, 'input', {
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

    read(message)
    {
        let [prefix, payload] = Protocol.parse(message);
        switch(prefix)
        {
            case Protocol.INIT:
                this.initGame(payload);
                break;

            case Protocol.UPDATE:
                this.updateGame(payload);
                break;

            case Protocol.TRACK:
                this.updateTrack(payload);
                break;
            
            case Protocol.JOIN:
                this.playerJoined(payload);
                break;

            case Protocol.LEAVE:
                this.playerLeft(payload);
                break;
        }
    }

    initGame(initPackage) // TODO: types in protocol
    {
        this.id         = initPackage.id;        
        this.track      = initPackage.track.track;    
        this.inner      = initPackage.track.inner;
        this.outer      = initPackage.track.outer;

        for(let car of initPackage.cars)
            this.cars.push(new Car(this, car.name, car.id));
        
        this.cameras.main.startFollow(this.cars[this.id], false);
    }

    front;
    back;
    dir;
    head;
    updateGame(gamestate)
    {
        for(let car of gamestate)
        {
            // When player joins, for a short period there is client-server desync in current playerlist
            if(this.cars[car.id] === undefined) 
                return;

            this.cars[car.id].update(car);

            this.front = car.Front;
            this.back = car.Back;
            this.dir = car.Dir;
            this.head = car.Head;
        }
    }

    drawArrow(from, to)
    {
        //const LINE_WIDTH = 50;
        
        this.graphics.lineStyle(10, 0xffa500)
        this.graphics.lineBetween(from.x, from.y, from.x + to.x*50, from.y + to.y*50);
        
        /*let direction   = new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
        let arrowhead1  = direction.clone().rotate(Math.PI/2 - Math.PI/4).normalize().scale(LINE_WIDTH);
        let arrowhead2  = direction.clone().rotate(-Math.PI/2 + Math.PI/4).normalize().scale(LINE_WIDTH);
        this.graphics.lineBetween(to.x, to.y, to.x + arrowhead1.x, to.y + arrowhead1.y);
        this.graphics.lineBetween(to.x, to.y, to.x + arrowhead2.x, to.y + arrowhead2.y);*/
    }

    updateTrack(newtrack)
    {
        this.track      = newtrack.track;
        this.inner      = newtrack.inner;
        this.outer      = newtrack.outer;
    }

    playerJoined(player)
    {
        if(player.id == this.id)
            return;

        this.cars.push(new Car(this, player.name, player.id));
    }

    playerLeft(playerID)
    {
        this.cars[playerID].destroy();
        this.cars.splice(playerID, 1);
    }

    debug()
    {
        if(this.front != undefined)
        {
            this.graphics.fillStyle(0xff0000);
            this.graphics.fillCircle(this.front.x, this.front.y, 5);
        }

        if(this.back != undefined)
        {
            this.graphics.fillStyle(0x00ff00);
            this.graphics.fillCircle(this.back.x, this.back.y, 5);
        }

        /*if(this.dir != undefined)
        {
            this.drawArrow({x: this.cars[0].x, y: this.cars[0].y}, this.dir);
        }*/

        if(this.head != undefined)
        {
            this.drawArrow({x: this.cars[0].x, y: this.cars[0].y}, this.head);
        }
        
        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        //this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // track
        if(this.track != undefined)
        {
            this.graphics.lineStyle(2, 0xff0000)
            this.graphics.strokePoints(this.track);
            
            /*this.graphics.fillStyle(0xff0000);
            for(let p of this.track)
                this.graphics.fillCircle(p.x, p.y, 20);*/
        }

        // Inner
        if(this.inner != undefined)
        {
            this.graphics.lineStyle(2, 0xffffff)
            this.graphics.strokePoints(this.inner);

            this.graphics.fillStyle(0xffffff);
            for(let p of this.inner)
                this.graphics.fillCircle(p.x, p.y, 20);
        }

        // Outer
        if(this.outer != undefined)
        {
            this.graphics.lineStyle(2, 0x00ffff)
            this.graphics.strokePoints(this.outer);

            this.graphics.fillStyle(0x00ffff);
            for(let p of this.outer)
                this.graphics.fillCircle(p.x, p.y, 20);
        }
    }

    pad(str): string
    {
        return str.toString().padStart(2, ' ');
    }
}
