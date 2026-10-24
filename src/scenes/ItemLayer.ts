import Phaser from 'phaser';
import { GHOST_STYLE, GRID, ITEM_STYLE, TAB_COLOURS } from '../config';
import { getFeature } from '../data/content';
import { PIXEL_RATIO } from '../display';
import type { Zoo } from '../logic/zoo';

/** Extra sharpness for labels, so they stay readable when zoomed in. */
const LABEL_RESOLUTION = PIXEL_RATIO * 3;

/**
 * Draws placed items as placeholder coloured blocks with their names,
 * plus the green / grey outline shown while dragging.
 */
export class ItemLayer {
  private readonly items: Phaser.GameObjects.Graphics;
  private readonly ghost: Phaser.GameObjects.Graphics;
  private readonly ghostLabel: Phaser.GameObjects.Text;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.items = scene.add.graphics();
    this.ghost = scene.add.graphics();
    this.ghostLabel = this.makeLabel(0, 0, '', 0).setVisible(false);
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

      this.labels.push(this.makeLabel(x + width / 2, y + height / 2, feature.label, width).setAlpha(alpha));
    }
  }

  /** Shows where a dragged item would land: green and solid if it fits, grey and dashed if not. */
  showGhost(kind: string, col: number, row: number, fits: boolean): void {
    const feature = getFeature(kind);
    if (!feature) return;
    const [w, h] = feature.size;
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
      dashedRect(g, x, y, width, height);
    }

    this.ghostLabel
      .setText(feature.label)
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
    return this.scene.add
      .text(x, y, text, {
        fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
        fontSize: `${ITEM_STYLE.labelSize}px`,
        fontStyle: 'bold',
        color: ITEM_STYLE.labelColour,
        stroke: ITEM_STYLE.labelStroke,
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: Math.max(width - ITEM_STYLE.inset * 2, 1) },
      })
      .setOrigin(0.5)
      .setResolution(LABEL_RESOLUTION);
  }
}

function dashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
  dashedLine(g, x, y, x + width, y);
  dashedLine(g, x + width, y, x + width, y + height);
  dashedLine(g, x + width, y + height, x, y + height);
  dashedLine(g, x, y + height, x, y);
}

function dashedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const step = GHOST_STYLE.dash + GHOST_STYLE.gap;
  for (let d = 0; d < length; d += step) {
    const end = Math.min(d + GHOST_STYLE.dash, length);
    g.lineBetween(
      x1 + ((x2 - x1) * d) / length,
      y1 + ((y2 - y1) * d) / length,
      x1 + ((x2 - x1) * end) / length,
      y1 + ((y2 - y1) * end) / length,
    );
  }
}
