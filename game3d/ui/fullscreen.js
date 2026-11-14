import { TEXT, div } from './dom.js';

// Fullscreen button (original #fullscreen-btn). Hidden where the browser has no fullscreen API (iPhone Safari): there
// the page is already as large as it gets once added to the home screen.
export function createFullscreenButton(root, target) {
  const req = target.requestFullscreen || target.webkitRequestFullscreen, isFs = () => document.fullscreenElement || document.webkitFullscreenElement;
  const b = div(root, `${TEXT}position:absolute;left:12px;bottom:12px;width:40px;height:40px;border-radius:8px;background:rgba(0,0,0,.55);border:2px solid #fff;display:${req ? 'flex' : 'none'};align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;font-size:24px;user-select:none;z-index:50`, '⛶');
  b.title = 'Fullscreen'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Toggle fullscreen');
  const toggle = () => { try { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else req.call(target); } catch { /* blocked by the embedding page */ } };
  b.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  return b;
}
