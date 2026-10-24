import { describe, expect, it } from 'vitest';
import { GRID } from '../src/config';

describe('grid constants', () => {
  it('is 32 columns by 24 rows', () => {
    expect(GRID.cols).toBe(32);
    expect(GRID.rows).toBe(24);
  });

  it('uses 48 px squares', () => {
    expect(GRID.squareSize).toBe(48);
  });
});
