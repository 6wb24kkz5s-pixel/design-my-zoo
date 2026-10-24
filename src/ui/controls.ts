import { UI } from '../config';

export interface ControlActions {
  zoomIn(): void;
  zoomOut(): void;
  seeWholeZoo(): void;
}

export interface Controls {
  /** Fades the + or – button when the zoom is at that limit. */
  setZoomState(atMin: boolean, atMax: boolean): void;
}

/** Builds the HTML top bar and the + / – zoom buttons inside the #ui overlay. */
export function createControls(root: HTMLElement, actions: ControlActions): Controls {
  const style = document.documentElement.style;
  style.setProperty('--top-bar-height', `${UI.topBarHeight}px`);
  style.setProperty('--zoom-button-size', `${UI.zoomButtonSize}px`);

  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.append(makeButton('ui-button', '🗺️', 'See whole zoo', actions.seeWholeZoo, true));

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
  };
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
