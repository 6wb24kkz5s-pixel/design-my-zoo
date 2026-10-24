import Phaser from 'phaser';
import { COLOURS } from './config';
import { PIXEL_RATIO } from './display';
import { ZooScene } from './scenes/ZooScene';

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing #game element');

/** The game draws at device pixels; CSS stretches the canvas back to fill #game. */
function gameSize(element: HTMLElement): { width: number; height: number } {
  return {
    width: Math.round(element.clientWidth * PIXEL_RATIO),
    height: Math.round(element.clientHeight * PIXEL_RATIO),
  };
}

function startGame(element: HTMLElement): Phaser.Game {
  const { width, height } = gameSize(element);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: element,
    backgroundColor: COLOURS.background,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width,
      height,
      zoom: 1 / PIXEL_RATIO,
    },
    input: {
      activePointers: 2,
    },
    scene: [ZooScene],
  });
  // The screen may have changed size while Phaser was starting up.
  game.events.once(Phaser.Core.Events.READY, () => resizeGame(game, element));
  return game;
}

function resizeGame(game: Phaser.Game, element: HTMLElement): void {
  const { width, height } = gameSize(element);
  if (width !== game.scale.width || height !== game.scale.height) {
    game.scale.resize(width, height);
  }
}

// Phaser's WebGL renderer fails if it boots at 0×0, which can happen for a
// moment when launching from the Home Screen. Wait until #game has a size,
// then keep the game matched to it (including when the iPad is turned).
let game: Phaser.Game | null = null;
new ResizeObserver(() => {
  if (parent.clientWidth === 0 || parent.clientHeight === 0) return;
  if (!game) {
    game = startGame(parent);
  } else if (game.isBooted) {
    resizeGame(game, parent);
  }
}).observe(parent);
