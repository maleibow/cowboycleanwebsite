// Stage 3 (Neo-Scrap City) checks: acid gaps, the barrel, conveyor belts, the reversal set-piece with its crushers, and TRASH KING's charge lanes.
export default async function ({ fresh, fail }) {
  { // acid, barrel, belts in the layout
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { fluids: {}, obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i) };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      out.belts = W.layout.segments.filter((s) => s.name === 'conveyor').length; out.reversal = W.layout.segments.filter((s) => s.name === 'reversal').length;
      out.arrows = [...W.scenery.dressed.keys()].filter((s) => s.name === 'conveyor' || s.name === 'reversal').length;
      return out;
    });
    console.log('acid/belts/obstacle: ' + JSON.stringify(r));
    if (!r.types.includes('acid') || !r.fluids.gap) fail('gaps should be filled with acid: ' + JSON.stringify(r));
    if (r.obstacle.join() !== 'barrel') fail('stage 3 rolling obstacle should be the barrel: ' + r.obstacle);
    if (!(r.belts >= 1 && r.reversal === 1 && r.arrows >= 1)) fail('layout should have conveyors and one reversal set-piece: ' + JSON.stringify(r));
    await pg.close();
  }

  { // belts carry the player; the set-piece belt warns, then reverses
    const pg = await fresh('seed=1&foes=0&intro=0&god=1');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, step = (n) => window.__bot.step(n), out = {};
      const cv = W.layout.segments.find((s) => s.name === 'conveyor'), box = cv.boxes.find((b) => b.kind === 'conveyor');
      P.teleport(box.s0 + 4); step(40); const s0 = B.s; step(60); out.drift = { v: box.belt, ds: B.s - s0 };       // standing still: dragged at belt speed
      K.add('KeyW'); const s1 = B.s; step(60); out.run = { ds: B.s - s1, max: P.maxSpeed() }; K.clear();
      // the reversal
      const rv = W.layout.segments.find((s) => s.name === 'reversal'), rb = rv.boxes.find((b) => b.kind === 'conveyor'); P.teleport(rb.s0 + 2); step(10);
      let warnAt = -1, revAt = -1, t = 0, v0 = rb.belt, warnFlagged = false; const o1 = g.events.on('beltWarn', () => { if (warnAt < 0) warnAt = t; }), o2 = g.events.on('beltReverse', () => { if (revAt < 0) revAt = t; });
      for (let i = 0; i < 60 * 9 && revAt < 0; i++) { P.s = P.s; step(1); t += 1 / 60; if (rb.warn) warnFlagged = true; B.s = Math.min(B.s, rb.s0 + 20); P.progress = Math.max(P.progress, B.s); } o1(); o2();
      out.rev = { v0, v1: rb.belt, warnAt, revAt, warnFlagged, warnLead: revAt - warnAt };
      return out;
    });
    console.log('belts: ' + JSON.stringify(r));
    if (!(Math.abs(r.drift.ds - r.drift.v) < 0.5 && Math.abs(r.drift.v) > 3)) fail('a belt should drag the player at its speed: ' + JSON.stringify(r.drift));
    if (!(Math.abs(r.run.ds) > 5)) fail('running on a belt should still move: ' + JSON.stringify(r.run));
    if (!(r.rev.v0 > 0 && r.rev.v1 === -r.rev.v0 && r.rev.warnFlagged && r.rev.warnLead >= 0.9 && r.rev.revAt > 4)) fail('the set-piece belt should warn >= 0.9 s, then reverse: ' + JSON.stringify(r.rev));
    await pg.close();
  }

  { // crusher pistons: the footprint lights up before the slam; standing in it hurts, the free half does not
    const pg = await fresh('seed=1&foes=0&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const rv = W.layout.segments.find((s) => s.name === 'reversal'), pst = W.hazards.parts.find((p) => p.pistons).pistons[0], free = pst.x0 < 0 ? 2.0 : -2.0, hit = (pst.x0 + pst.x1) / 2;
      const trial = (x) => {
        P.teleport(pst.s - 4, x); step(5); run.health = 100; P.invuln = 0; pst.t = 0.01; let warnStart = -1, slam = -1, t = 0, hold = 0;
        for (let i = 0; i < 60 * 6; i++) {
          B.s = pst.s; B.x = x; B.vs = 0; B.vx = 0; P.progress = Math.max(P.progress, B.s); step(1); t += 1 / 60;
          if (pst.state === 'warn' && warnStart < 0) warnStart = t; if (pst.state === 'slam' && slam < 0) slam = t; if (slam > 0 && t - slam > 0.6) break;
        }
        return { warn: slam - warnStart, lost: 100 - run.health, hadMarker: pst.mk.material.opacity > 0 };
      };
      out.stay = trial(hit); out.free = trial(free); out.state = pst.state; return out;
    });
    console.log('pistons: ' + JSON.stringify(r));
    if (!(r.stay.warn >= 1.1)) fail('a piston should warn for >= 1.1 s before slamming: ' + JSON.stringify(r.stay));
    if (!(r.stay.lost >= 20)) fail('standing under a slamming piston should hurt: ' + JSON.stringify(r.stay));
    if (r.free.lost !== 0) fail('the free half of the belt should be safe: ' + JSON.stringify(r.free));
    await pg.close();
  }

  { // TRASH KING: every charge is telegraphed with a locked lane; staying in it hurts, stepping aside does not; phase two adds charges, junk and slags
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); };
      const reset = () => { clear(); boss.state = 'stun'; boss.st = 0; e.hp = e.maxHp; e.s = A.center.s - 5; e.x = 0; boss.hy = 0.1; run.health = 100; P.invuln = 0; P.teleport(A.center.s + 7, 0); step(6); K.clear(); boss.state = 'hover'; boss.timer = 0; boss.charge = 0; boss.post.s = e.s; boss.post.x = e.x; };
      const charge = (stay, phase) => {
        reset(); boss.phase = phase; let t = 0, tele = -1, chg = -1, crash = -1, lane = null, g2 = 0, strikes = 0, minions = 0, charges = 0;
        const off = g.events.on('bossCrash', () => { charges++; });
        while (g2++ < 60 * 14) {
          step(1); t++;
          if (boss.state === 'tele' && tele < 0) {
            tele = t; const l = fx.lanes.find((q) => q.on); lane = l && { s0: l.s0, x0: l.x0, s1: l.s1, x1: l.x1, w: l.w, dur: l.dur };
            if (!stay && lane) { const ds = lane.s1 - lane.s0, dx = lane.x1 - lane.x0, L = Math.hypot(ds, dx), ns = -dx / L, nx = ds / L; let s = (lane.s0 + lane.s1) / 2 + ns * 6, x = (lane.x0 + lane.x1) / 2 + nx * 6; if (Math.hypot(s - A.center.s, x) > A.center.r - 1.5) { s = (lane.s0 + lane.s1) / 2 - ns * 6; x = (lane.x0 + lane.x1) / 2 - nx * 6; } P.teleport(s, x); }
          }
          if (boss.state === 'charge' && chg < 0) chg = t;
          if (boss.state === 'crash' && crash < 0) { crash = t; strikes = fx.strikes.filter((q) => q.on).length; minions = W.enemies.list.filter((q) => !q.ctrl).length; }
          if (!stay) { B.vs = 0; B.vx = 0; }
          if (crash > 0 && t - crash > 8) break;
        }
        off(); K.clear(); return { tele: (chg - tele) / 60, hadLane: !!lane, laneW: lane?.w, lost: 100 - run.health, strikes, minions, inArena: Math.hypot(e.s - A.center.s, e.x - A.center.x) <= A.center.r + 0.1 };
      };
      out.stay = charge(true, 1); out.aside = charge(false, 1);
      // phase 2: three charges per series, shorter telegraph, junk circles and slags at the crash
      const p2 = charge(false, 2); out.p2 = p2;
      return out;
    });
    console.log('TRASH KING: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    for (const [name, x] of [['stay', r.stay], ['aside', r.aside]]) { if (!x.hadLane) fail(`${name}: no lane shown before the charge`); if (!(x.tele >= 1.4)) fail(`${name}: only ${x.tele.toFixed(2)} s from lane to charge, want >= 1.4`); if (!x.inArena) fail(name + ': the boss left the arena'); }
    if (!(r.stay.lost >= 25)) fail('standing in the charge lane should hurt: ' + JSON.stringify(r.stay));
    if (r.aside.lost !== 0) fail('standing beside the lane should cost nothing: ' + JSON.stringify(r.aside));
    if (!(r.p2.tele >= 1.0)) fail('phase two telegraph should still be >= 1.0 s: ' + r.p2.tele);
    if (r.stay.strikes !== 0 || r.aside.strikes !== 0) fail('phase one should not rain junk');
    if (!(r.p2.hadLane)) fail('phase two charge should still show a lane');
    await pg.close();
  }
}
