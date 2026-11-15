import * as THREE from 'three';
import { events } from '../core/events.js';
import { reducedMotion } from '../core/settings.js';
import { addHitStop } from '../core/hitstop.js';

// The 2D half of the juice pass (the original's polish layer, cleaningup.html 8607-8900, redone for the 3D game):
//   speed lines when sliding / boosted / being chased, a pulsing low-health vignette (+ heartbeat), coins that arc from the
//   pickup to the coin counter, the stage-clear "clean wave" ring, and the hit-stop triggers (core/hitstop.js).
// Everything is pooled / drawn into fixed buffers: nothing allocates per frame. Reduced motion (core/settings.js) turns off
// speed lines, flashes, the arcs' flight, the wave sweep and hit-stop; the steady low-health vignette stays, without pulsing.
const css = (el, s) => { el.style.cssText = s; return el; };
const _v = new THREE.Vector3();
const LOW_HP = 35, HEARTBEAT_HP = 25, COIN_POOL = 14, COIN_TIME = 0.55;

export function createJuice(root, h, { counterEl }) {
  const api = { speedK: 0 };
  const style = document.createElement('style');
  style.textContent = '@keyframes cc-pop{0%{transform:translateX(-50%) scale(1.7) rotate(-4deg)}60%{transform:translateX(-50%) scale(.94) rotate(1deg)}100%{transform:translateX(-50%) scale(1) rotate(0)}}@keyframes cc-bump{0%{transform:scale(1.28)}100%{transform:scale(1)}}';
  document.head.appendChild(style);

  // ---- speed lines: one small canvas, streaks radiating from the middle, drawn only while visible
  const cv = css(document.createElement('canvas'), 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0');
  cv.width = 320; cv.height = 180; root.insertBefore(cv, root.firstChild);
  const g = cv.getContext('2d'); let drawn = false;
  const N = 22, ang = new Float32Array(N), off = new Float32Array(N), len = new Float32Array(N);
  for (let i = 0; i < N; i++) { ang[i] = i * 2.39996; off[i] = (i * 0.618034) % 1; len[i] = 0.12 + ((i * 0.381966) % 1) * 0.2; }
  const drawLines = (k, t) => {
    g.clearRect(0, 0, 320, 180); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.85)';
    const cx = 160, cy = 92, R = 190;
    for (let i = 0; i < N; i++) {
      const f = (off[i] + t * (1.3 + (i % 3) * 0.4)) % 1, r0 = (0.36 + f * 0.5) * R, r1 = r0 + len[i] * R * (0.5 + k), a = ang[i], ca = Math.cos(a), sa = Math.sin(a);
      g.lineWidth = 1 + 1.6 * (1 - f) * k;
      g.beginPath(); g.moveTo(cx + ca * r0, cy + sa * r0 * 0.62); g.lineTo(cx + ca * r1, cy + sa * r1 * 0.62); g.stroke();
    }
    drawn = true;
  };

  // ---- low-health vignette (the original's red edge below 35 hp) and heartbeat
  const vig = css(document.createElement('div'), 'position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 42%,rgba(200,0,0,.2) 72%,rgba(170,0,0,.78) 100%)');
  vig.id = 'hud-lowhp'; root.insertBefore(vig, root.firstChild);
  let vigOp = -1, beatT = 0;

  // ---- coin arcs: DOM coins fly from the pickup to the coin counter along a quadratic curve
  const coins = Array.from({ length: COIN_POOL }, () => ({ el: css(document.createElement('div'), 'position:absolute;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7b0,#f1c40f 60%,#b8860b);border:2px solid #7a5a08;box-sizing:border-box;display:none;pointer-events:none;will-change:transform'), on: false, t: 0, x0: 0, y0: 0, cx: 0, cy: 0 }));
  for (const c of coins) root.appendChild(c.el);
  let tx = 70, ty = 52, targetAt = -1e9, lastT = performance.now(), bump = 0;
  const target = (now) => { if (now - targetAt < 800) return; targetAt = now; const r = counterEl.getBoundingClientRect(), p = root.getBoundingClientRect(); const k = p.width / root.clientWidth || 1; tx = (r.left - p.left) / k + 26; ty = (r.top - p.top) / k + 12; };   // the HUD may be scaled down on short screens
  api.coinFly = (s, x, y) => {
    if (reducedMotion() || !h.track || !h.camera) return;
    const c = coins.find((q) => !q.on); if (!c) return;
    h.track.toWorld(s, x, y, _v); _v.project(h.camera); if (_v.z > 1) return;
    const W = root.clientWidth, H = root.clientHeight, now = performance.now(); target(now);
    c.x0 = (_v.x * 0.5 + 0.5) * W; c.y0 = (-_v.y * 0.5 + 0.5) * H; c.cx = (c.x0 + tx) / 2 + (Math.random() - 0.5) * 60; c.cy = Math.min(c.y0, ty) - 70 - Math.random() * 40;
    c.on = true; c.t = 0; c.el.style.display = 'block';
  };
  const bumpCounter = () => { if (reducedMotion()) return; counterEl.style.animation = 'none'; void counterEl.offsetWidth; counterEl.style.animation = 'cc-bump .22s ease-out'; };

  // ---- the clean wave ring at stage clear (the colour flood itself is the grime shader, driven by arena.wash)
  const ring = css(document.createElement('div'), 'position:absolute;left:50%;top:52%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;border-radius:50%;pointer-events:none;opacity:0;transform:scale(.02);background:radial-gradient(circle,rgba(255,255,255,0) 52%,rgba(170,245,255,.55) 58%,rgba(255,255,255,.9) 60%,rgba(170,245,255,0) 66%)');
  root.appendChild(ring);
  api.cleanWave = () => {
    if (reducedMotion()) return;
    ring.style.transition = 'none'; ring.style.opacity = 1; ring.style.transform = 'scale(.02)'; void ring.offsetWidth;
    ring.style.transition = 'transform 1.3s cubic-bezier(.2,.7,.3,1),opacity 1.3s ease-in'; ring.style.transform = 'scale(1)'; ring.style.opacity = 0;
  };

  // ---- per-frame
  let t = 0;
  api.update = (level, dt) => {        // called from hud.update, once per simulation step
    t += dt; const p = level.player, b = p.body;
    const speed = Math.hypot(b.vs, b.vx), max = p.maxSpeed();
    let want = Math.max(0, Math.min(1, (speed - max * 1.02) / (max * 0.35)));
    if (level.hazard.active) want = Math.max(want, 0.55);
    if (reducedMotion()) want = 0;
    api.speedK += (want - api.speedK) * Math.min(1, 8 * dt);
    if (api.speedK < 0.02 && want === 0) api.speedK = 0;
  };
  api.lowHealth = (hp, dt) => {
    const k = hp > 0 && hp < LOW_HP ? (LOW_HP - hp) / LOW_HP : 0;
    const op = k === 0 ? 0 : reducedMotion() ? 0.5 + 0.3 * k : (0.55 + 0.45 * k) * (0.7 + 0.3 * Math.sin(t * (4 + 4 * k)));
    const q = Math.round(op * 40) / 40; if (q !== vigOp) { vigOp = q; vig.style.opacity = q; }
    if (hp > 0 && hp < HEARTBEAT_HP) { beatT -= dt; if (beatT <= 0) { beatT = 0.95 - 0.35 * (HEARTBEAT_HP - hp) / HEARTBEAT_HP; events.emit('heartbeat'); } } else beatT = 0;
  };
  api.render = () => {                  // called from hud.render, once per rendered frame
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (api.speedK > 0.02) { cv.style.opacity = Math.min(0.85, api.speedK).toFixed(2); drawLines(api.speedK, now / 1000); }
    else if (drawn) { cv.style.opacity = 0; g.clearRect(0, 0, 320, 180); drawn = false; }
    for (const c of coins) {
      if (!c.on) continue;
      c.t += dt / COIN_TIME; const u = Math.min(1, c.t), e = u * u * (3 - 2 * u), a = 1 - e;
      const x = a * a * c.x0 + 2 * a * e * c.cx + e * e * tx, y = a * a * c.y0 + 2 * a * e * c.cy + e * e * ty;
      c.el.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px) scale(${(1 - 0.35 * u).toFixed(2)})`;
      if (c.t >= 1) { c.on = false; c.el.style.display = 'none'; bump = 1; }
    }
    if (bump) { bump = 0; bumpCounter(); }
  };
  api.reset = () => { for (const c of coins) { c.on = false; c.el.style.display = 'none'; } api.speedK = 0; vigOp = -1; vig.style.opacity = 0; ring.style.opacity = 0; };

  // ---- hit-stop: a few frames of freeze on the moments that should land hard (PLAN 4 "Motion")
  events.on('enemyKilled', (e) => addHitStop(e?.type?.startsWith('boss') ? 0.14 : 0.04));
  events.on('hurt', () => addHitStop(0.07));
  events.on('bomb', () => addHitStop(0.09));
  events.on('bossCrash', () => addHitStop(0.08));
  events.on('stageCleared', () => api.cleanWave());
  return api;
}
