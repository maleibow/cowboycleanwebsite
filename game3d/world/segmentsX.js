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

  return T;
}
