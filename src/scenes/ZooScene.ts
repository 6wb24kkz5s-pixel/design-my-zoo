import Phaser from 'phaser';
import { COLOURS, GRID, SCREEN_MARGIN } from '../config';

/**
 * Draws the placeholder plot: a green building area with a sandy visitor
 * path around the edge. For M0 the whole plot is scaled to fit the screen;
 * camera zoom and pan come in M1.
 */
export class ZooScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;

  constructor() {
    super('ZooScene');
  }

  create(): void {
    this.grid = this.add.graphics();
    this.drawGrid(this.scale.width, this.scale.height);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.drawGrid(gameSize.width, gameSize.height);
  }

  /** Redraws the plot at a whole-pixel square size so every edge stays crisp. */
  private drawGrid(screenWidth: number, screenHeight: number): void {
    const { cols, rows, squareSize, pathWidth, lineWidth } = GRID;

    const fit = Math.min(
      (screenWidth - SCREEN_MARGIN * 2) / (cols * squareSize),
      (screenHeight - SCREEN_MARGIN * 2) / (rows * squareSize),
      1,
    );
    const size = Math.max(1, Math.floor(squareSize * fit));
    const plotWidth = cols * size;
    const plotHeight = rows * size;
    const left = Math.round((screenWidth - plotWidth) / 2);
    const top = Math.round((screenHeight - plotHeight) / 2);

    const g = this.grid;
    g.clear();

    // Sandy visitor path fills the whole plot; the building area goes on top.
    g.fillStyle(COLOURS.path);
    g.fillRect(left, top, plotWidth, plotHeight);

    const inner = pathWidth * size;
    g.fillStyle(COLOURS.grass);
    g.fillRect(left + inner, top + inner, plotWidth - inner * 2, plotHeight - inner * 2);

    // Grid lines as thin filled rectangles so they land on whole pixels.
    for (let col = 0; col <= cols; col++) {
      for (let row = 0; row < rows; row++) {
        g.fillStyle(this.isPath(col, row) || this.isPath(col - 1, row) ? COLOURS.pathLine : COLOURS.gridLine);
        g.fillRect(left + col * size, top + row * size, lineWidth, size);
      }
    }
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col < cols; col++) {
        g.fillStyle(this.isPath(col, row) || this.isPath(col, row - 1) ? COLOURS.pathLine : COLOURS.gridLine);
        g.fillRect(left + col * size, top + row * size, size, lineWidth);
      }
    }
  }

  /** True if the square is part of the visitor path (or just outside the plot). */
  private isPath(col: number, row: number): boolean {
    const { cols, rows, pathWidth } = GRID;
    return col < pathWidth || row < pathWidth || col >= cols - pathWidth || row >= rows - pathWidth;
  }
}
