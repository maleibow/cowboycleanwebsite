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

  return T;
}
