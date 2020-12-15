import 'phaser';
import 'Car'

export default class MainScene extends Phaser.Scene
{
    // TODO: Bundle all objects into worlds module
    player: Phaser.Physics.Arcade.Sprite;

    // TODO: Put into dedicated controls module
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    text: Phaser.GameObjects.Text;

    constructor ()
    {
        super('demo');
    }

    preload ()
    {
        // TODO: Put into dedicated scene for loading
        this.load.image('car', 'assets/car.png');
        this.load.image('grid', 'assets/grid.png');
        this.load.image('track', 'assets/track.png');
    }

    create ()
    {
        this.add.image(987 * 5, 427 * 5, 'track').setScale(10);
        
        this.player = this.physics.add.sprite(5870, 4080, 'car');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.5, 0.5);
        
        this.text = this.add.text(10, 10, '', { font: '16px Courier', fill: '#00ff00' });
        this.text.setScrollFactor(0);

        this.physics.world.setBounds(0, 0, 987 * 10, 427 * 10);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.setBounds(0, 0, 987 * 10, 427 * 10);
        this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    }

    update()
    {
        if (this.cursors.left.isDown)
        {
            this.player.setX(this.player.x - 10);
        }
        else if (this.cursors.right.isDown)
        {
            this.player.setX(this.player.x + 10);
        }
        
        if (this.cursors.down.isDown)
        {
            this.player.setY(this.player.y + 10);
        }
        else if (this.cursors.up.isDown)
        {
            this.player.setY(this.player.y - 10);
        }

        this.debug();
    }

    debug()
    {
        this.text.setText([
            'x: ' + this.player.x,
            'y: ' + this.player.y,
            'accel: ' + 0,
            'fps: ' + this.game.loop.actualFps,
        ]);
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    width: 1080,
    height: 720,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene],
    physics: {
        default: 'arcade',
        arcade: { debug: true }
    }

};

const game = new Phaser.Game(config);
