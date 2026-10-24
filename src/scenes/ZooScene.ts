import Phaser from 'phaser';
import { PLOT_HEIGHT, PLOT_WIDTH } from '../camera';
import { CAMERA, COLOURS, GRID, UNDO_LIMIT } from '../config';
import {
  ENCLOSURE_MESSAGES,
  featureCatalogue,
  FENCE_MATERIALS,
  getGround,
  getMaterial,
  NOTICES,
} from '../data/content';
import { PIXEL_RATIO } from '../display';
import { findFreeSpot } from '../logic/animals';
import { checkArea } from '../logic/enclosures';
import { canUndo, commit, createHistory, undo, type History } from '../logic/history';
import type { PaintTool } from '../logic/paint';
import { browserStorage, loadZoo, saveZoo } from '../logic/save';
import { animalAt, EMPTY_ZOO, isEmptyZoo, placeAnimal, type Square, type Zoo } from '../logic/zoo';
import { confirmDialog } from '../ui/confirmDialog';
import { createControls, type Controls } from '../ui/controls';
import { pickMaterial } from '../ui/materialPicker';
import { createMessageBanner, type MessageBanner } from '../ui/messageBanner';
import { createPaintIndicator, type PaintIndicator } from '../ui/paintIndicator';
import { createPalette, type Palette } from '../ui/palette';
import { AnimalLayer } from './AnimalLayer';
import { CameraController } from './CameraController';
import { DEPTH } from './depth';
import { DragController, type Moving } from './DragController';
import { EnclosureLayer } from './EnclosureLayer';
import { GroundLayer } from './GroundLayer';
import { ItemLayer } from './ItemLayer';
import { PaintController } from './PaintController';
import { TapController } from './TapController';

/**
 * The plot: an empty building area with a sandy visitor path around the edge,
 * drawn once in world space, with painted ground, fences, placed items and
 * animals on top. The camera pans and zooms over it.
 */
export class ZooScene extends Phaser.Scene {
  private lines!: Phaser.GameObjects.Graphics;
  private linesZoom = 0;
  private cameraController!: CameraController;
  private dragController!: DragController;
  private paintController!: PaintController;
  private groundLayer!: GroundLayer;
  private itemLayer!: ItemLayer;
  private animalLayer!: AnimalLayer;
  /** The item or animal being dragged on the plot, drawn faded until it lands. */
  private moving: Moving | null = null;
  private controls!: Controls;
  private palette!: Palette;
  private paintIndicator!: PaintIndicator;
  private ui!: HTMLElement;
  private history!: History<Zoo>;
  /** A paint stroke in progress, shown but not yet saved. */
  private draft: Zoo | null = null;
  private paintTool: PaintTool | null = null;
  private enclosureLayer!: EnclosureLayer;
  private banner!: MessageBanner;
  /** The animal the child tapped to check its enclosure. Re-checked after every change, wherever it moves. */
  private checkedAnimalId: string | null = null;
  private readonly storage = browserStorage();

  constructor() {
    super('ZooScene');
  }

  create(): void {
    this.drawBase();
    this.groundLayer = new GroundLayer(this);
    this.lines = this.add.graphics().setDepth(DEPTH.gridLines);
    this.itemLayer = new ItemLayer(this);
    this.animalLayer = new AnimalLayer(this);
    this.enclosureLayer = new EnclosureLayer(this);
    this.history = createHistory(loadZoo(this.storage, featureCatalogue));

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Missing #ui element');
    this.ui = ui;
    this.banner = createMessageBanner(ui);

    this.controls = createControls(ui, {
      zoomIn: () => this.cameraController.zoomBy(CAMERA.buttonZoomStep),
      zoomOut: () => this.cameraController.zoomBy(1 / CAMERA.buttonZoomStep),
      seeWholeZoo: () => this.cameraController.fitAll(),
      undo: () => this.undo(),
      newZoo: () => void this.askNewZoo(),
      addAnimal: (animalId) => this.addAnimal(animalId),
    });
    this.palette = createPalette(ui, {
      onCardPointerDown: (kind, event) => this.dragController.startFromPalette(kind, event),
      onToolTap: (tool) => this.toggleTool(tool),
      onFenceTap: () => void this.chooseFence(),
    });
    this.paintIndicator = createPaintIndicator(ui, () => this.setTool(null));

    this.cameraController = new CameraController(this, this.controls.setZoomState);
    this.dragController = new DragController(this, this.itemLayer, {
      zoo: () => this.history.present,
      commit: (next) => this.commit(next),
      setBinHover: (active) => this.palette.setBinHover(active),
      setMoving: (moving) => {
        this.moving = moving;
        this.render();
      },
      isPainting: () => this.paintTool !== null,
    });
    this.paintController = new PaintController(this, {
      tool: () => this.paintTool,
      zoo: () => this.history.present,
      showDraft: (draft) => {
        this.draft = draft;
        this.render();
      },
      commit: (next) => this.commit(next),
    });
    new TapController(this, () => this.paintTool === null, (square) => this.toggleCheck(square));
    this.refresh();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  update(): void {
    this.cameraController.update();

    const zoom = this.cameras.main.zoom;
    if (zoom !== this.linesZoom) {
      this.drawLines(zoom);
    }
  }

  private onResize(): void {
    this.cameraController.resize();
  }

  /** Tapping the active tool again turns paint mode off (GDD section 7). */
  private toggleTool(tool: PaintTool): void {
    const active = this.paintTool;
    const same = active?.layer === tool.layer && active.value === tool.value;
    this.setTool(same ? null : tool);
  }

  /** The Fence tool: turn painting off if it is on, otherwise choose a material first. */
  private async chooseFence(): Promise<void> {
    if (this.paintTool?.layer === 'fence' && this.paintTool.value !== null) {
      this.setTool(null);
      return;
    }
    this.cancelGestures();
    const material = await pickMaterial(
      this.ui,
      { icon: '🧱', title: 'Choose a material for your fence' },
      FENCE_MATERIALS,
    );
    if (material) this.setTool({ layer: 'fence', value: material });
  }

  private setTool(tool: PaintTool | null): void {
    this.paintController.cancel();
    this.paintTool = tool;
    this.palette.setActiveTool(tool);
    if (tool) {
      this.paintIndicator.show(...describeTool(tool));
    } else {
      this.paintIndicator.hide();
    }
  }

  /** Every change goes through here: remember it for Undo, autosave, redraw. */
  private commit(next: Zoo): void {
    this.history = commit(this.history, next, UNDO_LIMIT);
    this.afterChange();
  }

  private undo(): void {
    this.cancelGestures();
    if (!canUndo(this.history)) return;
    this.history = undo(this.history);
    this.afterChange();
  }

  private async askNewZoo(): Promise<void> {
    this.cancelGestures();
    const yes = await confirmDialog(this.ui, {
      icon: '🧹',
      message: 'Start a new zoo? Everything will be cleared.',
      yesLabel: 'Yes, start again',
      noLabel: 'No, keep my zoo',
    });
    if (yes && !isEmptyZoo(this.history.present)) this.commit(EMPTY_ZOO);
  }

  private cancelGestures(): void {
    this.dragController.cancel();
    this.paintController.cancel();
  }

  private afterChange(): void {
    saveZoo(this.storage, this.history.present);
    this.refresh();
  }

  private refresh(): void {
    this.render();
    this.controls.setCanUndo(canUndo(this.history));
    this.controls.setAnimalsInZoo(this.history.present.animals.map((a) => a.animalId));
  }

  private render(): void {
    const zoo = this.draft ?? this.history.present;
    this.groundLayer.render(zoo);
    this.itemLayer.render(zoo, this.moving?.itemId);
    this.animalLayer.render(zoo, this.moving?.animalId);
    this.showCheck(zoo);
  }

  /** Puts a new animal on the free squares nearest the middle of the view, ready to drag. */
  private addAnimal(animalId: string): void {
    this.cancelGestures();
    const zoo = this.history.present;
    const centre = this.cameraController.worldCentre();
    const near = { col: centre.x / GRID.squareSize, row: centre.y / GRID.squareSize };
    const spot = findFreeSpot(zoo, featureCatalogue, animalId, near);
    const next = spot && placeAnimal(zoo, featureCatalogue, animalId, spot.col, spot.row);
    if (next) {
      this.commit(next);
    } else {
      this.showNotice();
    }
  }

  /** "No room" message. The next touch anywhere puts the enclosure message (if any) back. */
  private showNotice(): void {
    this.banner.show(NOTICES.noRoom);
    window.addEventListener('pointerdown', () => this.showCheck(this.draft ?? this.history.present), {
      once: true,
    });
  }

  /**
   * Tap an animal to check its enclosure; tap it again to stop checking.
   * Tapping anywhere else (empty ground, an item) just clears the check.
   */
  private toggleCheck(square: Square): void {
    const zoo = this.draft ?? this.history.present;
    const tapped = animalAt(zoo, featureCatalogue, square.col, square.row)?.animalId ?? null;
    this.checkedAnimalId = tapped !== null && tapped !== this.checkedAnimalId ? tapped : null;
    this.showCheck(zoo);
  }

  /** Glow for a closed area, gap markers for an almost-closed one, with a message either way. */
  private showCheck(zoo: Zoo): void {
    const animal = zoo.animals.find((a) => a.animalId === this.checkedAnimalId);
    const check = animal ? checkArea(zoo.fences, { col: animal.col, row: animal.row }) : null;
    if (!check || check.kind === 'none') {
      this.checkedAnimalId = null;
      this.enclosureLayer.show(null);
      this.banner.hide();
      return;
    }
    this.enclosureLayer.show(check);
    this.banner.show(ENCLOSURE_MESSAGES[check.kind]);
  }

  /** Sandy path over the whole plot, then the plain, unpainted building area on top. */
  private drawBase(): void {
    const inner = GRID.pathWidth * GRID.squareSize;
    const g = this.add.graphics().setDepth(DEPTH.base);
    g.fillStyle(COLOURS.path);
    g.fillRect(0, 0, PLOT_WIDTH, PLOT_HEIGHT);
    g.fillStyle(COLOURS.unpainted);
    g.fillRect(inner, inner, PLOT_WIDTH - inner * 2, PLOT_HEIGHT - inner * 2);
  }

  /**
   * Grid lines, redrawn whenever the zoom changes so they stay exactly
   * GRID.lineWidth CSS pixels thick on screen and never blur or vanish.
   */
  private drawLines(zoom: number): void {
    this.linesZoom = zoom;
    const { cols, rows, squareSize, pathWidth } = GRID;
    const width = (GRID.lineWidth * PIXEL_RATIO) / zoom;
    const half = width / 2;
    const inner = pathWidth * squareSize;

    const g = this.lines;
    g.clear();

    // Every line full length in the path colour...
    g.fillStyle(COLOURS.pathLine);
    for (let col = 0; col <= cols; col++) {
      g.fillRect(col * squareSize - half, -half, width, PLOT_HEIGHT + width);
    }
    for (let row = 0; row <= rows; row++) {
      g.fillRect(-half, row * squareSize - half, PLOT_WIDTH + width, width);
    }

    // ...then the parts strictly inside the building area in the building-area colour.
    g.fillStyle(COLOURS.gridLine);
    for (let col = pathWidth + 1; col < cols - pathWidth; col++) {
      g.fillRect(col * squareSize - half, inner + half, width, PLOT_HEIGHT - inner * 2 - width);
    }
    for (let row = pathWidth + 1; row < rows - pathWidth; row++) {
      g.fillRect(inner + half, row * squareSize - half, PLOT_WIDTH - inner * 2 - width, width);
    }
  }
}

/** Icon and words for the painting sign, e.g. ["🖌️", "Painting: Wood fence"]. */
function describeTool(tool: PaintTool): [string, string] {
  if (tool.value === null) {
    return ['🧽', tool.layer === 'ground' ? 'Eraser: ground' : 'Eraser: fences'];
  }
  const name = tool.layer === 'ground' ? getGround(tool.value)?.label : `${getMaterial(tool.value)?.label} fence`;
  return ['🖌️', `Painting: ${name ?? tool.value}`];
}
