import { describe, expect, it } from 'vitest';
import data from '../src/data/char-and-properties.json';

describe('char-and-properties.json', () => {
  it('contains exactly 12 animals', () => {
    expect(data.animals).toHaveLength(12);
  });

  it('pairs every enclosure message with an icon', () => {
    for (const message of Object.values(data.enclosureMessages)) {
      expect(message.icon.length).toBeGreaterThan(0);
      expect(message.text.length).toBeGreaterThan(0);
    }
  });

  it('gives every animal a name and a size', () => {
    for (const animal of data.animals) {
      expect(animal.label.length).toBeGreaterThan(0);
      expect(animal.size).toHaveLength(2);
    }
  });

  it('contains exactly the 5 material properties', () => {
    expect(Object.keys(data.properties).sort()).toEqual(
      ['flexible', 'floats', 'strong', 'transparent', 'waterproof'],
    );
  });
});
