import { initArt } from './index';

/**
 * A review page that shows every picture in the game, big. Open the game with ?gallery on the end of
 * the address. It makes no changes to anything and is not linked from the game.
 */
export function showGallery(): void {
  const art = initArt();
  document.title = 'Design My Zoo: pictures';
  document.documentElement.style.cssText = 'overflow:auto;height:auto;touch-action:auto;background:#2f3e46';
  document.body.style.cssText = 'overflow:auto;height:auto;touch-action:auto;background:#2f3e46;color:#f4f1de;padding:16px;font:14px system-ui,sans-serif;-webkit-user-select:text;user-select:text';
  document.body.replaceChildren();

  const groups = new Map<string, string[]>();
  for (const name of [...art.frames.keys()].sort()) {
    const group = name.startsWith('icon:') ? 'icon' : (name.split(':')[0] ?? 'other');
    groups.set(group, [...(groups.get(group) ?? []), name]);
  }

  const zoom = new URLSearchParams(location.search).get('zoom') === '2' ? 2 : 1;
  for (const [group, names] of groups) {
    const heading = document.createElement('h2');
    heading.textContent = `${group} (${names.length})`;
    heading.style.cssText = 'margin:18px 0 8px;font-size:18px';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end';
    for (const name of names) {
      const cell = document.createElement('figure');
      cell.style.cssText = 'margin:0;text-align:center;font-size:10px;flex:0 0 auto';
      const image = document.createElement('img');
      image.src = art.url(name);
      image.alt = name;
      const frame = art.frames.get(name);
      image.style.cssText = `image-rendering:pixelated;background:#9bd770;display:block;margin:0 auto 2px;width:${(frame?.width ?? 48) * zoom}px;height:${(frame?.height ?? 48) * zoom}px`;
      const caption = document.createElement('figcaption');
      caption.textContent = name.replace(/^[a-z]+:/, '');
      cell.append(image, caption);
      row.append(cell);
    }
    document.body.append(heading, row);
  }
}
