import { FALLBACK_PAINT_STYLE, GROUND_STYLE, ITEM_STYLE, TAB_COLOURS, UI } from '../config';
import { featuresInTab, getMaterial, GROUND_TYPES, type PlaceableFeature } from '../data/content';
import type { PaintTool } from '../logic/paint';
import { BIN_DROP } from '../scenes/DragController';
import { cssColour } from './colour';

export interface PaletteActions {
  /** A finger went down on an item card: start dragging that item. */
  onCardPointerDown(kind: string, event: PointerEvent): void;
  /** A ground tool or an eraser was tapped. */
  onToolTap(tool: PaintTool): void;
  /** The Fence tool was tapped (a material is chosen next). */
  onFenceTap(): void;
}

export interface Palette {
  /** Highlights the Bin while an item is dragged over it. */
  setBinHover(active: boolean): void;
  /** Lights up the tool card for the active paint tool (or none). */
  setActiveTool(tool: PaintTool | null): void;
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

const FIRST_TAB = 'ground';

/** Size of one square in the little shape preview on each card, in CSS pixels. */
const SWATCH_SQUARE = 12;
/** Size of the colour square on ground tool cards, in CSS pixels. */
const TOOL_SWATCH = 30;

interface ToolCard {
  element: HTMLButtonElement;
  name: HTMLElement;
  label: string;
  isActive(tool: PaintTool | null): boolean;
}

/** Builds the bottom palette: tabs, item cards or paint tools, and the Bin. */
export function createPalette(root: HTMLElement, actions: PaletteActions): Palette {
  document.documentElement.style.setProperty('--palette-height', `${UI.paletteHeight}px`);

  const palette = document.createElement('div');
  palette.className = 'palette';

  const tabs = document.createElement('div');
  tabs.className = 'palette-tabs';
  tabs.setAttribute('role', 'tablist');

  const cards = document.createElement('div');
  cards.className = 'palette-cards';

  let activeTool: PaintTool | null = null;
  let toolCards: ToolCard[] = [];

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
    toolCards = id === 'ground' ? groundTools(actions) : id === 'fences' ? fenceTools(actions) : [];
    const features = featuresInTab(id);
    cards.replaceChildren(
      ...(toolCards.length > 0 ? toolCards.map((t) => t.element) : features.map((f) => makeItemCard(f, actions))),
    );
    highlight();
  }

  function highlight(): void {
    for (const card of toolCards) {
      const active = card.isActive(activeTool);
      card.element.setAttribute('aria-pressed', String(active));
      // The Fence card shows the chosen material while painting, e.g. "Fence: Wood".
      const material = active && activeTool?.layer === 'fence' && activeTool.value ? getMaterial(activeTool.value) : null;
      card.name.textContent = material ? `${card.label}: ${material.label}` : card.label;
    }
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
    setActiveTool(tool) {
      activeTool = tool;
      highlight();
    },
  };
}

function groundTools(actions: PaletteActions): ToolCard[] {
  const paints = GROUND_TYPES.map((ground) => {
    const swatch = document.createElement('span');
    swatch.className = 'palette-tool-swatch';
    swatch.style.width = swatch.style.height = `${TOOL_SWATCH}px`;
    swatch.style.background = cssColour((GROUND_STYLE[ground.id] ?? FALLBACK_PAINT_STYLE).colour);
    return makeToolCard(swatch, ground.label, () => actions.onToolTap({ layer: 'ground', value: ground.id }), (tool) =>
      tool?.layer === 'ground' && tool.value === ground.id,
    );
  });
  return [...paints, eraserCard('ground', actions)];
}

function fenceTools(actions: PaletteActions): ToolCard[] {
  const fence = makeToolCard(emojiSwatch('🧱'), 'Fence', () => actions.onFenceTap(), (tool) =>
    tool?.layer === 'fence' && tool.value !== null,
  );
  return [fence, eraserCard('fence', actions)];
}

function eraserCard(layer: PaintTool['layer'], actions: PaletteActions): ToolCard {
  return makeToolCard(emojiSwatch('🧽'), 'Eraser', () => actions.onToolTap({ layer, value: null }), (tool) =>
    tool?.layer === layer && tool.value === null,
  );
}

function emojiSwatch(emoji: string): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'palette-tool-emoji';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = emoji;
  return icon;
}

function makeToolCard(
  swatch: HTMLElement,
  label: string,
  onTap: () => void,
  isActive: (tool: PaintTool | null) => boolean,
): ToolCard {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'palette-card palette-tool';
  element.setAttribute('aria-pressed', 'false');

  const name = document.createElement('span');
  name.className = 'palette-card-name';
  name.textContent = label;

  element.append(swatch, name);
  element.addEventListener('click', onTap);
  return { element, name, label, isActive };
}

function makeItemCard(feature: PlaceableFeature, actions: PaletteActions): HTMLElement {
  const card = document.createElement('div');
  card.className = 'palette-card';
  card.setAttribute('aria-label', feature.label);

  const [w, h] = feature.size;
  const swatch = document.createElement('div');
  swatch.className = 'palette-swatch';
  swatch.style.gridTemplateColumns = `repeat(${w}, ${SWATCH_SQUARE}px)`;
  swatch.style.gridTemplateRows = `repeat(${h}, ${SWATCH_SQUARE}px)`;
  const colour = cssColour(TAB_COLOURS[feature.tab] ?? ITEM_STYLE.fallbackColour);
  for (let i = 0; i < w * h; i++) {
    const square = document.createElement('span');
    square.style.background = colour;
    swatch.append(square);
  }

  const name = document.createElement('span');
  name.className = 'palette-card-name';
  name.textContent = feature.label;

  card.append(swatch, name);
  card.addEventListener('pointerdown', (event) => actions.onCardPointerDown(feature.id, event));
  return card;
}
