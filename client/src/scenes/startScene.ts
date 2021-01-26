import MainScene from './mainScene';

export default class StartScene extends Phaser.Scene
{
    constructor ()
    {
        super('StartScene');
    }

    preload ()
    {
        this.load.bitmapFont('title', ['assets/font/title_0.png'], 'assets/font/title.fnt');
        this.load.image('logo', 'assets/logo.png');
    }

    create ()
    {   
        this.add.text(1280/2-130, 720/2+20, 'Enter Name', { color : '#0f0', fontSize: '32px' }).setInteractive();

        let startText = this.add.text(1280/2-80, 720/2+200, 'Start', { color: '#0f0', fontSize: '32px'  })
            .setInteractive()
            .on('pointerover', () => startText.setStyle({ color: '#ff0'}))
            .on('pointerout', () => startText.setStyle({ fill: '#0f0' }))
            .on('pointerup', () => this.scene.start('MainScene'));

        
        (this.add as any).rexInputText(1280/2+30, 720/2+100, 10, 10, {
            type: 'textarea',
            text: 'Schumacher',
            fontSize: '32px',
            maxLength: '16',
        }).resize(300, 50);

        this.add.image(615, 270, 'logo');
        this.add.bitmapText(540, 310, 'title', 'SENNAI', 32);
    }
}
