import Phaser from 'phaser';
import {
  clampView,
  clampZoom,
  fitView,
  lerpView,
  pan,
  screenToWorld,
  usableCentre,
  zoomAt,
  zoomLimits,
  type Insets,
  type Point,
  type View,
  type Viewport,
} from '../camera';
import { CAMERA, SCREEN_MARGIN, UI } from '../config';
import { PIXEL_RATIO } from '../display';

/** Tells the UI whether the zoom is at either limit, so it can fade the + or – button. */
export type ZoomStateListener = (atMin: boolean, atMax: boolean) => void;

const LIMIT_TOLERANCE = 1e-6;

/**
 * Two fingers pan and pinch-zoom the camera; one finger does nothing here.
 * The + / – buttons and "See whole zoo" animate the camera.
 */
export class CameraController {
  private view: View;
  private pinch: { mid: Point; distance: number } | null = null;
  private tween: Phaser.Tweens.Tween | null = null;
  private atMin = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onZoomState: ZoomStateListener,
  ) {
    this.view = fitView(this.viewport(), this.insets(), this.margin());
    this.setView(this.view);
  }

  /** Call once per frame. Reads the two touch pointers and applies any pinch or pan. */
  update(): void {
    const input = this.scene.input;
    const touches = [input.pointer1, input.pointer2].filter((p) => p?.isDown);
    const [a, b] = touches;
    if (!a || !b) {
      this.pinch = null;
      return;
    }

    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.hypot(a.x - b.x, a.y - b.y);

    if (this.pinch && this.pinch.distance > 0) {
      this.stopTween();
      const viewport = this.viewport();
      const moved = pan(this.view, mid.x - this.pinch.mid.x, mid.y - this.pinch.mid.y);
      const zoom = clampZoom(moved.zoom * (distance / this.pinch.distance), this.limits());
      this.setView(clampView(zoomAt(moved, viewport, zoom, mid), viewport, this.insets(), this.margin()));
    }
    this.pinch = { mid, distance };
  }

  /** Zooms in (factor > 1) or out (factor < 1) around the middle of the visible area. */
  zoomBy(factor: number): void {
    const viewport = this.viewport();
    const zoom = clampZoom(this.view.zoom * factor, this.limits());
    const target = zoomAt(this.view, viewport, zoom, usableCentre(viewport, this.insets()));
    this.animateTo(clampView(target, viewport, this.insets(), this.margin()));
  }

  /** The point in the plot at the middle of what the child can see (between the top bar and the palette). */
  worldCentre(): Point {
    const viewport = this.viewport();
    return screenToWorld(this.view, viewport, usableCentre(viewport, this.insets()));
  }

  /** "See whole zoo": the whole plot fits on screen. */
  fitAll(): void {
    this.animateTo(fitView(this.viewport(), this.insets(), this.margin()));
  }

  /** The screen changed size (e.g. the iPad was turned). Keep the view sensible. */
  resize(): void {
    this.stopTween();
    this.pinch = null;
    const next = this.atMin
      ? fitView(this.viewport(), this.insets(), this.margin())
      : clampView(this.view, this.viewport(), this.insets(), this.margin());
    this.setView(next);
  }

  private animateTo(target: View): void {
    this.stopTween();
    const from = this.view;
    this.tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: CAMERA.tweenMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        this.setView(clampView(lerpView(from, target, t), this.viewport(), this.insets(), this.margin()));
      },
      onComplete: () => {
        this.tween = null;
      },
    });
  }

  private stopTween(): void {
    this.tween?.stop();
    this.tween = null;
  }

  private setView(view: View): void {
    this.view = view;
    const camera = this.scene.cameras.main;
    camera.setZoom(view.zoom);
    camera.centerOn(view.midX, view.midY);

    const limits = this.limits();
    this.atMin = view.zoom <= limits.min + LIMIT_TOLERANCE;
    this.onZoomState(this.atMin, view.zoom >= limits.max - LIMIT_TOLERANCE);
  }

  private viewport(): Viewport {
    return { width: this.scene.scale.width, height: this.scene.scale.height };
  }

  /** The top bar and palette cover parts of the canvas, so the plot fits between them. */
  private insets(): Insets {
    return { top: UI.topBarHeight * PIXEL_RATIO, right: 0, bottom: UI.paletteHeight * PIXEL_RATIO, left: 0 };
  }

  private margin(): number {
    return SCREEN_MARGIN * PIXEL_RATIO;
  }

  private limits() {
    return zoomLimits(this.viewport(), this.insets(), this.margin());
  }
}
