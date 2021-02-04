export class Car extends Phaser.Physics.Matter.Image
{
    // assigned on creation. unique for each car
    public index:      number;
    
    private track: Phaser.Geom.Point[];

    // used in determining when we get out of bounds of the track TODO: Remove
    private circle: Phaser.Geom.Circle;

    private progress: Set<Phaser.Geom.Point> = new Set();
    private last_progress: number;

    private nametag:       Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, name: string, index)
    {
        super(scene.matter.world, 0, 0, 'car');
        //scene.add.existing(this);

        this.index = index;

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
        this.nametag.text   = carData.name;
        
        this.nametag.setPosition(this.x, this.y-100);
        //this.track_progress(frames); // TODO: remove
    }

    private track_progress(frames)
    {
        this.circle.setPosition(this.x, this.y);
        
        let length = this.progress.size;
        for(let p of this.track)
        {
            if(this.circle.contains(p.x, p.y))
                this.progress.add(p);
        }

        if(length < this.progress.size)
            this.last_progress = frames;
    }
}