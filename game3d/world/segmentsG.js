// Segment templates for stage 9 (Haunted Village, PLAN 6): bog patches that drag, swinging cemetery gates on a timer, and the LIGHTS OUT set-piece.
// Same contract as world/segments.js; K = the helpers from segments.js. The `gates` list carries segment-relative s (made absolute by the generator, read by world/hazGate.js);
// a segment with `dark: true` is the lights-out section (world/hazDark.js).
export function hauntedTemplates(K) {
  const { r1, ground, slot, coin, item, foe, populate } = K;
  const T = {};

  // ---- BOG: two patches of black bog across the path, each with a firm lane down one side (the lanes swap). Bog drags the player to half speed (kind 'mud', player.js) and lets zombies catch up.
  T.bog = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(9, 11)), pl = r1(rng.range(11, 14)), mid = r1(rng.range(9, 11)), len = a + pl + mid + pl + r1(rng.range(10, 12)), laneW = 2.4;
      let lane = rng.sign(); const spans = [], patches = [], slots = [item(a - 3, 0), foe(a + pl + 4, rng.range(-0.3, 0.3) * w), foe(len - 5, rng.range(-0.3, 0.3) * w)];
      const pool = (s0) => {
        const bogX = lane > 0 ? [-w / 2, w / 2 - laneW] : [-w / 2 + laneW, w / 2], laneX = lane > 0 ? [w / 2 - laneW, w / 2] : [-w / 2, -w / 2 + laneW];
        spans.push({ s0, s1: s0 + pl, x0: bogX[0], x1: bogX[1], top: -0.3, depth: 3, kind: 'mud' }, { s0, s1: s0 + pl, x0: laneX[0], x1: laneX[1], top: 0, depth: 3, kind: 'ground' });
        patches.push({ s0, s1: s0 + pl, x0: bogX[0], x1: bogX[1] });
        const lx = (laneX[0] + laneX[1]) / 2; for (let i = 0; i < 5; i++) slots.push(coin(s0 + 2 + i * (pl - 4) / 4, lx));
        for (let i = 0; i < 3; i++) slots.push(coin(s0 + pl / 2 - 1.5 + i * 1.5, -lane * 1.4, 0.7));
        lane = -lane;
      };
      spans.push(ground(0, a, w), ground(a + pl, a + pl + mid, w), ground(a + pl + mid + pl, len, w));
      pool(a); pool(a + pl + mid);
      return { len, spans, patches, slots };
    },
  };

  // ---- SWINGING GATES: two iron cemetery gates across the path, 12 m apart, on an out-of-step timer. Each closes into a solid wall, swings open, flashes red and creaks before it shuts again.
  // Nobody is trapped (the wall waits until the gateway is empty). Zombies shamble between the gates.
  T.swingGate = {
    cls: 'easy',
    build(c) {
      const { rng, w } = c, a = r1(rng.range(14, 16)), gap = r1(rng.range(14, 16)), len = a + gap + r1(rng.range(14, 16)), spans = [ground(0, len, w)];
      const gates = [{ s: a, w, closed: 1.4, open: 1.9, phase: rng.range(0, 3) }, { s: a + gap, w, closed: 1.4, open: 1.9, phase: rng.range(0, 3) }];
      const slots = [item(a - 6, rng.range(-0.2, 0.2) * w), foe(a + gap / 2, rng.range(-0.3, 0.3) * w), foe(len - 6, rng.range(-0.3, 0.3) * w), foe(6, rng.range(-0.3, 0.3) * w, 0, true)];
      for (let i = 0; i < 4; i++) slots.push(coin(a + 3 + i * 1.2, 0), coin(a + gap + 3 + i * 1.2, 0));
      return { len, spans, gates, slots };
    },
  };

  // ---- Stage 9 set-piece: LIGHTS OUT. A 110 m graveyard path in the dark. The fog closes to a few metres and the sky goes black; the spray is a lantern (a pale light on the muzzle that opens the fog
  // while you shoot). Faint glow-stones mark the path edges; gravestones (0.9 m: hop them) and zombies wait in the dark; ghosts show only their eyes. Hold the trigger to see, let go to cool the gun.
  T.lightsOut = {
    cls: 'special', dark: true,
    build(c) {
      const { rng, w } = c, run = 14, L = 84, tail = 14, len = run + L + tail, spans = [ground(0, len, w)], slots = [], solids = [];
      let side = rng.sign();
      for (let i = 0; i < 5; i++) {   // gravestones (jumpable low blocks) staggered left and right; coins above them reward the hop
        const s = run + 12 + i * 15.5, x = side * rng.range(0.4, 2.4); side = -side;
        spans.push({ s0: s - 0.4, s1: s + 0.4, x0: x - 0.8, x1: x + 0.8, top: 0.9, depth: 0.9, kind: 'ledge' });
        slots.push(coin(s - 1.4, x, 1.5), coin(s, x, 2.1), coin(s + 1.4, x, 1.5));
      }
      for (let i = 0; i < 6; i++) slots.push(foe(run + 6 + i * 13.5 + rng.range(-1.5, 1.5), rng.range(-0.34, 0.34) * w, 0, i % 3 === 1));
      slots.push(item(run + L * 0.45, rng.range(-0.25, 0.25) * w, 0.9), item(run + L * 0.85, rng.range(-0.25, 0.25) * w, 0.9), foe(len - 6, 0), coin(len - 10, 0), coin(len - 9, 0));
      return { len, spans, solids, slots, dark: true };
    },
  };
  return T;
}
