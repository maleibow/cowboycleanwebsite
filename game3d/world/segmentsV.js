// Segment templates for stage 6 (Volcano Peak, PLAN 6): falling rocks, the collapsing bridge, and the lava-wave chase set-piece.
// Same contract as world/segments.js; K = the helpers from segments.js. Lists `rocks` and `planks` carry segment-relative s and are made absolute by the generator,
// then read by world/hazRocks.js and world/hazCollapse.js.
export function volcanoTemplates(K) {
  const { r1, ground, slot, coin, item, foe, populate } = K;
  const T = {};
  const planks = (a, n, w = 4.4, len = 2.4, fuse = 0.55) => Array.from({ length: n }, (_, i) => ({ s0: a + i * len, s1: a + (i + 1) * len, x0: -w / 2, x1: w / 2, fuse }));

  // ---- ROCKFALL: plain ground under a rain of boulders. A boulder lands every ~1.2 s, each on a circle drawn on the floor for 1.35 s, alternating lanes: keep moving, step out of the circles.
  T.rockfall = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, len = r1(rng.range(44, 54)), spans = [ground(0, len, w)];
      const slots = [...populate(c, spans, { items: 1, obstacle: false }), coin(14, 0), coin(15.2, 0), foe(len - 8, rng.range(-0.3, 0.3) * w)];
      return { len, spans, slots, rocks: [{ s0: 8, s1: len - 3 }] };
    },
  };

  // ---- COLLAPSING BRIDGE: nine charred planks (21.6 m) over a lava river, 4.4 m wide. A plank burns for half a second after you step on it, then drops into the lava: keep running.
  T.collapse = {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(8, 10)), n = 9, L = n * 2.4, len = a + L + r1(rng.range(10, 12));
      const spans = [ground(0, a, w), ground(a + L, len, w)], slots = [item(a - 2.5, rng.range(-0.2, 0.2) * w), foe(a + L + 5, rng.range(-0.3, 0.3) * w)];
      for (let i = 0; i < 6; i++) slots.push(coin(a + 2 + i * ((L - 4) / 5), (i % 2 ? 1 : -1) * 0.7, 0.8));
      return { len, spans, gaps: [{ s0: a, s1: a + L }], planks: planks(a, n), slots, wide: true };
    },
  };

  // ---- Stage 6 set-piece: LAVA-WAVE CHASE. The camera turns round and the player runs toward it while a wall of lava rolls up behind him as wide as the road (no side-stepping it).
  // The run crosses a lava gap, a stretch of falling rocks and a nine-plank collapsing bridge (fuse 0.45 s); rolling ash piles slide in on the way. Same chase rules as stage 1's
  // dust ball (level.js): the wave gains if you stop, hits for 15 and drops back if it catches you.
  T.lavaChase = {
    cls: 'special', mode: 'toward',
    build(c) {
      const { w } = c, len = 104, sp = c.stage?.setPiece || { speed: 8, lag: 15, damage: 15 };
      const spans = [ground(0, 20, w), ground(23.5, 46, w), ground(70.6, len, w)];
      const slots = [coin(8, 0), coin(9.2, 0), coin(10.4, 0), coin(18, 0.5), coin(21.7, 0, 1.8), coin(23.2, 0, 2.2), item(36, 0), coin(58, 0, 0.8), coin(62, 0, 0.8), coin(66, 0, 0.8), coin(78, 0), coin(79.2, 0),
        slot('obstacle', 13, 1.5, 0, { rolling: true }), slot('obstacle', 40, -1.5, 0, { rolling: true }), slot('obstacle', 86, 0, 0, { rolling: true })];
      return { len, mode: 'toward', spans, gaps: [{ s0: 20, s1: 23.5 }, { s0: 46, s1: 70.6 }], planks: planks(46, 10, 4.4, 2.46, 0.45), rocks: [{ s0: 25, s1: 44 }], slots, wide: true,
        chase: { speed: sp.speed, lag: sp.lag, damage: sp.damage } };
    },
  };
  return T;
}
