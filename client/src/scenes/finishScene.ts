import Protocol from '../protocol';
import { ENDPOINT } from '../globals';

export default class FinishScene extends Phaser.Scene
{
    // conection to the server
    private socket: WebSocket;

    private CENTER_X = 1280 / 2;
    private CENTER_Y = 720 / 2;

    private bestlistText: Phaser.GameObjects.Text;

    private countdown: Phaser.GameObjects.Text;

    constructor()
    {
        super('FinishScene');
    }

    preload()
    {
        this.load.image('title', 'assets/title.png');
        this.load.image('logo', 'assets/logo.png');
    }

    create()
    {
        this.socket = this.registry.get('socket');
        
        // If the player enters when a race has just finished, otherwise this socket is defined already
        if(this.socket === undefined)
        {
            console.log("THIS IS NOT HAPPENING");
            this.socket = new WebSocket(ENDPOINT);
            this.socket.onopen = () => Protocol.send(this.socket, Protocol.HELLO, this.registry.get('name'));
            this.registry.set('socket', this.socket);
        }
        this.socket.onmessage = ({data}) => this.read(data);

        this.add.image(this.CENTER_X, 130, 'logo');
        this.add.image(this.CENTER_X, 180, 'title').setOrigin(0.5, 0.5);
        
        this.add.text(this.CENTER_X, this.CENTER_Y-64, 'STANDINGS', { color : '#0f0', fontSize: '32px' }).setOrigin(0.5, 0.5).setInteractive();
        
        this.bestlistText   = this.add.text(this.CENTER_X, this.CENTER_Y, '', { color: '#0f0', fontSize: '32px'}).setOrigin(0.5, 0.5);
        this.countdown      = this.add.text(this.CENTER_X, 720-32, '', { color: '#ffffff', fontSize: '32px'}).setOrigin(0.5, 0.5);
    }

    read(message)
    {
        let [prefix, payload] = Protocol.parse(message);
        switch(prefix)
        {
            case Protocol.BESTLIST:
                this.drawBestlist(payload);
                break;

            case Protocol.REST:
                this.countDown(payload);
                break;

            case Protocol.TRACK:
                this.updateTrack(payload);
                break;

            case Protocol.UPDATE:
                this.scene.start('MainScene');
                break;
        }

        
    }

    drawBestlist(bestlist)
    {
        bestlist.sort((a, b) => {
            if(a.finishTime == b.finishTime)
                return b.progress - a.progress;

            if(a.finishTime == 0 && b.finishTime != 0)
                return 1;

            if(b.finishTime == 0 && a.finishTime != 0)
                return -1;

            return a.finishTime - b.finishTime;
        });

        let string: Array<string> = [];
        for(let i = 0; i < bestlist.length; i++)
        {
            let position    = this.pad(i+1, 2);
            let name        = this.pad(bestlist[i].name, 12);
            let time        = this.pad(this.formatTime(bestlist[i].finishTime), 10);
            let progress    = this.pad(bestlist[i].progress, 3);
            
            string.push(`${position}. ${name} | ${time} - ${progress}%`);
        }

        this.bestlistText.setText(string);
    }

    countDown(count)
    {
        this.countdown.setText('Next race in: ' + count + 's');
    }

    updateTrack(newtrack)
    {
        this.registry.set('track', newtrack);
    }

    // time is given in milliseconds
    formatTime(millis: number)
    {
        let minutes = Math.floor(millis / 60000);
        millis -= minutes * 60000;
        let seconds = Math.floor(millis  / 1000);
        millis -= seconds * 1000;
        return this.padZero(minutes, 2) + ":" + this.padZero(seconds, 2) + ":" + this.padZero(millis, 3);

    }

    padZero(str, length): string
    {
        return str.toString().padStart(length, '0');
    }

    pad(str, length): string
    {
        return str.toString().padStart(length, ' ');
    }
}
