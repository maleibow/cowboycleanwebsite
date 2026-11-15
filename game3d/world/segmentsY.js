// Segment templates for stage 5 (Paris Nights, PLAN 6): rooftop gaps with an awning bounce pad, and the awning bounce run set-piece.
// Same contract as world/segments.js / segmentsX.js; K = the helpers from segments.js. An awning is a thin box of kind 'bounce' (0.3 m deep):
// landing on it springs the player up at PHYS.bounceSpeed (actors/player.js), 5 m apex, ~10 m of forward flight at run speed.
export function parisTemplates(K) {
  const { r1, ground, coin, item, foe, populate } = K;
  const T = {};
  const awning = (s0, s1, top, w = 5) => ({ s0, s1, x0: -w / 2, x1: w / 2, top, depth: 0.3, kind: 'bounce' });

  // ---- ROOFTOP GAP WITH AN AWNING: two roofs 9.5 m apart (wider than any jump), a striped awning hung in the middle. Jump onto it, ride the spring to the far roof.
  T.bounceGap = {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(8, 10)), G = 9.5, PL = 4, len = a + G + r1(rng.range(11, 13));
      const spans = [ground(0, a, w), ground(a + G, len, w), awning(a + (G - PL) / 2, a + (G + PL) / 2, 0.9, 5)];
      const slots = [item(a - 2.5, rng.range(-0.2, 0.2) * w), foe(a + G + 6, rng.range(-0.3, 0.3) * w), coin(a + G / 2 - 0.9, 0, 1.9), coin(a + G / 2, 0, 3.4), coin(a + G / 2 + 0.9, 0, 4.9), coin(a + G + 1.5, 0, 3.0)];
      return { len, spans, gaps: [{ s0: a, s1: a + G }], slots, wide: true };
    },
  };

  // ---- Stage 5 set-piece: AWNING BOUNCE RUN. A street of café awnings, seven springy pads 10 m apart (5 m of pad, 5 m of air), each at a different height; every
  // landing springs you onto the next, so you ride a rollercoaster over the rooftops. Miss one and you drop to the Seine (a normal pit fall).
  T.awnings = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, tops = [0.8, 2.2, 3.6, 2.4, 4.0, 2.6, 1.0], spans = [ground(0, 9, w)], gaps = [], slots = [];   // one long gap (the street / the Seine) under the whole run
      let s = 9;
      tops.forEach((top, i) => {
        spans.push(awning(s + 5, s + 10, top, 5.2));
        slots.push(coin(s + 2.5, (i % 2 ? 1 : -1) * 0.8, top + 2.6), coin(s + 7.5, 0, top + 0.9));
        if (i === 2) slots.push(item(s + 7.5, 0, top + 1.0));
        if (i === 4) slots.push(foe(s + 7.5, 0, top, true));
        s += 10;
      });
      gaps.push({ s0: 9, s1: s + 4.5 }); const len = s + 4.5 + 16; spans.push(ground(s + 4.5, len, w));
      slots.push(coin(len - 12, 0), coin(len - 10.8, 0), foe(len - 6, rng.range(-0.3, 0.3) * w));
      return { len, spans, gaps, slots, wide: true };
    },
  };
  return T;
}
