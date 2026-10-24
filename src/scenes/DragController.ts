import Phaser from 'phaser';
import { GRID } from '../config';
import { featureCatalogue } from '../data/content';
import { canPlace, itemAt, moveItem, placeItem, removeItem, type PlacedItem, type Zoo } from '../logic/zoo';
import type { ItemLayer } from './ItemLayer';
import { pointerToWorld } from './pointer';

/** Elements with data-drop="bin" remove a dragged item when it is dropped on them. */
export const BIN_DROP = 'bin';
const BIN_SELECTOR = `[data-drop="${BIN_DROP}"]`;

export interface DragHost {
  zoo(): Zoo;
  commit(next: Zoo): void;
  setBinHover(active: boolean): void;
  /** In paint mode one finger paints, so placed items cannot be picked up. */
  isPainting(): boolean;
}

type DragSource = { type: 'palette' } | { type: 'plot'; item: PlacedItem };

interface Drag {
  pointerId: number;
  kind: string;
  source: DragSource;
  /** Where the finger holds the item, measured from its top-left corner, in world pixels. */
  grab: { x: number; y: number };
  target: { col: number; row: number; fits: boolean } | null;
  overBin: boolean;
}

/**
 * One-finger drag and drop: from the palette onto the plot, or a placed item
 * to a new square or the Bin. A second finger cancels the drag, so two-finger
 * pan and zoom always win.
 */
export class DragController {
  private drag: Drag | null = null;
  private readonly canvas: HTMLCanvasElement;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: ItemLayer,
    private readonly host: DragHost,
  ) {
    this.canvas = scene.game.canvas;
    // Capture phase, so a second finger cancels the drag before any other handler runs.
    window.addEventListener('pointerdown', this.onAnyPointerDown, { capture: true });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
  }

  /** A finger went down on a palette card. */
  startFromPalette(kind: string, event: PointerEvent): void {
    const size = featureCatalogue.sizeOf(kind);
    if (!size || !this.canStart(event)) return;
    const half = GRID.squareSize / 2;
    this.begin(event, kind, { type: 'palette' }, { x: size[0] * half, y: size[1] * half });
  }

  /** Drops the current drag without changing anything (e.g. before Undo). */
  cancel(): void {
    if (this.drag) this.end();
  }

  private readonly onAnyPointerDown = (event: PointerEvent): void => {
    if (this.drag && event.pointerId !== this.drag.pointerId) this.cancel();
  };

  private readonly onCanvasPointerDown = (event: PointerEvent): void => {
    if (this.host.isPainting() || !this.canStart(event)) return;
    const world = pointerToWorld(this.scene, event);
    const square = GRID.squareSize;
    const item = itemAt(this.host.zoo(), featureCatalogue, Math.floor(world.x / square), Math.floor(world.y / square));
    if (!item) return;
    this.begin(event, item.kind, { type: 'plot', item }, { x: world.x - item.col * square, y: world.y - item.row * square });
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.drag?.pointerId === event.pointerId) this.update(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag?.pointerId === event.pointerId) this.finish();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.drag?.pointerId === event.pointerId) this.cancel();
  };

  /** Only the first finger on the screen (the primary pointer) can start a drag. */
  private canStart(event: PointerEvent): boolean {
    return this.drag === null && event.isPrimary;
  }

  private begin(event: PointerEvent, kind: string, source: DragSource, grab: Drag['grab']): void {
    event.preventDefault();
    this.drag = { pointerId: event.pointerId, kind, source, grab, target: null, overBin: false };
    if (source.type === 'plot') this.layer.render(this.host.zoo(), source.item.id);
    this.update(event);
  }

  private update(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    drag.overBin = drag.source.type === 'plot' && element?.closest(BIN_SELECTOR) != null;
    this.host.setBinHover(drag.overBin);

    if (element !== this.canvas) {
      drag.target = null;
      this.layer.hideGhost();
      return;
    }

    const world = pointerToWorld(this.scene, event);
    const col = Math.round((world.x - drag.grab.x) / GRID.squareSize);
    const row = Math.round((world.y - drag.grab.y) / GRID.squareSize);
    const ignoreId = drag.source.type === 'plot' ? drag.source.item.id : undefined;
    const fits = canPlace(this.host.zoo(), featureCatalogue, drag.kind, col, row, ignoreId);
    drag.target = { col, row, fits };
    this.layer.showGhost(drag.kind, col, row, fits);
  }

  private finish(): void {
    const drag = this.drag;
    if (!drag) return;
    this.end();

    const zoo = this.host.zoo();
    const { source, target } = drag;
    let next: Zoo | null = null;
    if (source.type === 'plot' && drag.overBin) {
      next = removeItem(zoo, source.item.id);
    } else if (target?.fits) {
      next =
        source.type === 'plot'
          ? moveItem(zoo, featureCatalogue, source.item.id, target.col, target.row)
          : placeItem(zoo, featureCatalogue, drag.kind, target.col, target.row);
    }
    if (next) this.host.commit(next);
  }

  private end(): void {
    const wasMoving = this.drag?.source.type === 'plot';
    this.drag = null;
    this.layer.hideGhost();
    this.host.setBinHover(false);
    if (wasMoving) this.layer.render(this.host.zoo());
  }
}
