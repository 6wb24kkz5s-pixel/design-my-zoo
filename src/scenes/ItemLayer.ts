import Phaser from 'phaser';
import {
  FALLBACK_PAINT_STYLE,
  GHOST_STYLE,
  GRID,
  ITEM_STYLE,
  MATERIAL_STYLE,
  RESULT_STYLE,
  RESULT_VISUAL,
  TAB_COLOURS,
  type PaintStyle,
  type ResultVisual,
} from '../config';
import { checkMaterial, getFeature, getMaterial, PROPERTIES, type PlaceableFeature } from '../data/content';
import type { PlacedItem, Size, Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { dashedRect, drawBlock } from './draw';
import { createBubbleText, createLabel } from './labels';

/** What one item looks like right now. */
interface Look {
  feature: PlaceableFeature;
  material: string | null;
  /** The picture for a material that does not suit the job, or null if it suits (or there is no choice). */
  visual: ResultVisual | null;
  /** 0 → 1 while the result plays out (the pool drains, the island sinks…); 1 once it has finished. */
  progress: number;
  width: number;
  height: number;
}

interface ItemView {
  container: Phaser.GameObjects.Container;
  /** What the picture was made from. When it changes (a new material), the picture is made again. */
  signature: string;
  tweens: Phaser.Tweens.Tween[];
}

/**
 * Draws placed items as placeholder blocks with their names and materials. A material that
 * does not suit the job gets a simple picture of what goes wrong (a pool drains, an island
 * sinks, a hut falls down, sun shines through a shade cover) and a badge showing the
 * property it is missing. M8 replaces these with real art.
 *
 * Also draws the green / grey outline shown while dragging (for items and animals).
 */
export class ItemLayer {
  private readonly ghost: Phaser.GameObjects.Graphics;
  private readonly ghostLabel: Phaser.GameObjects.Text;
  private readonly views = new Map<number, ItemView>();
  private readonly reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /** False until the first render, so a saved zoo appears at once and only new changes play out. */
  private ready = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.ghost = scene.add.graphics().setDepth(DEPTH.ghost);
    this.ghostLabel = createLabel(scene, 0, 0, '', 0).setDepth(DEPTH.ghost).setVisible(false);
  }

  /** Updates every item. `movingId` is drawn faded, because it is being dragged elsewhere. */
  render(zoo: Zoo, movingId?: number): void {
    const present = new Set<number>();
    for (const item of zoo.items) {
      const feature = getFeature(item.kind);
      if (!feature) continue;
      present.add(item.id);

      const signature = `${item.kind}|${item.material ?? ''}`;
      let view = this.views.get(item.id);
      if (view && view.signature !== signature) {
        this.destroyView(view);
        this.views.delete(item.id);
        view = undefined;
      }
      if (!view) {
        view = this.createView(item, feature, signature, this.ready);
        this.views.set(item.id, view);
      }
      view.container
        .setPosition(item.col * GRID.squareSize, item.row * GRID.squareSize)
        .setAlpha(item.id === movingId ? ITEM_STYLE.movingAlpha : 1);
    }

    for (const [id, view] of this.views) {
      if (present.has(id)) continue;
      this.destroyView(view);
      this.views.delete(id);
    }
    this.ready = true;
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

  private destroyView(view: ItemView): void {
    for (const tween of view.tweens) tween.stop();
    view.container.destroy();
  }

  private createView(item: PlacedItem, feature: PlaceableFeature, signature: string, animate: boolean): ItemView {
    const scene = this.scene;
    const inset = ITEM_STYLE.inset;
    const width = feature.size[0] * GRID.squareSize;
    const height = feature.size[1] * GRID.squareSize;

    const check = item.material ? checkMaterial(item.kind, item.material) : null;
    const visual = check?.missing ? (RESULT_VISUAL[check.missing] ?? null) : null;
    const look: Look = {
      feature,
      material: item.material ?? null,
      visual,
      progress: 1,
      width: width - inset * 2,
      height: height - inset * 2,
    };

    // The body is centred on the item's top edge, so a swing can sway from the top.
    const graphics = scene.add.graphics().setPosition(-width / 2, 0);
    const materialName = item.material ? getMaterial(item.material)?.label : undefined;
    const label = createLabel(
      scene,
      0,
      height / 2,
      materialName ? `${feature.label}\n${materialName}` : feature.label,
      width,
    );
    const body = scene.add.container(width / 2, 0, [graphics, label]);
    const parts: Phaser.GameObjects.GameObject[] = [body];
    if (check?.missing) {
      const badge = this.makeBadge(width, check.missing);
      if (badge) parts.push(badge);
    }
    const container = scene.add
      .container(0, 0, parts)
      .setDepth(DEPTH.items + (feature.placeOn ? 0.1 : 0));

    const tweens: Phaser.Tweens.Tween[] = [];
    const plays = visual === 'drain' || visual === 'sink' || visual === 'fall' || visual === 'light';
    if (animate && plays && !this.reduceMotion) {
      look.progress = 0;
      tweens.push(
        scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: RESULT_STYLE.animateMs,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            look.progress = tween.getValue() ?? 1;
            drawBody(graphics, look);
          },
        }),
      );
    }
    drawBody(graphics, look);

    // A swing that suits its job gently sways.
    if (feature.mustBe.flexible === true && check?.works && !this.reduceMotion) {
      tweens.push(
        scene.tweens.add({
          targets: body,
          angle: { from: -RESULT_STYLE.swayDegrees, to: RESULT_STYLE.swayDegrees },
          duration: RESULT_STYLE.swayMs,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        }),
      );
    }

    return { container, signature, tweens };
  }

  /** A round badge in the corner showing the property the material is missing (e.g. 💧). */
  private makeBadge(itemWidth: number, propertyId: string): Phaser.GameObjects.Container | null {
    const icon = PROPERTIES.find((p) => p.id === propertyId)?.icon;
    if (!icon) return null;
    const radius = Math.min(RESULT_STYLE.badgeRadius, itemWidth / 4);

    const shape = this.scene.add.graphics();
    shape.fillStyle(RESULT_STYLE.badgeFill, 1);
    shape.fillCircle(0, 0, radius);
    shape.lineStyle(RESULT_STYLE.badgeBorderWidth, RESULT_STYLE.badgeBorder, 1);
    shape.strokeCircle(0, 0, radius);
    const symbol = createBubbleText(this.scene, icon, RESULT_STYLE.badgeFontSize * (radius / RESULT_STYLE.badgeRadius), '#1e2a30');

    return this.scene.add.container(itemWidth - radius - 1, radius + 1, [shape, symbol]);
  }
}

/** Draws one item's picture at its current progress. */
function drawBody(g: Phaser.GameObjects.Graphics, look: Look): void {
  g.clear();
  g.setAlpha(1);
  const { feature, width: w, height: h } = look;
  const x = ITEM_STYLE.inset;
  const y = ITEM_STYLE.inset;
  const style: PaintStyle = look.material
    ? (MATERIAL_STYLE[look.material] ?? FALLBACK_PAINT_STYLE)
    : { colour: TAB_COLOURS[feature.tab] ?? ITEM_STYLE.fallbackColour, pattern: 'none', patternColour: ITEM_STYLE.border };

  // Which picture to draw depends on what the job needs (from the data file), not on the item's name.
  if (feature.mustBe.waterproof === true) {
    drawWaterHolder(g, look, x, y, w, h, style);
  } else if (feature.mustBe.floats === true) {
    drawIsland(g, look, x, y, w, h, style);
  } else if (feature.mustBe.strong === true) {
    drawHut(g, look, x, y, w, h, style);
  } else if (feature.mustBe.transparent === false) {
    drawShade(g, look, x, y, w, h, style);
  } else if (feature.mustBe.flexible === true) {
    drawSwing(g, x, y, w, h, style);
  } else {
    drawBlock(g, x, y, w, h, style);
    outline(g, x, y, w, h);
  }

  // A gentle dashed outline marks a material that does not suit its job.
  if (look.visual) {
    g.lineStyle(RESULT_STYLE.badgeBorderWidth, RESULT_STYLE.badgeBorder, 1);
    dashedRect(g, x - 3, y - 3, w + 6, h + 6, RESULT_STYLE.problemDash, RESULT_STYLE.problemGap);
  }
}

function outline(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.lineStyle(ITEM_STYLE.borderWidth, ITEM_STYLE.border, 1);
  g.strokeRect(x, y, w, h);
}

/** Pool, pond or bowl: a rim of the chosen material round the water. A leaky one drains and stays empty. */
function drawWaterHolder(
  g: Phaser.GameObjects.Graphics,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  style: PaintStyle,
): void {
  drawBlock(g, x, y, w, h, style);
  outline(g, x, y, w, h);

  const rim = Math.min(RESULT_STYLE.rim, w / 4, h / 4);
  const ix = x + rim;
  const iy = y + rim;
  const iw = w - rim * 2;
  const ih = h - rim * 2;
  g.fillStyle(RESULT_STYLE.dry, 1);
  g.fillRect(ix, iy, iw, ih);

  const level = look.visual === 'drain' ? 1 - look.progress : 1;
  if (level > 0.02) {
    const wetW = iw * level;
    const wetH = ih * level;
    g.fillStyle(RESULT_STYLE.water, 1);
    g.fillRect(ix + (iw - wetW) / 2, iy + (ih - wetH) / 2, wetW, wetH);
    g.lineStyle(2, RESULT_STYLE.waterLine, 1);
    g.lineBetween(ix + wetW * 0.15 + (iw - wetW) / 2, iy + ih * 0.35, ix + wetW * 0.55 + (iw - wetW) / 2, iy + ih * 0.35);
    g.lineBetween(ix + wetW * 0.4 + (iw - wetW) / 2, iy + ih * 0.65, ix + wetW * 0.85 + (iw - wetW) / 2, iy + ih * 0.65);
  } else {
    // Empty: cracks in the dry floor.
    g.lineStyle(2, RESULT_STYLE.crack, 1);
    g.lineBetween(ix + iw * 0.2, iy + ih * 0.3, ix + iw * 0.5, iy + ih * 0.55);
    g.lineBetween(ix + iw * 0.5, iy + ih * 0.55, ix + iw * 0.8, iy + ih * 0.4);
    g.lineBetween(ix + iw * 0.5, iy + ih * 0.55, ix + iw * 0.45, iy + ih * 0.85);
  }
  g.lineStyle(2, ITEM_STYLE.border, 1);
  g.strokeRect(ix, iy, iw, ih);
}

/** Floating island: a block on the water. One that does not float sinks, fades and makes ripples. */
function drawIsland(
  g: Phaser.GameObjects.Graphics,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  style: PaintStyle,
): void {
  const sink = look.visual === 'sink' ? look.progress : 0;
  const scale = 1 - 0.3 * sink;
  const bw = w * scale;
  const bh = h * scale;
  const bx = x + (w - bw) / 2;
  const by = y + (h - bh) / 2 + sink * h * 0.12;

  drawBlock(g, bx, by, bw, bh, style);
  outline(g, bx, by, bw, bh);
  if (sink > 0) {
    g.lineStyle(3, RESULT_STYLE.waterLine, 1);
    g.strokeEllipse(x + w / 2, y + h / 2, w * (0.9 + 0.2 * sink), h * (0.9 + 0.2 * sink));
    g.setAlpha(1 - 0.5 * sink);
  }
}

/** Hut: a block with a ridge down the middle. One that is not strong collapses into a heap. */
function drawHut(
  g: Phaser.GameObjects.Graphics,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  style: PaintStyle,
): void {
  const fall = look.visual === 'fall' ? look.progress : 0;
  const bh = h * (1 - 0.55 * fall);
  const by = y + (h - bh);

  drawBlock(g, x, by, w, bh, style);
  outline(g, x, by, w, bh);
  g.lineStyle(4, style.patternColour, 1);
  if (fall < 0.5) {
    g.lineBetween(x + w / 2, by, x + w / 2, by + bh);
  }
  if (fall > 0) {
    // Fallen planks lying about.
    g.lineStyle(4, style.patternColour, fall);
    g.lineBetween(x + w * 0.1, by + bh * 0.3, x + w * 0.45, by + bh * 0.7);
    g.lineBetween(x + w * 0.9, by + bh * 0.25, x + w * 0.6, by + bh * 0.8);
    g.lineBetween(x + w * 0.3, by + bh * 0.85, x + w * 0.75, by + bh * 0.5);
  }
}

/** Shade cover: a block with a shadow under it. Glass is transparent, so sun shines straight through. */
function drawShade(
  g: Phaser.GameObjects.Graphics,
  look: Look,
  x: number,
  y: number,
  w: number,
  h: number,
  style: PaintStyle,
): void {
  g.fillStyle(RESULT_STYLE.shadow, RESULT_STYLE.shadowAlpha);
  g.fillRect(x + 6, y + 6, w, h);
  drawBlock(g, x, y, w, h, style);
  outline(g, x, y, w, h);

  if (look.visual === 'light') {
    const p = look.progress;
    g.fillStyle(RESULT_STYLE.sun, RESULT_STYLE.sunAlpha * p);
    g.fillRect(x, y, w, h);
    g.lineStyle(4, RESULT_STYLE.sun, p);
    for (const k of [0.25, 0.5, 0.75]) {
      g.lineBetween(x + w * k - w * 0.2, y - 4, x + w * k + w * 0.2, y + h + 4);
    }
  }
}

/** Swing: a frame with a seat of the chosen material. A swing that is not flexible just hangs still. */
function drawSwing(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, style: PaintStyle): void {
  g.lineStyle(4, ITEM_STYLE.border, 1);
  g.lineBetween(x, y + 2, x + w, y + 2);
  g.lineBetween(x + w * 0.2, y + 2, x + w * 0.2, y + h * 0.7);
  g.lineBetween(x + w * 0.8, y + 2, x + w * 0.8, y + h * 0.7);
  drawBlock(g, x + w * 0.1, y + h * 0.65, w * 0.8, h * 0.28, style);
  outline(g, x + w * 0.1, y + h * 0.65, w * 0.8, h * 0.28);
}
