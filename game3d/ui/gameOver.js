import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { submitScore, fetchLeaderboard } from '../services/leaderboard.js';
import { claimPrize, validEmail, prizeTier, PRIZE_LINKS, TSHIRT_SCORE } from '../services/prize.js';
import { TEXT, MONO, div, el, button, screen, isolateKeys } from './dom.js';

// Game over (original "GRIME OVERLOAD" screen): final score, prize unlock + email (score >= 100), name entry with POST
// SCORE (Firebase leaderboard via services/leaderboard.js), the global top 5, and RETRY STAGE (PLAN 3.4: the stage
// restarts with the score it began with). QUIT TO TITLE returns to the menu.
const M = `font-family:${MONO};text-shadow:none;`;

export function createGameOver(root, { onRetry, onQuit }) {
  const ui = screen(root, `${TEXT}background:rgba(14,0,0,.82);overflow:auto;padding:14px 0;box-sizing:border-box;gap:10px;justify-content:flex-start;`);
  div(ui.el, 'font-size:clamp(46px,8vw,84px);color:#e74c3c;text-shadow:3px 3px 0 #000,6px 6px 0 #c0392b;margin-top:auto', 'GRIME OVERLOAD');
  const score = div(ui.el, 'font-size:32px;color:#ffd84a');
  const cols = div(ui.el, 'display:flex;gap:26px;flex-wrap:wrap;justify-content:center;align-items:flex-start;width:94%');
  const left = div(cols, 'display:flex;flex-direction:column;align-items:center;gap:10px;min-width:260px');
  const right = div(cols, 'display:flex;flex-direction:column;align-items:center;gap:10px;min-width:240px');

  // ---- prize
  const prize = div(left, 'padding:10px 12px;background:rgba(46,204,113,.2);border:2px dashed #2ecc71;border-radius:8px;width:100%;max-width:350px;box-sizing:border-box;text-align:center');
  div(prize, 'font-size:20px;color:#f1c40f;margin-bottom:6px', '⭐ SPECIAL PRIZE UNLOCKED! ⭐');
  const pDesc = div(prize, `${M}font-size:8px;color:#fff;margin-bottom:8px;line-height:1.6`);
  const pForm = div(prize, 'display:flex;gap:5px;justify-content:center;align-items:center;margin-bottom:5px');
  const email = el('input', pForm, `${M}font-size:10px;padding:8px;border:2px solid #f1c40f;background:#111;color:#fff;outline:none;border-radius:4px;width:150px`, { type: 'email', placeholder: 'EMAIL ADDRESS', autocomplete: 'off' }); isolateKeys(email);
  button(pForm, 'CLAIM', () => claim(), { bg: '#e67e22', border: '#d35400', size: 14, extra: 'padding:6px 10px' });
  const pStatus = div(prize, `${M}font-size:9px;color:#e74c3c;min-height:12px;margin-bottom:4px`);
  const rewards = div(prize, 'display:none;flex-direction:column;gap:8px');
  const links = PRIZE_LINKS.map((l) => { const a = el('a', rewards, `${M}color:#34dbcc;font-size:9px;text-decoration:underline;display:none;pointer-events:auto`, { href: l.href, target: '_blank', rel: 'noopener', textContent: l.label }); return { a, min: l.min }; });
  const shirt = div(rewards, `${M}display:none;color:#f1c40f;font-size:9px;line-height:1.5;border:1px dashed #f1c40f;padding:5px;background:rgba(241,196,15,.2)`);
  shirt.innerHTML = '<div style="font-size:11px;color:#fff;margin-bottom:4px">🎉 HUGE CONGRATULATIONS! 🎉</div>SCREENSHOT THIS PAGE AND SEND IT TO COWBOY CLEAN FOR A FREE T-SHIRT!!';
  async function claim() {
    const v = email.value.trim();
    if (!validEmail(v)) { pStatus.textContent = 'PLEASE ENTER VALID EMAIL'; pStatus.style.color = '#e74c3c'; events.emit('error'); return; }
    pStatus.textContent = 'VERIFYING...'; pStatus.style.color = '#f1c40f';
    await claimPrize(v);
    pForm.style.display = 'none'; pStatus.textContent = 'SUCCESS! ENJOY THE REWARDS.'; pStatus.style.color = '#2ecc71'; rewards.style.display = 'flex';
    for (const l of links) l.a.style.display = run.score >= l.min ? 'block' : 'none';
    shirt.style.display = run.score >= TSHIRT_SCORE ? 'flex' : 'none'; shirt.style.flexDirection = 'column'; events.emit('buy');
  }
  email.addEventListener('keydown', (e) => { if (e.key === 'Enter') claim(); });

  // ---- name entry + status
  const entry = div(left, 'display:flex;flex-direction:column;align-items:center;gap:8px');
  const name = el('input', entry, `${M}font-size:16px;padding:10px;text-transform:uppercase;text-align:center;border:3px solid #34dbcc;background:#111;color:#fff;width:220px;outline:none;border-radius:8px;box-sizing:border-box`, { type: 'text', placeholder: 'ENTER NAME', maxLength: 12, autocomplete: 'off', spellcheck: false }); isolateKeys(name);
  const post = button(entry, 'POST SCORE', () => doPost(), { bg: '#3498db', border: '#2980b9', size: 20, extra: 'padding:6px 20px' });
  const status = div(left, `${M}font-size:11px;color:#2ecc71;min-height:14px;text-align:center`);
  let posted = false;
  async function doPost() {
    if (posted) return;
    const n = (name.value || '').trim().toUpperCase() || 'COWBOY';          // original: blank = COWBOY
    const ok = await submitScore(n, run.score, run.stage, { statusDiv: status, entrySection: entry, listDiv: list });
    if (ok) posted = true;
  }
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') doPost(); });

  // ---- leaderboard + buttons
  const lb = div(right, 'padding:10px 14px;border-radius:8px;background:rgba(0,0,0,.55);border:2px solid #34495e;width:100%;box-sizing:border-box');
  div(lb, 'font-size:22px;color:#f1c40f;margin-bottom:6px;text-align:center', 'GLOBAL TOP 5');
  const list = div(lb, `${M}font-size:9px;line-height:1.8;color:#ecf0f1;min-height:50px`, 'Loading High Scores...');
  button(right, 'RETRY STAGE  [Enter]', () => onRetry(), { bg: '#e67e22', border: '#d35400', size: 24 });
  button(right, 'QUIT TO TITLE', () => onQuit(), { bg: '#34495e', border: '#95a5a6', size: 18 });
  div(ui.el, 'margin-bottom:auto');

  return {
    ui, get open() { return ui.open; }, name, email, post: doPost, claim,
    show() {
      score.textContent = 'FINAL SCORE: ' + run.score; status.textContent = ''; entry.style.display = 'flex'; name.value = ''; posted = false;
      const tier = prizeTier(run.score); prize.style.display = tier ? 'block' : 'none';
      if (tier) { pDesc.textContent = `Score ${tier}+! Enter email for your secret rewards:`; pForm.style.display = 'flex'; email.value = ''; pStatus.textContent = ''; rewards.style.display = 'none'; for (const l of links) l.a.style.display = 'none'; shirt.style.display = 'none'; }
      ui.show(); fetchLeaderboard(list); setTimeout(() => { if (ui.open) name.focus(); }, 100);
    },
    hide() { ui.hide(); name.blur(); email.blur(); },
  };
}
