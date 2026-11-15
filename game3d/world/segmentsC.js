// Segment templates for stage 8 (Cloud Dream, PLAN 6): a hop across open sky on drifting clouds, and the moving-cloud ride set-piece.
// Same contract as world/segments.js; K = the helpers from segments.js. The `clouds` list carries segment-relative s and is made absolute by the generator, then read by world/hazClouds.js.
// A cloud is 4.4-5.2 m long; the mean gap between neighbours is 3.4 m and drift never widens it past 5.2 m (a full-speed jump clears 5.2 m with margin).
export function cloudTemplates(K) {
  const { r1, ground, slot, coin, item, foe, arc } = K;
  const T = {};
  const cloud = (s, x, move, amp, period, phase, L = 4.4, W = 4.4, ampS = 0) => ({ s, x, L, W, move, amp, ampS, period, phase });

  // ---- CLOUD HOP: two islands 19 m apart over open sky, two drifting clouds between them (the first sweeps sideways, the second drifts along the path). Time the hop onto each.
  T.cloudHop = {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(8, 10)), G = 19, len = a + G + r1(rng.range(11, 13)), ph = rng.range(0, 6);
      const spans = [ground(0, a, w), ground(a + G, len, w)];
      const clouds = [cloud(a + 3.4 + 2.2, 0, 'x', 2.0, 4.4, ph), cloud(a + 3.4 * 2 + 4.4 + 2.2, 0, 's', 0.8, 3.8, ph + 1.3)];
      const slots = [item(a - 2.5, rng.range(-0.2, 0.2) * w), foe(a + G + 6, rng.range(-0.3, 0.3) * w), foe(a + G / 2, 0, 0, true), coin(a + 2.2, 0, 1.3), coin(a + 11.6, 0, 1.3), coin(a + G + 1.5, 0, 1.3)];
      return { len, spans, gaps: [{ s0: a, s1: a + G }], clouds, slots, wide: true };
    },
  };

  // ---- Stage 8 set-piece: THE MOVING-CLOUD RIDE. Open sky for 78 m with a little island of rest in the middle: seven big clouds (5.2 m) that sweep sideways, drift along the path or circle in an ellipse.
  // Whatever stands on a cloud is carried with it; steer to the middle of the next cloud before you jump. Miss and you fall to the cloud sea like any pit.
  T.cloudRide = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, L = 5.2, G = 3.4, run = 10, mid = 7, ph = rng.range(0, 6), moves = ['x', 'orbit', 's', null, 'x', 's', 'orbit'], clouds = [], slots = [], spans = [ground(0, run, w)], gaps = [];
      let s = run, k = 0;
      const addCloud = (move) => {
        const cs = s + G + L / 2, i = k++;
        clouds.push(cloud(cs, 0, move, move === 's' ? 0.9 : 1.8, 4.4 + (i % 3) * 0.5, ph + i * 1.7, L, L, move === 'orbit' ? 0.9 : 0));
        slots.push(coin(s + G / 2 - 0.9, 0, 1.4), coin(s + G / 2, 0, 1.9), coin(s + G / 2 + 0.9, 0, 1.4)); s += G + L;
      };
      const open0 = s; for (let i = 0; i < 3; i++) addCloud(moves[i]);
      gaps.push({ s0: open0, s1: s + G }); spans.push(ground(s + G, s + G + mid, 5.5, 0, 'platform', 3)); slots.push(item(s + G + mid / 2, 0, 0.9), foe(s + G + mid / 2, 0, 0, true)); s += G + mid;   // the island of rest
      const open1 = s; for (let i = 4; i < 7; i++) addCloud(moves[i]);
      gaps.push({ s0: open1, s1: s + G });
      const len = s + G + 18; spans.push(ground(s + G, len, w)); slots.push(foe(len - 9, rng.range(-0.3, 0.3) * w), foe(len - 6, 0, 0, true), coin(len - 12, 0), coin(len - 10.8, 0));
      return { len, spans, gaps, clouds, slots, wide: true };
    },
  };
  return T;
}
