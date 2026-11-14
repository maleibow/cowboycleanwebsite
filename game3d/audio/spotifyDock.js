import { spotifyFor } from '../data/music.js';

// Spotify mode (PLAN 8.1): the OFFICIAL Spotify embed, docked in a corner of the game box. Rules it keeps:
//   - always visible and never covered (it sits above every game screen), never hidden while Spotify mode is on;
//   - never started by the game: the listener must press play ("Press play to listen on Spotify");
//   - it cannot be read, looped or synced, so beat effects are off in this mode (the Jukebox decides that).
// Uses Spotify's iFrame API when it loads (loadUri swaps the track without rebuilding the player); if the script is
// blocked or slow, a plain embed iframe is used instead and reloaded by changing its src.
const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
const W = 300, H = 80;                                // Spotify's compact player

export function createSpotifyDock(box) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:absolute;left:12px;bottom:60px;z-index:60;width:${W}px;display:none;flex-direction:column;gap:4px;pointer-events:auto;max-width:calc(100% - 24px)`;
  const label = document.createElement('div');
  label.style.cssText = 'font:16px/1.1 Bangers,cursive;letter-spacing:1px;color:#fff;background:rgba(0,0,0,.72);border:2px solid #1db954;border-radius:8px;padding:4px 10px;text-shadow:2px 2px 0 #000';
  label.textContent = 'Press play to listen on Spotify';
  const host = document.createElement('div');
  host.style.cssText = `width:100%;height:${H}px;border-radius:12px;overflow:hidden;background:#121212`;
  wrap.append(label, host); box.appendChild(wrap);
  wrap.addEventListener('pointerdown', (e) => e.stopPropagation());   // a click on the player must not reach the game

  let ctl = null, apiObj = null, apiState = 'idle', current = null, frame = null, shown = false, mounting = false;   // apiState: idle | loading | ready | failed
  const mount = () => {                                 // build the API controller once (again after a hide: hiding destroys the player so it stops)
    if (ctl || mounting || !apiObj || !shown) return; mounting = true;
    const first = document.createElement('div'); host.replaceChildren(first);
    apiObj.createController(first, { uri: current.uri, width: '100%', height: H }, (c) => { mounting = false; if (!shown) { try { c.destroy(); } catch { /* gone */ } host.replaceChildren(); } else ctl = c; });
  };
  const loadApi = () => {
    if (apiState !== 'idle') return; apiState = 'loading';
    const giveUp = setTimeout(() => { if (apiState === 'loading') { apiState = 'failed'; render(); } }, 4000);
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(giveUp); if (apiState === 'failed') return; apiObj = api; apiState = 'ready'; mount(); };
    const s = document.createElement('script'); s.src = API_SRC; s.async = true; s.onerror = () => { clearTimeout(giveUp); apiState = 'failed'; render(); };
    document.head.appendChild(s);
  };
  const plain = () => {                                 // fallback: an ordinary embed iframe; changing src reloads it
    if (!current) return;
    if (!frame) { frame = document.createElement('iframe'); frame.style.cssText = 'width:100%;height:100%;border:0'; frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'; host.replaceChildren(frame); }
    if (frame.dataset.src !== current.embed) { frame.dataset.src = current.embed; frame.src = current.embed; }
  };
  function render() {
    if (!shown || !current) return;
    if (apiState === 'idle') loadApi();
    if (apiState === 'ready') { if (ctl) ctl.loadUri(current.uri); else mount(); }   // loadUri swaps the track for the new stage; never ctl.play(): the listener presses play
    else if (apiState === 'failed') plain();
  }
  return {
    get visible() { return shown; },
    // Show the embed for a music slot (its track, or the artist page while the track link is still empty).
    show(slotObj) {
      const next = spotifyFor(slotObj); const changed = !current || current.uri !== next.uri;
      current = next; shown = true; wrap.style.display = 'flex';
      label.textContent = slotObj && next.type === 'track' ? 'Press play to listen on Spotify' : 'Press play to listen on Spotify (Cowboy Clean)';
      if (changed || apiState === 'idle' || (!ctl && !frame)) render();
    },
    hide() {                                              // leaving Spotify mode removes the player, so nothing keeps playing unseen
      shown = false; wrap.style.display = 'none';
      if (ctl) { try { ctl.destroy(); } catch { /* already gone */ } ctl = null; }
      frame = null; host.replaceChildren();
    },
  };
}
