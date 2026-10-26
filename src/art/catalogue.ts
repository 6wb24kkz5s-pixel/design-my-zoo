// Every sprite in the game, made from the data file: if a ground type, feature, food, animal or
// material is added to char-and-properties.json, the tests fail until it has a picture.

import { ITEM_PICTURE } from '../config';
import {
  ALL_MATERIALS,
  ANIMALS,
  FENCE_MATERIALS,
  GROUND_TYPES,
  PLACEABLE_FEATURES,
  ROOF_MATERIALS,
} from '../data/content';
import { GROUND_VARIANTS, spriteName } from './names';
import type { Palette } from './palette';
import type { Pixels } from './pixels';
import { ANIMAL_DRAWINGS, ANIMAL_POSES } from './sprites/animals';
import * as F from './sprites/features';
import { groundTile, pathTile, plotTile, type Drawing } from './sprites/ground';
import { fenceTile, materialSwatch, roofHatch, roofTile } from './sprites/materials';

export interface SpriteDef {
  name: string;
  pixels: Pixels;
  /** Colours specific to this sprite (the material colours, say). The shared palette covers the rest. */
  palette: Palette;
}

/** Features and foods that look the same whatever they are made of. */
const PLAIN_ITEMS: Readonly<Record<string, () => Drawing>> = {
  water_plants: F.waterPlants,
  mist_sprayer: F.mistSprayer,
  tall_tree: F.tallTree,
  bushes: F.bushes,
  hollow_log: F.hollowLog,
  rock_cave: F.rockCave,
  fish_food: F.fishFood,
  insects: F.insects,
  seeds_fruit: F.seedsFruit,
  shrimp: F.shrimp,
  meat: F.meat,
  mice: F.mice,
  hay: F.hay,
  rotting_fruit: F.rottingFruit,
};

/** Padding round an outlined icon, in sprite pixels. */
export const ICON_MARGIN = 2;

/** Every sprite name the game will ask for, worked out from the data file. */
export function requiredSpriteNames(): string[] {
  const names: string[] = [spriteName.plot, spriteName.path, spriteName.roofHatch, spriteName.ripple];
  for (const g of GROUND_TYPES) for (let v = 0; v < GROUND_VARIANTS; v++) names.push(spriteName.ground(g.id, v));
  for (const m of ALL_MATERIALS) names.push(spriteName.material(m.id));
  for (const m of FENCE_MATERIALS) names.push(spriteName.fence(m.id), spriteName.fence(m.id, true));
  for (const m of ROOF_MATERIALS) names.push(spriteName.roof(m.id));
  for (const a of ANIMALS) {
    names.push(spriteName.animal(a.id));
    if (ANIMAL_POSES[a.id]) names.push(spriteName.animalPose(a.id));
  }
  for (const f of PLACEABLE_FEATURES) {
    if (f.materialIds.length === 0) {
      names.push(spriteName.item(f.id));
      continue;
    }
    for (const m of f.materialIds) names.push(spriteName.item(f.id, m));
    switch (ITEM_PICTURE[f.id]) {
      case 'waterHolder':
        names.push(spriteName.water(f.id), spriteName.cracks(f.id));
        break;
      case 'hut':
        for (const m of f.materialIds) names.push(spriteName.rubble(m));
        break;
      case 'shade':
        names.push(spriteName.shadow, spriteName.sun);
        break;
      case 'swing':
        for (const m of f.materialIds) names.push(spriteName.swingBroken(m));
        break;
      default:
    }
  }
  return [...new Set(names)];
}

/** Draws every sprite. Pictures that are missing are simply left out, and the tests say which. */
export function buildSprites(): SpriteDef[] {
  const sprites: SpriteDef[] = [];
  const add = (name: string, drawing: Drawing) => {
    if (!sprites.some((s) => s.name === name)) sprites.push({ name, pixels: drawing.pixels, palette: drawing.palette });
  };

  for (const g of GROUND_TYPES) for (let v = 0; v < GROUND_VARIANTS; v++) add(spriteName.ground(g.id, v), groundTile(g.id, v));
  add(spriteName.plot, plotTile());
  add(spriteName.path, pathTile());
  for (const m of ALL_MATERIALS) add(spriteName.material(m.id), materialSwatch(m.id));
  for (const m of FENCE_MATERIALS) {
    add(spriteName.fence(m.id), fenceTile(m.id, false));
    add(spriteName.fence(m.id, true), fenceTile(m.id, true));
  }
  for (const m of ROOF_MATERIALS) add(spriteName.roof(m.id), roofTile(m.id));
  add(spriteName.roofHatch, roofHatch());
  add(spriteName.ripple, F.ripple());

  for (const a of ANIMALS) {
    const draw = ANIMAL_DRAWINGS[a.id];
    if (draw) add(spriteName.animal(a.id), draw());
    const pose = ANIMAL_POSES[a.id];
    if (pose) add(spriteName.animalPose(a.id), pose());
  }

  for (const f of PLACEABLE_FEATURES) {
    const plain = PLAIN_ITEMS[f.id];
    if (plain && f.materialIds.length === 0) {
      add(spriteName.item(f.id), plain());
      continue;
    }
    const [squaresWide, squaresHigh] = f.size;
    switch (ITEM_PICTURE[f.id]) {
      case 'waterHolder':
        for (const m of f.materialIds) add(spriteName.item(f.id, m), F.waterHolderBase(squaresWide, squaresHigh, m));
        add(spriteName.water(f.id), F.waterFill(squaresWide, squaresHigh));
        add(spriteName.cracks(f.id), F.waterCracks(squaresWide, squaresHigh));
        break;
      case 'island':
        for (const m of f.materialIds) add(spriteName.item(f.id, m), F.islandSprite(m));
        break;
      case 'hut':
        for (const m of f.materialIds) {
          add(spriteName.item(f.id, m), F.hutSprite(m));
          add(spriteName.rubble(m), F.rubbleSprite(m));
        }
        break;
      case 'shade':
        for (const m of f.materialIds) add(spriteName.item(f.id, m), F.shadeSprite(m));
        add(spriteName.shadow, F.shadowSprite());
        add(spriteName.sun, F.sunSprite());
        break;
      case 'swing':
        for (const m of f.materialIds) {
          add(spriteName.item(f.id, m), F.swingSprite(m, false));
          add(spriteName.swingBroken(m), F.swingSprite(m, true));
        }
        break;
      default:
    }
  }

  // Zoomed out, animals and items are drawn bigger and with a pale halo, so they read as clear icons.
  for (const sprite of [...sprites]) {
    if (!sprite.name.startsWith('animal:') && !sprite.name.startsWith('item:')) continue;
    const halo = sprite.pixels.padded(ICON_MARGIN).outline('w').outline('w');
    sprites.push({ name: spriteName.icon(sprite.name), pixels: halo, palette: sprite.palette });
  }
  return sprites;
}
