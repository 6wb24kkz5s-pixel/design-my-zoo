import { UI } from '../config';
import { cssColour } from './colour';
import type { ChecklistLineView, HeartView, PanelView } from './needsView';

export interface SidePanel {
  /** Shows (and keeps up to date) the panel for an animal, or slides it away if the view is null. */
  show(view: PanelView | null): void;
}

/**
 * The panel that slides in from the right when an animal is tapped: its five hearts with a gentle
 * message under each empty one, what visitors can see, and a 💡 hint that shows a picture checklist.
 */
export function createSidePanel(root: HTMLElement, onClose: () => void): SidePanel {
  document.documentElement.style.setProperty('--panel-width', `${UI.panelWidth}px`);

  const panel = document.createElement('aside');
  panel.className = 'side-panel';
  panel.setAttribute('aria-label', 'Animal needs');
  panel.setAttribute('aria-hidden', 'true');
  root.append(panel);

  let hintOpen = false;
  let shownAnimal: string | null = null;
  let lastKey = '';

  function render(view: PanelView): void {
    const header = element('div', 'side-panel-header');
    const picture = element('span', 'side-panel-picture');
    picture.setAttribute('aria-hidden', 'true');
    const name = element('h2', 'side-panel-name', view.name);
    const close = element('button', 'ui-button side-panel-close');
    close.setAttribute('type', 'button');
    close.setAttribute('aria-label', 'Close');
    close.textContent = '✕';
    close.addEventListener('click', onClose);
    header.append(picture, name, close);

    const parts: HTMLElement[] = [header];

    if (view.happy) {
      parts.push(element('div', 'side-panel-happy', view.happyText));
    }

    const hearts = element('ul', 'side-panel-hearts');
    for (const heart of view.hearts) hearts.append(heartRow(heart));
    parts.push(hearts);

    parts.push(element('div', 'side-panel-visitor', `${view.visitor.icon} ${view.visitor.text}`));

    const hint = element('button', 'ui-button side-panel-hint-button');
    hint.setAttribute('type', 'button');
    hint.setAttribute('aria-expanded', String(hintOpen));
    hint.innerHTML = '<span class="ui-button-icon" aria-hidden="true">💡</span><span>Hint</span>';
    hint.addEventListener('click', () => {
      hintOpen = !hintOpen;
      lastKey = '';
      if (current) render(current);
    });
    parts.push(hint);

    if (hintOpen) {
      const list = element('ul', 'side-panel-checklist');
      for (const line of view.checklist) list.append(checklistRow(line));
      parts.push(list);
    }

    panel.replaceChildren(...parts);
  }

  let current: PanelView | null = null;

  return {
    show(view) {
      const open = view !== null;
      panel.classList.toggle('side-panel-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('panel-open', open);
      if (!view) {
        current = null;
        shownAnimal = null;
        lastKey = '';
        return;
      }

      if (view.animalId !== shownAnimal) {
        hintOpen = false;
        shownAnimal = view.animalId;
        lastKey = '';
      }
      // Painting a stroke asks for the panel on every move: only redraw when something is different.
      const key = JSON.stringify(view) + hintOpen;
      current = view;
      if (key === lastKey) return;
      lastKey = key;
      render(view);
    },
  };
}

function heartRow(heart: HeartView): HTMLElement {
  const row = element('li', heart.full ? 'heart-row' : 'heart-row heart-row-empty');
  const top = element('div', 'heart-row-top');
  top.append(
    element('span', 'heart-row-icon', heart.icon),
    element('span', 'heart-row-label', heart.label),
    // A filled heart or an empty outline, so colour is not the only signal.
    element('span', 'heart-row-heart', heart.full ? '♥' : '♡'),
  );
  top.lastElementChild?.setAttribute('aria-label', heart.full ? 'full' : 'empty');
  row.append(top);
  if (heart.message) row.append(element('p', 'heart-row-message', heart.message));
  return row;
}

function checklistRow(line: ChecklistLineView): HTMLElement {
  const row = element('li', line.met ? 'check-row check-row-met' : 'check-row');
  row.append(element('span', 'check-row-heart', line.heartIcon));

  const what = element('span', 'check-row-what');
  if (line.rule) {
    what.append(element('span', 'check-row-rule', `${line.rule.icon} ${line.rule.text}`));
  } else {
    line.options.forEach((option, index) => {
      if (index > 0) what.append(element('span', 'check-row-or', 'or'));
      const chip = element('span', 'check-option');
      const swatch = element('span', 'check-option-swatch');
      swatch.style.background = cssColour(option.colour);
      swatch.setAttribute('aria-hidden', 'true');
      chip.append(swatch, element('span', 'check-option-label', option.label));
      what.append(chip);
    });
  }
  row.append(what, element('span', 'check-row-tick', line.met ? '✓' : ''));
  return row;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
