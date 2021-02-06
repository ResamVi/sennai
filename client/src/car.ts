export class Car extends Phaser.Physics.Matter.Image
{
    // assigned on creation. unique for each car
    public index: number;
    
    // % of progress on track
    public progress: number;

    // name of player controlling this car
    private nametag: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, name: string, index)
    {
        super(scene.matter.world, 0, 0, 'car');
        scene.add.existing(this);

        this.index = index;
        this.progress = 0;

        this.nametag = scene.add.text(0, 0, name, { font: '64px Courier', color: '#ffffff' }).setOrigin(0.5);
        this.nametag.setScrollFactor(1);
    }

    public destroy()
    {
        this.nametag.destroy();
        super.destroy();
    }

    public update(carData: any)
    {
        this.x              = carData.x;
        this.y              = carData.y;
        this.angle          = 360 + carData.rotation;
        this.progress       = carData.progress;
        this.name           = carData.name;
        this.nametag.text   = carData.name;
        
        this.nametag.setPosition(this.x, this.y-100);
    }
}