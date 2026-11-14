// Loaded into the page by tools/smoke.mjs. A scripted "player" that reads the track through
// window.__game and presses real keys (input.keys), so it exercises the same input path as a human.
window.__bot = {
  make() {
    const g = window.__game, W = g.world, b = W.player.body, T = W.track, K = g.input.keys, boxes = [];
    let hold = 0;
    const set = (code, on) => (on ? K.add(code) : K.delete(code));
    return () => {
      set('KeyW', true);
      T.query(b.s - 1, b.s + 4, boxes);
      let jump = false, slide = false;
      if (b.grounded) {
        for (const o of boxes) {
          if (o.s1 < b.s || o.s0 > b.s + 3.2 || o.x1 < b.x - 0.4 || o.x0 > b.x + 0.4) continue;
          if (o.kind === 'barrier') { if (o.s0 - b.s < 3 && o.s0 - b.s > -1) slide = true; }
          else if (o.y1 - b.y > 0.35 && o.y0 < b.y + 1 && o.s0 - (b.s + 0.4) < 1) jump = true; // ledge to climb
        }
        const ahead = T.heightUnder(b.s + 0.9, b.x, 0.05);
        if (ahead === -Infinity || ahead < b.y - 0.6) jump = true;                              // edge of a pit
      }
      if (jump) hold = 30; // hold jump through the apex (a tap is a short hop)
      set('Space', hold-- > 0);
      set('ShiftLeft', slide);
    };
  },
  // Advance the simulation `n` fixed steps without waiting for the render loop.
  step(n, bot) { const g = window.__game; for (let i = 0; i < n; i++) { bot?.(); g.input.update(); g.world.update(1 / 60, g.input); } },
};
