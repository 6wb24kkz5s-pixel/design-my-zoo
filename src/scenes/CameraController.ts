import Phaser from 'phaser';
import {
  clampView,
  clampZoom,
  fitView,
  lerpView,
  pan,
  screenToWorld,
  pinchZoomFactor,
  usableCentre,
  wheelPixels,
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
 *
 * On a computer: a trackpad pinch zooms where the pointer is, and scrolling (two fingers or a wheel) or dragging pans.
 * The middle or right button always pans. The left button pans when it goes down on empty ground
 * (`canLeftPan` says whether that spot is empty), so it never fights with placing, dragging or painting.
 */
export class CameraController {
  private view: View;
  private pinch: { mid: Point; distance: number } | null = null;
  private tween: Phaser.Tweens.Tween | null = null;
  private atMin = true;
  /** A mouse drag that is panning the view, with where the pointer was last. */
  private mousePan: { pointerId: number; x: number; y: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onZoomState: ZoomStateListener,
    /** True if a left-button press at this world point should pan (nothing there to pick up, no tool on). */
    private readonly canLeftPan: (world: Point) => boolean = () => false,
  ) {
    this.view = fitView(this.viewport(), this.insets(), this.margin());
    this.setView(this.view);

    const canvas = scene.game.canvas;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onMouseDown);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('pointermove', this.onMouseMove);
    window.addEventListener('pointerup', this.onMouseUp);
    window.addEventListener('pointercancel', this.onMouseUp);
    window.addEventListener('blur', this.endMousePan);
  }

  /** A point on the page (CSS pixels) as a point on the screen in game pixels. */
  private toScreen(clientX: number, clientY: number): Point {
    const box = this.scene.game.canvas.getBoundingClientRect();
    return { x: (clientX - box.left) * PIXEL_RATIO, y: (clientY - box.top) * PIXEL_RATIO };
  }

  /**
   * A trackpad pinch (which browsers send as ctrl + wheel) zooms where the pointer is. Anything else,
   * like two fingers sliding on a trackpad or a mouse wheel, scrolls the view, like two fingers on the iPad.
   */
  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault(); // the page itself must not scroll or zoom
    this.stopTween();
    const viewport = this.viewport();
    if (event.ctrlKey) {
      const zoom = clampZoom(this.view.zoom * pinchZoomFactor(event.deltaY, event.deltaMode), this.limits());
      const focus = this.toScreen(event.clientX, event.clientY);
      this.setView(clampView(zoomAt(this.view, viewport, zoom, focus), viewport, this.insets(), this.margin()));
      return;
    }
    // Content follows the fingers, so scrolling down moves the view down. Shift + wheel scrolls sideways.
    const dx = wheelPixels(event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX, event.deltaMode);
    const dy = event.shiftKey && event.deltaX === 0 ? 0 : wheelPixels(event.deltaY, event.deltaMode);
    const moved = pan(this.view, -dx * PIXEL_RATIO, -dy * PIXEL_RATIO);
    this.setView(clampView(moved, viewport, this.insets(), this.margin()));
  };

  private readonly onMouseDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || this.mousePan) return;
    const leftOnEmpty =
      event.button === 0 &&
      this.canLeftPan(screenToWorld(this.view, this.viewport(), this.toScreen(event.clientX, event.clientY)));
    if (event.button !== 1 && event.button !== 2 && !leftOnEmpty) return;
    event.preventDefault(); // no autoscroll circle on a middle click
    this.stopTween();
    this.mousePan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    this.scene.game.canvas.style.cursor = 'grabbing';
  };

  private readonly onMouseMove = (event: PointerEvent): void => {
    const drag = this.mousePan;
    if (drag?.pointerId !== event.pointerId) return;
    const viewport = this.viewport();
    const moved = pan(this.view, (event.clientX - drag.x) * PIXEL_RATIO, (event.clientY - drag.y) * PIXEL_RATIO);
    this.setView(clampView(moved, viewport, this.insets(), this.margin()));
    drag.x = event.clientX;
    drag.y = event.clientY;
  };

  private readonly onMouseUp = (event: PointerEvent): void => {
    if (this.mousePan?.pointerId === event.pointerId) this.endMousePan();
  };

  private readonly endMousePan = (): void => {
    this.mousePan = null;
    this.scene.game.canvas.style.cursor = '';
  };

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
