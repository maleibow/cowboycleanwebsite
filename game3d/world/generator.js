// Builds a stage's segment list from (stageData, seed), per PLAN 3.3.
// Pure data in, pure data out: no THREE, no Math.random, so it is deterministic and testable in Node.
import { createRng } from '../core/rng.js';
import { TEMPLATES, JUMP_MAX_GAP } from './segments.js';
import { POWERUP_TYPES } from '../data/stages.js';

export const stageSeed = (stage, loop = 1) => stage * 1000 + loop;
// The casino side-door is rare: only this share of stages get one (decided from the seed, so it consumes no rng values).
export const DOOR_STAGE_CHANCE = 0.3;
const hasDoor = (seed) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296 < DOOR_STAGE_CHANCE;
const isGap = (name) => name && TEMPLATES[name].cls === 'gap';

function instantiate(name, s0, act, c, flags = {}) {
  const t = TEMPLATES[name], d = t.build(c);
  const seg = {
    name, cls: t.cls, act, s0, len: d.len, s1: s0 + d.len,
    yaw: d.yaw || 0, rise: d.rise || 0, mode: d.mode || 'behind', lockX: !!d.lockX,
    width: d.width || c.w, chase: d.chase ? { ...d.chase, s0, s1: s0 + d.len } : null,
    boxes: [], deco: [], gaps: [], patches: [], slots: [], checkpoint: null, gate: null, arena: null,
  };
  for (const p of d.patches || []) seg.patches.push({ s0: s0 + p.s0, s1: s0 + p.s1, x0: p.x0, x1: p.x1 });
  if (d.arena) seg.arena = { ...d.arena, s: s0 + d.arena.s };
  for (const p of d.spans || []) seg.boxes.push({ s0: s0 + p.s0, s1: s0 + p.s1, x0: p.x0, x1: p.x1, y0: p.top - p.depth, y1: p.top, kind: p.kind });
  for (const o of d.solids || []) seg.boxes.push({ ...o, s0: s0 + o.s0, s1: s0 + o.s1 });
  for (const o of d.deco || []) seg.deco.push({ ...o, s0: s0 + o.s0, s1: s0 + o.s1 });
  for (const g of d.gaps || []) seg.gaps.push({ s0: s0 + g.s0, s1: s0 + g.s1 });
  seg.slots = (d.slots || []).map((sl) => ({ ...sl, s: s0 + sl.s }));
  if (d.checkpoint != null) seg.checkpoint = s0 + d.checkpoint;
  if (d.gate != null) seg.gate = s0 + d.gate;
  if (flags.noEnemies) seg.slots = seg.slots.filter((sl) => sl.kind !== 'enemy');
  return seg;
}

export function generateStage(stageData, seed) {
  const rng = createRng(seed), doorOk = hasDoor(seed);
  const total = stageData.length || 1100, w = stageData.trackWidth || 8;
  const segs = [], acts = [];
  let s = 0, act = 1, doorDone = false, specialDone = false;

  const add = (name, flags) => {
    const c = { rng, w, stage: stageData, door: act === 2 && !doorDone && name === 'flat' && rng.chance(0.45) && doorOk };
    const seg = instantiate(name, s, act, c, flags);
    if (seg.slots.some((sl) => sl.kind === 'door')) doorDone = true;
    segs.push(seg); s = seg.s1; return seg;
  };
  const pick = (weights, prev) => {
    const names = Object.keys(weights).filter((n) => {
      if (n === prev?.name && n !== 'flat') return false;
      if (act === 1 && isGap(n) && isGap(prev?.name)) return false; // never two gaps in a row in Act 1
      if (prev?.cls === 'special' && n !== 'flat') return false;     // breathe after a special section
      return true;
    });
    let r = rng.next() * names.reduce((a, n) => a + weights[n], 0);
    for (const n of names) { r -= weights[n]; if (r <= 0) return n; }
    return names[0];
  };

  add('flat', { noEnemies: true }); // intro runway
  const ends = [total * 0.35, total * 0.7, total - 70];
  for (act = 1; act <= 3; act++) {
    const start = s, end = ends[act - 1], specialAt = start + (end - start) * rng.range(0.35, 0.6);
    specialDone = false;
    const special = () => {
      if (act === 2) { add('side'); return; }
      const hard = stageData.act3Special === 'hard' || (stageData.act3Special === 'either' && rng.chance(0.5));
      if (!hard) { add('chase'); return; }
      add('steps'); add('flat'); add('doubleGap'); add('flat'); add('beam');
    };
    const wantsSpecial = () => act >= 2 && !specialDone && s >= specialAt;
    // Act 1 teaches the stage's hazards: it always contains a gap and a low barrier.
    const teach = act === 1 ? [{ name: 'gap', at: start + (end - start) * rng.range(0.2, 0.4) }, { name: 'barrier', at: start + (end - start) * rng.range(0.55, 0.75) }] : [];
    while (s < end) {
      const prev = segs[segs.length - 1];
      if (wantsSpecial()) {
        if (isGap(prev.name)) { add('flat'); continue; } // never blend the camera out of a gap
        special(); specialDone = true; add('flat'); continue;
      }
      const due = teach.find((t) => !t.done && s >= t.at && !(t.name === 'gap' && isGap(prev.name)));
      if (due) { due.done = true; add(due.name); continue; }
      add(pick(stageData.weights[act - 1], prev));
    }
    for (const t of teach) if (!t.done && !segs.some((g) => g.act === 1 && g.name === t.name)) add(t.name);
    if (act >= 2 && !specialDone) { if (isGap(segs[segs.length - 1].name)) add('flat'); special(); specialDone = true; add('flat'); }
    acts.push({ act, s0: start, s1: s });
    if (act < 3) add('checkpoint');
  }
  act = 3; add('rest'); add('bossGate'); add('arena');   // the loop above leaves act at 4

  // ---- slot pass: enemy roster/density by act, obstacle type, powerup guarantee ----
  const roster = stageData.roster, items = [];
  for (const seg of segs) {
    const keep = [];
    for (const sl of seg.slots) {
      if (sl.kind === 'enemy') {
        if (seg.act === 1 && rng.next() > stageData.density[0] ) continue;
        if (seg.act === 2 && rng.next() > stageData.density[1]) continue;
        if (seg.act === 3 && rng.next() > stageData.density[2]) continue;
        const tiers = roster.slice(0, seg.act), tier = rng.chance(0.55) ? tiers.length - 1 : rng.int(0, tiers.length - 1);
        sl.type = rng.pick(tiers[tier]); sl.tier = tier + 1;
      } else if (sl.kind === 'obstacle') sl.type = stageData.obstacle;
      else if (sl.kind === 'pickup' && sl.role === 'item') items.push(sl);
      keep.push(sl);
    }
    seg.slots = keep;
  }
  rng.shuffle(items);
  items.forEach((sl, i) => { sl.item = i < POWERUP_TYPES.length ? POWERUP_TYPES[i] : rng.pick(['crate', 'crate', ...POWERUP_TYPES]); });

  const all = segs.flatMap((sg) => sg.slots);
  all.forEach((sl, i) => (sl.id = i));
  const gateSeg = segs.find((g) => g.name === 'bossGate'), arenaSeg = segs[segs.length - 1];
  return {
    seed, stageId: stageData.id, segments: segs, length: s, acts, slots: all,
    checkpoints: segs.filter((g) => g.checkpoint != null).map((g) => ({ s: g.checkpoint })),
    gateS: gateSeg.gate, arena: arenaSeg.arena, arenaSeg, startS: 4,
  };
}

// Returns a list of rule violations (empty = valid). Used by tools/smoke.mjs over many seeds.
export function validateStage(layout, stageData) {
  const errs = [], segs = layout.segments;
  if (layout.length < 1000 || layout.length > 1300) errs.push(`length ${layout.length.toFixed(0)}`);
  segs.forEach((g, i) => { if (i && Math.abs(g.s0 - segs[i - 1].s1) > 1e-6) errs.push(`gap in layout at ${i}`); });
  for (let i = 1; i < segs.length; i++) {
    if (segs[i].act === 1 && isGap(segs[i].name) && isGap(segs[i - 1].name)) errs.push(`two gaps in a row in act 1 at ${i}`);
    if (segs[i].name === 'steps' || segs[i].name === 'doubleGap' || segs[i].name === 'gap') {
      if (segs[i].act === 1 && segs[i].name !== 'gap') errs.push('act 1 uses ' + segs[i].name);
    }
  }
  if (segs.at(-1).name !== 'arena' || segs.at(-2).name !== 'bossGate' || segs.at(-3).name !== 'rest') errs.push('rest, boss gate, arena must end the stage');
  for (const n of ['gap', 'barrier']) if (!segs.some((g) => g.act === 1 && g.name === n)) errs.push('act 1 lacks ' + n);
  if (layout.checkpoints.length !== 2) errs.push('want a checkpoint at each act boundary');
  if (segs.filter((g) => g.name === 'side').length !== 1) errs.push('want exactly one side section');
  if (!segs.some((g) => g.name === 'chase') && !segs.some((g) => g.name === 'beam' && g.act === 3)) errs.push('act 3 lacks chase/hard run');
  const have = new Set(layout.slots.filter((sl) => sl.item).map((sl) => sl.item));
  for (const p of POWERUP_TYPES) if (!have.has(p)) errs.push('powerup never obtainable: ' + p);
  for (const g of segs) {
    for (const gap of g.gaps) if (gap.s1 - gap.s0 > JUMP_MAX_GAP) errs.push(`gap too wide ${gap.s1 - gap.s0}`);
    for (const sl of g.slots) if (sl.kind === 'enemy' && sl.tier > g.act) errs.push('enemy tier above act');
  }
  return errs;
}
