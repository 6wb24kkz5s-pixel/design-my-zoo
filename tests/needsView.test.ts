import { describe, expect, it } from 'vitest';
import { HEART_MESSAGES, HINT_LABELS, NEEDS_DATA, VISITOR_MESSAGES } from '../src/data/content';
import { HEARTS, type Reason } from '../src/logic/needs';
import { EMPTY_ZOO, placeAnimal, type Zoo } from '../src/logic/zoo';
import { featureCatalogue } from '../src/data/content';
import { buildPanelView, messageFor, withIcon } from '../src/ui/needsView';

const ALL_IDS = NEEDS_DATA.animals.map((a) => a.id);

/** An animal alone on open ground with nothing round it: every need is missing. */
function bareZoo(animalId: string): Zoo {
  return placeAnimal(EMPTY_ZOO, featureCatalogue, animalId, 10, 10) as Zoo;
}

describe('the panel for each animal', () => {
  it.each(ALL_IDS)('shows a gentle message under every empty heart of the %s', (id) => {
    const view = buildPanelView(bareZoo(id), id);
    expect(view).not.toBeNull();
    expect(view!.hearts.map((h) => h.id)).toEqual([...HEARTS]);
    for (const heart of view!.hearts) {
      if (heart.full) {
        expect(heart.message, `${id} ${heart.id}`).toBeNull();
      } else {
        expect(heart.message, `${id} ${heart.id}`).toBeTruthy();
        // Every placeholder is filled in, and every message has an icon in it.
        expect(heart.message).not.toMatch(/[{}]/);
        expect(heart.message).toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });

  it('is not happy when nothing is provided, and says nothing about being happy', () => {
    const view = buildPanelView(bareZoo('goat'), 'goat')!;
    expect(view.happy).toBe(false);
    expect(view.hearts.filter((h) => h.full)).toHaveLength(1); // air is full: no roof to block it
    expect(view.visitor.text).toBe(VISITOR_MESSAGES.none.text.replace('{animal}', 'goat'));
  });

  it('gives each animal its own picture checklist', () => {
    const goat = buildPanelView(bareZoo('goat'), 'goat')!;
    const lines = goat.checklist;
    expect(lines.some((l) => l.options.map((o) => o.label).join() === 'Grass,Hay')).toBe(true);
    expect(lines.some((l) => l.rule?.text === HINT_LABELS.closedFence.text)).toBe(true);
    // Every line has either pictures or wording, and every picture has a name.
    for (const line of lines) {
      expect(line.options.length > 0 || line.rule !== null).toBe(true);
      for (const option of line.options) expect(option.label.length).toBeGreaterThan(0);
    }
    expect(lines.every((l) => !l.met || l.rule !== null || l.options.length > 0)).toBe(true);
  });

  it('is null for an animal that is not in the zoo', () => {
    expect(buildPanelView(EMPTY_ZOO, 'goat')).toBeNull();
  });
});

describe('the wording', () => {
  it("uses an animal's own message from the data file first", () => {
    expect(messageFor('goldfish', 'food', { kind: 'noFood' })).toBe('The goldfish is hungry! 🐟');
    expect(messageFor('crocodile', 'safety', { kind: 'eats', other: 'frog' })).toBe(
      'Shh — the crocodile might eat its neighbours! 🐊',
    );
  });

  it('falls back to the general messages, with the names filled in', () => {
    expect(messageFor('koi', 'water', { kind: 'noWater' })).toBe('The koi needs water! 💧');
    expect(messageFor('frog', 'safety', { kind: 'eaten', other: 'crocodile' })).toBe(
      'The frog is not safe near the crocodile! 😟',
    );
    expect(messageFor('frog', 'safety', { kind: 'eats', other: 'beetle' })).toBe('Shh! The frog might eat the beetle! 😮');
  });

  it('says why a leaking pool or a weak fence is a problem, using the data file', () => {
    expect(messageFor('hippopotamus', 'water', { kind: 'leakingWater', source: 'deep_pool' })).toContain('not waterproof');
    expect(messageFor('goat', 'safety', { kind: 'weakFence' })).toContain('not strong');
    expect(messageFor('parrot', 'air', { kind: 'roofBlocksAir' })).toContain('fresh air');
  });

  it('puts the heart icon in front of a message that has no icon of its own', () => {
    expect(withIcon('The dragonfly is hungry!', '🍎')).toBe('🍎 The dragonfly is hungry!');
    expect(withIcon('The goldfish is hungry! 🐟', '🍎')).toBe('The goldfish is hungry! 🐟');
  });

  it('has a message for every kind of reason', () => {
    const reasons: Reason[] = [
      { kind: 'noFood' },
      { kind: 'noWater' },
      { kind: 'leakingWater', source: 'water_bowl' },
      { kind: 'notInWater' },
      { kind: 'roofBlocksAir' },
      { kind: 'noHome', group: ['hut'] },
      { kind: 'gap' },
      { kind: 'open' },
      { kind: 'weakFence' },
      { kind: 'bigGaps' },
      { kind: 'needsRoof' },
      { kind: 'roofGapsBig' },
      { kind: 'eats', other: 'frog' },
      { kind: 'eaten', other: 'crocodile' },
    ];
    for (const id of ALL_IDS) {
      for (const reason of reasons) {
        const text = messageFor(id, 'safety', reason);
        expect(text, `${id} ${reason.kind}`).toBeTruthy();
        expect(text).not.toMatch(/[{}]/);
      }
    }
    expect(Object.keys(HEART_MESSAGES).sort()).toEqual(['air', 'eaten', 'eats', 'food', 'home', 'safety', 'water']);
  });
});
