export interface ConfirmOptions {
  icon: string;
  message: string;
  yesLabel: string;
  noLabel: string;
}

/**
 * A friendly yes / no box over the whole screen. Resolves true only if "yes"
 * is tapped; tapping "no" or outside the box resolves false.
 */
export function confirmDialog(root: HTMLElement, options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const box = document.createElement('div');
    box.className = 'dialog';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', options.message);

    const icon = document.createElement('div');
    icon.className = 'dialog-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = options.icon;

    const message = document.createElement('p');
    message.className = 'dialog-message';
    message.textContent = options.message;

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';

    const close = (answer: boolean) => {
      backdrop.remove();
      resolve(answer);
    };

    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'ui-button dialog-no';
    no.textContent = options.noLabel;
    no.addEventListener('click', () => close(false));

    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'ui-button dialog-yes';
    yes.textContent = options.yesLabel;
    yes.addEventListener('click', () => close(true));

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(false);
    });

    buttons.append(no, yes);
    box.append(icon, message, buttons);
    backdrop.append(box);
    root.append(backdrop);
  });
}
