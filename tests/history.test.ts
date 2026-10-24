import { describe, expect, it } from 'vitest';
import { UNDO_LIMIT } from '../src/config';
import { canUndo, commit, createHistory, undo } from '../src/logic/history';
import { EMPTY_ZOO, placeItem, type Catalogue } from '../src/logic/zoo';

describe('undo history', () => {
  it('undoes changes in reverse order', () => {
    let h = createHistory(0);
    h = commit(h, 1, UNDO_LIMIT);
    h = commit(h, 2, UNDO_LIMIT);
    h = undo(h);
    expect(h.present).toBe(1);
    h = undo(h);
    expect(h.present).toBe(0);
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
  });

  it(`remembers only the last ${UNDO_LIMIT} actions`, () => {
    let h = createHistory(0);
    for (let i = 1; i <= UNDO_LIMIT + 5; i++) h = commit(h, i, UNDO_LIMIT);
    let undos = 0;
    while (canUndo(h)) {
      h = undo(h);
      undos++;
    }
    expect(undos).toBe(UNDO_LIMIT);
    expect(h.present).toBe(5);
  });

  it('can undo "New zoo"', () => {
    const catalogue: Catalogue = { sizeOf: () => [1, 1] };
    const built = placeItem(EMPTY_ZOO, catalogue, 'small', 3, 3);
    if (!built) throw new Error('could not place');
    let h = commit(createHistory(EMPTY_ZOO), built, UNDO_LIMIT);
    h = commit(h, EMPTY_ZOO, UNDO_LIMIT);
    expect(h.present.items).toHaveLength(0);
    h = undo(h);
    expect(h.present).toBe(built);
  });
});
