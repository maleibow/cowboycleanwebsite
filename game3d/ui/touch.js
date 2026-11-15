import { events } from '../core/events.js';
import { settings, onSetting } from '../core/settings.js';

// On-screen touch controls (PLAN 5): a floating left joystick and JUMP / SPRAY / BOMB / SLIDE buttons, plus pause. Everything
// writes into `input.touch`, which core/input.js merges with keyboard and gamepad, so gameplay never knows the difference.
//  - Pointer Events with one pointerId per control: the left thumb steers while the right thumb holds SPRAY and taps JUMP.
//  - Lives on <body> (not the 16:9 box) so the controls can sit in the letterbox margins of a wide phone, with safe-area insets.
//  - Platform handling ported from cleaningup.html (checkPlatform): desktop = fine pointer or a big screen; the original's
//    portrait "rotate your phone" prompt (?ignore_rotation=1 turns it off); iPhone has no fullscreen API so that button hides.
//    Difference: a coarse-pointer iPad / tablet is treated as touch even above 1024 px (the original hid its controls there).
//  - Shown only while a level is being played; hidden on desktop. A real touch on a "desktop" page turns the controls on.
const SHOW_IN = new Set(['PLAYING']);
const DEAD = 0.16;                 // joystick dead zone (fraction of the radius)
const BTN = [                      // right-hand cluster, px from the bottom-right corner at scale 1 (844 x 390 reference)
  { id: 'jump',  label: 'JUMP',  r: 28,  b: 20,  size: 96, hue: '#2ecc71' },
  { id: 'spray', label: 'SPRAY', r: 140, b: 34,  size: 92, hue: '#3498db' },
  { id: 'bomb',  label: 'BOMB',  r: 34,  b: 128, size: 70, hue: '#e67e22' },
  { id: 'slide', label: 'SLIDE', r: 134, b: 138, size: 70, hue: '#9b59b6' },
];

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isPhoneIOS = () => /iPhone|iPod/.test(navigator.userAgent);

// Is this a touch-first device? ?touch=1 / ?touch=0 force it (tests, kiosks).
export function detectTouch(params = new URLSearchParams(location.search)) {
  if (params.get('touch') === '1') return true;
  if (params.get('touch') === '0') return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(pointer: fine)').matches;
  return coarse || (navigator.maxTouchPoints > 1 && !fine);
}

export function createTouchControls(input, { params = new URLSearchParams(location.search) } = {}) {
  const T = input.touch;
  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;display:none;--tu:1;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;font-family:Bangers,cursive';
  document.body.appendChild(root);
  const api = { root, enabled: detectTouch(params), visible: false, portrait: false, state: null, unit: 1 };
  const ignoreRotation = params.get('ignore_rotation') === '1';
  const mk = (css, text = '', parent = root) => { const d = document.createElement('div'); d.style.cssText = css; if (text) d.textContent = text; parent.appendChild(d); return d; };

  // ---- sizing: one CSS variable scales everything with the screen and the player's size setting
  const resize = () => {
    api.unit = Math.max(0.78, Math.min(1.35, Math.min(innerWidth / 844, innerHeight / 390))) * settings.touchScale;
    root.style.setProperty('--tu', api.unit.toFixed(3));
    api.portrait = matchMedia('(orientation: portrait)').matches || innerHeight > innerWidth * 1.15;
    refresh();
  };

  // ---- joystick: a floating base that appears under the thumb anywhere in the left half, clamped on screen
  const zone = mk('position:absolute;left:0;top:70px;bottom:0;width:48%;pointer-events:auto;touch-action:none');
  const base = mk('position:absolute;width:calc(var(--tu)*130px);height:calc(var(--tu)*130px);margin:calc(var(--tu)*-65px) 0 0 calc(var(--tu)*-65px);border-radius:50%;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.45);box-sizing:border-box;opacity:.55;left:0;top:0;will-change:transform', '', root);
  const stick = mk('position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(255,255,255,.8);box-sizing:border-box;will-change:transform', '', base);
  const probe = mk('position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;padding-left:env(safe-area-inset-left,0px);padding-bottom:env(safe-area-inset-bottom,0px)');   // reads the notch / home-bar insets
  const rest = { x: 0, y: 0 };                                          // where the base sits when idle (bottom-left)
  const joy = { id: -1, ox: 0, oy: 0 };
  const placeBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; base.style.bottom = 'auto'; };
  const idleBase = () => {
    const u = api.unit, x = (parseFloat(getComputedStyle(probe).paddingLeft) || 0) + 100 * u, y = innerHeight - (parseFloat(getComputedStyle(probe).paddingBottom) || 0) - 100 * u;
    rest.x = x; rest.y = y; placeBase(x, y); base.style.opacity = '.55'; stick.style.transform = 'translate(0,0)';
  };
  const joyMove = (cx, cy) => {
    const R = 65 * api.unit, dx = cx - joy.ox, dy = cy - joy.oy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1, sx = dx * k, sy = dy * k;
    stick.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
    const m = Math.min(1, d / R);
    if (m < DEAD) { T.moveX = 0; T.moveY = 0; return; }
    const a = (m - DEAD) / (1 - DEAD), mag = Math.min(1, a * 1.15);          // a touch of gain so full speed does not need full travel
    T.moveX = (dx / d) * mag; T.moveY = -(dy / d) * mag;                      // screen up = forward (+y)
  };
  zone.addEventListener('pointerdown', (e) => {
    if (joy.id !== -1 || e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); joy.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const R = 65 * api.unit; joy.ox = Math.min(innerWidth * 0.5, Math.max(R, e.clientX)); joy.oy = Math.min(innerHeight - R * 0.6, Math.max(R + 70, e.clientY));
    placeBase(joy.ox, joy.oy); base.style.opacity = '.9'; joyMove(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) { e.preventDefault(); joyMove(e.clientX, e.clientY); } });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = -1; T.moveX = 0; T.moveY = 0; idleBase(); };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, joyEnd);

  // ---- buttons
  const buttons = {};
  for (const d of BTN) {
    const pad = 14;   // the hit area is bigger than the drawn disc, so a thumb that lands slightly off still counts
    const hit = mk(`position:absolute;right:calc(max(env(safe-area-inset-right),0px) + var(--tu)*${d.r - pad}px);bottom:calc(max(env(safe-area-inset-bottom),0px) + var(--tu)*${d.b - pad}px);width:calc(var(--tu)*${d.size + pad * 2}px);height:calc(var(--tu)*${d.size + pad * 2}px);pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center`);
    const disc = mk(`width:calc(var(--tu)*${d.size}px);height:calc(var(--tu)*${d.size}px);border-radius:50%;background:${d.hue};opacity:.62;border:4px solid rgba(255,255,255,.85);box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;font-size:calc(var(--tu)*${d.size > 80 ? 24 : 18}px);letter-spacing:1px;text-shadow:2px 2px 0 #000;box-shadow:0 4px 0 rgba(0,0,0,.4);transition:transform .05s,opacity .05s`, d.label, hit);
    const b = { id: -1, hit, disc };
    const down = (e) => {
      if (b.id !== -1 || e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); b.id = e.pointerId; try { hit.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      T[d.id] = true; disc.style.transform = 'scale(.9)'; disc.style.opacity = '.95'; navigator.vibrate?.(6);
    };
    const up = (e) => { if (e.pointerId !== b.id) return; b.id = -1; T[d.id] = false; disc.style.transform = ''; disc.style.opacity = '.62'; };
    hit.addEventListener('pointerdown', down);
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) hit.addEventListener(t, up);
    hit.addEventListener('contextmenu', (e) => e.preventDefault());
    buttons[d.id] = b;
  }

  // ---- pause (top right, under the stage name) and the rotate prompt
  const pauseBtn = mk('position:absolute;right:calc(max(env(safe-area-inset-right),0px) + 10px);top:62px;width:calc(var(--tu)*46px);height:calc(var(--tu)*46px);margin:-6px;padding:6px;box-sizing:content-box;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center');
  const pauseDisc = mk('width:100%;height:100%;border-radius:10px;background:rgba(0,0,0,.55);border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;font-size:calc(var(--tu)*22px);text-shadow:2px 2px 0 #000', 'II', pauseBtn);
  pauseBtn.setAttribute('role', 'button'); pauseBtn.setAttribute('aria-label', 'Pause');
  let pausePtr = -1;
  pauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pausePtr = e.pointerId; T.pause = true; pauseDisc.style.background = 'rgba(255,255,255,.35)'; setTimeout(() => { T.pause = false; }, 90); });
  pauseBtn.addEventListener('pointerup', () => { pauseDisc.style.background = 'rgba(0,0,0,.55)'; pausePtr = -1; });

  const rotate = document.createElement('div');
  rotate.id = 'rotate-prompt';
  rotate.style.cssText = 'position:fixed;inset:0;z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:#0b0614;color:#fff;text-align:center;font-family:Bangers,cursive;letter-spacing:2px;pointer-events:auto;touch-action:none';
  rotate.innerHTML = '<div style="font-size:clamp(34px,11vw,64px);color:#ffd84a;text-shadow:4px 4px 0 #000">ROTATE YOUR PHONE</div><div style="width:64px;height:110px;border:6px solid #fff;border-radius:14px;animation:cc-rot 2.2s ease-in-out infinite"></div><div style="font-size:clamp(18px,5vw,28px);opacity:.85;max-width:80%">Cowboy Clean plays sideways</div>';
  const st = document.createElement('style'); st.textContent = '@keyframes cc-rot{0%,15%{transform:rotate(0)}55%,100%{transform:rotate(-90deg)}}';
  document.head.appendChild(st); document.body.appendChild(rotate);

  // ---- visibility
  function releaseAll() {
    T.moveX = T.moveY = 0; T.jump = T.spray = T.bomb = T.slide = T.pause = false; joy.id = -1;
    for (const b of Object.values(buttons)) { b.id = -1; b.disc.style.transform = ''; b.disc.style.opacity = '.62'; }
    idleBase();
  }
  function refresh() {
    const showRotate = api.enabled && api.portrait && !ignoreRotation;
    rotate.style.display = showRotate ? 'flex' : 'none';
    document.body.classList.toggle('touch-ui', api.enabled);
    document.body.classList.toggle('force-portrait', showRotate);
    const vis = api.enabled && !showRotate && SHOW_IN.has(api.state);
    if (vis !== api.visible) { api.visible = vis; root.style.display = vis ? 'block' : 'none'; if (!vis) releaseAll(); else idleBase(); }
    else if (vis) idleBase();
    events.emit('orientation', { portrait: showRotate });
  }
  api.setEnabled = (on) => { if (on === api.enabled) return; api.enabled = on; refresh(); };
  events.on('state', (name) => { api.state = name; refresh(); });
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 120));
  matchMedia('(orientation: portrait)').addEventListener?.('change', resize);
  onSetting((k) => { if (k === 'touchScale' || k === '*') resize(); });
  // iOS Safari: stop pinch / double-tap zoom and rubber-band scrolling under the game (viewport meta alone is ignored since iOS 10).
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.cancelable && !e.target.closest?.('[data-scroll]')) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (api.enabled) e.preventDefault(); });
  // A real finger on a page we thought was desktop (hybrid laptop, tablet with a mouse): turn the controls on for good.
  addEventListener('pointerdown', (e) => { if (!api.enabled && e.pointerType === 'touch') api.setEnabled(true); }, true);
  api.buttons = buttons; api.zone = zone; api.base = base;
  resize();
  return api;
}
