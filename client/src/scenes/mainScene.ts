import { Car } from '../car';
import Protocol from '../protocol';
import { ENDPOINT } from '../globals';

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
    
    // track to drive on containing both bounds (inner, outer) and racing line (center)
    private track;

    // displayed on the nametag
    private name: string;

    // which car that represents us and we will follow with the camera
    private id: number = 0;
    
    // Start-to-race countdown
    private bigNumber: Phaser.GameObjects.Text;
    private smallNumber: Phaser.GameObjects.Text;
    
    // on change of the big number trigger beep sound
    private tick: number = 0;

    // race ending countdown
    private topNumber: Phaser.GameObjects.Text;
    
    // sound accompanied with count
    private countBeep: Phaser.Sound.BaseSound;
    private startBeep: Phaser.Sound.BaseSound;

    // conection to the server
    private socket: WebSocket;
    
    // Debug
    zoom = 0.3;
    graphics:       Phaser.GameObjects.Graphics;
    
    constructor ()
    {
        super('MainScene');
    }

    preload ()
    {
        this.load.image('car', 'assets/car.png');
        this.load.image('dot', 'assets/dot.png');
        this.load.audio('count', 'assets/countBeep.mp3');
        this.load.audio('start', 'assets/startBeep.mp3');
    }

    create ()
    {   
        this.socket = this.registry.get('socket');
        
        if(this.socket === undefined) // On first visit, otherwise this is defined already
        {
            this.socket = new WebSocket(ENDPOINT);
            this.socket.onopen = () => Protocol.send(this.socket, Protocol.HELLO, this.registry.get('name'));
            this.registry.set('socket', this.socket);
        }
        else // We have completed a round and revisit this scene again for a new race
        {
            let latest = this.registry.get('track');
            this.track = latest.track;
            
            Protocol.send(this.socket, Protocol.HELLO, this.registry.get('name'));
        }
        this.socket.onmessage = ({data}) => this.read(data);
        
        this.input.on('wheel', (a, b, c, deltaY) => {
            this.zoom -= 0.0001 * deltaY;
            this.cameras.main.setZoom(this.zoom);
        });

        this.cursors = this.input.keyboard.createCursorKeys();
                
        this.scoreboard = this.add.text(-1280, -720, '', { font: '96px Courier', color: '#00ff00' });
        this.scoreboard.setScrollFactor(0);

        let centerX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        let centerY = this.cameras.main.worldView.y + this.cameras.main.height / 2

        this.bigNumber = this.add.text(centerX, centerY, '', { font: '512px Courier', color: '#ffffff', strokeThickness: 24 });
        this.bigNumber.setScrollFactor(0);
        this.bigNumber.setOrigin(0.5);
        
        this.smallNumber = this.add.text(centerX+256, centerY+64, '', { font: '128px Courier', color: '#ffffff', strokeThickness: 24 });
        this.smallNumber.setScrollFactor(0);
        this.smallNumber.setOrigin(0.5); 

        this.topNumber = this.add.text(centerX, -720, '', { font: '128px Courier', color: '#ffffff' });
        this.topNumber.setScrollFactor(0);
        this.topNumber.setOrigin(0.5); 

        this.countBeep = this.sound.add('count', {volume: 0.05});
        this.startBeep = this.sound.add('start', {volume: 0.05});

        this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 }, fillStyle: { color: 0x00ff00 }});
        
        this.cameras.main.setZoom(this.zoom);
    }
    
    update()
    {
        this.graphics.clear();

        this.readControls();
        //this.cameras.main.shake(1000, 0.025);

        //this.drawTrack();
        this.drawBestlist();
        this.debug();
    }

    // readControls sends player inputs to the server
    // they are sent in such a way that only a *change* in input is reported to the server
    readControls()
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
        this.graphics.strokePoints(this.track.center);
        
        // Track bounds
        this.graphics.lineStyle(2, 0xff0000)
        this.graphics.strokePoints(this.track.inner);
        this.graphics.strokePoints(this.track.outer);
    }

    drawBestlist()
    {
        let bestlist = this.cars.slice(0);

        bestlist.sort((a, b) => b.percentage - a.percentage);     // TODO: grobe finish time hier

        let string: Array<string> = ["Ranking:"];
        for(let i = 0; i < bestlist.length; i++)
            string.push(`${this.pad(i+1, 2)}. ${this.pad(bestlist[i].name, 12)} | ${this.pad(bestlist[i].percentage, 2)}%`);

        this.scoreboard.setText(string);
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

            case Protocol.COUNTDOWN:
                this.countDown(payload);
                break;

            case Protocol.CLOSEDOWN:
                this.closeDown(payload);
                break;
            
            case Protocol.BESTLIST:
                this.scene.start('FinishScene');
                break;

            case Protocol.JOIN:
                this.playerJoined(payload);
                break;

            case Protocol.LEAVE:
                this.playerLeft(payload);
                break;
        }
    }

    initGame(initPackage)
    {
        this.id     = initPackage.id;        
        this.track  = initPackage.track;    
        this.cars   = [];

        for(let car of initPackage.cars)
            this.cars.push(new Car(this, car.name, car.id));
        
        this.cameras.main.startFollow(this.cars[this.id], false);

        console.log(this.cars);
    }

    // TODO: We send the calculated ranking because sheesh....
    updateGame(gamestate)
    {
        for(let car of gamestate)
        {
            // When player joins, for a short period there is client-server desync in current playerlist
            if(this.cars[car.id] === undefined) 
                return;

            this.cars[car.id].update(car);
        }
    }

    drawArrow(from, to, color, thick)
    {   
        this.graphics.lineStyle(thick, color);
        this.graphics.lineBetween(from.x, from.y, from.x + to.x, from.y + to.y);
    }

    countDown(count)
    {
        let bigNumber = Math.floor(count / 10);
        let smallNumber = Math.floor(count - bigNumber*10);

        this.bigNumber.setText('' + bigNumber);
        this.smallNumber.setText('.' + smallNumber);

        // Beep noise on every second
        if(bigNumber != this.tick && count > 0)
        {
            this.countBeep.play();
            this.tick = bigNumber;
        }

        if(count <= 0)
        {
            this.bigNumber.setText('GO!');
            this.smallNumber.setText('');
            this.startBeep.play();

            setTimeout(() => {
                this.bigNumber.setText('');
                this.smallNumber.setText('');
            }, 500);
        }
    }

    closeDown(count)
    {
        this.topNumber.setText('Race ends in: ' + count);
    }

    playerJoined(player)
    {
        if(player.id == this.id)
            return;

        this.cars.push(new Car(this, player.name, player.id));
        
        let current = this.registry.get('cars');
        current.push(player);
        this.registry.set('cars', current);
    }

    playerLeft(playerID)
    {
        this.cars[playerID].destroy();
        this.cars.splice(playerID, 1);

        let current = this.registry.get('cars');
        current.splice(playerID, 1)
        this.registry.set('cars', current);
    }

    debug()
    {
        /*if(this.inside != undefined)
        {   
            this.graphics.fillStyle(0xff0000);
            for(let p of this.inside)
                this.graphics.fillCircle(p.x, p.y, 20);
        }*/


        // Rectangle of generated points
        this.graphics.lineStyle(5, 0x0000ff);
        //this.graphics.strokeRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // track
        if(this.track != undefined)
        {
            this.graphics.lineStyle(2, 0xff0000)
            this.graphics.strokePoints(this.track.center);
            
            /*this.graphics.fillStyle(0xff0000);
            for(let p of this.track)
                this.graphics.fillCircle(p.x, p.y, 20);*/
        }

        // Inner
        if(this.track != undefined)
        {
            this.graphics.lineStyle(2, 0xffffff)
            this.graphics.strokePoints(this.track.inner);

            this.graphics.fillStyle(0xffffff);
            for(let p of this.track.inner)
                this.graphics.fillCircle(p.x, p.y, 20);
        }

        // Outer
        if(this.track != undefined)
        {
            this.graphics.lineStyle(2, 0x00ffff)
            this.graphics.strokePoints(this.track.outer);

            this.graphics.fillStyle(0x00ffff);
            for(let p of this.track.outer)
                this.graphics.fillCircle(p.x, p.y, 20);
        }
    }

    pad(str, length): string
    {
        return str.toString().padStart(length, ' ');
    }

    round(n, p): number
    {
        let pow = 10 * p;
        return Math.floor(n*pow)/pow;
    }
}
