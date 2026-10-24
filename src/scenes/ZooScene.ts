import Phaser from 'phaser';
import { PLOT_HEIGHT, PLOT_WIDTH } from '../camera';
import { CAMERA, COLOURS, GRID } from '../config';
import { PIXEL_RATIO } from '../display';
import { createControls } from '../ui/controls';
import { CameraController } from './CameraController';

/**
 * The plot: a green building area with a sandy visitor path around the edge,
 * drawn once in world space. The camera pans and zooms over it.
 */
export class ZooScene extends Phaser.Scene {
  private lines!: Phaser.GameObjects.Graphics;
  private linesZoom = 0;
  private cameraController!: CameraController;

  constructor() {
    super('ZooScene');
  }

  create(): void {
    this.drawGround();
    this.lines = this.add.graphics();

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Missing #ui element');

    const controls = createControls(ui, {
      zoomIn: () => this.cameraController.zoomBy(CAMERA.buttonZoomStep),
      zoomOut: () => this.cameraController.zoomBy(1 / CAMERA.buttonZoomStep),
      seeWholeZoo: () => this.cameraController.fitAll(),
    });
    this.cameraController = new CameraController(this, controls.setZoomState);

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

  /** Sandy path over the whole plot, then the green building area on top. */
  private drawGround(): void {
    const inner = GRID.pathWidth * GRID.squareSize;
    const g = this.add.graphics();
    g.fillStyle(COLOURS.path);
    g.fillRect(0, 0, PLOT_WIDTH, PLOT_HEIGHT);
    g.fillStyle(COLOURS.grass);
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

    // ...then the parts strictly inside the building area in the grass colour.
    g.fillStyle(COLOURS.gridLine);
    for (let col = pathWidth + 1; col < cols - pathWidth; col++) {
      g.fillRect(col * squareSize - half, inner + half, width, PLOT_HEIGHT - inner * 2 - width);
    }
    for (let row = pathWidth + 1; row < rows - pathWidth; row++) {
      g.fillRect(inner + half, row * squareSize - half, PLOT_WIDTH - inner * 2 - width, width);
    }
  }
}
