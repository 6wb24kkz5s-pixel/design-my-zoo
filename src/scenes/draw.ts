import Phaser from 'phaser';

/** A dashed rectangle outline, using the Graphics object's current line style. */
export function dashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  dash: number,
  gap: number,
): void {
  dashedLine(g, x, y, x + width, y, dash, gap);
  dashedLine(g, x + width, y, x + width, y + height, dash, gap);
  dashedLine(g, x + width, y + height, x, y + height, dash, gap);
  dashedLine(g, x, y + height, x, y, dash, gap);
}

function dashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  for (let d = 0; d < length; d += dash + gap) {
    const end = Math.min(d + dash, length);
    g.lineBetween(
      x1 + ((x2 - x1) * d) / length,
      y1 + ((y2 - y1) * d) / length,
      x1 + ((x2 - x1) * end) / length,
      y1 + ((y2 - y1) * end) / length,
    );
  }
}
