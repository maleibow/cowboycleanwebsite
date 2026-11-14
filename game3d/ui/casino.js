import { CASINO, applyPrize } from '../data/casino.js';
import { createSlot } from '../core/slot.js';
import { events } from '../core/events.js';
import { TEXT, div, button, screen } from './dom.js';

// Lucky 7 Casino overlay (DOM over scenes/slotRoom.js). Rules and messages are the original's: PULL LEVER (10c),
// "Match 3 to WIN!", "SPINNING...", "JACKPOT! WON <SYMBOL>!", "NO LUCK! TRY AGAIN.", "NOT ENOUGH COINS!".
// getWeapon() returns the live level's weapon so prizes can add powerup time. onLeave() returns to the stage.
export function createCasino(root, run, room, getWeapon) {
  const ui = screen(root, 'justify-content:space-between;pointer-events:none;padding:2% 3%;box-sizing:border-box;', { pointer: false });
  div(ui.el, `${TEXT}font-size:34px;color:#f1c40f;text-shadow:2px 2px 0 #000,4px 4px 0 #e67e22;align-self:flex-start`, 'LUCKY 7 CASINO');
  const bottom = div(ui.el, 'display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;margin-bottom:1%');
  const result = div(bottom, `${TEXT}font-size:30px;min-height:36px`), coins = div(bottom, `${TEXT}font-size:20px;color:#f1c40f`);
  const row = div(bottom, 'display:flex;gap:20px;pointer-events:auto');
  const pullBtn = button(row, `PULL LEVER (${CASINO.cost}c)`, () => pull(), { bg: '#e67e22', border: '#d35400', size: 24 });
  button(row, 'LEAVE', () => leave(), { bg: '#95a5a6', border: '#7f8c8d', size: 24 });
  const slot = createSlot(); let onLeave = null;
  const showCoins = () => { coins.textContent = 'COINS: ' + run.coins; };
  function pull() {
    if (!ui.open) return;
    const r = slot.pull(run);
    if (r === 'broke') { events.emit('error'); result.textContent = 'NOT ENOUGH COINS!'; return; }
    if (r !== true) return;
    events.emit('buy'); room.pull(); result.textContent = 'SPINNING...'; showCoins();
  }
  function leave() { if (!ui.open) return; ui.hide(); const f = onLeave; onLeave = null; f?.(); }
  addEventListener('keydown', (e) => { if (ui.open && !e.repeat && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); pull(); } });
  addEventListener('keyup', (e) => { if (ui.open && e.code === 'Escape') leave(); });    // on release, so the same press cannot also pause the stage
  return {
    ui, slot, get open() { return ui.open; },
    show(cb) { onLeave = cb; slot.reset(); room.setReels(slot.pos); result.textContent = 'Match 3 to WIN!'; showCoins(); ui.show(); },
    pull, leave,
    update(dt) {
      if (!ui.open) return;
      const res = slot.update(dt); room.setReels(slot.pos);
      if (slot.justStopped >= 0) events.emit('reelStop');
      if (res === null) return;
      if (res) { result.textContent = 'JACKPOT! WON ' + res + '!'; applyPrize(res, run, getWeapon()); room.jackpot(); events.emit('jackpot'); showCoins(); }
      else { result.textContent = 'NO LUCK! TRY AGAIN.'; events.emit('error'); }
    },
  };
}
