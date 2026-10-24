import Phaser from 'phaser';
import { GRID } from '../config';
import type { Square } from '../logic/zoo';

/** Screen position of a pointer event (CSS pixels) to world position, through the main camera. */
export function pointerToWorld(scene: Phaser.Scene, event: PointerEvent): Phaser.Math.Vector2 {
  const canvas = scene.game.canvas;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  return scene.cameras.main.getWorldPoint(x, y);
}

/** The grid square under a pointer event. */
export function pointerToSquare(scene: Phaser.Scene, event: PointerEvent): Square {
  const world = pointerToWorld(scene, event);
  return { col: Math.floor(world.x / GRID.squareSize), row: Math.floor(world.y / GRID.squareSize) };
}
