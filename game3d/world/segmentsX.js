// Segment templates added for stages 2-4 (PLAN 6): each stage's set-piece plus its path hazards.
// Same contract as world/segments.js; extra per-segment lists (vines, belts, pistons, traffic, holes) are copied by the
// generator with absolute s and read by world/hazards.js. K = the helpers from segments.js.
export function extraTemplates(K) {
  const { r1, ground, slot, coin, item, foe, populate, arc } = K;
  const T = {};

  // ---- Stage 2 set-piece: VINE SWINGS. Three river gaps (9.5 m: wider than any jump), a hanging vine in the middle of each.
  // Jump toward a vine and you grab it, swing across and let go (Jump lets go early) to land on the next mossy island.
  T.vines = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, G = 9.5, ISL = 6.5, run = 11, n = 3, spans = [ground(0, run, w)], gaps = [], vines = [], slots = [];
      let s = run;
      for (let i = 0; i < n; i++) {
        gaps.push({ s0: s, s1: s + G }); vines.push({ s: s + G / 2, x: 0, rest: 0.2 * (i % 2 ? 1 : -1) });
        for (let k = 0; k < 4; k++) slots.push(coin(s + G / 2 - 1.8 + k * 1.2, 0, 3.8 + Math.sin((k / 3) * Math.PI) * 0.9));     // a trail of coins marks the swing
        spans.push(ground(s + G, s + G + ISL, 5.5, 0, 'platform', 3));
        if (i === 1) slots.push(item(s + G + ISL / 2, 0, 0.9));
        s += G + ISL;
      }
      const len = s + 12; spans.push(ground(s, len, w)); slots.push(coin(s + 4, 0), coin(s + 5.2, 0), foe(len - 4, rng.range(-0.25, 0.25) * w));
      return { len, spans, gaps, vines, slots };
    },
  };

  // ---- Stage 3 hazard: CONVEYOR BELT. A belt across the whole path drags whatever stands on it (the box carries `belt` m/s, read by the
  // player controller). Fixed direction per belt; running with it is quick, against it is a slog. The set-piece below reverses it.
  T.conveyor = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(9, 12)), L = r1(rng.range(16, 22)), len = a + L + r1(rng.range(11, 14)), v = rng.sign() * rng.range(3.2, 4.2);
      const spans = [ground(0, a, w), { s0: a, s1: a + L, x0: -w / 2, x1: w / 2, top: 0, depth: 1.2, kind: 'conveyor', belt: v }, ground(a + L, len, w)];
      const slots = [...populate(c, [ground(0, a, w), ground(a + L, len, w)], { items: 0, obstacle: true }), item(a + L / 2, rng.range(-0.25, 0.25) * w)];
      for (let i = 0; i < 5; i++) slots.push(coin(a + 2 + (i * (L - 4)) / 4, 0));
      return { len, spans, slots };
    },
  };

  // ---- Stage 3 set-piece: CONVEYOR REVERSAL. A long belt with crusher pistons over it. Every 6 s the belt warns (flashing arrows, alarm) and then
  // reverses; each piston lights its footprint, then slams down on one half of the belt (the other half is clear).
  T.reversal = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, run = 11, L = 66, tail = 14, len = run + L + tail, v = 4.6, ps = [];
      const spans = [ground(0, run, w), { s0: run, s1: run + L, x0: -w / 2, x1: w / 2, top: 0, depth: 1.2, kind: 'conveyor', belt: v }, ground(run + L, len, w)];
      let side = rng.sign();
      for (let i = 0; i < 3; i++) { ps.push({ s: run + 16 + i * 17, x0: side < 0 ? -w / 2 : 0.4, x1: side < 0 ? -0.4 : w / 2, period: 4.4, phase: i * 1.5, depth: 2.4 }); side = -side; }
      const slots = [item(run + L * 0.5, 0, 0.9), foe(run + 24, rng.range(-0.3, 0.3) * w, 0, true), foe(run + 50, rng.range(-0.3, 0.3) * w, 0, true), foe(len - 5, 0)];
      for (let i = 0; i < 9; i++) slots.push(coin(run + 4 + (i * (L - 8)) / 8, (i % 2 ? 1 : -1) * 1.6));
      return { len, spans, belts: [{ s0: run, s1: run + L, v, period: 6.2, warn: 1.0 }], pistons: ps, slots };
    },
  };

  // ---- Stage 4 hazard: OPEN MANHOLES. Three 3.4 x 2.4 m holes in the road (a real pit: -20 and back to the last safe ground), different lanes, so there is
  // always a way round; coins arc over each one. The ground boxes are cut around the holes.
  T.manholes = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, len = r1(rng.range(34, 42)), holes = [];
      for (let i = 0; i < 3; i++) { const x = (i % 2 ? -1 : 1) * rng.sign() * rng.range(0.3, w / 2 - 1.4), s = 9 + i * 10 + rng.range(-1, 1); holes.push({ s0: s - 1.7, s1: s + 1.7, x0: x - 1.2, x1: x + 1.2 }); }   // 3.4 x 2.4 m: a runner covers 2 m in 0.2 s, too short to sink past the 0.35 m step-up, so the hole has to be longer than the body plus a stride. 10 m apart: always a clear lane
      const spans = []; let cur = 0;
      for (const h of holes) {
        spans.push(ground(cur, h.s0, w));
        if (h.x0 > -w / 2 + 0.05) spans.push({ s0: h.s0, s1: h.s1, x0: -w / 2, x1: h.x0, top: 0, depth: 3, kind: 'ground' });
        if (h.x1 < w / 2 - 0.05) spans.push({ s0: h.s0, s1: h.s1, x0: h.x1, x1: w / 2, top: 0, depth: 3, kind: 'ground' });
        cur = h.s1;
      }
      spans.push(ground(cur, len, w));
      const near = (sl) => holes.some((h) => sl.s > h.s0 - 1.2 && sl.s < h.s1 + 1.2 && sl.x > h.x0 - 1.2 && sl.x < h.x1 + 1.2);
      const slots = populate(c, [ground(0, len, w)], { items: 1, obstacle: false }).filter((sl) => !near(sl));
      for (const h of holes) for (let k = 0; k < 3; k++) slots.push(coin(h.s0 - 0.6 + k * 1.1, (h.x0 + h.x1) / 2, 1.0 + Math.sin(((k + 0.5) / 3) * Math.PI) * 1.2));
      return { len, spans, holes, slots };
    },
  };

  // ---- Stage 4 hazard: TRAFFIC CROSSING. Three lanes of taxis sweep across the road at 12.5 m/s, one every few seconds per lane. Each car honks and shows
  // its headlights as it enters (the cars start well outside the corridor), and clips you for 15 if you are still in its way: jump over it (1.5 m) or time the gap.
  T.crossing = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, len = r1(rng.range(38, 44)), traffic = [];
      for (let i = 0; i < 3; i++) traffic.push({ s: 13 + i * 6.5, dir: i % 2 ? -1 : 1, speed: 12.5, period: 4.9 + i * 0.35, phase: i * 1.6 + rng.range(0, 1), hs: 0.95, hx: 2.1, h: 1.5 });
      const spans = [ground(0, len, w)], slots = populate(c, spans, { items: 1, obstacle: false }).filter((sl) => !traffic.some((q) => Math.abs(sl.s - q.s) < 2.2));
      slots.push(coin(11, 0), coin(12, 0), coin(len - 9, 0), foe(len - 6, rng.range(-0.3, 0.3) * w));
      return { len, spans, traffic, slots };
    },
  };

  // ---- Stage 4 set-piece: ROOFTOP-TO-STREET DROP. Up three fire-escape landings, over three rooftops (4.4 m alleys between them), then step off the last
  // roof and drop 5 m back to the street. The alleys and the street below are the gaps (flooded subway trench), so a miss is a normal pit fall.
  T.rooftops = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, TOP = 5.1, spans = [ground(0, 8, w)], gaps = [], slots = [];
      const pad = (a, b, top, kind, ww, depth) => spans.push({ s0: a, s1: b, x0: -ww / 2, x1: ww / 2, top, depth, kind });
      [[10, 14.2, 1.7], [16.7, 20.9, 3.4], [23.4, 27.6, TOP]].forEach(([a, b, top], i) => { gaps.push({ s0: i ? [14.2, 20.9][i - 1] : 8, s1: a }); pad(a, b, top, 'platform', 3.6, top + 3); slots.push(coin((a + b) / 2, 0, top + 0.9)); });
      const roofs = [[29.8, 46], [50.4, 64.4], [68.8, 82]];
      roofs.forEach(([a, b], i) => { gaps.push({ s0: i ? roofs[i - 1][1] : 27.6, s1: a }); pad(a, b, TOP, 'ledge', 7.2, TOP + 3); for (let k = 0; k < 4; k++) slots.push(coin(a + 3 + k * ((b - a - 6) / 3), (k % 2 ? 1 : -1) * 1.2, TOP + 0.8)); });
      for (const [a, g] of [[27.6, 2.2], [46, 4.4], [64.4, 4.4]]) for (let k = 0; k < 3; k++) slots.push(coin(a + 0.4 + k * (g / 2.4), 0, TOP + 0.9 + Math.sin(((k + 0.5) / 3) * Math.PI) * 1.2));
      slots.push(item(57, 0, TOP + 0.9), foe(38, 0, TOP, true), foe(74, rng.range(-0.4, 0.4) * 3, TOP, true));
      spans.push(ground(82, 98, w)); slots.push(coin(85, 0, 0.9), coin(87, 0, 0.9), foe(92, 0));
      return { len: 98, spans, gaps, slots };
    },
  };

  return T;
}
