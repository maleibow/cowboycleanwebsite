import { STORE_ITEMS, isOwned, buy } from '../data/store.js';
import { events } from '../core/events.js';
import { TEXT, div, button, screen } from './dom.js';

// The saloon store overlay (DOM over scenes/saloon.js). Same six items, prices and max levels as the original.
// onLeave() is called by the NEXT STAGE button / Enter. `saloon.flash(id)` pops the matching prop on a purchase.
const SAY = ["Step right up! What'll it be, partner?", 'Fine choice, partner!', 'That ain\'t enough coin, friend.', 'You\'re all stocked up on that one!'];

export function createStore(root, run, saloon) {
  const ui = screen(root, 'justify-content:flex-end;pointer-events:none;', { pointer: false });
  const bubble = div(ui.el, 'position:absolute;left:6%;top:12%;max-width:34%;padding:10px 18px;border-radius:16px;background:#fff;color:#000;border:4px solid #000;font:22px/1.2 Bangers,cursive;letter-spacing:1px;box-shadow:4px 4px 0 rgba(0,0,0,.5)');
  const panel = div(ui.el, `${TEXT}pointer-events:auto;width:min(92%,660px);margin-bottom:1.5%;padding:6px 14px 10px;border-radius:14px;background:rgba(36,18,8,.88);border:4px solid #d9a93a;box-sizing:border-box;text-align:center`);
  div(panel, 'font-size:22px;color:#fff3c8', '~ UPGRADE MENU ~');
  const coins = div(panel, 'font-size:18px;color:#f1c40f;margin-bottom:4px');
  const grid = div(panel, 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px');
  const btns = {};
  for (const it of STORE_ITEMS) {
    const b = button(grid, '', () => attempt(it), { bg: '#6b4226', border: '#d9a93a', size: 16, extra: 'padding:3px 6px;display:flex;flex-direction:column;gap:0;border-width:3px;box-shadow:0 3px 0 rgba(0,0,0,.45)' });
    btns[it.id] = { b, name: div(b, 'font-size:18px'), sub: div(b, 'font-size:14px;color:#ffd84a') };
  }
  const next = button(panel, 'NEXT STAGE  ▶', () => leave(), { bg: '#2ecc71', border: '#27ae60', size: 22, extra: 'padding:3px 20px' });
  let onLeave = null, sayT = 0;
  const say = (i) => { bubble.textContent = `"${SAY[i]}"`; };
  const refresh = () => {
    coins.textContent = 'COINS: ' + run.coins;
    for (const it of STORE_ITEMS) {
      const r = btns[it.id], lvl = run.upgrades[it.key], owned = isOwned(run.upgrades, it);
      r.name.textContent = owned ? (it.max === 1 ? 'OWNED' : 'MAXED') : it.label;           // same wording as the original
      r.sub.textContent = owned ? it.label : `${it.price}c` + (it.max > 1 ? `   ${'●'.repeat(lvl)}${'○'.repeat(it.max - lvl)}` : '');
      r.b.style.opacity = owned ? 0.6 : run.coins >= it.price ? 1 : 0.75;
    }
  };
  function attempt(it) {
    if (!ui.open) return;
    if (buy(run, it)) { events.emit('buy'); saloon?.flash(it.id); say(1); } else { events.emit('error'); say(isOwned(run.upgrades, it) ? 3 : 2); }
    refresh(); clearTimeout(sayT); sayT = setTimeout(() => say(0), 2200);
  }
  function leave() { if (!ui.open) return; const f = onLeave; ui.hide(); onLeave = null; f?.(); }
  addEventListener('keydown', (e) => { if (ui.open && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) leave(); });
  return { ui, get open() { return ui.open; }, show(cb) { onLeave = cb; say(0); refresh(); ui.show(); }, hide() { ui.hide(); }, refresh, buy: (id) => attempt(STORE_ITEMS.find((i) => i.id === id)), leave };
}
