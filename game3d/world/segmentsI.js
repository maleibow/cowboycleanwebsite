// Segment templates for stage 7 (Rainbow Island, PLAN 6): mud pools that slow you, and the rainbow slide set-piece.
// Same contract as world/segments.js; K = the helpers from segments.js.
export function islandTemplates(K) {
  const { r1, ground, slot, coin, item, foe, populate } = K;
  const T = {};

  // ---- MUD POOLS: two pools across the path, each with a firm lane down one side (the lanes swap sides). Mud drags the player to half speed (kind 'mud', player.js) and lets enemies catch up.
  T.mudPool = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(9, 11)), pl = r1(rng.range(11, 14)), mid = r1(rng.range(9, 11)), len = a + pl + mid + pl + r1(rng.range(10, 12)), laneW = 2.4;
      let lane = rng.sign(); const spans = [], patches = [], slots = [item(a - 3, 0), foe(a + pl + 4, rng.range(-0.3, 0.3) * w), foe(len - 5, rng.range(-0.3, 0.3) * w)];
      const pool = (s0) => {
        const sandX = lane > 0 ? [-w / 2, w / 2 - laneW] : [-w / 2 + laneW, w / 2], laneX = lane > 0 ? [w / 2 - laneW, w / 2] : [-w / 2, -w / 2 + laneW];
        spans.push({ s0, s1: s0 + pl, x0: sandX[0], x1: sandX[1], top: -0.3, depth: 3, kind: 'mud' }, { s0, s1: s0 + pl, x0: laneX[0], x1: laneX[1], top: 0, depth: 3, kind: 'ground' });
        patches.push({ s0, s1: s0 + pl, x0: sandX[0], x1: sandX[1] });
        const lx = (laneX[0] + laneX[1]) / 2; for (let i = 0; i < 5; i++) slots.push(coin(s0 + 2 + i * (pl - 4) / 4, lx));
        for (let i = 0; i < 3; i++) slots.push(coin(s0 + pl / 2 - 1.5 + i * 1.5, -lane * 1.4, 0.7));
        lane = -lane;
      };
      spans.push(ground(0, a, w), ground(a + pl, a + pl + mid, w), ground(a + pl + mid + pl, len, w));
      pool(a); pool(a + pl + mid);
      return { len, spans, patches, slots };
    },
  };

  // ---- Stage 7 set-piece: RAINBOW SLIDE. A long rainbow ribbon that carries you down the hillside (kind 'slide': +9 m/s along the track, so you run at about twice normal speed).
  // Soft cloud bumps (0.9 m: jump them) sit on the stripes, coins hang in rainbow arcs, and a few paint blobs wait at the bottom. Steer between the bumps.
  T.rainbowSlide = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, run = 10, L = 96, tail = 18, len = run + L + tail, spans = [ground(0, run, w), { s0: run, s1: run + L, x0: -w / 2, x1: w / 2, top: 0, depth: 0.6, kind: 'slide', belt: 9 }, ground(run + L, len, w)], slots = [];
      let side = rng.sign();
      for (let i = 0; i < 6; i++) {   // bumps alternate sides and sit at least 13 m apart (a jump at slide speed covers ~14 m)
        const s = run + 12 + i * 14.5, x = side * rng.range(0.6, 2.2); side = -side;
        spans.push({ s0: s - 0.9, s1: s + 0.9, x0: x - 1.2, x1: x + 1.2, top: 0.9, depth: 0.9, kind: 'ledge' });
        slots.push(coin(s - 6, -x * 0.6, 0.8), coin(s - 5, -x * 0.6, 0.8), coin(s - 4, -x * 0.6, 0.8));
        if (i === 2) slots.push(item(s + 5, -x * 0.5, 0.9));
      }
      for (let k = 0; k < 10; k++) slots.push(coin(run + 4 + k * 1.2, Math.sin(k * 0.6) * 2.2, 0.8 + Math.sin((k / 9) * Math.PI) * 1.6));
      slots.push(foe(run + L + 6, -1.5), foe(run + L + 11, 1.5), coin(len - 5, 0), coin(len - 4, 0));
      return { len, rise: -9, spans, slots };
    },
  };
  return T;
}
