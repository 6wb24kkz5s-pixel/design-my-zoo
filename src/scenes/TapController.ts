import Phaser from 'phaser';
import { TAP } from '../config';
import type { Square } from '../logic/zoo';
import { pointerToSquare, pointerToWorld } from './pointer';

interface Press {
  pointerId: number;
  x: number;
  y: number;
  time: number;
}

/**
 * Spots a tap on the plot: one finger down and up again quickly, without
 * moving much. A second finger, or moving too far, means it was not a tap.
 */
export class TapController {
  private press: Press | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Taps are ignored while this returns false (e.g. in paint mode). */
    private readonly enabled: () => boolean,
    private readonly onTap: (square: Square, world: { x: number; y: number }) => void,
  ) {
    window.addEventListener('pointerdown', this.onAnyPointerDown, { capture: true });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    scene.game.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
  }

  private readonly onAnyPointerDown = (event: PointerEvent): void => {
    if (this.press && event.pointerId !== this.press.pointerId) this.press = null;
  };

  private readonly onCanvasPointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0 || !this.enabled()) return;
    this.press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const press = this.press;
    if (press?.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP.maxMoveCss) this.press = null;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const press = this.press;
    if (press?.pointerId !== event.pointerId) return;
    this.press = null;
    if (event.timeStamp - press.time <= TAP.maxMs && this.enabled()) {
      const world = pointerToWorld(this.scene, event);
      this.onTap(pointerToSquare(this.scene, event), { x: world.x, y: world.y });
    }
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.press?.pointerId === event.pointerId) this.press = null;
  };
}
