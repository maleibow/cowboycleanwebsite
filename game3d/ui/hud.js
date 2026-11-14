// Minimal grey-box HUD: act / distance / health / camera mode, plus a banner at the boss gate.
// Replaced by the real HUD in the combat prompt.
import { run } from '../core/state.js';

export function createHud(root) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;left:10px;bottom:8px;padding:4px 10px;font:18px/1.3 Bangers,cursive;color:#fff;' +
    'background:rgba(0,0,0,.45);letter-spacing:1px;text-shadow:1px 1px 0 #000;white-space:pre';
  const banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;top:30%;text-align:center;font:64px Bangers,cursive;color:#ffd84a;' +
    'text-shadow:3px 3px 0 #000;display:none;letter-spacing:3px';
  banner.textContent = 'BOSS GATE';
  root.append(el, banner);
  let last = '';
  return {
    update(level) {
      const p = level.player, b = p.body, seg = p.seg;
      const txt = `ACT ${seg.act}  ${Math.max(0, b.s).toFixed(0)} / ${level.layout.length.toFixed(0)} m   HP ${run.health}`;
      if (txt === last && !level.finished) return; last = txt;
      el.textContent = txt;
      banner.style.display = level.finished ? 'block' : 'none';
    },
  };
}
