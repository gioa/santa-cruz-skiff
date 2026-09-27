import {bindPointer, stickVector} from './input.js?v=20260927-immersive';
const $ = selector => document.querySelector(selector);

export function createMobileControls({state: s, actions: a}) {
  const coarse = matchMedia('(any-pointer: coarse)');
  let preference = 'auto', sensitivity = 1, enabled = false;
  try { const p = JSON.parse(localStorage.getItem('skiff-controls') || '{}'); preference = p.mode || 'auto'; sensitivity = p.sensitivity || 1; } catch {}
  let stick = {x: 0, y: 0}, center, radius;
  const root = $('#touch-controls');
  const joystick = $('#joystick');
  const thumb = $('#stick-thumb');
  const neutral = () => { stick = {x: 0, y: 0}; thumb.style.transform = 'translate(0, 0)'; };
  const usable = () => enabled && s.mode !== 'intro' && !s.paused;
  const controller = bindPointer(joystick, {
    start(event) {
      if (!usable() || (s.mode === 'boat' && s.moored && !s.standing)) return false;
      const rect = joystick.getBoundingClientRect();
      center = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
      radius = rect.width * .32;
      updateStick(event);
      a.audio();
    },
    move: updateStick, end: neutral, cancel: neutral,
  });
  function updateStick(event) {
    stick = stickVector(event.clientX - center.x, event.clientY - center.y, radius);
    if (s.mode === 'boat' && !s.standing) stick.y = 0;
    thumb.style.transform = `translate(${stick.x * radius}px, ${stick.y * radius}px)`;
  }
  function applyMode() {
    const next = preference === 'touch' || (preference === 'auto' && (coarse.matches || navigator.maxTouchPoints > 0));
    if (next !== enabled) a.reset();
    enabled = next;
    document.body.classList.toggle('touch-mode', enabled);
    root.hidden = !enabled || s.mode === 'intro';
  }
  coarse.addEventListener('change', applyMode);
  window.addEventListener('pointerdown', event => {
    if (preference === 'auto' && event.pointerType === 'touch' && !enabled) {
      enabled = true; document.body.classList.add('touch-mode'); root.hidden = s.mode === 'intro';
    }
  }, {passive: true});
  const buttons = {
    'touch-menu': a.menu, 'touch-map': a.map, 'touch-guide': a.guide,
    'touch-engine': a.engine, 'touch-anchor': a.anchor, 'touch-interact': a.interact,
    'touch-reel-toggle': a.reelToggle, 'touch-neutral': () => a.throttle(0),
    'drag-less': () => a.drag(-.05), 'drag-more': () => a.drag(.05),
    'touch-center': () => a.center(),
  };
  for (const [id, fn] of Object.entries(buttons)) $('#' + id).onclick = () => { if (usable()) fn(); };
  $('#touch-throttle').oninput = event => { if (usable()) a.throttle(Number(event.target.value) / 100); };
  function configure(mode, lookSensitivity) {
    preference = ['auto', 'touch', 'keyboard'].includes(mode) ? mode : 'auto';
    sensitivity = Math.max(.5, Math.min(2, Number(lookSensitivity) || 1));
    try { localStorage.setItem('skiff-controls', JSON.stringify({mode: preference, sensitivity})); } catch {}
    applyMode();
  }
  function update({prompt, reeling}) {
    root.hidden = !enabled || s.mode === 'intro';
    if (!enabled) return;
    const boat = s.mode === 'boat', helm=boat&&!s.standing, fight = s.fishState === 'fight';
    document.body.classList.toggle('touch-boat', boat);
    document.body.classList.toggle('touch-fight', fight);
    document.body.classList.toggle('touch-paused', s.paused);
    $('#stick-label').textContent = s.mode==='swim'?'拖动游泳':s.standing?'船内行走':boat ? '左右操舵' : '拖动行走';
    joystick.setAttribute('aria-label', s.mode==='swim'?'拖动摇杆游泳，松开漂浮':helm ? '左右拖动操舵，松开回正；油门独立控制' : '拖动摇杆行走，松开停止');
    $('#touch-guide').hidden = s.mode!=='walk';
    $('#touch-guide').textContent = s.autoWalk ? '停止步行' : '沿栈道走';
    $('#touch-helm').hidden = !helm || s.moored || (!s.assisted&&!s.engine);
    joystick.hidden = !s.assisted && helm && s.anchor;
    $('#touch-engine').hidden = !helm;
    $('#touch-engine').textContent = s.engine ? '停机' : '启动';
    $('#touch-engine').setAttribute('aria-pressed', String(s.engine));
    $('#touch-anchor').hidden = !helm;
    $('#touch-anchor').textContent = s.anchor ? '起锚' : '下锚';
    $('#touch-anchor').setAttribute('aria-pressed', String(s.anchor));
    $('#touch-throttle').disabled = !s.engine || s.moored || s.anchor || s.paused;
    // Do not replace a finger's active range value while it is being dragged.
    if (!$('#touch-throttle').matches(':active')) $('#touch-throttle').value = Math.round(s.throttle * 100);
    $('#touch-throttle').setAttribute('aria-valuetext',s.throttle===0?'空挡':s.throttle<0?`倒车 ${Math.round(-s.throttle*100)}%`:`前进 ${Math.round(s.throttle*100)}%`);
    $('#throttle-value').textContent = s.throttle < 0 ? `倒车 ${Math.round(-s.throttle * 100)}%` : `油门 ${Math.round(s.throttle * 100)}%`;
    $('#touch-neutral').textContent = s.waypoint ? '接管停船' : '空挡';
    $('#touch-interact').hidden = !prompt;
    $('#touch-interact').textContent = prompt;
    $('#touch-cast').hidden = !helm || s.moored;
    const label = s.fishState === 'bite' ? '提竿！' : fight ? '轻提竿' : s.fishState === 'idle' ? '抛竿' : '收回';
    $('#touch-cast-label').textContent = label;
    $('#touch-cast-hint').textContent = s.fishState === 'idle' ? '按住 · 松开抛' : fight ? '按住提竿' : '轻点';
    $('#touch-cast').classList.toggle('bite', s.fishState === 'bite');
    $('#touch-reel').hidden = !fight;
    $('#touch-reel-toggle').hidden = !fight;
    $('#touch-reel-toggle').textContent = reeling ? '松线' : '持续收线';
    $('#touch-reel-toggle').setAttribute('aria-pressed', String(reeling));
    $('#touch-drag').hidden = !fight;
    $('#touch-drag-value').textContent = `泄力 ${Math.round(s.drag * 100)}%`;
    $('#drag-less').disabled = s.drag <= .2;
    $('#drag-more').disabled = s.drag >= .85;
    $('#touch-look-hint').textContent = s.mode==='swim'?'左手游泳 · 右手环顾寻找木艇':boat ? '滑动海面环顾 · 双手可同时操作' : '左手行走 · 右手滑动环顾';
  }
  applyMode();
  return {
    get enabled() { return enabled; }, get preference() { return preference; },
    get sensitivity() { return sensitivity; }, get stick() { return stick; },
    reset() { controller.reset(); neutral(); }, configure, update,
  };
}
