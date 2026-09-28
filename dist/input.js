// Each surface owns one pointer. Unrelated contacts never move or release it.
export function bindPointer(element, {start, move, end, cancel}) {
  let owner = null;
  const release = (event, aborted) => {
    if (owner === null || (event && event.pointerId !== owner)) return;
    const id = owner;
    owner = null; // Clear before releasePointerCapture emits lostpointercapture.
    element.classList?.remove('held');
    if (aborted) cancel?.(event); else end?.(event);
    try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch {}
  };
  // Safari can show its selection loupe despite user-select:none and a
  // canceled pointerdown. Cancel the native touch gesture on these custom
  // hold/drag surfaces only; menus, native selects and scroll trays stay native.
  element.addEventListener('touchstart', event => {
    if (event.cancelable) event.preventDefault();
  }, {passive: false});
  element.addEventListener('pointerdown', event => {
    if (owner !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (start?.(event) === false) return;
    owner = event.pointerId;
    event.preventDefault();
    element.classList?.add('held');
    try { element.setPointerCapture(owner); } catch { release(null, true); }
  });
  element.addEventListener('pointermove', event => {
    if (event.pointerId !== owner) return;
    event.preventDefault();
    move?.(event);
  });
  element.addEventListener('pointerup', event => release(event, false));
  element.addEventListener('pointercancel', event => release(event, true));
  element.addEventListener('lostpointercapture', event => release(event, true));
  element.addEventListener('contextmenu', event => event.preventDefault());
  return {reset: () => release(null, true), get owner() { return owner; }};
}

export function stickVector(dx, dy, radius, deadzone = .12) {
  const distance = Math.hypot(dx, dy);
  if (!distance || distance / radius <= deadzone) return {x: 0, y: 0};
  const strength = Math.min(1, (distance / radius - deadzone) / (1 - deadzone));
  return {x: dx / distance * strength, y: dy / distance * strength};
}

export class ActionSources {
  constructor(onChange) { this.sources = new Map(); this.onChange = onChange; }
  set(action, source, active) {
    let set = this.sources.get(action);
    if (!set) this.sources.set(action, set = new Set());
    if (active) set.add(source); else set.delete(source);
    this.onChange?.(action, set.size > 0);
  }
  has(action, source) { return this.sources.get(action)?.has(source) || false; }
  clear(action) {
    if (action) { this.sources.delete(action); this.onChange?.(action, false); }
    else { for (const key of this.sources.keys()) this.onChange?.(key, false); this.sources.clear(); }
  }
}
