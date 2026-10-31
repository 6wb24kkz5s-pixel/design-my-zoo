import { spriteName } from '../art/names';
import { featurePicture, groundPicture } from '../art/pictures';
import { TAP, UI } from '../config';
import { featuresInTab, getMaterial, GROUND_TYPES, type PlaceableFeature } from '../data/content';
import type { PaintTool } from '../logic/paint';
import type { RoofTool } from '../logic/roofs';
import { BIN_DROP } from '../scenes/DragController';
import { spriteImg } from './sprite';

export interface PaletteActions {
  /** A finger went down on an item card: start dragging that item. */
  onCardPointerDown(kind: string, event: PointerEvent): void;
  /** An item card was tapped (not dragged): pop that item into the plot. */
  onCardTap(kind: string): void;
  /** A ground tool or an eraser was tapped. */
  onToolTap(tool: PaintTool): void;
  /** The Fence tool was tapped (a material is chosen next). */
  onFenceTap(): void;
  /** The Roof tool was tapped (a material is chosen next). */
  onRoofTap(): void;
  /** The "No roof" tool was tapped. */
  onNoRoofTap(): void;
}

export interface Palette {
  /** Highlights the Bin while an item is dragged over it. */
  setBinHover(active: boolean): void;
  /** Lights up the tool card for the active paint tool (or none). */
  setActiveTool(tool: PaintTool | null): void;
  /** Lights up the Roof or "No roof" card while roof mode is on. */
  setActiveRoof(tool: RoofTool | null): void;
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

/** The icon of a palette tab, e.g. 🏠 for "shelter". */
export function tabIcon(tabId: string): string {
  return TABS.find((tab) => tab.id === tabId)?.icon ?? '';
}

interface ModeState {
  paint: PaintTool | null;
  roof: RoofTool | null;
}

interface ToolCard {
  element: HTMLButtonElement;
  name: HTMLElement;
  label: string;
  isActive(state: ModeState): boolean;
  /** The material being used, shown after the name while active (e.g. "Fence: Wood"). */
  detail(state: ModeState): string | null;
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

  const state: ModeState = { paint: null, roof: null };
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
    toolCards =
      id === 'ground' ? groundTools(actions) : id === 'fences' ? fenceTools(actions) : id === 'shelter' ? roofTools(actions) : [];
    cards.replaceChildren(
      ...featuresInTab(id).map((f) => makeItemCard(f, actions)),
      ...toolCards.map((t) => t.element),
    );
    highlight();
  }

  function highlight(): void {
    for (const card of toolCards) {
      const active = card.isActive(state);
      card.element.setAttribute('aria-pressed', String(active));
      const detail = active ? card.detail(state) : null;
      card.name.textContent = detail ? `${card.label}: ${detail}` : card.label;
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
      state.paint = tool;
      highlight();
    },
    setActiveRoof(tool) {
      state.roof = tool;
      highlight();
    },
  };
}

const noDetail = () => null;

function groundTools(actions: PaletteActions): ToolCard[] {
  const paints = GROUND_TYPES.map((ground) => {
    return makeToolCard(
      spriteImg(groundPicture(ground.id), 'sprite palette-sprite palette-ground'),
      ground.label,
      () => actions.onToolTap({ layer: 'ground', value: ground.id }),
      ({ paint }) => paint?.layer === 'ground' && paint.value === ground.id,
      noDetail,
    );
  });
  return [...paints, eraserCard('ground', actions)];
}

function fenceTools(actions: PaletteActions): ToolCard[] {
  const fence = makeToolCard(
    spriteImg(spriteName.fence('wood'), 'sprite palette-sprite'),
    'Fence',
    () => actions.onFenceTap(),
    ({ paint }) => paint?.layer === 'fence' && paint.value !== null,
    ({ paint }) => (paint?.value ? (getMaterial(paint.value)?.label ?? null) : null),
  );
  return [fence, eraserCard('fence', actions)];
}

/** The Roof and "No roof" tools sit with the items in the Shelter tab. */
function roofTools(actions: PaletteActions): ToolCard[] {
  const roof = makeToolCard(
    spriteImg(spriteName.roof('metal_mesh'), 'sprite palette-sprite'),
    'Roof',
    () => actions.onRoofTap(),
    ({ roof: tool }) => tool !== null && tool.material !== null,
    ({ roof: tool }) => (tool?.material ? (getMaterial(tool.material)?.label ?? null) : null),
  );
  const noRoof = makeToolCard(
    emojiSwatch('🧽'),
    'No roof',
    () => actions.onNoRoofTap(),
    ({ roof: tool }) => tool !== null && tool.material === null,
    noDetail,
  );
  return [roof, noRoof];
}

function eraserCard(layer: PaintTool['layer'], actions: PaletteActions): ToolCard {
  return makeToolCard(
    emojiSwatch('🧽'),
    'Eraser',
    () => actions.onToolTap({ layer, value: null }),
    ({ paint }) => paint?.layer === layer && paint.value === null,
    noDetail,
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
  isActive: (state: ModeState) => boolean,
  detail: (state: ModeState) => string | null,
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
  return { element, name, label, isActive, detail };
}

function makeItemCard(feature: PlaceableFeature, actions: PaletteActions): HTMLElement {
  const card = document.createElement('div');
  card.className = 'palette-card';
  card.setAttribute('aria-label', feature.label);

  const name = document.createElement('span');
  name.className = 'palette-card-name';
  name.textContent = feature.label;

  card.append(spriteImg(featurePicture(feature.id), 'sprite palette-sprite'), name);
  card.addEventListener('pointerdown', (event) => {
    actions.onCardPointerDown(feature.id, event);
    watchForTap(event, () => actions.onCardTap(feature.id));
  });
  return card;
}

/**
 * Calls `onTap` if this finger comes up soon, close to where it went down. A longer press or a move
 * is a drag, which the drag controller handles on its own, so tapping and dragging both work on a card.
 */
function watchForTap(down: PointerEvent, onTap: () => void): void {
  if (!down.isPrimary) return;
  const stop = () => {
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', stop);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== down.pointerId) return;
    stop();
    const moved = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
    if (moved <= TAP.maxMoveCss && event.timeStamp - down.timeStamp <= TAP.maxMs) onTap();
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', stop);
}
