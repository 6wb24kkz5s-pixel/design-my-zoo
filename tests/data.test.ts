import { describe, expect, it } from 'vitest';
import data from '../src/data/char-and-properties.json';

describe('char-and-properties.json', () => {
  it('contains exactly 12 animals', () => {
    expect(data.animals).toHaveLength(12);
  });

  it('contains exactly the 5 material properties', () => {
    expect(Object.keys(data.properties).sort()).toEqual(
      ['flexible', 'floats', 'strong', 'transparent', 'waterproof'],
    );
  });
});
