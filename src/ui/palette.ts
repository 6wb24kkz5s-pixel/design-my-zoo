import { ITEM_STYLE, TAB_COLOURS, UI } from '../config';
import { featuresInTab, type PlaceableFeature } from '../data/content';
import { BIN_DROP } from '../scenes/DragController';

export interface PaletteActions {
  /** A finger went down on an item card: start dragging that item. */
  onCardPointerDown(kind: string, event: PointerEvent): void;
}

export interface Palette {
  /** Highlights the Bin while an item is dragged over it. */
  setBinHover(active: boolean): void;
}

// Tab ids match the "tab" values in char-and-properties.json (GDD section 5).
const TABS = [
  { id: 'ground', icon: '🟩', label: 'Ground' },
  { id: 'fences', icon: '🧱', label: 'Fences' },
  { id: 'water', icon: '💧', label: 'Water' },
  { id: 'plants', icon: '🌳', label: 'Plants' },
  { id: 'shelter', icon: '🏠', label: 'Shelter' },
  { id: 'food', icon: '🍎', label: 'Food' },
] as const;

const FIRST_TAB = 'water';

/** Size of one square in the little shape preview on each card, in CSS pixels. */
const SWATCH_SQUARE = 12;

/** Builds the bottom palette: tabs, draggable item cards, and the Bin. */
export function createPalette(root: HTMLElement, actions: PaletteActions): Palette {
  document.documentElement.style.setProperty('--palette-height', `${UI.paletteHeight}px`);

  const palette = document.createElement('div');
  palette.className = 'palette';

  const tabs = document.createElement('div');
  tabs.className = 'palette-tabs';
  tabs.setAttribute('role', 'tablist');

  const cards = document.createElement('div');
  cards.className = 'palette-cards';

  const tabButtons = TABS.map((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-tab';
    button.setAttribute('role', 'tab');
    button.innerHTML = `<span class="ui-button-icon" aria-hidden="true">${tab.icon}</span><span>${tab.label}</span>`;
    button.addEventListener('click', () => showTab(tab.id));
    tabs.append(button);
    return { id: tab.id, button };
  });

  function showTab(id: string): void {
    for (const tab of tabButtons) tab.button.setAttribute('aria-selected', String(tab.id === id));
    const features = featuresInTab(id);
    cards.replaceChildren(
      ...(features.length > 0 ? features.map((f) => makeCard(f, actions)) : [comingSoon()]),
    );
  }

  const main = document.createElement('div');
  main.className = 'palette-main';
  main.append(tabs, cards);

  const bin = document.createElement('div');
  bin.className = 'palette-bin';
  bin.dataset.drop = BIN_DROP;
  bin.innerHTML = '<span class="palette-bin-icon" aria-hidden="true">🗑</span><span>Bin</span>';

  palette.append(main, bin);
  root.append(palette);
  showTab(FIRST_TAB);

  return {
    setBinHover(active) {
      bin.classList.toggle('palette-bin-active', active);
    },
  };
}

function makeCard(feature: PlaceableFeature, actions: PaletteActions): HTMLElement {
  const card = document.createElement('div');
  card.className = 'palette-card';
  card.setAttribute('aria-label', feature.label);

  const [w, h] = feature.size;
  const swatch = document.createElement('div');
  swatch.className = 'palette-swatch';
  swatch.style.gridTemplateColumns = `repeat(${w}, ${SWATCH_SQUARE}px)`;
  swatch.style.gridTemplateRows = `repeat(${h}, ${SWATCH_SQUARE}px)`;
  const colour = TAB_COLOURS[feature.tab] ?? ITEM_STYLE.fallbackColour;
  for (let i = 0; i < w * h; i++) {
    const square = document.createElement('span');
    square.style.background = `#${colour.toString(16).padStart(6, '0')}`;
    swatch.append(square);
  }

  const name = document.createElement('span');
  name.className = 'palette-card-name';
  name.textContent = feature.label;

  card.append(swatch, name);
  card.addEventListener('pointerdown', (event) => actions.onCardPointerDown(feature.id, event));
  return card;
}

function comingSoon(): HTMLElement {
  const note = document.createElement('div');
  note.className = 'palette-note';
  note.innerHTML = '<span class="ui-button-icon" aria-hidden="true">🖌️</span><span>Coming soon</span>';
  return note;
}
