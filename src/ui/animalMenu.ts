import { spriteName } from '../art/names';
import { ANIMALS, type Animal } from '../data/content';
import { spriteImg } from './sprite';

export interface AnimalMenu {
  /** The 🐾 Animals button and its drop-down, ready to put in the top bar. */
  element: HTMLElement;
  /** Ticks the animals that are already in the zoo. */
  setPlaced(animalIds: readonly string[]): void;
}

/**
 * 🐾 Animals: a drop-down of cards, one per animal, with a picture and its name.
 * Tapping a card adds that animal to the zoo (each animal can be added once).
 * The cards are in alphabetical order and carry no hint about grouping or difficulty.
 */
export function createAnimalMenu(onChoose: (animalId: string) => void): AnimalMenu {
  const wrapper = document.createElement('div');
  wrapper.className = 'menu';

  const panel = document.createElement('div');
  panel.className = 'menu-panel animal-panel';
  panel.hidden = true;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ui-button';
  toggle.setAttribute('aria-label', 'Animals');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.innerHTML = '<span class="ui-button-icon" aria-hidden="true">🐾</span><span>Animals</span>';
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
  });

  const cards = new Map<string, HTMLButtonElement>();
  for (const animal of ANIMALS) {
    const card = makeCard(animal, () => {
      panel.hidden = true;
      onChoose(animal.id);
    });
    cards.set(animal.id, card);
    panel.append(card);
  }

  // A tap anywhere outside the menu closes it.
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !wrapper.contains(event.target as Node)) panel.hidden = true;
  });

  wrapper.append(toggle, panel);

  return {
    element: wrapper,
    setPlaced(animalIds) {
      const placed = new Set(animalIds);
      for (const [id, card] of cards) {
        const isPlaced = placed.has(id);
        card.disabled = isPlaced;
        card.classList.toggle('animal-card-placed', isPlaced);
      }
    },
  };
}

function makeCard(animal: Animal, onTap: () => void): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'animal-card';
  card.setAttribute('aria-label', animal.label);

  const name = document.createElement('span');
  name.className = 'animal-card-name';
  name.textContent = animal.label;

  // Shown only on animals already in the zoo.
  const tick = document.createElement('span');
  tick.className = 'animal-card-tick';
  tick.setAttribute('aria-hidden', 'true');
  tick.textContent = '✓ In the zoo';

  card.append(spriteImg(spriteName.animal(animal.id), 'sprite animal-sprite'), name, tick);
  card.addEventListener('click', onTap);
  return card;
}
