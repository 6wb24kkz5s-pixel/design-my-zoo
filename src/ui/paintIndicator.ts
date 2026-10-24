export interface PaintIndicator {
  /** Shows the sign with this icon and text, e.g. "🖌️" and "Painting: Wood fence". */
  show(icon: string, text: string): void;
  hide(): void;
}

/** The "🖌️ Painting: …  ✋ Done" sign above the palette, shown while in paint mode. */
export function createPaintIndicator(root: HTMLElement, onDone: () => void): PaintIndicator {
  const sign = document.createElement('div');
  sign.className = 'paint-indicator';
  sign.setAttribute('role', 'status');
  sign.hidden = true;

  const icon = document.createElement('span');
  icon.className = 'ui-button-icon';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'paint-indicator-text';

  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'ui-button paint-indicator-done';
  done.innerHTML = '<span class="ui-button-icon" aria-hidden="true">✋</span><span>Done</span>';
  done.addEventListener('click', onDone);

  sign.append(icon, text, done);
  root.append(sign);

  return {
    show(iconText, label) {
      icon.textContent = iconText;
      text.textContent = label;
      sign.hidden = false;
    },
    hide() {
      sign.hidden = true;
    },
  };
}
