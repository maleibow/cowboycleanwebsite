import { TEXT, div } from './dom.js';
import { isPhoneIOS } from './touch.js';

// Fullscreen button (original #fullscreen-btn + toggleFullscreen, cleaningup.html 1509-1564). Ported behaviour:
//  - requests fullscreen on the whole page (so the on-screen touch controls come along), then locks the screen to landscape;
//  - if the browser or the embedding iframe refuses, falls back to "pseudo fullscreen" (body.pseudo-fs fills the visible screen);
//  - hidden on iPhone, which has no fullscreen API for pages (the game is as large as it gets; Add to Home Screen goes further).
// The button follows real fullscreen changes too (Esc, swipe), so its glyph never goes stale.
export function createFullscreenButton(root, target = document.documentElement) {
  const req = target.requestFullscreen || target.webkitRequestFullscreen, isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const can = !isPhoneIOS() && !!req && (document.fullscreenEnabled !== false);
  const b = div(root, `${TEXT}position:absolute;left:12px;bottom:12px;width:40px;height:40px;border-radius:8px;background:rgba(0,0,0,.55);border:2px solid #fff;display:${can ? 'flex' : 'none'};align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;font-size:24px;user-select:none;z-index:50`, '⛶');
  b.id = 'fs-btn'; b.title = 'Fullscreen'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Toggle fullscreen');
  const sync = () => { const on = isFs() || document.body.classList.contains('pseudo-fs'); b.textContent = on ? '✖' : '⛶'; b.title = on ? 'Exit fullscreen' : 'Fullscreen'; };
  const lock = () => { try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* not supported */ } };
  const enter = () => {
    const pseudo = () => { document.body.classList.add('pseudo-fs'); sync(); };
    try {
      if (target.requestFullscreen) target.requestFullscreen().then(lock, pseudo);
      else if (target.webkitRequestFullscreen) { target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); lock(); }
      else pseudo();
    } catch { pseudo(); }
  };
  const leave = () => { document.body.classList.remove('pseudo-fs'); try { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* already out */ } try { screen.orientation?.unlock?.(); } catch { /* not locked */ } sync(); };
  b.addEventListener('click', (e) => { e.stopPropagation(); (isFs() || document.body.classList.contains('pseudo-fs')) ? leave() : enter(); });
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, sync);
  return b;
}
