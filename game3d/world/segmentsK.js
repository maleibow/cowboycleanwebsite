// Segment templates for stage 10 (Charcoal Streets, PLAN 6): stepping stones over a ruby canal, and the rising-tide climb set-piece.
// Same contract as world/segments.js; K = the helpers from segments.js. The `tides` list carries segment-relative s (made absolute by the generator, read by world/hazTide.js).
export function charcoalTemplates(K) {
  const { r1, ground, slot, coin, item, foe } = K;
  const T = {};
  const stone = (s0, s1, x, w, top = 0) => ({ s0, s1, x0: x - w / 2, x1: x + w / 2, top, depth: top + 3, kind: 'platform' });

  // ---- CANAL STONES: a ruby canal 23 m wide crossed on five stepping stones (2.6 m square), each gap 1.9 m and every stone a step to the side of the one before. Too wide to jump; hop stone to stone.
  T.canalStones = {
    cls: 'gap',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(8, 10)), n = 5, SZ = 2.6, G = 1.9, spans = [ground(0, a, w)], slots = [item(a - 2.5, rng.range(-0.2, 0.2) * w)];
      let s = a + G, side = rng.sign();
      for (let i = 0; i < n; i++) { const x = side * 0.9; spans.push(stone(s, s + SZ, x, SZ)); slots.push(coin(s + SZ / 2, x, 1.0), coin(s + SZ + G / 2, (x + -side * 0.9) / 2, 1.8)); if (i === 2) slots.push(foe(s + SZ / 2, x, 0, true)); side = -side; s += SZ + G; }
      const len = s + r1(rng.range(10, 12)); spans.push(ground(s, len, w)); slots.push(foe(len - 5, rng.range(-0.3, 0.3) * w), coin(len - 9, 0));
      return { len, spans, gaps: [{ s0: a, s1: s }], slots, wide: true };
    },
  };

  // ---- Stage 10 set-piece: RISING TIDE. A flooded avenue: a flight of seven stone steps (0.9 m each) climbs a ruby tide that begins to rise the moment you step on the first one, 0.7 m a second.
  // Keep moving: a normal run stays about a second and a half ahead of it; if the water reaches your feet it washes you back (-20, the tide falls 3 m and you get another go). The top of the climb is
  // a roof, and the last step is a drop back to the street. The tide is a ruby plane (world/hazTide.js) over the whole avenue.
  T.risingTide = {
    cls: 'special',
    build(c) {
      const { rng, w } = c, run = 12, N = 7, L = 11, H = 0.9, top = N * H, spans = [ground(0, run, w)], slots = [];
      for (let i = 0; i < N; i++) {
        const a = run + i * L, y = (i + 1) * H;
        spans.push({ s0: a, s1: a + L, x0: -w / 2, x1: w / 2, top: y, depth: y + 3, kind: 'ledge' });
        for (let k = 0; k < 3; k++) slots.push(coin(a + 2 + k * 3, (k % 2 ? 1 : -1) * 1.4, y + 0.8));
        if (i % 2 === 1) slots.push(foe(a + L / 2, rng.range(-0.3, 0.3) * w, y, i === 3));
        if (i === 3) slots.push(item(a + 6, 0, y + 0.9));
      }
      const roof = run + N * L, len = roof + 14;
      spans.push({ s0: roof, s1: len, x0: -w / 2, x1: w / 2, top, depth: top + 3, kind: 'ledge' });
      slots.push(item(roof + 7, 0, top + 0.9), coin(len - 6, 0, top + 0.8), coin(len - 4.8, 0, top + 0.8));
      return { len, spans, slots, tides: [{ s0: run - 2, s1: len, s: run, rate: 0.7, from: -2.6, max: top - 0.3 }], wide: true };
    },
  };
  return T;
}
