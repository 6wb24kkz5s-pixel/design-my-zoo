import type { Message } from '../data/content';

export interface MessageBanner {
  show(message: Message): void;
  hide(): void;
}

/** A gentle message below the top bar, always with its icon. */
export function createMessageBanner(root: HTMLElement): MessageBanner {
  const banner = document.createElement('div');
  banner.className = 'message-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;

  const icon = document.createElement('span');
  icon.className = 'message-banner-icon';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');

  banner.append(icon, text);
  root.append(banner);

  return {
    show(message) {
      // Some messages carry their own icon inside the words, so they need none in front.
      icon.textContent = message.icon;
      icon.hidden = message.icon === '';
      text.textContent = message.text;
      banner.hidden = false;
    },
    hide() {
      banner.hidden = true;
    },
  };
}
