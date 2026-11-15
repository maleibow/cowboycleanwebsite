// Segment templates (PLAN 3.3). Each build(c) returns a segment-relative description:
//   { len, yaw, rise, mode, lockX, spans[], solids[], deco[], gaps[], slots[], chase?, checkpoint?, gate? }
// c = { rng, w (track width) }. All s values are relative to the segment start.
//   spans  = walkable ground boxes { s0, s1, x0, x1, top, depth, kind }
//   solids = non-walkable colliders (barrier, wall) { s0,s1,x0,x1,y0,y1,kind }
//   deco   = visual only boxes + colour
//   gaps   = holes in the path the player must cross { s0, s1 }
//   slots  = spawn slots for enemies / pickups / obstacles / the casino door
import { extraTemplates } from './segmentsX.js';
import { parisTemplates } from './segmentsY.js';
import { volcanoTemplates } from './segmentsV.js';
import { islandTemplates } from './segmentsI.js';
import { cloudTemplates } from './segmentsC.js';
import { hauntedTemplates } from './segmentsG.js';
import { charcoalTemplates } from './segmentsK.js';
export const JUMP_MAX_GAP = 5.2; // widest hole a full-speed jump clears with margin

const r1 = (v) => Math.round(v * 2) / 2;
const ground = (s0, s1, w, top = 0, kind = 'ground', depth = 3) =>
  ({ s0, s1, x0: -w / 2, x1: w / 2, top, depth, kind });
const slot = (kind, s, x, y, extra) => ({ kind, s, x, y, ...extra });
const coin = (s, x, y = 0.8) => slot('pickup', s, x, y, { role: 'coin' });
const item = (s, x, y = 0.8) => slot('pickup', s, x, y, { role: 'item' });
const foe = (s, x, y = 0, air = false) => slot('enemy', s, x, air ? y + 3 : y, { air });

// Fills ground spans with enemy / coin / item / obstacle slots, staying 3 m clear of edges.
function populate(c, spans, { items = 1, obstacle = false, enemies = true } = {}) {
  const { rng, w } = c; const out = [];
  const usable = spans.filter((p) => p.s1 - p.s0 >= 9);
  let itemsLeft = items;
  for (const p of usable) {
    const a = p.s0 + 3, b = p.s1 - 3, len = b - a, top = p.top;
    if (enemies) {
      const n = Math.floor(len / 13);
      for (let i = 0; i < n; i++) {
        const s = a + (len * (i + 0.5)) / n + rng.range(-1.5, 1.5);
        out.push(foe(s, rng.range(-0.32, 0.32) * w, top, rng.chance(0.25)));
      }
    }
    const cs = rng.range(a, b - 5), cx = rng.range(-0.25, 0.25) * w;
    for (let i = 0; i < 4; i++) out.push(coin(cs + i * 1.2, cx, top + 0.8));
    if (itemsLeft > 0) { out.push(item(rng.range(a, b), rng.range(-0.3, 0.3) * w, top + 0.8)); itemsLeft--; }
    if (obstacle && len > 14) out.push(slot('obstacle', b - 2, rng.range(-0.25, 0.25) * w, top, { rolling: true }));
  }
  return out;
}

const arc = (s, g, x, n = 4) => { // coins arcing over a gap of width g starting at s
  const out = [];
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; out.push(coin(s + u * g, x, 0.9 + Math.sin(u * Math.PI) * 1.4)); }
  return out;
};

export const TEMPLATES = {
  flat: {
    cls: 'easy',
    build(c) {
      const len = r1(c.rng.range(26, 42)), spans = [ground(0, len, c.w)];
      const slots = populate(c, spans, { items: 1, obstacle: true });
      if (c.door) slots.push(slot('door', len / 2, (c.rng.sign()) * (c.w / 2 + 1.6), 0));
      return { len, spans, slots };
    },
  },
  curve: {
    cls: 'easy',
    build(c) {
      const len = r1(c.rng.range(40, 58)), spans = [ground(0, len, c.w)];
      return { len, yaw: c.rng.sign() * c.rng.range(0.5, 0.9), spans, slots: populate(c, spans) };
    },
  },
  climb: {
    cls: 'easy',
    build(c) {
      const len = r1(c.rng.range(36, 48)), spans = [ground(0, len, c.w)];
      return { len, rise: c.rng.range(4, 6.5), spans, slots: populate(c, spans) };
    },
  },
  drop: {
    cls: 'easy',
    build(c) {
      const len = r1(c.rng.range(36, 48)), spans = [ground(0, len, c.w)];
      return { len, rise: -c.rng.range(4, 6.5), spans, slots: populate(c, spans) };
    },
  },
  gap: {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, g = r1(rng.range(3.5, 4.8)), a = r1(rng.range(8, 11)), len = a + g + r1(rng.range(11, 14));
      const spans = [ground(0, a, w), ground(a + g, len, w)];
      const slots = [...arc(a, g, 0), item(a - 2, rng.range(-0.2, 0.2) * w), foe(a + g + 6, rng.range(-0.3, 0.3) * w)];
      return { len, spans, gaps: [{ s0: a, s1: a + g }], slots };
    },
  },
  doubleGap: {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, g1 = r1(rng.range(3.3, 4.2)), g2 = r1(rng.range(3.3, 4.2));
      const a = 8, pl = r1(rng.range(4.5, 5.5)), tail = r1(rng.range(10, 13));
      const p0 = a + g1, p1 = p0 + pl, e0 = p1 + g2, len = e0 + tail;
      const spans = [ground(0, a, w), ground(p0, p1, w, 0, 'platform'), ground(e0, len, w)];
      const slots = [...arc(a, g1, 0, 3), ...arc(p1, g2, 0, 3), item(p0 + pl / 2, 0), foe(e0 + 6, 0)];
      return { len, spans, gaps: [{ s0: a, s1: p0 }, { s0: p1, s1: e0 }], slots };
    },
  },
  steps: { // stepping platforms: 4.5-5.5 m pads that suit a full-speed hop each
    cls: 'gap',
    build(c) {
      const { rng } = c, w = c.w, n = rng.int(4, 5), spans = [ground(0, 8, w)], gaps = [], slots = [];
      let s = 8;
      for (let i = 0; i < n; i++) {
        const g = r1(rng.range(2.5, 3.3)), pl = r1(rng.range(4.5, 5.5)), top = i % 2 ? 0.5 : 0;
        gaps.push({ s0: s, s1: s + g });
        spans.push(ground(s + g, s + g + pl, 4, top, 'platform', 3 + top));
        slots.push(coin(s + g + pl / 2, 0, top + 0.9));
        if (i === 1) slots.push(item(s + g + pl / 2, 0, top + 0.9));
        s += g + pl;
      }
      const g = r1(rng.range(2.5, 3.2)); gaps.push({ s0: s, s1: s + g });
      const len = s + g + 9; spans.push(ground(s + g, len, w));
      slots.push(foe(len - 4, 0));
      return { len, spans, gaps, slots };
    },
  },
  beam: {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, bl = r1(rng.range(22, 30)), len = 8 + bl + 8;
      const spans = [ground(0, 8, w), { s0: 8, s1: 8 + bl, x0: -0.8, x1: 0.8, top: 0, depth: 0.6, kind: 'beam' }, ground(8 + bl, len, w)];
      const slots = []; for (let i = 0; i < 6; i++) slots.push(coin(10 + i * (bl - 4) / 5, 0, 0.8));
      slots.push(item(8 + bl / 2, 0), foe(len - 4, 0));
      return { len, spans, gaps: [], slots };
    },
  },
  barrier: { // low bar: underside 0.85 m, too tall to jump -> slide under it (standing duck is 1.0 m)
    cls: 'easy',
    build(c) {
      const { rng, w } = c, len = r1(rng.range(30, 38)), b = r1(rng.range(13, 18));
      const spans = [ground(0, len, w)];
      const solids = [{ s0: b, s1: b + 1.2, x0: -w / 2 - 0.5, x1: w / 2 + 0.5, y0: 0.85, y1: 3.6, kind: 'barrier' }];
      const slots = [...populate(c, spans, { items: 1, enemies: false }).filter((s) => Math.abs(s.s - b) > 3),
        coin(b - 3, 0, 0.5), coin(b, 0, 0.4), coin(b + 3, 0, 0.5), foe(len - 6, rng.range(-0.3, 0.3) * w)];
      return { len, spans, solids, slots };
    },
  },
  side: { // homage 2D section: camera swings 90 deg, path is narrow, left/right runs it
    cls: 'special', mode: 'side',
    build(c) {
      const w = 3.2, len = 70, gy = (a, b, top = 0, kind = 'ground', depth = 3) => ground(a, b, w, top, kind, depth);
      const spans = [gy(0, 12), gy(16, 36), gy(22, 36, 1.1, 'ledge', 1.1), gy(36, 44), gy(48.5, len), gy(56, 62, 1.1, 'ledge', 1.1)];
      const slots = [
        foe(6, 0), foe(19, 0), foe(28, 0, 1.1), foe(40, 0), foe(52, 0), foe(66, 0),
        ...arc(12, 4, 0), ...arc(44, 4.5, 0), coin(26, 0, 2), coin(28, 0, 2), coin(30, 0, 2),
        item(33, 0, 1.9), item(59, 0, 1.9),
      ];
      return { len, mode: 'side', lockX: true, spans, gaps: [{ s0: 12, s1: 16 }, { s0: 44, s1: 48.5 }], slots };
    },
  },
  chase: { // player runs toward the camera, a dust-ball hazard rolls up behind
    cls: 'special', mode: 'toward',
    build(c) {
      const { w } = c, len = 80, sp = c.stage?.setPiece || { speed: 8, lag: 16, damage: 15 };
      const spans = [ground(0, 30, w), ground(33.5, 56, w), ground(59.5, len, w)];
      const slots = [...arc(30, 3.5, 0), ...arc(56, 3.5, 0), coin(10, 0), coin(12, 0), coin(14, 0), item(45, 0),
        slot('obstacle', 20, 1.5, 0, { rolling: true }), slot('obstacle', 48, -1.5, 0, { rolling: true }), slot('obstacle', 70, 0, 0, { rolling: true })];
      return { len, mode: 'toward', spans, gaps: [{ s0: 30, s1: 33.5 }, { s0: 56, s1: 59.5 }], slots, chase: { speed: sp.speed, lag: sp.lag, damage: sp.damage } };
    },
  },
  quicksand: { // a patch of sand that drags (half speed) with a firm lane down one side: steer round it or hop across
    cls: 'easy',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(10, 12)), pl = r1(rng.range(14, 18)), len = a + pl + r1(rng.range(12, 15));
      const lane = rng.sign(), laneW = 2.4, sandX = lane > 0 ? [-w / 2, w / 2 - laneW] : [-w / 2 + laneW, w / 2];
      const laneX = lane > 0 ? [w / 2 - laneW, w / 2] : [-w / 2, -w / 2 + laneW];
      const spans = [ground(0, a, w), ground(a + pl, len, w),
        { s0: a, s1: a + pl, x0: sandX[0], x1: sandX[1], top: -0.25, depth: 3, kind: 'quicksand' },
        { s0: a, s1: a + pl, x0: laneX[0], x1: laneX[1], top: 0, depth: 3, kind: 'ground' }];
      const lx = (laneX[0] + laneX[1]) / 2, slots = [item(a - 3, 0), foe(len - 5, rng.range(-0.3, 0.3) * w), foe(4, rng.range(-0.3, 0.3) * w)];
      for (let i = 0; i < 6; i++) slots.push(coin(a + 2 + i * (pl - 4) / 5, lx));
      for (let i = 0; i < 3; i++) slots.push(coin(a + pl / 2 - 1.5 + i * 1.5, -lane * 1.2, 0.7));
      return { len, spans, slots, patches: [{ s0: a, s1: a + pl, x0: sandX[0], x1: sandX[1] }] };
    },
  },
  arena: { // the boss arena: a corridor from the gate leads into a disc of radius R (world/arena.js owns the rules)
    cls: 'special', mode: 'arena',
    build(c) {
      const R = c.stage?.boss?.arena?.radius ?? 15, mouth = 6, len = mouth + 2 * R + 6;
      const spans = [ground(0, mouth + 1, 8), ground(mouth, len, 2 * R + 2, 0, 'hidden')];
      return { len, mode: 'arena', spans, slots: [], arena: { s: mouth + R, x: 0, r: R, mouth } };
    },
  },
  checkpoint: {
    cls: 'easy',
    build(c) {
      const w = c.w, len = 14, spans = [ground(0, len, w)];
      return { len, spans, checkpoint: 7, slots: [coin(10, 0), coin(11, 0)] };
    },
  },
  rest: {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, len = r1(rng.range(22, 30)), spans = [ground(0, len, w)];
      const slots = [item(len * 0.35, -1.5), item(len * 0.65, 1.5)];
      for (let i = 0; i < 5; i++) slots.push(coin(4 + i * 1.5, 0));
      return { len, spans, slots };
    },
  },
  bossGate: {
    cls: 'special',
    build(c) {
      const w = c.w, len = 40, spans = [ground(0, len, w)];
      const solids = [{ s0: 38.6, s1: 40, x0: -w / 2 - 1, x1: w / 2 + 1, y0: 0, y1: 7, kind: 'wall' }];
      return { len, spans, solids, gate: 36, slots: [] };
    },
  },
};

// Stage 2-4 hazards and set-pieces (world/segmentsX.js) share this file's helpers.
Object.assign(TEMPLATES, extraTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), parisTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), volcanoTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), islandTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), cloudTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), hauntedTemplates({ r1, ground, slot, coin, item, foe, populate, arc }), charcoalTemplates({ r1, ground, slot, coin, item, foe, populate, arc }));
