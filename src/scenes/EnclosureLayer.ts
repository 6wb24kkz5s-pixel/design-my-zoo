import Phaser from 'phaser';
import { ENCLOSURE_STYLE, GRID } from '../config';
import type { AreaCheck } from '../logic/enclosures';
import { squareKey } from '../logic/zoo';
import { DEPTH } from './depth';
import { dashedRect } from './draw';

/**
 * Shows the result of an enclosure check: a pulsing gold outline around a
 * closed area, or pulsing amber dashed boxes on the gaps.
 */
export class EnclosureLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.enclosure);
    scene.tweens.add({
      targets: this.g,
      alpha: { from: 1, to: ENCLOSURE_STYLE.pulseMinAlpha },
      duration: ENCLOSURE_STYLE.pulseMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  show(check: AreaCheck | null): void {
    const g = this.g;
    g.clear();
    if (check?.kind === 'closed') this.drawOutline(check.squares);
    if (check?.kind === 'gap') this.drawGaps(check.gaps);
  }

  /** The area's outer edge: every side of a square whose neighbour is not in the area. */
  private drawOutline(squares: readonly { col: number; row: number }[]): void {
    const size = GRID.squareSize;
    const inArea = new Set(squares.map((s) => squareKey(s.col, s.row)));
    const g = this.g;
    g.lineStyle(ENCLOSURE_STYLE.glowWidth, ENCLOSURE_STYLE.glow, 1);
    for (const { col, row } of squares) {
      const x = col * size;
      const y = row * size;
      if (!inArea.has(squareKey(col, row - 1))) g.lineBetween(x, y, x + size, y);
      if (!inArea.has(squareKey(col, row + 1))) g.lineBetween(x, y + size, x + size, y + size);
      if (!inArea.has(squareKey(col - 1, row))) g.lineBetween(x, y, x, y + size);
      if (!inArea.has(squareKey(col + 1, row))) g.lineBetween(x + size, y, x + size, y + size);
    }
  }

  private drawGaps(gaps: readonly { col: number; row: number }[]): void {
    const size = GRID.squareSize;
    const g = this.g;
    for (const { col, row } of gaps) {
      g.fillStyle(ENCLOSURE_STYLE.gap, ENCLOSURE_STYLE.gapFillAlpha);
      g.fillRect(col * size, row * size, size, size);
      g.lineStyle(ENCLOSURE_STYLE.gapLineWidth, ENCLOSURE_STYLE.gap, 1);
      dashedRect(g, col * size, row * size, size, size, ENCLOSURE_STYLE.dash, ENCLOSURE_STYLE.dashGap);
    }
  }
}
