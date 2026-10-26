import Phaser from 'phaser';
import { spriteName } from '../art/names';
import { registerArt } from '../art/phaser';
import { PLOT_HEIGHT, PLOT_WIDTH } from '../camera';
import { loadSoundSetting, saveSoundSetting, soundForChange, SoundPlayer } from '../audio/sounds';
import { CAMERA, COLOURS, GRID, GRID_LINE_ALPHA, UNDO_LIMIT } from '../config';
import {
  checkMaterial,
  failMessageFor,
  featureCatalogue,
  FENCE_MATERIALS,
  getFeature,
  getGround,
  getMaterial,
  getMaterials,
  NEEDS_DATA,
  NOTICES,
  ROOF_MATERIALS,
  type Message,
} from '../data/content';
import { PIXEL_RATIO } from '../display';
import { findFreeSpot } from '../logic/animals';
import { checkArea } from '../logic/enclosures';
import { canUndo, commit, createHistory, undo, type History } from '../logic/history';
import { evaluateAnimal } from '../logic/needs';
import type { PaintTool } from '../logic/paint';
import { removeRoofArea, roofArea, type RoofTool } from '../logic/roofs';
import { browserStorage, loadZoo, saveZoo } from '../logic/save';
import {
  EMPTY_ZOO,
  isEmptyZoo,
  itemsAt,
  placeAnimal,
  placeItem,
  setItemMaterial,
  type PlacedItem,
  type Square,
  type Zoo,
} from '../logic/zoo';
import { confirmDialog } from '../ui/confirmDialog';
import { createControls, type Controls } from '../ui/controls';
import { pickMaterial } from '../ui/materialPicker';
import { createMessageBanner, type MessageBanner } from '../ui/messageBanner';
import { buildPanelView } from '../ui/needsView';
import { createPaintIndicator, type PaintIndicator } from '../ui/paintIndicator';
import { createPalette, tabIcon, type Palette } from '../ui/palette';
import { createSidePanel, type SidePanel } from '../ui/sidePanel';
import { AnimalLayer, type Mood } from './AnimalLayer';
import { CameraController } from './CameraController';
import { DEPTH } from './depth';
import { DragController, type Moving } from './DragController';
import { EnclosureLayer } from './EnclosureLayer';
import { GroundLayer } from './GroundLayer';
import { ItemLayer } from './ItemLayer';
import { PaintController } from './PaintController';
import { RoofLayer } from './RoofLayer';
import { TapController } from './TapController';

/**
 * The plot: an empty building area with a sandy visitor path around the edge,
 * drawn once in world space, with painted ground, fences, placed items, roofs and
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
  private roofLayer!: RoofLayer;
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
  /** Roof mode: tap inside a fenced-in area to roof it (or take its roof off). Not on at the same time as a paint tool. */
  private roofTool: RoofTool | null = null;
  private enclosureLayer!: EnclosureLayer;
  private banner!: MessageBanner;
  private panel!: SidePanel;
  /** The animal the child tapped to check its enclosure. Re-checked after every change, wherever it moves. */
  private checkedAnimalId: string | null = null;
  private readonly storage = browserStorage();
  private readonly sounds = new SoundPlayer();
  private soundOn = false;

  constructor() {
    super('ZooScene');
  }

  create(): void {
    registerArt(this.textures);
    this.drawBase();
    this.groundLayer = new GroundLayer(this);
    // The grid lines are faint, so the pictures underneath show through.
    this.lines = this.add.graphics().setDepth(DEPTH.gridLines).setAlpha(GRID_LINE_ALPHA);
    this.itemLayer = new ItemLayer(this);
    this.roofLayer = new RoofLayer(this);
    this.animalLayer = new AnimalLayer(this, () => this.sounds.play('chime'));
    this.enclosureLayer = new EnclosureLayer(this);
    this.history = createHistory(loadZoo(this.storage, featureCatalogue));

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Missing #ui element');
    this.ui = ui;
    this.banner = createMessageBanner(ui);
    this.panel = createSidePanel(ui, () => this.closePanel());

    this.controls = createControls(ui, {
      zoomIn: () => this.cameraController.zoomBy(CAMERA.buttonZoomStep),
      zoomOut: () => this.cameraController.zoomBy(1 / CAMERA.buttonZoomStep),
      seeWholeZoo: () => this.cameraController.fitAll(),
      undo: () => this.undo(),
      newZoo: () => void this.askNewZoo(),
      addAnimal: (animalId) => this.addAnimal(animalId),
      toggleSound: () => this.setSound(!this.soundOn),
    });
    // Sound starts off. If it was turned on before, it is on again, and the first touch unlocks it.
    this.soundOn = loadSoundSetting(this.storage);
    this.sounds.setEnabled(this.soundOn);
    this.controls.setSoundOn(this.soundOn);
    if (this.soundOn) window.addEventListener('pointerdown', () => this.sounds.unlock(), { once: true });
    this.palette = createPalette(ui, {
      onCardPointerDown: (kind, event) => this.dragController.startFromPalette(kind, event),
      onToolTap: (tool) => this.toggleTool(tool),
      onFenceTap: () => void this.chooseFence(),
      onRoofTap: () => void this.chooseRoof(),
      onNoRoofTap: () => this.toggleNoRoof(),
    });
    this.paintIndicator = createPaintIndicator(ui, () => this.stopTools());

    this.cameraController = new CameraController(this, this.controls.setZoomState);
    this.dragController = new DragController(this, this.itemLayer, {
      zoo: () => this.history.present,
      commit: (next) => this.commit(next),
      setBinHover: (active) => this.palette.setBinHover(active),
      setMoving: (moving) => {
        this.moving = moving;
        this.render();
      },
      isPainting: () => this.paintTool !== null || this.roofTool !== null,
      dropNew: (kind, col, row) => void this.dropNew(kind, col, row),
      showNotice: (message) => this.showNotice(message),
      animalAtPoint: (x, y) => {
        const id = this.animalLayer.idAtPoint(x, y);
        return id ? this.history.present.animals.find((a) => a.animalId === id) : undefined;
      },
      animalPosition: (animalId) => this.animalLayer.positionOf(animalId),
    });
    this.paintController = new PaintController(this, {
      tool: () => this.paintTool,
      zoo: () => this.history.present,
      showDraft: (draft) => {
        this.draft = draft;
        this.render();
      },
      commit: (next) => {
        this.commit(next);
        // A fence that is not strong gets its gentle message once the stroke is finished.
        if (this.paintTool?.layer === 'fence' && this.paintTool.value) this.reportMaterial('fence', this.paintTool.value);
      },
    });
    new TapController(this, () => this.paintTool === null, (square, world) => this.onTap(square, world));
    this.refresh();
    this.syncLayerZoom();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  update(_time: number, delta: number): void {
    this.cameraController.update();
    this.animalLayer.update(this.history.present, delta);

    const zoom = this.cameras.main.zoom;
    if (zoom !== this.linesZoom) {
      this.drawLines(zoom);
      this.syncLayerZoom();
    }
  }

  /** Tells the pictures how big a grid square is on screen, so tiny ones can grow into clear icons. */
  private syncLayerZoom(): void {
    const squarePx = (GRID.squareSize * this.cameras.main.zoom) / PIXEL_RATIO;
    this.itemLayer.setSquarePx(squarePx);
    this.animalLayer.setSquarePx(squarePx);
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

  /** The Roof tool: turn roofing off if it is on, otherwise choose a roof material first. */
  private async chooseRoof(): Promise<void> {
    if (this.roofTool?.material) {
      this.setRoofTool(null);
      return;
    }
    this.cancelGestures();
    const material = await pickMaterial(
      this.ui,
      { icon: tabIcon('shelter'), title: 'Choose a material for your roof' },
      ROOF_MATERIALS,
    );
    if (material) this.setRoofTool({ material });
  }

  /** The "No roof" tool takes a roof off the area you tap. Tap it again to stop. */
  private toggleNoRoof(): void {
    this.setRoofTool(this.roofTool?.material === null ? null : { material: null });
  }

  private setTool(tool: PaintTool | null): void {
    this.paintController.cancel();
    this.paintTool = tool;
    if (tool) this.roofTool = null;
    this.syncTools();
  }

  private setRoofTool(tool: RoofTool | null): void {
    this.paintController.cancel();
    this.roofTool = tool;
    if (tool) this.paintTool = null;
    this.syncTools();
  }

  /** ✋ Done: back to normal drag mode. */
  private stopTools(): void {
    this.paintController.cancel();
    this.paintTool = null;
    this.roofTool = null;
    this.syncTools();
  }

  /** Lights up the active tool in the palette and shows (or hides) the sign above it. */
  private syncTools(): void {
    this.palette.setActiveTool(this.paintTool);
    this.palette.setActiveRoof(this.roofTool);
    if (this.paintTool) {
      this.paintIndicator.show(...describeTool(this.paintTool));
    } else if (this.roofTool) {
      this.paintIndicator.show(...describeRoof(this.roofTool));
    } else {
      this.paintIndicator.hide();
    }
  }

  /** Every change goes through here: remember it for Undo, autosave, redraw. */
  private commit(next: Zoo): void {
    const before = this.history.present;
    this.history = commit(this.history, next, UNDO_LIMIT);
    this.afterChange();
    this.sounds.play(soundForChange(before, next, featureCatalogue));
  }

  private setSound(on: boolean): void {
    this.soundOn = on;
    this.sounds.setEnabled(on);
    this.sounds.unlock(); // this tap is the touch the iPad needs before it allows sound
    saveSoundSetting(this.storage, on);
    this.controls.setSoundOn(on);
    this.sounds.play('pop'); // a little sound to show it works
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
    this.updateMoods();
  }

  /** Who is happy, and who just gained or lost hearts. Worked out after every saved change. */
  private updateMoods(): void {
    const zoo = this.history.present;
    const moods = new Map<string, Mood>();
    // Only the heart counts matter here, so skip the slow "is it a gap?" check, and share areas.
    const options = { cache: new Map(), explain: false };
    for (const animal of zoo.animals) {
      const needs = evaluateAnimal(zoo, featureCatalogue, NEEDS_DATA, animal.animalId, options);
      if (needs) moods.set(animal.animalId, { count: needs.heartCount, happy: needs.happy });
    }
    this.animalLayer.setMoods(moods);
  }

  private render(): void {
    const zoo = this.draft ?? this.history.present;
    this.groundLayer.render(zoo);
    this.itemLayer.render(zoo, this.moving?.itemId);
    this.roofLayer.render(zoo);
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
      this.showNotice(NOTICES.noRoom);
    }
  }

  /** A gentle message. The next touch anywhere puts the enclosure message (if any) back. */
  private showNotice(message: Message): void {
    this.banner.show(message);
    window.addEventListener('pointerdown', () => this.showCheck(this.draft ?? this.history.present), {
      once: true,
    });
  }

  /** If this material does not suit its job, say so gently. The job is a feature id, "fence" or "roof". */
  private reportMaterial(job: string, material: string): void {
    if (checkMaterial(job, material).works) return;
    const message = failMessageFor(job);
    if (message) this.showNotice(message);
  }

  /**
   * One tap on the plot. In roof mode it roofs (or un-roofs) the area. Otherwise:
   * tap an animal to check its enclosure (tap it again to stop), tap an item that has a
   * material to change it, and tap anywhere else to clear the check.
   */
  private onTap(square: Square, world: { x: number; y: number }): void {
    const zoo = this.draft ?? this.history.present;
    if (this.roofTool) {
      this.applyRoof(square);
      return;
    }

    // Animals wander, so the one tapped is the one drawn under the finger.
    const animalId = this.animalLayer.idAtPoint(world.x, world.y);
    const animal = animalId ? zoo.animals.find((a) => a.animalId === animalId) : undefined;
    this.checkedAnimalId = animal && animal.animalId !== this.checkedAnimalId ? animal.animalId : null;
    this.showCheck(zoo);
    if (animal) return;

    // A water-only item (a plant) floats on a pool, so look at the top item first.
    const withMaterial = itemsAt(zoo, featureCatalogue, square.col, square.row).filter(
      (item) => featureCatalogue.materialsFor(item.kind).length > 0,
    );
    const item = withMaterial.find((i) => featureCatalogue.placeOn(i.kind) !== null) ?? withMaterial[0];
    if (item) void this.changeMaterial(item);
  }

  /** Roof mode: put a roof on the fenced-in area that was tapped, or take its roof off. */
  private applyRoof(square: Square): void {
    const tool = this.roofTool;
    if (!tool) return;
    const zoo = this.history.present;

    if (tool.material === null) {
      const next = removeRoofArea(zoo, square);
      if (next !== zoo) this.commit(next);
      return;
    }
    const result = roofArea(zoo, featureCatalogue, square, tool.material);
    if (!result.ok) {
      if (result.reason === 'needsFence') this.showNotice(NOTICES.roofNeedsFence);
      return;
    }
    if (result.zoo !== zoo) this.commit(result.zoo);
    this.reportMaterial('roof', tool.material);
  }

  /** A new item was dropped from the palette where it fits. Ask for its material first, if it has a choice. */
  private async dropNew(kind: string, col: number, row: number): Promise<void> {
    const feature = getFeature(kind);
    if (!feature) return;

    let material: string | undefined;
    if (feature.materialIds.length > 0) {
      const chosen = await pickMaterial(
        this.ui,
        { icon: tabIcon(feature.tab), title: `Choose a material for your ${feature.label.toLowerCase()}` },
        getMaterials(feature.materialIds),
      );
      if (!chosen) return;
      material = chosen;
    }

    const next = placeItem(this.history.present, featureCatalogue, kind, col, row, material);
    if (!next) return;
    this.commit(next);
    if (material) this.reportMaterial(kind, material);
  }

  /** Tapping an item with a material choice reopens the picker, so you can try another one. */
  private async changeMaterial(item: PlacedItem): Promise<void> {
    const feature = getFeature(item.kind);
    if (!feature) return;
    this.cancelGestures();
    const chosen = await pickMaterial(
      this.ui,
      { icon: tabIcon(feature.tab), title: `Choose a material for your ${feature.label.toLowerCase()}` },
      getMaterials(feature.materialIds),
      item.material,
    );
    if (!chosen) return;
    const next = setItemMaterial(this.history.present, featureCatalogue, item.id, chosen);
    if (!next) return;
    this.commit(next);
    this.reportMaterial(item.kind, chosen);
  }

  /**
   * The tapped animal: a glow round its enclosure (or markers on its gaps), and the side panel
   * with its hearts, which keeps up to date as the zoo changes.
   */
  private showCheck(zoo: Zoo): void {
    const animal = zoo.animals.find((a) => a.animalId === this.checkedAnimalId);
    const check = animal ? checkArea(zoo.fences, { col: animal.col, row: animal.row }) : null;
    const view = animal ? buildPanelView(zoo, animal.animalId) : null;
    this.banner.hide();
    if (!check || !view) {
      this.checkedAnimalId = null;
      this.enclosureLayer.show(null);
      this.panel.show(null);
      return;
    }
    this.enclosureLayer.show(check);
    this.panel.show(view);
  }

  private closePanel(): void {
    this.checkedAnimalId = null;
    this.showCheck(this.draft ?? this.history.present);
  }

  /** The sandy path over the whole plot, then the plain, unpainted building area on top. */
  private drawBase(): void {
    const inner = GRID.pathWidth * GRID.squareSize;
    this.add.tileSprite(0, 0, PLOT_WIDTH, PLOT_HEIGHT, spriteName.path).setOrigin(0).setDepth(DEPTH.base);
    this.add
      .tileSprite(inner, inner, PLOT_WIDTH - inner * 2, PLOT_HEIGHT - inner * 2, spriteName.plot)
      .setOrigin(0)
      .setDepth(DEPTH.base + 0.1);
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

/** Icon and words for the roof sign, e.g. ["🏠", "Roofing: Fabric net"]. */
function describeRoof(tool: RoofTool): [string, string] {
  if (tool.material === null) return ['🧽', 'Taking roofs off: tap an area'];
  return ['🏠', `Roofing: ${getMaterial(tool.material)?.label ?? tool.material}. Tap an area`];
}

/** Icon and words for the painting sign, e.g. ["🖌️", "Painting: Wood fence"]. */
function describeTool(tool: PaintTool): [string, string] {
  if (tool.value === null) {
    return ['🧽', tool.layer === 'ground' ? 'Eraser: ground' : 'Eraser: fences'];
  }
  const name = tool.layer === 'ground' ? getGround(tool.value)?.label : `${getMaterial(tool.value)?.label} fence`;
  return ['🖌️', `Painting: ${name ?? tool.value}`];
}
