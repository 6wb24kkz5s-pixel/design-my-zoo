import Phaser from 'phaser';
import { COLOURS } from './config';
import { ZooScene } from './scenes/ZooScene';

function startGame(parent: HTMLElement): void {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: COLOURS.background,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [ZooScene],
  });
}

// Phaser's WebGL renderer fails if it boots at 0×0, which can happen for a
// moment when launching from the Home Screen. Wait until #game has a size.
const parent = document.getElementById('game');
if (!parent) throw new Error('Missing #game element');

const observer = new ResizeObserver(() => {
  if (parent.clientWidth > 0 && parent.clientHeight > 0) {
    observer.disconnect();
    startGame(parent);
  }
});
observer.observe(parent);
