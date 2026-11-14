import { events } from '../core/events.js';
import { MONO, div, el, isolateKeys } from './dom.js';
import { MUSIC, ARTIST, ARTIST_URL, listenUrl } from '../data/music.js';

// Jukebox UI pieces (PLAN 8.2): the settings panel (title screen + pause menu), the HUD "now playing" chip, and the
// "Tracks you heard" list (results + game-over). All of them only read / ask the Jukebox (audio/jukebox.js).
const M = `font-family:${MONO};text-shadow:none;`;
const BTN = `${M}font-size:8px;padding:7px 8px;border:2px solid;border-radius:6px;cursor:pointer;user-select:none;text-align:center;flex:1;`;
const ON = 'background:#1db954;color:#000;border-color:#1db954', OFF = 'background:rgba(0,0,0,.6);color:#fff;border-color:#8e8e9a';

// Source switch (Game mix | Spotify | Synth) and two volume sliders. `parent` gets one self-contained box.
export function createJukeboxPanel(parent, jukebox, style = '') {
  const box = div(parent, `${M}display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.62);border:2px solid #8e44ad;pointer-events:auto;font-size:9px;color:#fff;${style}`);
  div(box, `font:20px Bangers,cursive;letter-spacing:2px;color:#d9b3ff;text-shadow:2px 2px 0 #000`, '♪ JUKEBOX');
  const row = div(box, 'display:flex;gap:5px'), btns = {};
  for (const s of jukebox.SOURCES) {
    const b = div(row, `${BTN}${OFF}`, jukebox.LABEL[s].toUpperCase());
    b.setAttribute('role', 'button'); b.tabIndex = 0; btns[s] = b;
    const pick = () => jukebox.set({ source: s });
    b.addEventListener('click', (e) => { e.stopPropagation(); pick(); });
    b.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); pick(); } });
  }
  const slider = (label, k) => {
    const r = div(box, 'display:flex;align-items:center;gap:8px'); div(r, 'width:52px', label);
    const i = el('input', r, 'flex:1;min-width:90px;accent-color:#1db954;cursor:pointer', { type: 'range', min: 0, max: 100, step: 1 });
    isolateKeys(i); i.setAttribute('aria-label', label + ' volume'); i.addEventListener('input', () => jukebox.set({ [k]: i.value / 100 }));
    return i;
  };
  const music = slider('MUSIC', 'music'), sfx = slider('SFX', 'sfx');
  const now = div(box, 'line-height:1.6;opacity:.9;min-height:14px');
  const sync = () => {
    const c = jukebox.cfg; for (const s of jukebox.SOURCES) btns[s].style.cssText = BTN + (c.source === s ? ON : OFF);
    music.value = Math.round(c.music * 100); sfx.value = Math.round(c.sfx * 100); music.disabled = c.source === 'spotify';
    const n = jukebox.nowPlaying; now.textContent = c.source === 'spotify' ? 'Press play in the Spotify player' : `♪ ${n.title}`;
  };
  events.on('jukeboxChanged', sync); events.on('musicChanged', sync); sync();
  return box;
}

// HUD chip: "♪ Track title · Game mix". Clicks pass through (the HUD ignores the pointer).
export function createNowPlaying(root, jukebox) {
  const chip = div(root, `${M}position:absolute;left:60px;bottom:16px;max-width:46%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:9px;line-height:1.4;color:#fff;background:rgba(0,0,0,.55);border:2px solid #8e44ad;border-radius:14px;padding:6px 12px;display:none`);
  const sync = () => { const n = jukebox.nowPlaying; chip.textContent = `♪ ${n.title} · ${n.label}${n.source === 'mix' && n.voice === 'synth' ? ' (synth)' : ''}`; chip.style.display = 'block'; };
  events.on('musicChanged', sync); sync(); return chip;
}

// "TRACKS YOU HEARD": every track that played this run, each with a Listen link; plus the artist Follow link.
export function createTrackList(parent, jukebox, style = '') {
  const box = div(parent, `${M}display:none;flex-direction:column;gap:6px;padding:10px 14px;border-radius:8px;background:rgba(0,0,0,.55);border:2px solid #1db954;box-sizing:border-box;width:100%;max-width:360px;pointer-events:auto;${style}`);
  div(box, 'font:22px Bangers,cursive;letter-spacing:2px;color:#1ed760;text-align:center;text-shadow:2px 2px 0 #000', 'TRACKS YOU HEARD');
  const list = div(box, 'display:flex;flex-direction:column;gap:5px;font-size:8px;line-height:1.6;color:#fff');
  const a = el('a', box, 'color:#1ed760;font-size:9px;text-align:center;text-decoration:underline;pointer-events:auto', { href: ARTIST_URL, target: '_blank', rel: 'noopener', textContent: `Follow ${ARTIST} on Spotify` });
  a.addEventListener('pointerdown', (e) => e.stopPropagation());
  return {
    el: box,
    refresh() {
      list.replaceChildren(); const keys = jukebox.heard; box.style.display = keys.length ? 'flex' : 'none';
      for (const k of keys) {
        const s = MUSIC[k], row = div(list, 'display:flex;justify-content:space-between;gap:10px;align-items:baseline');
        div(row, '', `${k === 'boss' ? 'BOSS' : k === 'saloon' ? 'SALOON' : k.replace('stage', 'STAGE ')}: ${s.title}`);
        const l = el('a', row, 'color:#1ed760;text-decoration:underline;white-space:nowrap;pointer-events:auto', { href: listenUrl(s), target: '_blank', rel: 'noopener', textContent: 'Listen' });
        l.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
    },
  };
}
