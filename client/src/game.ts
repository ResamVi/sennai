import 'phaser';

import * as io from 'socket.io-client';
import { Car, Control } from './car';
import { generateTrack } from './track';
import { generate_population, parent_selection, crossover, mutate, NEW_SPAWNS, START_POPULATION  } from './ai';

export class TestScene extends Phaser.Scene
{

    private car: Car;

    private socket: SocketIOClient.Socket;

    preload ()
    {
        this.load.image('car', 'assets/car.png');
    }

    create()
    {
        this.socket = io();
        this.car = new Car(this, [new Phaser.Geom.Point(50, 50)], 0, []);
    }

    update(delta)
    {
        
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    parent: 'game',
    width: 1080,
    height: 720,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [TestScene],
    seed: ["Wow"],
    physics: {
        default: 'matter',
        matter: { 
            enabled: false,
            debug: true,
            gravity: { x: 0, y: 0 }
        }
    }
};

const game = new Phaser.Game(config);
