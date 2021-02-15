import 'phaser';
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js';
import StartScene from './scenes/startScene';
import MainScene from './scenes/mainScene';
import FinishScene from './scenes/finishScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  scale: {
    parent: 'phaser-game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [StartScene, MainScene, FinishScene],
  seed: ["Wow"],
  physics: {
    default: 'matter',
    matter: { 
        enabled: false,
        debug: true,
        gravity: { x: 0, y: 0 }
    }
  },
  dom: {
    createContainer: true
  },
  plugins: {
    global: [{
        key: 'rexInputTextPlugin',
        plugin: InputTextPlugin,
        start: true
    }]
  },
  audio: {
    disableWebAudio: true
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)
})
