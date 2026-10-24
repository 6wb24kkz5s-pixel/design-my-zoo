import { UI } from '../config';
import { createAnimalMenu } from './animalMenu';

export interface ControlActions {
  zoomIn(): void;
  zoomOut(): void;
  seeWholeZoo(): void;
  undo(): void;
  newZoo(): void;
  addAnimal(animalId: string): void;
}

export interface Controls {
  /** Fades the + or – button when the zoom is at that limit. */
  setZoomState(atMin: boolean, atMax: boolean): void;
  /** Fades Undo when there is nothing to undo. */
  setCanUndo(canUndo: boolean): void;
  /** Ticks the animals that are already in the zoo, in the 🐾 Animals drop-down. */
  setAnimalsInZoo(animalIds: readonly string[]): void;
}

/** Builds the HTML top bar (Animals, Undo, See whole zoo, Menu) and the + / – zoom buttons inside #ui. */
export function createControls(root: HTMLElement, actions: ControlActions): Controls {
  const style = document.documentElement.style;
  style.setProperty('--top-bar-height', `${UI.topBarHeight}px`);
  style.setProperty('--zoom-button-size', `${UI.zoomButtonSize}px`);

  const animals = createAnimalMenu(actions.addAnimal);
  const undo = makeButton('ui-button', '↩️', 'Undo', actions.undo, true);
  const wholeZoo = makeButton('ui-button', '🗺️', 'See whole zoo', actions.seeWholeZoo, true);
  const menu = createMenu(actions);

  const spacer = document.createElement('div');
  spacer.className = 'top-bar-spacer';

  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.append(animals.element, undo, wholeZoo, spacer, menu);

  const zoomIn = makeButton('ui-button zoom-button', '+', 'Zoom in', actions.zoomIn);
  const zoomOut = makeButton('ui-button zoom-button', '−', 'Zoom out', actions.zoomOut);
  const zoomButtons = document.createElement('div');
  zoomButtons.className = 'zoom-buttons';
  zoomButtons.append(zoomIn, zoomOut);

  root.append(topBar, zoomButtons);

  return {
    setZoomState(atMin, atMax) {
      zoomOut.disabled = atMin;
      zoomIn.disabled = atMax;
    },
    setCanUndo(canUndo) {
      undo.disabled = !canUndo;
    },
    setAnimalsInZoo(animalIds) {
      animals.setPlaced(animalIds);
    },
  };
}

/** ☰ Menu button with a small drop-down. For now it holds only "New zoo". */
function createMenu(actions: ControlActions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'menu';

  const panel = document.createElement('div');
  panel.className = 'menu-panel';
  panel.hidden = true;

  const close = () => {
    panel.hidden = true;
  };

  const toggle = makeButton('ui-button', '☰', 'Menu', () => {
    panel.hidden = !panel.hidden;
  }, true);
  toggle.setAttribute('aria-haspopup', 'true');

  panel.append(
    makeButton('ui-button menu-item', '🧹', 'New zoo', () => {
      close();
      actions.newZoo();
    }, true),
  );

  // A tap anywhere outside the menu closes it.
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !wrapper.contains(event.target as Node)) close();
  });

  wrapper.append(toggle, panel);
  return wrapper;
}

function makeButton(
  className: string,
  icon: string,
  label: string,
  onTap: () => void,
  showLabel = false,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);

  const iconSpan = document.createElement('span');
  iconSpan.className = 'ui-button-icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = icon;
  button.append(iconSpan);

  if (showLabel) {
    const text = document.createElement('span');
    text.textContent = label;
    button.append(text);
  }

  button.addEventListener('click', onTap);
  return button;
}
