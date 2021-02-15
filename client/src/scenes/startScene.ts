export default class StartScene extends Phaser.Scene
{
    private name: string = 'Schumacher';
    private music: Phaser.Sound.BaseSound;

    private CENTER_X = 1280 / 2;
    private CENTER_Y = 720 / 2;

    constructor()
    {
        super('StartScene');
    }

    preload()
    {
        this.load.image('title', 'assets/title.png');
        this.load.image('logo', 'assets/logo.png');
        this.load.audio('menu', 'assets/menu.mp3');
    }

    create()
    {   
        this.music = this.sound.add('menu', {volume: 0.05, loop: true});
        this.input.on('pointerdown', (pointer) => {
            this.music.play();
        });
        
        this.add.text(this.CENTER_X, this.CENTER_Y+20, 'Enter Name', { color : '#0f0', fontSize: '32px' }).setOrigin(0.5, 0.5).setInteractive();

        let startText = this.add.text(this.CENTER_X, this.CENTER_Y+150, 'Start', { color: '#0f0', fontSize: '32px'})
            .setInteractive()
            .setOrigin(0.5, 0.5)
            .on('pointerover', () => startText.setStyle({ color: '#ff0'}))
            .on('pointerout', () => startText.setStyle({ fill: '#0f0' }))
            .on('pointerup', () => {
                this.registry.set('name', this.name);
                this.scene.start('MainScene');
            });
        
        (this.add as any).rexInputText(this.CENTER_X+55, this.CENTER_Y+90, 10, 10, {
            type: 'textarea',
            text: this.name,
            fontSize: '32px',
            maxLength: '12',
        })
        .resize(300, 50)
        .on('textchange', (inputText) => this.name = inputText.text);

        this.add.image(this.CENTER_X, this.CENTER_Y-100, 'logo');
        this.add.image(this.CENTER_X, this.CENTER_Y-50, 'title').setOrigin(0.5, 0.5);
    }
}
