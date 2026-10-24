import Phaser from 'phaser';
import { ITEM_STYLE } from '../config';
import { PIXEL_RATIO } from '../display';

/** Extra sharpness for labels, so they stay readable when zoomed in. */
const LABEL_RESOLUTION = PIXEL_RATIO * 3;

const FONT = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

/** A short bold name on a block, wrapped to `wrapWidth` and centred on (x, y). */
export function createLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  wrapWidth: number,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${ITEM_STYLE.labelSize}px`,
      fontStyle: 'bold',
      color: ITEM_STYLE.labelColour,
      stroke: ITEM_STYLE.labelStroke,
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: Math.max(wrapWidth - ITEM_STYLE.inset * 2, 1) },
    })
    .setOrigin(0.5)
    .setResolution(LABEL_RESOLUTION);
}

/** Text for a speech bubble: dark on a light bubble, with emoji drawn sharply. */
export function createBubbleText(scene: Phaser.Scene, text: string, fontSize: number, colour: string): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, { fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: 'bold', color: colour })
    .setOrigin(0.5)
    .setResolution(LABEL_RESOLUTION);
}
