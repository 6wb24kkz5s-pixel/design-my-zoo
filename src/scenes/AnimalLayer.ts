import Phaser from 'phaser';
import { iconScale, NAME_TAG_MIN_SQUARE_PX, usesIcon } from '../art/lod';
import { spriteName } from '../art/names';
import { ART_KEY } from '../art/phaser';
import { ANIMAL_STYLE, EMOTE, GRID, ITEM_STYLE } from '../config';
import { BUBBLES, featureCatalogue, getAnimal, type Animal } from '../data/content';
import { needsWater } from '../logic/animals';
import type { Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { createBubbleText, createLabel } from './labels';

interface AnimalView {
  /** Sits at the middle of the animal, so scaling it for a zoomed-out icon keeps it in place. */
  container: Phaser.GameObjects.Container;
  picture: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  /** A small ❤️ that shows while the animal is happy. */
  badge: Phaser.GameObjects.Text;
  /** The animal's name, shown only when the plot is zoomed in enough to read it. */
  nameTag: Phaser.GameObjects.Text;
  id: string;
  width: number;
  height: number;
  smallestSide: number;
}

/** How happy an animal is, as far as the plot needs to know. */
export interface Mood {
  /** How many of its five hearts are full. */
  count: number;
  happy: boolean;
}

/**
 * Draws the animals from their pictures, gently bobbing. A fish that is not in water gets a 💧 speech
 * bubble, a happy animal gets a ❤️ badge, and an emote floats up when something changes its hearts.
 * Zoomed out, animals grow into bold icons; zoomed in, a small name tag appears under each one.
 * Views are kept between redraws, so the bob does not restart every time something changes.
 */
export class AnimalLayer {
  private readonly views = new Map<string, AnimalView>();
  private readonly hearts = new Map<string, number>();
  private readonly reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private created = 0;
  private squarePx: number = GRID.squareSize;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Updates every animal. `movingId` is drawn faded, because it is being dragged elsewhere. */
  render(zoo: Zoo, movingId?: string): void {
    const present = new Set<string>();
    for (const animal of zoo.animals) {
      const info = getAnimal(animal.animalId);
      if (!info) continue;
      present.add(animal.animalId);

      const view = this.views.get(animal.animalId) ?? this.create(info);
      view.container.setPosition(
        animal.col * GRID.squareSize + view.width / 2,
        animal.row * GRID.squareSize + view.height / 2,
      );
      view.container.setAlpha(animal.animalId === movingId ? ITEM_STYLE.movingAlpha : 1);
      view.bubble.setVisible(needsWater(zoo, featureCatalogue, animal));
    }

    for (const [id, view] of this.views) {
      if (present.has(id)) continue;
      view.container.destroy();
      this.views.delete(id);
      this.hearts.delete(id);
    }
  }

  /** The plot was zoomed: animals grow into bold icons when tiny, and show their names when big. */
  setSquarePx(squarePx: number): void {
    this.squarePx = squarePx;
    for (const view of this.views.values()) this.applyZoom(view);
  }

  private applyZoom(view: AnimalView): void {
    const scale = iconScale(this.squarePx, view.smallestSide);
    view.container.setScale(scale);
    const normal = spriteName.animal(view.id);
    view.picture.setFrame(usesIcon(scale) ? spriteName.icon(normal) : normal);
    view.nameTag.setVisible(this.squarePx >= NAME_TAG_MIN_SQUARE_PX);
  }

  /**
   * Shows who is happy, and floats an emote above an animal whose hearts just changed:
   * 😊 for a heart gained, 😟 for one lost, 🥰 when it has just become happy. The first
   * time an animal is seen (when the game loads, or it is added) nothing floats.
   */
  setMoods(moods: ReadonlyMap<string, Mood>): void {
    for (const [id, view] of this.views) {
      const mood = moods.get(id);
      if (!mood) continue;
      view.badge.setVisible(mood.happy);

      const before = this.hearts.get(id);
      if (before !== undefined && before !== mood.count) {
        this.emote(view, mood.happy ? EMOTE.becameHappy : mood.count > before ? EMOTE.gain : EMOTE.lose);
      }
      this.hearts.set(id, mood.count);
    }
  }

  private emote(view: AnimalView, face: string): void {
    const x = view.container.x;
    const y = view.container.y - view.height / 2 - 6;
    const text = createBubbleText(this.scene, face, EMOTE.fontSize, '#1e2a30').setPosition(x, y).setDepth(DEPTH.animals + 0.5);
    this.scene.tweens.add({
      targets: text,
      y: this.reduceMotion ? y : y - EMOTE.rise,
      alpha: { from: 1, to: 0 },
      duration: EMOTE.ms,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private create(animal: Animal): AnimalView {
    const width = animal.size[0] * GRID.squareSize;
    const height = animal.size[1] * GRID.squareSize;

    const picture = this.scene.add.image(0, 0, ART_KEY, spriteName.animal(animal.id));
    const nameTag = createLabel(this.scene, 0, height / 2 + 4, animal.label, width + 40)
      .setOrigin(0.5, 0)
      .setColor('#ffffff')
      .setStroke('#1e2a30', 4)
      .setVisible(false);
    const body = this.scene.add.container(0, 0, [picture]);
    const bubble = this.makeBubble(height);
    const badge = createBubbleText(this.scene, EMOTE.happyBadge, EMOTE.badgeFontSize, '#1e2a30')
      .setPosition(width / 2 - 6, -height / 2 + 6)
      .setVisible(false);
    const container = this.scene.add.container(0, 0, [body, nameTag, bubble, badge]).setDepth(DEPTH.animals);

    if (!this.reduceMotion) {
      this.scene.tweens.add({
        targets: body,
        y: -ANIMAL_STYLE.bobHeight,
        duration: ANIMAL_STYLE.bobMs / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: this.created * ANIMAL_STYLE.bobStaggerMs,
      });
    }
    this.created++;

    const view: AnimalView = {
      container,
      picture,
      bubble,
      badge,
      nameTag,
      id: animal.id,
      width,
      height,
      smallestSide: Math.min(animal.size[0], animal.size[1]),
    };
    this.views.set(animal.id, view);
    this.applyZoom(view);
    return view;
  }

  /** A speech bubble above the animal, with its icon, from the messages in the data file. */
  private makeBubble(animalHeight: number): Phaser.GameObjects.Container {
    const { icon, text } = BUBBLES.needWater;
    const words = createBubbleText(this.scene, `${icon} ${text}`, ANIMAL_STYLE.bubbleFontSize, ANIMAL_STYLE.bubbleText);
    const w = words.width + ANIMAL_STYLE.bubblePadX * 2;
    const h = words.height + ANIMAL_STYLE.bubblePadY * 2;
    const tail = 8;

    const shape = this.scene.add.graphics();
    shape.fillStyle(ANIMAL_STYLE.bubbleFill, 1);
    shape.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    shape.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + tail);
    shape.lineStyle(ANIMAL_STYLE.bubbleBorderWidth, ANIMAL_STYLE.bubbleBorder, 1);
    shape.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    return this.scene.add
      .container(0, -(animalHeight / 2 + ANIMAL_STYLE.bubbleGap + h / 2 + tail), [shape, words])
      .setVisible(false);
  }
}
