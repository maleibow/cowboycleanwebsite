import * as THREE from 'three';
import { createBatch, shapes } from './instanced.js';
import { groundAt, rndRange } from './enemyAI.js';
import { pxs } from '../data/weapons.js';
import { OBSTACLE_MODELS } from './propModels.js';
import { createToon } from '../render/materials.js';

// The stage's low obstacle: rolls down the path toward the player (PLAN 1.1) or sits still as a static hazard.
// Obstacles are NOT damage dealers in the original: touching one just shoves the player (7416-7433), so they are
// collision boxes in the player's query (track.dyn). Jump or slide-hop over them. Sizes here are grey-box.
export const OBSTACLES = {
  sand_pile:  { shape: 'ball', hs: 0.9,  hx: 0.9,  h: 0.9,  color: 0xd9b36b },
  log:        { shape: 'cyl',  hs: 0.5,  hx: 1.2,  h: 0.9,  color: 0x7a5230 },
  barrel:     { shape: 'cyl',  hs: 0.55, hx: 0.55, h: 1.0,  color: 0x8a4b2a },
  trash_can:  { shape: 'cyl',  hs: 0.5,  hx: 0.5,  h: 1.0,  color: 0x7f8c8d },
  cafe_chair: { shape: 'box',  hs: 0.5,  hx: 0.5,  h: 0.95, color: 0xb5651d },
  ash_pile:   { shape: 'ball', hs: 0.95, hx: 0.95, h: 0.85, color: 0x555a60 },
  cloud_bump: { shape: 'ball', hs: 0.95, hx: 0.95, h: 0.9,  color: 0xf4f6ff },
  sleep_sheep:{ shape: 'ball', hs: 0.8,  hx: 0.8,  h: 0.9,  color: 0xfff7e6 },
  gravestone: { shape: 'box',  hs: 0.3,  hx: 0.6,  h: 1.0,  color: 0x9aa0a6 },
  coal_pile:  { shape: 'ball', hs: 0.95, hx: 0.95, h: 0.9,  color: 0x2b2b30 },
};
export const ROLL_SPEED = pxs(3);   // a lump rolling toward you moves about as fast as a walker (3 px/frame)
const ROLL_SEGMENTS = new Set(['flat', 'curve', 'climb', 'drop', 'rest']);
const CAP = 24, AMBIENT = [6, 11];  // 3D tuning: the original dropped one every 2-5 s on a one-screen arena

export function createObstacles(ctx, scene, track) {
  track.dyn = [];
  const pool = Array.from({ length: CAP }, () => ({ on: false, type: 'sand_pile', def: OBSTACLES.sand_pile, s: 0, x: 0, y: 0, p0s: 0, rolling: false, started: false, spin: 0, box: { s0: 0, s1: 0, x0: 0, x1: 0, y0: 0, y1: 0, kind: 'obstacle' }, slot: -1 }));
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const batches = { ball: createBatch(scene, track, shapes.ball(), lit, CAP), cyl: createBatch(scene, track, shapes.cyl(), lit, CAP), box: createBatch(scene, track, shapes.box(), lit, CAP) };
  const models = {}; for (const [k, m] of Object.entries(OBSTACLE_MODELS)) models[k] = createBatch(scene, track, m.build(), createToon({ vertexColors: true, grime: false, rimStrength: 0.8 }), CAP);
  const list = [], _w = new THREE.Vector3();
  let timer = rndRange(AMBIENT[0], AMBIENT[1]);
  const api = { list, rolling: 0 };

  const sync = (o) => { const b = o.box, d = o.def; b.s0 = o.s - d.hs; b.s1 = o.s + d.hs; b.x0 = o.x - d.hx; b.x1 = o.x + d.hx; b.y0 = o.y; b.y1 = o.y + d.h; };
  api.spawn = (type, s, x, y, rolling, slot = -1) => {
    const o = pool.find((q) => !q.on); if (!o) return null;
    o.on = true; o.type = type; o.def = OBSTACLES[type] || OBSTACLES.sand_pile; o.s = o.p0s = s; o.x = x; o.y = y; o.rolling = rolling; o.started = false; o.spin = 0; o.slot = slot;
    sync(o); list.push(o); track.dyn.push(o.box);
    return o;
  };
  const remove = (o) => {
    o.on = false; let i = list.indexOf(o); if (i >= 0) { list[i] = list[list.length - 1]; list.pop(); }
    i = track.dyn.indexOf(o.box); if (i >= 0) { track.dyn[i] = track.dyn[track.dyn.length - 1]; track.dyn.pop(); }
  };

  // Timed ambient roller: rolls from ahead on plain ground in a normal (behind-camera) segment.
  const spawnRoller = () => {
    const b = ctx.player.body, s = b.s + 42, seg = track.segmentAt(s);
    if (!ROLL_SEGMENTS.has(seg.name)) return; // plain running ground only: never on gaps, barriers, beams or special sections
    const x = (Math.random() - 0.5) * seg.width * 0.5, g = groundAt(track, s, x, 6, 8);
    if (g === -Infinity) return;
    api.spawn(ctx.stageData.obstacle, s, x, g, true);
  };

  api.update = (dt) => {
    const b = ctx.player.body; api.rolling = 0;
    if (ctx.spawnEnabled) { timer -= dt; if (timer <= 0) { timer = rndRange(AMBIENT[0], AMBIENT[1]); spawnRoller(); } }
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i]; o.p0s = o.s;
      if (o.s < b.s - 30) { remove(o); continue; }
      if (o.rolling) {
        if (!o.started && o.s - b.s < 38) o.started = true;
        if (o.started) {
          api.rolling++;
          o.s -= ROLL_SPEED * dt; o.spin += dt * 4;
          const g = groundAt(track, o.s, o.x, o.y, 0.6);
          if (g === -Infinity) { o.y -= 12 * dt * 2; if (o.y < -6) { remove(o); continue; } } else o.y = g;
        }
      }
      sync(o);
    }
  };

  api.render = (alpha) => {
    for (const k in batches) batches[k].begin();
    for (const k in models) models[k].begin();
    for (const o of list) {
      const d = o.def, s = o.p0s + (o.s - o.p0s) * alpha, m = OBSTACLE_MODELS[o.type];
      if (m && models[o.type]) {   // modelled: a rolling one rocks forward and back as it slides in, shedding dust
        const rock = o.rolling && o.started ? Math.sin(o.spin * 1.6) * m.rock : 0;
        models[o.type].put(s, o.x, o.y, d.hx / 0.9, d.h / 0.9, d.hs / 0.9, 0xffffff, o.rolling ? Math.sin(o.spin * 0.5) * 0.25 : 0, rock);
        if (m.dust && o.rolling && o.started && ctx.particles && Math.random() < 0.25) { track.toWorld(s, o.x, o.y + 0.15, _w); ctx.particles.emit('dust', _w.x, _w.y, _w.z, { count: 0.5, scale: 0.9 }); }
        continue;
      }
      batches[d.shape].put(s, o.x, o.y, d.hx * 2, d.h, d.hs * 2, d.color, o.rolling ? o.spin : 0);
    }
    for (const k in batches) batches[k].end();
    for (const k in models) models[k].end();
  };
  api.clear = () => { for (const o of [...list]) remove(o); timer = rndRange(AMBIENT[0], AMBIENT[1]); };
  return api;
}
