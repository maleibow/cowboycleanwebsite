// Full-screen cards drawn over the game (DOM): stage intro, boss title, stage-clear tally.
// Plain functions of the stage data, so every stage gets the same cards for free.
import { ARTIST, ARTIST_URL, slotFor, listenUrl } from '../data/music.js';
const FONT = 'Bangers,cursive';
const css = (el, s) => { el.style.cssText = s; return el; };
const div = (parent, s, text = '') => { const d = css(document.createElement('div'), s); if (text) d.textContent = text; parent?.appendChild(d); return d; };
import { reducedMotion } from '../core/settings.js';
import { createControlsCard } from './controlsCard.js';
const TEXT = `font-family:${FONT};color:#fff;letter-spacing:2px;text-shadow:3px 3px 0 #000;`;
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function createStageCards(root) {
  const api = { introOpen: false, clearOpen: false };

  // ---- stage intro: name, tagline, track credit. Any key / click / pad button closes it early.
  const intro = div(root, `position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(90deg,transparent,rgba(20,6,30,.82) 18%,rgba(20,6,30,.82) 82%,transparent);${TEXT}pointer-events:auto;transition:opacity .5s`);
  const iNum = div(intro, 'font-size:30px;color:#ff9a52'), iName = div(intro, 'font-size:104px;line-height:1;color:#ffd84a;text-align:center'), iTag = div(intro, 'font-size:26px;opacity:.9;margin-top:8px;text-align:center;max-width:70%');
  const iTrack = div(intro, 'font-size:22px;margin-top:34px;padding:6px 18px;border:2px solid rgba(255,255,255,.55);border-radius:30px;background:rgba(0,0,0,.35)');
  // Listen / Follow buttons (PLAN 8.2). Pointing at them holds the card open so they can be clicked.
  const links = div(intro, 'display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;justify-content:center');
  const spLink = (label, bg) => { const a = document.createElement('a'); a.textContent = label; a.target = '_blank'; a.rel = 'noopener'; a.style.cssText = `${TEXT}font-size:20px;padding:4px 16px;border-radius:20px;background:${bg};color:#000;text-shadow:none;text-decoration:none;cursor:pointer;pointer-events:auto`; a.addEventListener('pointerdown', (e) => e.stopPropagation()); a.addEventListener('pointerenter', () => clearTimeout(introTimer)); a.addEventListener('pointerleave', () => { if (api.introOpen) introTimer = setTimeout(closeIntro, 2500); }); links.appendChild(a); return a; };
  const listenA = spLink('Listen on Spotify', '#1ed760'), followA = spLink('Follow', '#fff'); followA.href = ARTIST_URL;
  const hint = div(intro, 'font-size:16px;opacity:.65;margin-top:18px', 'tap or press any key');
  const loadBar = div(intro, 'width:min(320px,60%);height:12px;margin-top:16px;background:rgba(0,0,0,.55);border:2px solid #fff;border-radius:8px;overflow:hidden;display:none'), loadFill = div(loadBar, 'height:100%;width:0;background:#ffd84a;transition:width .15s');
  const introKeys = createControlsCard(intro, 'position:absolute;right:3%;bottom:6%;width:min(250px,27%)');   // reminder of the keys (SLIDE highlighted) while the stage loads
  let introDone = null, introTimer = 0;
  let loading = null, wantClose = false;      // the stage is still being built (0..1): the card stays up until it is ready
  const closeIntro = () => { if (!api.introOpen) return; if (loading !== null) { wantClose = true; return; } api.introOpen = false; intro.style.opacity = 0; setTimeout(() => { intro.style.display = 'none'; }, 500); clearTimeout(introTimer); removeEventListener('keydown', closeIntro); intro.removeEventListener('pointerdown', closeIntro); const f = introDone; introDone = null; f?.(); };
  api.showIntro = (stage, onDone, secs = 3.6) => {
    iNum.textContent = `STAGE ${stage.id}`; iName.textContent = stage.name.toUpperCase(); iTag.textContent = stage.tagline || '';
    const track = slotFor(stage.id); iTrack.textContent = `♪  ${track.title}  —  ${ARTIST}`; listenA.href = listenUrl(track);
    introKeys.refresh(); intro.style.display = 'flex'; intro.style.opacity = 1; api.introOpen = true; introDone = onDone;
    introTimer = setTimeout(closeIntro, secs * 1000); setTimeout(() => { if (api.introOpen) addEventListener('keydown', closeIntro); }, 350); intro.addEventListener('pointerdown', closeIntro);
  };
  api.setLoading = (f) => {
    if (f === loading) return; loading = f;
    if (f === null) { loadBar.style.display = 'none'; hint.textContent = 'tap or press any key'; if (wantClose) { wantClose = false; closeIntro(); } return; }
    loadBar.style.display = 'block'; loadFill.style.width = Math.round(f * 100) + '%'; hint.textContent = 'building the stage...';
  };
  api.pollPad = (input) => { if (api.introOpen && (input.jumpPressed || input.bombPressed || input.pausePressed)) closeIntro(); };

  // ---- boss title: slides in when the boss lands
  const boss = div(root, `position:absolute;left:0;right:0;top:34%;text-align:center;${TEXT}opacity:0;transform:scale(1.4);transition:opacity .35s,transform .35s;pointer-events:none`); if (reducedMotion()) boss.style.transform = 'none';
  const bName = div(boss, 'font-size:110px;line-height:1;color:#e74c3c;text-shadow:4px 4px 0 #000,0 0 30px rgba(190,60,220,.8)'), bLine = div(boss, 'font-size:28px;color:#ffd84a;margin-top:4px');
  // cinematic bars: slide in while the name card shows (plain fade with reduced motion)
  const bar = (pos) => div(root, `position:absolute;left:0;right:0;${pos}:0;height:11%;background:#000;pointer-events:none;transform:translateY(${pos === 'top' ? '-100%' : '100%'});transition:transform .4s ease-out,opacity .4s`);
  const barT = bar('top'), barB = bar('bottom');
  let bossT = 0, barsT = 0;
  api.showBoss = (name, line) => {
    bName.textContent = name; bLine.textContent = line || ''; boss.style.opacity = 1; boss.style.transform = reducedMotion() ? 'none' : 'scale(1)';
    for (const b of [barT, barB]) { b.style.opacity = 1; b.style.transform = 'translateY(0)'; }
    clearTimeout(bossT); clearTimeout(barsT);
    bossT = setTimeout(() => { boss.style.opacity = 0; boss.style.transform = reducedMotion() ? 'none' : 'scale(.9)'; }, 2300);
    barsT = setTimeout(() => { barT.style.transform = 'translateY(-100%)'; barB.style.transform = 'translateY(100%)'; }, 2500);
  };

  // ---- a big shout in the middle of the screen (chase warning, "RUN!", "CHECKPOINT")
  const shout = div(root, `position:absolute;left:0;right:0;top:22%;text-align:center;${TEXT}font-size:72px;color:#ff5a3a;opacity:0;transition:opacity .2s;pointer-events:none`);
  let shoutT = 0;
  api.shout = (text, color = '#ff5a3a', ms = 1600) => { shout.textContent = text; shout.style.color = color; shout.style.opacity = 1; clearTimeout(shoutT); shoutT = setTimeout(() => { shout.style.opacity = 0; }, ms); };

  // ---- stage clear tally: rows count up one after another
  const clear = div(root, `position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:radial-gradient(rgba(10,30,50,.55),rgba(5,12,24,.88));${TEXT}pointer-events:auto`);
  const cTitle = div(clear, 'font-size:92px;color:#7fe8ff;text-shadow:3px 3px 0 #000,0 0 24px rgba(127,232,255,.8)', 'STAGE CLEAN!'), cName = div(clear, 'font-size:26px;opacity:.85;margin-bottom:14px');
  const table = div(clear, 'display:grid;grid-template-columns:auto auto;gap:6px 46px;font-size:34px;min-width:380px'), rows = {};
  for (const [k, label] of [['score', 'SCORE'], ['coins', 'COINS'], ['kills', 'GRIME CLEANED'], ['time', 'TIME']]) { div(table, 'text-align:left;opacity:.9', label); rows[k] = div(table, 'text-align:right;color:#ffd84a;opacity:0;transition:opacity .25s'); }
  const cTotal = div(clear, 'font-size:46px;margin-top:14px;color:#ffd84a;opacity:0;transition:opacity .3s');
  const cHint = div(clear, 'font-size:20px;margin-top:20px;opacity:.0;transition:opacity .4s;cursor:pointer;padding:6px 20px;border:3px solid #fff;border-radius:8px', 'CONTINUE  [Enter]');
  let onContinue = null, raf = 0;
  const finish = () => { if (!api.clearOpen || cHint.style.opacity < 1) return; api.hideClear(); const f = onContinue; onContinue = null; f?.(); };
  cHint.addEventListener('click', finish);
  addEventListener('keydown', (e) => { if (api.clearOpen && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !e.repeat) finish(); });
  api.showClear = (stage, stats, cont) => {
    cName.textContent = stage.name.toUpperCase(); clear.style.display = 'flex'; api.clearOpen = true; onContinue = cont;
    const vals = { score: stats.gained, coins: stats.coins, kills: stats.kills, time: stats.time }, fmt = { time: fmtTime }, order = ['score', 'coins', 'kills', 'time'];
    for (const k of order) { rows[k].style.opacity = 0; rows[k].textContent = '0'; } cTotal.style.opacity = 0; cHint.style.opacity = 0;
    let i = 0, t0 = performance.now();
    const step = (now) => {
      const k = order[i]; if (!k) { cTotal.textContent = `TOTAL  ${stats.score}`; cTotal.style.opacity = 1; cHint.style.opacity = 1; return; }
      const u = Math.min(1, (now - t0) / 700); rows[k].style.opacity = 1; rows[k].textContent = (fmt[k] || ((v) => Math.round(v)))(vals[k] * u);
      if (u >= 1) { i++; t0 = now + 120; } raf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf); raf = requestAnimationFrame(step);
  };
  api.hideClear = () => { api.clearOpen = false; clear.style.display = 'none'; cancelAnimationFrame(raf); };
  api.reset = () => { api.hideClear(); loading = null; wantClose = false; loadBar.style.display = 'none'; closeIntro(); boss.style.opacity = 0; shout.style.opacity = 0; clearTimeout(bossT); clearTimeout(barsT); barT.style.transform = 'translateY(-100%)'; barB.style.transform = 'translateY(100%)'; };
  return api;
}
