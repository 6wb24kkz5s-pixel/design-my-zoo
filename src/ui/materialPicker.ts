import { spriteName } from '../art/names';
import { PROPERTIES, type Material } from '../data/content';
import { spriteImg } from './sprite';

export interface PickerHeading {
  icon: string;
  title: string;
}

/**
 * Big material cards over the whole screen (GDD section 9). Each card shows the
 * material's name and its property icons; a crossed-out icon means the material
 * does not have that property, and null properties are not shown.
 * Resolves with the chosen material id, or null if the child backs out.
 */
export function pickMaterial(
  root: HTMLElement,
  heading: PickerHeading,
  materials: readonly Material[],
  /** The material it is made of now, if any. It gets a "✓ Now" label. */
  current?: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const box = document.createElement('div');
    box.className = 'picker';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', heading.title);

    const title = document.createElement('div');
    title.className = 'picker-title';
    title.innerHTML = `<span class="ui-button-icon" aria-hidden="true">${heading.icon}</span>`;
    title.append(heading.title);

    const grid = document.createElement('div');
    grid.className = 'picker-cards';

    const close = (answer: string | null) => {
      backdrop.remove();
      resolve(answer);
    };

    for (const material of materials) {
      grid.append(materialCard(material, material.id === current, () => close(material.id)));
    }

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'ui-button picker-back';
    back.innerHTML = '<span class="ui-button-icon" aria-hidden="true">✋</span><span>Not now</span>';
    back.addEventListener('click', () => close(null));

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(null);
    });

    box.append(title, grid, back);
    backdrop.append(box);
    root.append(backdrop);
  });
}

function materialCard(material: Material, isCurrent: boolean, onChoose: () => void): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = isCurrent ? 'picker-card picker-card-current' : 'picker-card';
  card.setAttribute('aria-label', material.label);

  const swatch = spriteImg(spriteName.material(material.id), 'sprite picker-swatch');

  const name = document.createElement('span');
  name.className = 'picker-name';
  name.textContent = material.label;

  const props = document.createElement('span');
  props.className = 'picker-props';
  for (const property of PROPERTIES) {
    const has = material.properties[property.id];
    if (has === null || has === undefined) continue;
    const prop = document.createElement('span');
    prop.className = has ? 'picker-prop' : 'picker-prop picker-prop-no';
    prop.setAttribute('aria-label', `${property.label}: ${has ? 'yes' : 'no'}`);
    prop.innerHTML = `<span class="picker-prop-icon" aria-hidden="true">${property.icon}</span>`;
    const word = document.createElement('span');
    word.className = 'picker-prop-word';
    word.textContent = property.label;
    prop.append(word);
    props.append(prop);
  }

  card.append(swatch, name, props);
  if (isCurrent) {
    const now = document.createElement('span');
    now.className = 'picker-now';
    now.textContent = '✓ Now';
    card.append(now);
  }
  card.addEventListener('click', onChoose);
  return card;
}
