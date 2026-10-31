import Phaser from 'phaser';
import { GRID } from '../config';
import { featureCatalogue, getAnimal, getFeature, NOTICES, type Message } from '../data/content';
import {
  canMoveItem,
  canPlace,
  canPlaceAnimal,
  isOnWater,
  itemAt,
  moveAnimal,
  moveItem,
  removeAnimal,
  removeItem,
  type PlacedAnimal,
  type PlacedItem,
  type Size,
  type Zoo,
} from '../logic/zoo';
import type { ItemLayer } from './ItemLayer';
import { pointerToWorld } from './pointer';

/** Elements with data-drop="bin" remove a dragged item or animal when it is dropped on them. */
export const BIN_DROP = 'bin';
const BIN_SELECTOR = `[data-drop="${BIN_DROP}"]`;

/** What is being moved on the plot right now, so it can be drawn faded. */
export interface Moving {
  itemId?: number;
  animalId?: string;
}

export interface DragHost {
  zoo(): Zoo;
  commit(next: Zoo): void;
  setBinHover(active: boolean): void;
  setMoving(moving: Moving | null): void;
  /** In paint and roof mode one finger does something else, so placed things cannot be picked up. */
  isPainting(): boolean;
  /** A new item from the palette was dropped where it fits. The host asks for a material if it needs one. */
  dropNew(kind: string, col: number, row: number): void;
  showNotice(message: Message): void;
  /** The animal drawn at this point of the plot. Animals wander, so this may not be where they were put. */
  animalAtPoint(x: number, y: number): PlacedAnimal | undefined;
  /** The top-left corner of where an animal is drawn right now, in world pixels. */
  animalPosition(animalId: string): { x: number; y: number } | null;
}

type DragSource =
  | { type: 'palette'; kind: string }
  | { type: 'item'; item: PlacedItem }
  | { type: 'animal'; animal: PlacedAnimal };

interface Drag {
  pointerId: number;
  source: DragSource;
  label: string;
  size: Size;
  /** Where the finger holds it, measured from its top-left corner, in world pixels. */
  grab: { x: number; y: number };
  target: { col: number; row: number; fits: boolean } | null;
  overBin: boolean;
}

/**
 * One-finger drag and drop: an item from the palette onto the plot, or a placed
 * item or animal to a new square or the Bin. A second finger cancels the drag,
 * so two-finger pan and zoom always win.
 */
export class DragController {
  private drag: Drag | null = null;
  private readonly canvas: HTMLCanvasElement;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ghost: Pick<ItemLayer, 'showGhost' | 'hideGhost'>,
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
    const feature = getFeature(kind);
    if (!feature || !this.canStart(event)) return;
    const half = GRID.squareSize / 2;
    this.begin(event, { type: 'palette', kind }, feature.label, feature.size, {
      x: feature.size[0] * half,
      y: feature.size[1] * half,
    });
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
    const col = Math.floor(world.x / square);
    const row = Math.floor(world.y / square);
    const zoo = this.host.zoo();

    // Animals stand on top of items, so they are picked up first. They are found where they are drawn,
    // which may be a square or two from where they were put, because they wander.
    const animal = this.host.animalAtPoint(world.x, world.y);
    const animalInfo = animal && getAnimal(animal.animalId);
    if (animal && animalInfo) {
      const drawnAt = this.host.animalPosition(animal.animalId) ?? { x: animal.col * square, y: animal.row * square };
      this.begin(event, { type: 'animal', animal }, animalInfo.label, animalInfo.size, {
        x: world.x - drawnAt.x,
        y: world.y - drawnAt.y,
      });
      return;
    }

    const item = itemAt(zoo, featureCatalogue, col, row);
    const feature = item && getFeature(item.kind);
    if (item && feature) {
      this.begin(event, { type: 'item', item }, feature.label, feature.size, {
        x: world.x - item.col * square,
        y: world.y - item.row * square,
      });
    }
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
    // Only the left button (or a finger): the middle and right buttons pan the view.
    return this.drag === null && event.isPrimary && event.button === 0;
  }

  private begin(event: PointerEvent, source: DragSource, label: string, size: Size, grab: Drag['grab']): void {
    event.preventDefault();
    this.drag = { pointerId: event.pointerId, source, label, size, grab, target: null, overBin: false };
    if (source.type === 'item') this.host.setMoving({ itemId: source.item.id });
    if (source.type === 'animal') this.host.setMoving({ animalId: source.animal.animalId });
    this.update(event);
  }

  private update(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    drag.overBin = drag.source.type !== 'palette' && element?.closest(BIN_SELECTOR) != null;
    this.host.setBinHover(drag.overBin);

    if (element !== this.canvas) {
      drag.target = null;
      this.ghost.hideGhost();
      return;
    }

    const world = pointerToWorld(this.scene, event);
    const col = Math.round((world.x - drag.grab.x) / GRID.squareSize);
    const row = Math.round((world.y - drag.grab.y) / GRID.squareSize);
    const fits = this.fits(drag.source, col, row);
    drag.target = { col, row, fits };
    this.ghost.showGhost(drag.label, drag.size, col, row, fits);
  }

  private fits(source: DragSource, col: number, row: number): boolean {
    const zoo = this.host.zoo();
    switch (source.type) {
      case 'palette':
        return canPlace(zoo, featureCatalogue, source.kind, col, row);
      case 'item':
        return canMoveItem(zoo, featureCatalogue, source.item.id, col, row);
      case 'animal':
        return canPlaceAnimal(zoo, featureCatalogue, source.animal.animalId, col, row);
    }
  }

  private finish(): void {
    const drag = this.drag;
    if (!drag) return;
    this.end();

    const zoo = this.host.zoo();
    const { source, target } = drag;
    let next: Zoo | null = null;
    if (drag.overBin && source.type === 'item') {
      next = removeItem(zoo, featureCatalogue, source.item.id);
    } else if (drag.overBin && source.type === 'animal') {
      next = removeAnimal(zoo, source.animal.animalId);
    } else if (target?.fits) {
      if (source.type === 'palette') {
        // The host may ask for a material before it places the new item.
        this.host.dropNew(source.kind, target.col, target.row);
        return;
      }
      if (source.type === 'item') next = moveItem(zoo, featureCatalogue, source.item.id, target.col, target.row);
      if (source.type === 'animal') {
        next = moveAnimal(zoo, featureCatalogue, source.animal.animalId, target.col, target.row);
      }
    } else if (target && source.type !== 'animal' && this.missedWater(zoo, source, target)) {
      this.host.showNotice(NOTICES.needsWater);
    }
    if (next) this.host.commit(next);
  }

  /** True if a water-only item (plants, island, shrimp, fish food) was dropped somewhere that is not water. */
  private missedWater(zoo: Zoo, source: DragSource, target: { col: number; row: number }): boolean {
    const kind = source.type === 'palette' ? source.kind : source.type === 'item' ? source.item.kind : null;
    if (!kind || featureCatalogue.placeOn(kind) !== 'water') return false;
    return !isOnWater(zoo, featureCatalogue, kind, target.col, target.row);
  }

  private end(): void {
    this.drag = null;
    this.ghost.hideGhost();
    this.host.setBinHover(false);
    this.host.setMoving(null);
  }
}
