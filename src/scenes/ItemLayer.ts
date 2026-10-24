import Phaser from 'phaser';
import { GHOST_STYLE, GRID, ITEM_STYLE, TAB_COLOURS } from '../config';
import { getFeature } from '../data/content';
import type { Size, Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { dashedRect } from './draw';
import { createLabel } from './labels';

/**
 * Draws placed items as placeholder coloured blocks with their names,
 * plus the green / grey outline shown while dragging (for items and animals).
 */
export class ItemLayer {
  private readonly items: Phaser.GameObjects.Graphics;
  private readonly ghost: Phaser.GameObjects.Graphics;
  private readonly ghostLabel: Phaser.GameObjects.Text;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.items = scene.add.graphics().setDepth(DEPTH.items);
    this.ghost = scene.add.graphics().setDepth(DEPTH.ghost);
    this.ghostLabel = this.makeLabel(0, 0, '', 0).setDepth(DEPTH.ghost).setVisible(false);
  }

  /** Redraws every item. `movingId` is drawn faded, because it is being dragged elsewhere. */
  render(zoo: Zoo, movingId?: number): void {
    const g = this.items;
    g.clear();
    for (const label of this.labels) label.destroy();
    this.labels = [];

    for (const item of zoo.items) {
      const feature = getFeature(item.kind);
      if (!feature) continue;
      const alpha = item.id === movingId ? ITEM_STYLE.movingAlpha : 1;
      const { x, y, width, height } = this.itemRect(item.col, item.row, feature.size[0], feature.size[1]);

      g.fillStyle(TAB_COLOURS[feature.tab] ?? ITEM_STYLE.fallbackColour, alpha);
      g.fillRect(x, y, width, height);
      g.lineStyle(ITEM_STYLE.borderWidth, ITEM_STYLE.border, alpha);
      g.strokeRect(x, y, width, height);

      this.labels.push(
        this.makeLabel(x + width / 2, y + height / 2, feature.label, width).setAlpha(alpha).setDepth(DEPTH.items),
      );
    }
  }

  /** Shows where a dragged item or animal would land: green and solid if it fits, grey and dashed if not. */
  showGhost(label: string, size: Size, col: number, row: number, fits: boolean): void {
    const [w, h] = size;
    const x = col * GRID.squareSize;
    const y = row * GRID.squareSize;
    const width = w * GRID.squareSize;
    const height = h * GRID.squareSize;
    const colour = fits ? GHOST_STYLE.fits : GHOST_STYLE.noFit;

    const g = this.ghost;
    g.clear();
    g.fillStyle(colour, GHOST_STYLE.fillAlpha);
    g.fillRect(x, y, width, height);
    g.lineStyle(GHOST_STYLE.lineWidth, colour, 1);
    if (fits) {
      g.strokeRect(x, y, width, height);
    } else {
      dashedRect(g, x, y, width, height, GHOST_STYLE.dash, GHOST_STYLE.gap);
    }

    this.ghostLabel
      .setText(label)
      .setPosition(x + width / 2, y + height / 2)
      .setWordWrapWidth(width - ITEM_STYLE.inset * 2)
      .setVisible(true);
  }

  hideGhost(): void {
    this.ghost.clear();
    this.ghostLabel.setVisible(false);
  }

  private itemRect(col: number, row: number, w: number, h: number) {
    const inset = ITEM_STYLE.inset;
    return {
      x: col * GRID.squareSize + inset,
      y: row * GRID.squareSize + inset,
      width: w * GRID.squareSize - inset * 2,
      height: h * GRID.squareSize - inset * 2,
    };
  }

  private makeLabel(x: number, y: number, text: string, width: number): Phaser.GameObjects.Text {
    return createLabel(this.scene, x, y, text, width);
  }
}
