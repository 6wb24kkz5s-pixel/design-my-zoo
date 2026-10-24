import Phaser from 'phaser';
import { ANIMAL_STYLE, GRID, ITEM_STYLE } from '../config';
import { BUBBLES, featureCatalogue, getAnimal, type Animal } from '../data/content';
import { needsWater } from '../logic/animals';
import type { Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { createBubbleText, createLabel } from './labels';

interface AnimalView {
  container: Phaser.GameObjects.Container;
  bubble: Phaser.GameObjects.Container;
}

/**
 * Draws the animals as placeholder blocks that gently bob. A fish that is not
 * in water gets a 💧 speech bubble. Views are kept between redraws, so the bob
 * does not restart every time something changes.
 */
export class AnimalLayer {
  private readonly views = new Map<string, AnimalView>();
  private readonly reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private created = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Updates every animal. `movingId` is drawn faded, because it is being dragged elsewhere. */
  render(zoo: Zoo, movingId?: string): void {
    const present = new Set<string>();
    for (const animal of zoo.animals) {
      const info = getAnimal(animal.animalId);
      if (!info) continue;
      present.add(animal.animalId);

      const view = this.views.get(animal.animalId) ?? this.create(info);
      view.container.setPosition(animal.col * GRID.squareSize, animal.row * GRID.squareSize);
      view.container.setAlpha(animal.animalId === movingId ? ITEM_STYLE.movingAlpha : 1);
      view.bubble.setVisible(needsWater(zoo, featureCatalogue, animal));
    }

    for (const [id, view] of this.views) {
      if (present.has(id)) continue;
      view.container.destroy();
      this.views.delete(id);
    }
  }

  private create(animal: Animal): AnimalView {
    const width = animal.size[0] * GRID.squareSize;
    const height = animal.size[1] * GRID.squareSize;
    const inset = ANIMAL_STYLE.inset;

    const block = this.scene.add.graphics();
    block.fillStyle(ANIMAL_STYLE.colour, 1);
    block.fillRoundedRect(inset, inset, width - inset * 2, height - inset * 2, 10);
    block.lineStyle(ANIMAL_STYLE.borderWidth, ANIMAL_STYLE.border, 1);
    block.strokeRoundedRect(inset, inset, width - inset * 2, height - inset * 2, 10);

    const label = createLabel(this.scene, width / 2, height / 2, animal.label, width)
      .setColor(ANIMAL_STYLE.labelColour)
      .setStroke('#fff1c9', 3);

    const body = this.scene.add.container(0, 0, [block, label]);
    const bubble = this.makeBubble(width);
    const container = this.scene.add.container(0, 0, [body, bubble]).setDepth(DEPTH.animals);

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

    const view = { container, bubble };
    this.views.set(animal.id, view);
    return view;
  }

  /** A speech bubble above the animal, with its icon, from the messages in the data file. */
  private makeBubble(animalWidth: number): Phaser.GameObjects.Container {
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
      .container(animalWidth / 2, -(ANIMAL_STYLE.bubbleGap + h / 2 + tail), [shape, words])
      .setVisible(false);
  }
}
