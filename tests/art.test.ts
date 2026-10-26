import { describe, expect, it } from 'vitest';
import { buildSprites, ICON_MARGIN, requiredSpriteNames, type SpriteDef } from '../src/art/catalogue';
import { iconScale, ICON, usesIcon } from '../src/art/lod';
import { GROUND_VARIANTS, spriteName } from '../src/art/names';
import { colourOf, materialLook, mixHex } from '../src/art/palette';
import { Pixels, seededRandom } from '../src/art/pixels';
import { ANIMALS, PLACEABLE_FEATURES } from '../src/data/content';
import { ITEM_PICTURE } from '../src/config';

const sprites = buildSprites();
const byName = new Map(sprites.map((s) => [s.name, s]));
const SQUARE = 16;

describe('every picture the game needs has been drawn', () => {
  it('has a picture for every ground type, feature, food, animal and material in the data file', () => {
    const missing = requiredSpriteNames().filter((name) => !byName.has(name));
    expect(missing).toEqual([]);
  });

  it('has no picture twice', () => {
    expect(new Set(sprites.map((s) => s.name)).size).toBe(sprites.length);
  });

  it('has a picture for all 12 animals and all 38 placed things', () => {
    expect(ANIMALS).toHaveLength(12);
    expect(sprites.filter((s) => s.name.startsWith('animal:'))).toHaveLength(12);
    expect(sprites.filter((s) => s.name.startsWith('item:'))).toHaveLength(
      PLACEABLE_FEATURES.reduce((sum, f) => sum + Math.max(f.materialIds.length, 1), 0),
    );
  });
});

describe('every picture is drawn properly', () => {
  it('only uses colours that exist', () => {
    for (const sprite of sprites) {
      for (let y = 0; y < sprite.pixels.height; y++) {
        for (let x = 0; x < sprite.pixels.width; x++) {
          expect(() => colourOf(sprite.pixels.get(x, y), sprite.palette), `${sprite.name} at ${x},${y}`).not.toThrow();
        }
      }
    }
  });

  it('is not empty', () => {
    for (const sprite of sprites) expect(sprite.pixels.count(), sprite.name).toBeGreaterThan(3);
  });

  it('has the right size: 16 pixels for each grid square it covers', () => {
    for (const a of ANIMALS) {
      const sprite = byName.get(spriteName.animal(a.id)) as SpriteDef;
      expect([sprite.pixels.width, sprite.pixels.height], a.id).toEqual([a.size[0] * SQUARE, a.size[1] * SQUARE]);
    }
    for (const f of PLACEABLE_FEATURES) {
      const names = f.materialIds.length > 0 ? f.materialIds.map((m) => spriteName.item(f.id, m)) : [spriteName.item(f.id)];
      for (const name of names) {
        const sprite = byName.get(name) as SpriteDef;
        expect([sprite.pixels.width, sprite.pixels.height], name).toEqual([f.size[0] * SQUARE, f.size[1] * SQUARE]);
      }
    }
    const tiles = sprites.filter((s) => /^(ground|fence|roof|material|tile):/.test(s.name));
    expect(tiles.length).toBeGreaterThan(30);
    for (const tile of tiles) expect([tile.pixels.width, tile.pixels.height], tile.name).toEqual([SQUARE, SQUARE]);
  });

  it('makes pool water and cracks to fit inside the rim', () => {
    for (const f of PLACEABLE_FEATURES.filter((p) => ITEM_PICTURE[p.id] === 'waterHolder')) {
      for (const name of [spriteName.water(f.id), spriteName.cracks(f.id)]) {
        const sprite = byName.get(name) as SpriteDef;
        expect([sprite.pixels.width, sprite.pixels.height], name).toEqual([f.size[0] * SQUARE - 8, f.size[1] * SQUARE - 8]);
      }
    }
  });

  it('gives each animal its own picture', () => {
    const drawings = ANIMALS.map((a) => (byName.get(spriteName.animal(a.id)) as SpriteDef).pixels.toRows().join('/'));
    expect(new Set(drawings).size).toBe(ANIMALS.length);
  });

  it('gives animals the same dark outline, so none looks like it belongs to a group', () => {
    for (const a of ANIMALS) {
      const rows = (byName.get(spriteName.animal(a.id)) as SpriteDef).pixels.toRows().join('');
      expect(rows, a.id).toContain('k');
    }
  });
});

describe('materials', () => {
  it('draws a hut, shade cover, pool and the rest differently in every material', () => {
    for (const f of PLACEABLE_FEATURES.filter((p) => p.materialIds.length > 1)) {
      const looks = f.materialIds.map((m) => {
        const sprite = byName.get(spriteName.item(f.id, m)) as SpriteDef;
        return sprite.pixels.toRows().join('/') + JSON.stringify(sprite.palette);
      });
      expect(new Set(looks).size, f.id).toBe(f.materialIds.length);
    }
  });

  it('draws a fence that is not strong cracked, so it looks different', () => {
    for (const material of ['fabric', 'wood', 'glass']) {
      const strong = byName.get(spriteName.fence(material)) as SpriteDef;
      const weak = byName.get(spriteName.fence(material, true)) as SpriteDef;
      expect(weak.pixels.toRows()).not.toEqual(strong.pixels.toRows());
    }
  });

  it('has a look for every material, with light, middle and dark colours', () => {
    const look = materialLook('wood');
    expect(Object.keys(look.palette).sort()).toEqual(['D', 'L', 'M', 'P']);
    expect(look.palette.L).not.toBe(look.palette.D);
  });
});

describe('the zoomed-out icons', () => {
  it('has a bold, outlined icon for every animal and every placed thing', () => {
    for (const sprite of sprites.filter((s) => s.name.startsWith('animal:') || s.name.startsWith('item:'))) {
      const icon = byName.get(spriteName.icon(sprite.name));
      expect(icon, sprite.name).toBeDefined();
      expect(icon?.pixels.width).toBe(sprite.pixels.width + ICON_MARGIN * 2);
      expect(icon?.pixels.height).toBe(sprite.pixels.height + ICON_MARGIN * 2);
      // The halo adds pixels all round the picture.
      expect(icon?.pixels.count()).toBeGreaterThan(sprite.pixels.count());
    }
  });

  it('draws small pictures bigger when the plot is zoomed out, up to a limit', () => {
    expect(iconScale(48, 1)).toBe(1); // full size: no change
    expect(iconScale(20, 1)).toBeCloseTo(ICON.minScreenPx / 20);
    expect(iconScale(4, 1)).toBe(ICON.maxScale); // never more than the limit
    expect(iconScale(10, 3)).toBeCloseTo(26 / 30 < 1 ? 1 : 26 / 30); // a big pool needs no help
  });

  it('only switches to the icon picture when it is clearly bigger', () => {
    expect(usesIcon(1)).toBe(false);
    expect(usesIcon(1.05)).toBe(false);
    expect(usesIcon(1.5)).toBe(true);
  });
});

describe('the drawing tools', () => {
  it('draws shapes with an outline round them', () => {
    const px = new Pixels(8, 8).ellipse(4, 4, 2, 2, 'a').outline('k');
    expect(px.get(4, 4)).toBe('a');
    expect(px.get(4, 1)).toBe('k');
    expect(px.get(0, 0)).toBe('.');
  });

  it('reads a picture from rows of text, and says if a row is the wrong length', () => {
    expect(Pixels.fromRows(['ab', 'ba']).get(1, 0)).toBe('b');
    expect(() => Pixels.fromRows(['ab', 'b'])).toThrow();
  });

  it('makes the same "random" texture every time', () => {
    const a = seededRandom(5);
    const b = seededRandom(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('mixes colours', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(GROUND_VARIANTS).toBeGreaterThan(1);
  });
});
