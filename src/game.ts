import 'phaser';

export default class Demo extends Phaser.Scene
{
    player: Phaser.GameObjects.Rectangle;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor ()
    {
        super('demo');
    }

    preload ()
    {
    }

    create ()
    {
        this.player = this.add.rectangle(200, 200, 148, 148, 0xff00ff);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update()
    {
        if (this.cursors.left.isDown)
        {
            this.player.setX(this.player.x - 1);
        }
        else if (this.cursors.right.isDown)
        {
            this.player.setX(this.player.x + 1);
        }
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
    scene: Demo
};

const game = new Phaser.Game(config);
