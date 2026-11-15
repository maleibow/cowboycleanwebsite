import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss07Model } from './boss07Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// DOUBLE RAINBOW: flies a figure of eight over the arena trailing a rainbow beam (PLAN section 6).
//   enter (drops in) -> roar -> tele (flies to the start of the eight; the whole path is drawn on the floor) -> sweep (beam lit, he flies the eight) -> rain (hovers, fans of bombs on
//   marked circles) -> rest (sinks low, open to fire) -> tele ...
//   phase 2 below half health: rage roar (invulnerable, harmless), faster sweep, a second beam from the mirrored side of the eight, five-bomb fans, two clouds at the rage.
// Fairness: the path (a chain of floor markers) is on the floor >= 1.5 s before the beam lights and stays lit while he flies it; the beam is a column under him (a jump does not clear it,
// a step sideways does); each bomb has a circle on the floor for its whole fall (>= 1.1 s); while he flies at 4+ m his body cannot touch anyone.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
const TAU = Math.PI * 2;

function beamTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d');
  ['#ff3b30', '#ff9500', '#ffe135', '#34c759', '#32ade6', '#5856d6', '#af52de'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * (128 / 7), 0, 128 / 7 + 1, 8); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

export function spawnBoss07(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss7, model = createBoss07Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const tex = beamTexture(), beamGeo = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true).translate(0, -0.5, 0);
  const beams = [0, 1].map(() => { const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })); m.matrixAutoUpdate = false; m.visible = false; m.frustumCulled = false; ctx.scene.add(m); return m; });
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, eye: 0, mouth: 0, charge: 0, lean: 0, roll: 0, glow: 0, scale: 1, sq: 1, hy: T.intro.startHeight, face: 0, shX: 0, shZ: 0,
    th: 0, beamOn: false, hitCd: 0, volleysLeft: 0, volleyT: 0, sweepsLeft: 0, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.beams = beams;   // (read by the stage test)
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss7', A.s, 0, T.intro.startHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = 8;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const pathAt = (th, out) => { out.s = A.s + T.pathB * Math.sin(2 * th); out.x = T.pathA * Math.sin(th); return out; };
  const spark = (s, x, y, n = 14) => { for (let i = 0; i < 3; i++) ctx.fx.burst(s, x, y, [0xff3b30, 0xffe135, 0x32ade6][i], n, 6, 0.24); ctx.fx.burst(s, x, y, 0xffffff, 6, 4, 0.12, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(A.s + Math.cos(a) * 4, Math.sin(a) * 4, 1.2, {}); ctx.enemies.spawn('mud_cloud', q.s, q.x, 0, { active: true, tier: 2 }); } };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const drawPath = (dur) => { const q = {}; for (let k = 0; k < 11; k++) { pathAt((k / 11) * TAU, q); fx.marker(q.s, q.x, 0, T.beamR * 1.15, dur); } };
  const fan = () => {   // a line of bombs across the player's position, perpendicular to the line from the boss
    const p = K.pattern(), P = ctx.player.body, ds = P.s - e.s, dx = P.x - e.x, d = Math.hypot(ds, dx) || 1, ps = -dx / d, px = ds / d, q = {};
    for (let i = 0; i < p.bombs; i++) { const o = (i - (p.bombs - 1) / 2) * 2.7; arena.clampPoint(P.s + ps * o, P.x + px * o, 1.4, q); fx.strike(q.s, q.x, p.bombR, p.bombDelay, { damage: p.bombDamage, color: [0xff3b30, 0xffe135, 0x32ade6, 0x34c759, 0xaf52de][i % 5], size: 0.55, height: e.y + 0.5 }); }
    K.mouth = 1; K.volleysLeft--; K.volleyT = p.every; events.emit('prismBomb');
  };
  const showBeams = (on, t) => {
    const mirror = K.phase === 2 || on === 2;
    beams.forEach((m, i) => {
      const vis = on && (i === 0 || (i === 1 && K.phase === 2)); m.visible = vis; if (!vis) return;
      const s = i === 0 ? e.s : 2 * A.s - e.s, x = i === 0 ? e.x : -e.x, h = Math.max(0.5, e.y);
      placeMatrix(ctx.track, s, x, h, 0, T.beamR * 0.8, h, T.beamR * 0.8, _m); m.matrix.copy(_m); m.matrixWorldNeedsUpdate = true; m.material.map.offset.x = (t * 0.6 + i * 0.4) % 1; m.material.opacity = 0.65 + 0.2 * Math.sin(t * 18);
    });
    return mirror;
  };
  const hitBeams = (dt) => {
    K.hitCd = Math.max(0, K.hitCd - dt); if (!K.beamOn || K.hitCd > 0) return; const b = ctx.player.body;
    for (let i = 0; i < (K.phase === 2 ? 2 : 1); i++) { const s = i === 0 ? e.s : 2 * A.s - e.s, x = i === 0 ? e.x : -e.x; if (Math.hypot(b.s - s, b.x - x) < T.beamR + b.hx * 0.5 && b.y < e.y) { ctx.combat.damagePlayer(T.beamDamage); K.hitCd = 0.8; events.emit('beamOn'); break; } }
  };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.mouth = Math.max(0, K.mouth - dt * 3); K.charge = 0; K.lean = 0; K.roll = 0; K.sq = 1; K.eye = 0.3 + (K.phase - 1) * 0.5; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 3));
    const bob = Math.sin(K.t * 2.4) * 0.15;
    switch (K.state) {
      case 'enter': {
        const u = clamp01(K.st / T.intro.dropTime), a = (1 - u) * 3; K.hy = lerp(T.intro.startHeight, T.hoverY, u * u * (3 - 2 * u)); e.s = A.s + Math.sin(a) * 3 * (1 - u); e.x = Math.cos(a) * 5 * (1 - u); K.roll = 0.3 * (1 - u); K.eye = 0.1;
        if (u >= 1) { ctx.combat.shake(0.6); spark(e.s, e.x, e.y, 18); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.hy = T.hoverY + bob; K.mouth = 1; K.eye = 1; K.charge = 0.6; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.onReady?.(); go('tele'); drawPath(p.tele + p.sweep); } break; }
      case 'tele': { // flies to the start of the eight; the path is on the floor
        const ds = A.s - e.s, dx = 0 - e.x, d = Math.hypot(ds, dx), v = Math.min(10, d * 3) * dt; if (d > 0.2) { e.s += (ds / d) * v; e.x += (dx / d) * v; }
        K.hy = lerp(K.hy, T.hoverY, 0.1) + bob * 0.02; K.charge = clamp01(K.st / p.tele); K.eye = 0.7; K.shX = Math.sin(K.st * 35) * 0.05 * K.charge;
        if (K.st >= p.tele && !rageCheck()) { K.th = 0; K.beamOn = true; events.emit('beamOn'); go('sweep'); }
        break;
      }
      case 'sweep': {
        K.th = (K.st / p.sweep) * TAU; const q = {}; pathAt(K.th, q); e.s = q.s; e.x = q.x; K.hy = T.hoverY + Math.sin(K.th * 2) * 0.4; K.charge = 1; K.roll = -0.15 * Math.cos(K.th); K.lean = 0.08; K.eye = 1;
        if (K.st >= p.sweep) { K.beamOn = false; K.volleysLeft = p.volleys; K.volleyT = 0.4; go('rain'); }
        break;
      }
      case 'rain': { // hovers near the middle, dropping fans of bombs
        const ds = A.s - e.s, dx = P.x * 0.3 - e.x, d = Math.hypot(ds, dx); if (d > 0.3) { const v = Math.min(5, d * 2) * dt; e.s += (ds / d) * v; e.x += (dx / d) * v; } K.hy = T.hoverY + bob; K.lean = -0.1;
        K.volleyT -= dt; if (K.volleysLeft > 0 && K.volleyT <= 0) fan(); else if (K.volleysLeft <= 0 && K.volleyT < -0.4 && !rageCheck()) go('rest');
        break;
      }
      case 'rest': { // sinks low and mops his brow: open to fire
        K.hy = lerp(K.hy, T.restY, 0.08) + bob * 0.05; K.eye = 0.1; K.sq = 1.03 + Math.sin(K.st * 4) * 0.02; K.mouth = 0.3;
        if (K.st >= p.rest && !rageCheck()) { go('tele'); drawPath(p.tele + p.sweep); }
        break;
      }
      case 'rage': {
        if (K.st === dt) { K.phase = 2; K.beamOn = false; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.hy = lerp(K.hy, T.hoverY + 1, 0.1); K.mouth = 1; K.eye = 1; K.charge = 1; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(T.p2.minions); go('tele'); drawPath(T.p2.tele + T.p2.sweep); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.hy = lerp(K.hy, 1.2, 0.05); K.roll = Math.sin(K.st * 9) * 0.3 * (1 - u * 0.5); K.glow = Math.min(1.5, u * 1.7); K.mouth = 1; K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; spark(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 2.4, 4); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 7; i++) ctx.fx.burst(e.s, e.x, 1.2 + i * 0.3, [0xff3b30, 0xff9500, 0xffe135, 0x34c759, 0x32ade6, 0x5856d6, 0xaf52de][i], 14, 9, 0.24, true); ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = false; hitBeams(dt);
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.0);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; K.beamOn = false; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ eye: K.eye, mouth: K.mouth, charge: K.charge, lean: K.lean, roll: K.roll, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true; showBeams(K.beamOn && !K.done, K.t);
    fx.shadow(s, x, 0, 1.6 + Math.min(1.8, y * 0.25), 0.4 - Math.min(0.28, y * 0.05));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); for (const m of beams) ctx.scene.remove(m); beamGeo.dispose(); tex.dispose(); beams.forEach((m) => m.material.dispose()); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
