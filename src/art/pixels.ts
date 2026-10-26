// A tiny pixel canvas for drawing sprites in code. Each pixel is one character that names a
// colour in a palette ('.' is see-through). Sprites are 16 pixels per grid square.

export const TRANSPARENT = '.';

/** A small, repeatable random-number generator, so a "random" texture looks the same every time. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pixels {
  private readonly cells: string[][];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = Array.from({ length: height }, () => Array<string>(width).fill(TRANSPARENT));
  }

  /** Builds a sprite from rows of text, e.g. ["..kk..", ".kaak."]. Every row must be as wide as the first. */
  static fromRows(rows: readonly string[]): Pixels {
    const width = rows[0]?.length ?? 0;
    const pixels = new Pixels(width, rows.length);
    rows.forEach((row, y) => {
      if (row.length !== width) throw new Error(`row ${y} is ${row.length} wide, expected ${width}`);
      [...row].forEach((c, x) => pixels.set(x, y, c));
    });
    return pixels;
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? TRANSPARENT;
  }

  set(x: number, y: number, c: string): this {
    const row = this.cells[Math.floor(y)];
    const px = Math.floor(x);
    if (row && px >= 0 && px < this.width) row[px] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    return this;
  }

  /** A filled ellipse. (cx, cy) is its centre in pixel coordinates, so (8, 8) is the corner between four pixels. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** A one-pixel-wide line between two pixels. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xEnd = Math.round(x1);
    const yEnd = Math.round(y1);
    const dx = Math.abs(xEnd - x);
    const dy = -Math.abs(yEnd - y);
    const sx = x < xEnd ? 1 : -1;
    const sy = y < yEnd ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.set(x, y, c);
      if (x === xEnd && y === yEnd) break;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y += sy;
      }
    }
    return this;
  }

  /** A filled triangle. */
  triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: string): this {
    const minX = Math.floor(Math.min(ax, bx, cx));
    const maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy));
    const maxY = Math.ceil(Math.max(ay, by, cy));
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (area === 0) return this;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
        const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Puts `c` on every see-through pixel that touches a drawn pixel (up, down, left or right). */
  outline(c: string): this {
    const edge: [number, number][] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== TRANSPARENT) continue;
        if (
          this.get(x - 1, y) !== TRANSPARENT ||
          this.get(x + 1, y) !== TRANSPARENT ||
          this.get(x, y - 1) !== TRANSPARENT ||
          this.get(x, y + 1) !== TRANSPARENT
        ) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, c);
    return this;
  }

  /** A copy with `margin` extra see-through pixels round every side. */
  padded(margin: number): Pixels {
    const bigger = new Pixels(this.width + margin * 2, this.height + margin * 2);
    bigger.blit(this, margin, margin);
    return bigger;
  }

  /** Draws another sprite on top of this one, leaving see-through pixels alone. */
  blit(source: Pixels, ox: number, oy: number): this {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const c = source.get(x, y);
        if (c !== TRANSPARENT) this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }

  flipX(): Pixels {
    const flipped = new Pixels(this.width, this.height);
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) flipped.set(this.width - 1 - x, y, this.get(x, y));
    return flipped;
  }

  clone(): Pixels {
    return new Pixels(this.width, this.height).blit(this, 0, 0);
  }

  /** The sprite as rows of text. */
  toRows(): string[] {
    return this.cells.map((row) => row.join(''));
  }

  /** How many pixels are drawn (not see-through). */
  count(): number {
    return this.cells.reduce((sum, row) => sum + row.filter((c) => c !== TRANSPARENT).length, 0);
  }
}
