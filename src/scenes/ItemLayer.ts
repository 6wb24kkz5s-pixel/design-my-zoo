import Phaser from 'phaser';
import { iconScale, usesIcon } from '../art/lod';
import { spriteName } from '../art/names';
import { ART_KEY } from '../art/phaser';
import { GHOST_STYLE, GRID, ITEM_PICTURE, ITEM_STYLE, RESULT_STYLE, RESULT_VISUAL, type ResultVisual } from '../config';
import { checkMaterial, getFeature, PROPERTIES, type PlaceableFeature } from '../data/content';
import type { PlacedItem, Size, Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { dashedRect } from './draw';
import { createBubbleText, createLabel } from './labels';

interface ItemView {
  /** Sits at the middle of the item, so scaling it for a zoomed-out icon keeps it in place. */
  container: Phaser.GameObjects.Container;
  /** What the picture was made from. When it changes (a new material), the picture is made again. */
  signature: string;
  tweens: Phaser.Tweens.Tween[];
  /** The width and height of the item, in world pixels. */
  width: number;
  height: number;
  /** For a plain one-picture item: the picture, and its normal and zoomed-out frames. */
  plain: { image: Phaser.GameObjects.Image; normal: string; icon: string } | null;
  /** The smaller side of the item, in squares. */
  smallestSide: number;
}

/** Animation timings and tweens read this to know what to draw. */
interface Look {
  visual: ResultVisual | null;
}

/**
 * Draws placed items from the pictures. A material that does not suit its job gets a picture of what
 * goes wrong (a pool drains, an island sinks, a hut falls down, sun shines through a shade cover,
 * a swing breaks) and a badge showing the property it is missing.
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
  /** The width of one grid square on screen, so pictures can grow into clear icons when zoomed out. */
  private squarePx: number = GRID.squareSize;

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
        .setPosition(item.col * GRID.squareSize + view.width / 2, item.row * GRID.squareSize + view.height / 2)
        .setAlpha(item.id === movingId ? ITEM_STYLE.movingAlpha : 1);
    }

    for (const [id, view] of this.views) {
      if (present.has(id)) continue;
      this.destroyView(view);
      this.views.delete(id);
    }
    this.ready = true;
  }

  /** The plot was zoomed: small pictures grow into bold icons when they would be tiny on screen. */
  setSquarePx(squarePx: number): void {
    this.squarePx = squarePx;
    for (const view of this.views.values()) this.applyIconScale(view);
  }

  private applyIconScale(view: ItemView): void {
    const scale = iconScale(this.squarePx, view.smallestSide);
    view.container.setScale(scale);
    if (view.plain) view.plain.image.setFrame(usesIcon(scale) ? view.plain.icon : view.plain.normal);
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
    const width = feature.size[0] * GRID.squareSize;
    const height = feature.size[1] * GRID.squareSize;
    const check = item.material ? checkMaterial(item.kind, item.material) : null;
    const visual = check?.missing ? (RESULT_VISUAL[check.missing] ?? null) : null;
    const look: Look = { visual };
    const picture = ITEM_PICTURE[feature.id];
    const material = item.material;

    const parts: Phaser.GameObjects.GameObject[] = [];
    const tweens: Phaser.Tweens.Tween[] = [];
    const playing = animate && visual !== null && !this.reduceMotion;
    const image = (frame: string, x = 0, y = 0) => scene.add.image(x, y, ART_KEY, frame);
    const tween = (config: Phaser.Types.Tweens.TweenBuilderConfig) => tweens.push(scene.tweens.add(config));
    const progress = (onUpdate: (value: number) => void, onDone?: () => void) =>
      tweens.push(
        scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: RESULT_STYLE.animateMs,
          ease: 'Sine.easeInOut',
          onUpdate: (t) => onUpdate(t.getValue() ?? 1),
          onComplete: onDone,
        }),
      );

    let plain: ItemView['plain'] = null;

    if (picture === 'waterHolder' && material) {
      // The rim and floor, then the water on top. A leaky one drains until only cracks are left.
      parts.push(image(spriteName.item(feature.id, material)));
      const water = image(spriteName.water(feature.id));
      const cracks = image(spriteName.cracks(feature.id)).setVisible(false);
      parts.push(water, cracks);
      const level = (value: number) => {
        water.setScale(Math.max(value, 0.001)).setVisible(value > 0.02);
        cracks.setVisible(value <= 0.02);
      };
      if (look.visual === 'drain') {
        if (playing) {
          level(1);
          progress((p) => level(1 - p));
        } else {
          level(0);
        }
      }
    } else if (picture === 'island' && material) {
      const raft = image(spriteName.item(feature.id, material));
      const ripples = image(spriteName.ripple).setVisible(false).setScale(1.6);
      parts.push(ripples, raft);
      const sink = (p: number) => {
        raft.setScale(1 - 0.3 * p).setAlpha(1 - 0.5 * p).setY(p * height * 0.12);
        ripples.setVisible(p > 0).setAlpha(p);
      };
      if (look.visual === 'sink') {
        if (playing) {
          progress(sink);
        } else {
          sink(1);
        }
      }
    } else if (picture === 'hut' && material) {
      // The hut is anchored at its base, so it can collapse downwards into a heap.
      const hut = image(spriteName.item(feature.id, material), 0, height / 2).setOrigin(0.5, 1);
      const rubble = image(spriteName.rubble(material), 0, height / 2).setOrigin(0.5, 1).setAlpha(0);
      parts.push(hut, rubble);
      const fall = (p: number) => {
        hut.setScale(1, 1 - 0.55 * p).setAlpha(1 - p * 0.9);
        rubble.setAlpha(p);
      };
      if (look.visual === 'fall') {
        if (playing) {
          progress(fall);
        } else {
          fall(1);
        }
      }
    } else if (picture === 'shade' && material) {
      const sun = image(spriteName.sun).setAlpha(0);
      parts.push(image(spriteName.shadow), image(spriteName.item(feature.id, material)), sun);
      if (look.visual === 'light') {
        if (playing) {
          progress((p) => sun.setAlpha(p));
        } else {
          sun.setAlpha(1);
        }
      }
    } else if (picture === 'swing' && material) {
      // A swing that is strong enough gently sways from its top bar. One that is not breaks.
      const broken = look.visual === 'fall';
      const frame = broken && !playing ? spriteName.swingBroken(material) : spriteName.item(feature.id, material);
      const swing = image(frame, 0, -height / 2).setOrigin(0.5, 0);
      parts.push(swing);
      if (broken && playing) {
        progress(
          () => undefined,
          () => swing.setFrame(spriteName.swingBroken(material)),
        );
      } else if (!broken && !this.reduceMotion) {
        tween({
          targets: swing,
          angle: { from: -RESULT_STYLE.swayDegrees, to: RESULT_STYLE.swayDegrees },
          duration: RESULT_STYLE.swayMs,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      // Everything else is one picture. Zoomed out, it swaps to a bolder, outlined version.
      const normal = spriteName.item(feature.id, material);
      const icon = spriteName.icon(normal);
      plain = { image: image(normal), normal, icon };
      parts.push(plain.image);
    }

    if (check?.missing) {
      const badge = this.makeBadge(width, height, check.missing);
      if (badge) parts.push(badge);
    }

    const container = scene.add
      .container(0, 0, parts)
      .setDepth(DEPTH.items + (feature.placeOn ? 0.1 : 0));
    const view: ItemView = {
      container,
      signature,
      tweens,
      width,
      height,
      plain,
      smallestSide: Math.min(feature.size[0], feature.size[1]),
    };
    this.applyIconScale(view);
    return view;
  }

  /** A round badge in the corner showing the property the material is missing (e.g. 💧). */
  private makeBadge(itemWidth: number, itemHeight: number, propertyId: string): Phaser.GameObjects.Container | null {
    const icon = PROPERTIES.find((p) => p.id === propertyId)?.icon;
    if (!icon) return null;
    const radius = Math.min(RESULT_STYLE.badgeRadius, itemWidth / 4);

    const shape = this.scene.add.graphics();
    shape.fillStyle(RESULT_STYLE.badgeFill, 1);
    shape.fillCircle(0, 0, radius);
    shape.lineStyle(RESULT_STYLE.badgeBorderWidth, RESULT_STYLE.badgeBorder, 1);
    shape.strokeCircle(0, 0, radius);
    const symbol = createBubbleText(this.scene, icon, RESULT_STYLE.badgeFontSize * (radius / RESULT_STYLE.badgeRadius), '#1e2a30');

    return this.scene.add.container(itemWidth / 2 - radius - 1, -itemHeight / 2 + radius + 1, [shape, symbol]);
  }
}
