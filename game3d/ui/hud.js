import * as THREE from 'three';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { POWERUPS, PROJ } from '../data/weapons.js';

// In-game HUD (DOM): score, coins, bombs, health, heat, stage/act, active powerups, combo, floating text,
// boss bar (unused until the boss prompts), toast and a placeholder game-over card.
// Everything is created once; per-frame work only touches elements whose value changed.
const FONT = 'Bangers,cursive';
const TIMED = ['super', 'spread', 'fourway', 'homing', 'grenade', 'spin'];
const css = (el, s) => { el.style.cssText = s; return el; };
const div = (parent, s, text = '') => { const d = css(document.createElement('div'), s); if (text) d.textContent = text; parent?.appendChild(d); return d; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const TEXT = `font:20px/1.2 ${FONT};color:#fff;letter-spacing:1px;text-shadow:2px 2px 0 #000;`;

export function createHud(root) {
  const h = { track: null, camera: null, level: null, onRetry: null };
  const panel = div(root, `position:absolute;left:12px;top:10px;${TEXT}`);
  const rowScore = div(panel, 'font-size:30px;color:#ffd84a'), rowInfo = div(panel, 'font-size:18px;opacity:.95');
  const bombs = div(panel, 'font-size:22px;color:#ff8c1a;margin-top:2px;letter-spacing:3px');
  const bar = (label, w) => {
    const wrap = div(panel, `display:flex;align-items:center;gap:6px;margin-top:4px;font-size:15px`), lab = div(wrap, 'width:46px', label);
    const box = div(wrap, `width:${w}px;height:14px;background:rgba(0,0,0,.55);border:2px solid #000;border-radius:4px;overflow:hidden`);
    return { fill: div(box, 'height:100%;width:0'), lab, wrap };
  };
  const hp = bar('HP', 190), heat = bar('HEAT', 190);
  const stage = div(root, `position:absolute;right:12px;top:10px;text-align:right;${TEXT}`);
  const chips = div(root, 'position:absolute;right:12px;top:64px;display:flex;flex-direction:column;gap:4px;align-items:flex-end');
  const chipEls = {};
  for (const k of [...TIMED, 'shield', 'laser', 'lasso']) {
    const c = div(chips, `${TEXT}font-size:15px;display:none;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,.55);border-left:6px solid #fff;min-width:96px`);
    const lab = div(c, ''), b = div(c, 'height:4px;margin-top:2px;background:#fff'); chipEls[k] = { c, lab, b, on: false };
  }
  const combo = div(root, `position:absolute;left:50%;top:64px;transform:translateX(-50%);text-align:center;${TEXT}font-size:34px;color:#ff7ad9;display:none`);
  const toast = div(root, `position:absolute;left:50%;top:26%;transform:translateX(-50%);${TEXT}font-size:36px;opacity:0;transition:opacity .25s`);
  const bossBar = div(root, 'position:absolute;left:25%;right:25%;top:12px;display:none');
  const bossName = div(bossBar, `${TEXT}text-align:center;font-size:22px`), bossFill = div(div(bossBar, 'height:16px;background:rgba(0,0,0,.6);border:2px solid #000;border-radius:4px;overflow:hidden'), 'height:100%;background:#e74c3c;width:100%');
  const banner = div(root, `position:absolute;left:0;right:0;top:30%;text-align:center;${TEXT}font-size:64px;color:#ffd84a;display:none;letter-spacing:3px`, 'BOSS GATE');
  const hurt = div(root, 'position:absolute;inset:0;background:radial-gradient(transparent 55%,rgba(220,20,20,.55));opacity:0;transition:opacity .35s');
  // mute button (sfx.js owns the state: this only asks, and shows what muteChanged says). The M key does the same.
  const mute = div(root, `position:absolute;right:12px;bottom:12px;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.55);border:2px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;${TEXT}font-size:22px;user-select:none;-webkit-tap-highlight-color:transparent`, '🔊');
  mute.title = 'Sound on/off  [M]'; mute.setAttribute('role', 'button'); mute.setAttribute('aria-label', 'Toggle sound');
  mute.addEventListener('pointerdown', (e) => { e.stopPropagation(); events.emit('toggleMute'); });
  events.on('muteChanged', (m) => { mute.textContent = m ? '🔇' : '🔊'; mute.style.opacity = m ? 0.7 : 1; });
  const dbg = div(root, 'position:absolute;right:8px;bottom:62px;font:12px monospace;color:#7CFC7C;white-space:pre;text-align:right;display:none');
  const over = div(root, `position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(10,0,0,.7);pointer-events:auto;${TEXT}`);
  div(over, `font-size:88px;color:#e74c3c;letter-spacing:4px`, 'GAME OVER'); const overScore = div(over, 'font-size:34px;color:#ffd84a');
  const retry = div(over, 'font-size:28px;padding:6px 22px;border:3px solid #fff;border-radius:8px;cursor:pointer', 'RETRY STAGE  [Enter]');
  retry.addEventListener('click', () => h.onRetry?.());
  div(over, 'font-size:16px;opacity:.7', 'placeholder screen: name entry + leaderboard come with the game-flow prompt');

  // ---- floating text pool (world position -> screen each frame)
  const FT = Array.from({ length: 28 }, () => ({ el: div(root, `position:absolute;left:0;top:0;${TEXT}white-space:nowrap;display:none;will-change:transform`), on: false, t: 0, max: 1, v: new THREE.Vector3(), size: 1 }));
  let ftCursor = 0; const _v = new THREE.Vector3();
  h.floatTrack = (s, x, y, text, color = '#fff', life = 1.0) => {
    if (!h.track) return; const f = FT[ftCursor]; ftCursor = (ftCursor + 1) % FT.length;
    h.track.toWorld(s, x, y, f.v); f.on = true; f.t = f.max = life; f.el.textContent = text; f.el.style.color = color;
    f.size = life < 0.8 ? 0.8 : 1.25; f.el.style.fontSize = (f.size * 20) + 'px'; f.el.style.display = 'block';
  };
  let toastT = 0;
  h.toast = (text, color = 0xffffff) => { toast.textContent = text; toast.style.color = hex(color); toast.style.opacity = 1; toastT = 1.1; };
  h.showBoss = (name, hpNow, hpMax) => { bossBar.style.display = 'block'; bossName.textContent = name; bossFill.style.width = Math.max(0, (100 * hpNow) / hpMax) + '%'; };
  h.hideBoss = () => { bossBar.style.display = 'none'; };
  h.showGameOver = (score) => { overScore.textContent = 'SCORE ' + score; over.style.display = 'flex'; };
  h.hideGameOver = () => { over.style.display = 'none'; };
  h.flashHurt = () => { hurt.style.opacity = 1; setTimeout(() => (hurt.style.opacity = 0), 60); };
  h.attach = (level, camera) => { h.level = level; h.track = level.track; h.camera = camera; };

  const memo = {}; // write-if-changed
  const setText = (k, el, v) => { if (memo[k] !== v) { memo[k] = v; el.textContent = v; } };
  const setW = (k, el, pct, col) => { const v = pct.toFixed(1) + col; if (memo[k] !== v) { memo[k] = v; el.style.width = pct + '%'; el.style.background = col; } };

  h.update = (level, dt = 1 / 60) => {
    const w = level.weapon, p = level.player, seg = p.seg;
    setText('sc', rowScore, 'SCORE ' + run.score);
    setText('in', rowInfo, `COINS ${run.coins}    ${level.stageData.name.toUpperCase()}  ·  ACT ${seg.act}  ·  ${Math.max(0, p.body.s).toFixed(0)}/${level.layout.length.toFixed(0)} m`);
    setText('bm', bombs, 'BOMBS ' + '● '.repeat(Math.max(0, run.bombs)).trim() + (run.bombs <= 0 ? '—' : ''));
    const hpPct = Math.max(0, run.health); setW('hp', hp.fill, hpPct, hpPct > 50 ? '#3ddc6b' : hpPct > 25 ? '#f2c230' : '#e74c3c'); setText('hpn', hp.lab, 'HP ' + Math.round(run.health));
    const over_ = w.overheated; setW('ht', heat.fill, w.heat, over_ ? (Math.floor(w.time * 10) % 2 ? '#ff2a1a' : '#8a1c10') : w.heat > 70 ? '#ff8c1a' : '#5ac8ff');
    setText('htl', heat.lab, over_ ? 'LOCK' : 'HEAT');
    const chip = (k, on, label, color, frac) => {
      const c = chipEls[k];
      if (on !== c.on) { c.on = on; c.c.style.display = on ? 'block' : 'none'; if (on) { c.lab.textContent = label; c.c.style.borderColor = c.b.style.background = hex(color); } }
      if (on) c.b.style.width = (100 * frac).toFixed(0) + '%';
    };
    for (const k of TIMED) chip(k, w.timers[k] > 0, POWERUPS[k].label, POWERUPS[k].color, w.timers[k] / POWERUPS[k].time);
    chip('shield', w.shield, 'SHIELD', POWERUPS.shield.color, 1); chip('laser', run.upgrades.laser, 'LASER', PROJ.laser.color, 1); chip('lasso', run.upgrades.lasso, 'LASSO', PROJ.lasso.color, 1);
    const cb = level.combat.combo; if (cb.n >= 2) { combo.style.display = 'block'; setText('cb', combo, `COMBO x${cb.n}`); } else if (combo.style.display !== 'none') combo.style.display = 'none';
    const arenaState = level.arena?.state; banner.style.display = arenaState === 'opening' || arenaState === 'open' ? 'block' : 'none';
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.style.opacity = 0; }
    if (dbg.style.display !== 'none') dbg.textContent = level.debugLine?.() || '';
  };
  h.enableDebug = () => { dbg.style.display = 'block'; panel.style.top = '64px'; };

  // Timers advance with the simulation; projection happens each rendered frame.
  h.tick = (dt) => { for (const f of FT) if (f.on) { f.t -= dt; if (f.t <= 0) { f.on = false; f.el.style.display = 'none'; } } };
  h.render = () => {
    const cam = h.camera; if (!cam) return; const W = root.clientWidth, H = root.clientHeight;
    for (const f of FT) {
      if (!f.on) continue;
      const k = 1 - f.t / f.max; _v.copy(f.v); _v.y += k * 1.1; _v.project(cam);
      if (_v.z > 1) { f.el.style.display = 'none'; continue; }
      f.el.style.display = 'block'; f.el.style.opacity = Math.min(1, f.t / (f.max * 0.4));
      f.el.style.transform = `translate(${((_v.x * 0.5 + 0.5) * W).toFixed(0)}px,${((-_v.y * 0.5 + 0.5) * H).toFixed(0)}px) translate(-50%,-100%)`;
    }
  };
  h.reset = () => { for (const f of FT) { f.on = false; f.el.style.display = 'none'; } h.hideGameOver(); h.hideBoss(); };
  return h;
}
