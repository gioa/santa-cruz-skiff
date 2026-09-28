// A scene is a separate, saveable journey. Add new destinations here without
// coupling their controllers, renderers, or saved progress to one another.
export const LOCATIONS = Object.freeze([
  Object.freeze({
    id: 'santa-cruz',
    name: 'Santa Cruz Wharf',
    subtitle: '圣克鲁兹 · 码头与小木船',
    detail: '从码头出发，驾驶小木船寻找海上的鱼讯。',
    tag: '船钓',
    href: './index.html',
    art: 'santa-cruz',
  }),
  Object.freeze({
    id: 'pacifica',
    name: 'Pacifica Beach',
    subtitle: 'Linda Mar · 沙滩与浪花',
    detail: '逛逛饵料渔具店，沿沙滩找钓位，向浪里抛一竿。',
    tag: '沙滩钓',
    href: './pacifica.html',
    art: 'pacifica',
  }),
]);

let picker;
let returnFocus;

export function getCurrentLocation() {
  const selected = document.documentElement.dataset.location
    || document.body.dataset.location;
  return LOCATIONS.find(location => location.id === selected)
    || LOCATIONS.find(location => new URL(location.href, document.baseURI).pathname === window.location.pathname)
    || LOCATIONS[0];
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function makeArt(location) {
  const art = element('span', `location-art location-art--${location.art}`);
  art.setAttribute('aria-hidden', 'true');
  for (const part of ['sun', 'headland', 'ocean', 'beach', 'foam', 'pier', 'boat', 'shop', 'rod']) {
    art.append(element('i', `location-art-${part}`));
  }
  art.append(element('span', 'location-art-caption', location.art === 'pacifica' ? 'LINDA MAR' : 'MONTEREY BAY'));
  return art;
}

function ensurePicker() {
  if (picker) return picker;
  picker = element('dialog', 'location-picker');
  picker.id = 'location-picker';
  picker.setAttribute('aria-labelledby', 'location-picker-title');
  picker.setAttribute('aria-describedby', 'location-picker-description');
  const header = element('div', 'location-picker-header');
  const title = element('div');
  title.append(element('p', 'location-picker-eyebrow', 'A DIFFERENT SHORE'));
  const heading = element('h2', '', '今天，去哪里钓鱼？');
  heading.id = 'location-picker-title';
  title.append(heading);
  const close = element('button', 'location-picker-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', '关闭钓场选择');
  close.addEventListener('click', closeLocationPicker);
  header.append(title, close);
  const description = element('p', 'location-picker-description', '一片海岸，一段新的慢时光。');
  description.id = 'location-picker-description';
  const cards = element('div', 'location-picker-grid');
  for (const location of LOCATIONS) {
    const card = element('a', 'location-card');
    card.href = location.href;
    card.dataset.locationId = location.id;
    const content = element('span', 'location-card-content');
    const top = element('span', 'location-card-top');
    top.append(element('span', 'location-card-tag', location.tag));
    const state = element('span', 'location-card-state');
    state.dataset.locationState = '';
    top.append(state);
    content.append(top, element('strong', 'location-card-name', location.name),
      element('span', 'location-card-subtitle', location.subtitle),
      element('span', 'location-card-detail', location.detail));
    card.append(makeArt(location), content);
    card.addEventListener('click', event => {
      if (location.id === getCurrentLocation().id) {
        event.preventDefault();
        closeLocationPicker();
      }
      // Other destinations use normal document navigation. Each controller's
      // pagehide handler saves its own progress before leaving.
    });
    cards.append(card);
  }
  picker.append(header, description, cards,
    element('p', 'location-picker-note', '每个钓场各自记录进度，下次回来接着钓。'));
  picker.addEventListener('click', event => {
    if (event.target !== picker) return;
    const bounds = picker.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) closeLocationPicker();
  });
  // Native dialog handles Escape and focus trapping. Keep fishing shortcuts
  // from receiving the same keyboard input while browsing destinations.
  picker.addEventListener('keydown', event => event.stopPropagation());
  picker.addEventListener('keyup', event => event.stopPropagation());
  picker.addEventListener('close', () => {
    window.dispatchEvent(new CustomEvent('location-picker', { detail: { open: false } }));
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
  document.body.append(picker);
  return picker;
}

export function openLocationPicker(trigger = document.activeElement) {
  const dialog = ensurePicker();
  if (dialog.open) return;
  returnFocus = trigger;
  const current = getCurrentLocation();
  for (const card of dialog.querySelectorAll('[data-location-id]')) {
    const active = card.dataset.locationId === current.id;
    card.classList.toggle('is-current', active);
    if (active) card.setAttribute('aria-current', 'location');
    else card.removeAttribute('aria-current');
    card.querySelector('[data-location-state]').textContent = active ? '当前钓场' : '去这里 →';
  }
  dialog.showModal();
  window.dispatchEvent(new CustomEvent('location-picker', { detail: { open: true } }));
}

export function closeLocationPicker() {
  if (picker?.open) picker.close();
}

export function mountLocationPicker() {
  const current = getCurrentLocation();
  const intro = document.querySelector('#intro');
  if (intro && !intro.querySelector('[data-scene-picker]')) {
    const trigger = element('button', 'location-intro-link');
    trigger.type = 'button';
    trigger.dataset.scenePicker = '';
    const text = element('span');
    text.append(element('strong', '', '选择钓场'), element('small', '', 'Santa Cruz · Pacifica'));
    trigger.append(text, element('span', 'location-intro-arrow', '↗'));
    intro.insertBefore(trigger, intro.querySelector('.intro-foot'));
  }
  for (const trigger of document.querySelectorAll('[data-scene-picker]')) {
    if (trigger.dataset.scenePickerBound) continue;
    trigger.dataset.scenePickerBound = 'true';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'location-picker');
    trigger.addEventListener('click', event => {
      event.preventDefault();
      openLocationPicker(trigger);
    });
  }
  // Santa Cruz's controller does not yet consume the pause event. Its live
  // navigation is therefore a regular link, with no overlay over running play.
  const tools = document.querySelector('.hud-tools');
  if (current.id === 'santa-cruz' && tools && !tools.querySelector('.location-hud-link')) {
    const next = LOCATIONS.find(location => location.id !== current.id);
    if (next) {
      const link = element('a', 'location-hud-link', '⌖');
      link.href = next.href;
      link.title = `切换钓场 · ${next.name}`;
      link.setAttribute('aria-label', `切换钓场，前往 ${next.name}`);
      link.addEventListener('click', event => {
        if (document.querySelector('#app')?.classList.contains('is-intro')) {
          event.preventDefault();
          openLocationPicker(link);
        }
      });
      tools.append(link);
      tools.closest('.hud')?.classList.add('has-location-nav');
    }
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountLocationPicker, { once: true });
  else mountLocationPicker();
}
