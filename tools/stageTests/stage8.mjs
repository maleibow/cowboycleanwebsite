// Stage 8 (Cloud Dream) checks: the cloud sea under the gaps, the sleeping sheep, drifting clouds that carry you and never open a gap a jump cannot clear, the moving-cloud ride, and THE EYE's
// shield, marked storm bolts, locked laser lane and the open window (the only time he can be hurt).
export default async function ({ fresh, fail }) {
  { // layout content, fluids, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.cloudHop = n('cloudHop'); out.cloudRide = n('cloudRide');
      out.clouds = W.hazards.parts.find((p) => p.clouds)?.clouds.length;
      return out;
    });
    console.log('clouds/obstacle: ' + JSON.stringify(r));
    if (!r.fluids.gap || !r.fluids.cloudRide) fail('gaps and the ride should have a cloud sea under them: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'sleep_sheep') fail('stage 8 rolling obstacle should be the sleeping sheep: ' + r.obstacle);
    if (!(r.cloudHop >= 1 && r.cloudRide === 1 && r.clouds >= 9)) fail('layout should hold cloud hops and the moving-cloud ride: ' + JSON.stringify(r));
    await pg.close();
  }

  { // moving clouds: a rider is carried with the cloud; no gap between neighbouring clouds (or the islands) ever exceeds 5.2 m or closes to nothing over a full minute
    const pg = await fresh('seed=1&foes=0&intro=0&god=1');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, step = (n) => window.__bot.step(n), out = {};
      const hz = W.hazards.parts.find((p) => p.clouds), seg = W.layout.segments.find((s) => s.name === 'cloudRide'), mine = hz.clouds.filter((c) => c.seg === seg);
      const c = mine.find((q) => q.move === 'x'); P.teleport(c.cs, c.cx); step(30); out.stood = B.ground === c.box; const x0 = B.x - c.cx; let moved = 0, drift = 0;
      for (let i = 0; i < 120; i++) { const px = c.cx; B.vs = 0; B.vx = 0; step(1); moved = Math.max(moved, Math.abs(c.cx - px) * 60); drift = Math.max(drift, Math.abs((B.x - c.cx) - x0)); }
      out.carried = { cloudSpeed: moved, drift, onIt: B.ground === c.box, rides: hz.rides };
      // gap sweep over 60 s of clock time: edge-to-edge distance between consecutive clouds (the islands are fixed)
      const first = seg.boxes.find((b) => b.kind === 'ground' && b.s0 === seg.s0), isl = seg.boxes.filter((b) => b.kind === 'platform' || b.kind === 'ground').sort((a, b) => a.s0 - b.s0);
      let maxGap = 0, minGap = 99; const t0 = performance.now();
      const pos = (q, tt) => { const w = (Math.PI * 2 / q.period) * (tt + q.phase); return q.move === 'x' ? [q.s, q.x + q.amp * Math.sin(w)] : q.move === 's' ? [q.s + q.amp * Math.sin(w), q.x] : [q.s + q.ampS * Math.sin(w), q.x + q.amp * Math.cos(w)]; };
      const lanes = [seg.s0 + 10, null]; for (let tt = 0; tt < 60; tt += 0.05) {
        const edges = mine.map((q) => { const [s] = pos(q, tt); return [s - q.L / 2, s + q.L / 2]; }).sort((a, b) => a[0] - b[0]);
        const left = isl[0].s1, mid = isl.find((b) => b.kind === 'platform'), all = [[0, left], ...edges.slice(0, 3), ...(mid ? [[mid.s0, mid.s1]] : []), ...edges.slice(3), [isl[isl.length - 1].s0, 1e9]].sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < all.length; i++) { const gp = all[i][0] - all[i - 1][1]; maxGap = Math.max(maxGap, gp); minGap = Math.min(minGap, gp); }
      }
      out.gaps = { maxGap, minGap, clouds: mine.length };
      return out;
    });
    console.log('moving clouds: ' + JSON.stringify(r));
    if (!(r.stood && r.carried.cloudSpeed > 1.5 && r.carried.onIt && r.carried.drift < 0.3)) fail('a cloud should carry the player with it: ' + JSON.stringify(r.carried));
    if (!(r.carried.rides >= 1)) fail('stepping on a cloud should count as a ride (sound event)');
    if (!(r.gaps.maxGap <= 5.3 && r.gaps.minGap > -0.5)) fail('cloud gaps should stay jumpable: ' + JSON.stringify(r.gaps));
    await pg.close();
  }

  { // the ride: a scripted runner that steers onto the next cloud crosses the whole set-piece without falling
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'cloudRide'); let n = 0, jumps = 0; const off = g.events.on('jump', () => jumps++);
      P.teleport(seg.s0 + 1); while (B.s < seg.s1 - 6 && n++ < 60 * 40) { bot(); window.__bot.step(1); } off();
      return { s: B.s, end: seg.s1, pit: P.pitFalls, hp: g.run.health, jumps, secs: n / 60 };
    });
    console.log('cloud ride: ' + JSON.stringify(r));
    if (!(r.s >= r.end - 6 && r.pit === 0)) fail('the runner should cross the moving clouds without a fall: ' + JSON.stringify(r));
    await pg.close();
  }

  { // THE EYE: shielded = invulnerable, bolts marked >= 1 s, lane locked >= 0.85 s before the first round, open = hittable, rounds fly along the lane, phase two adds bolts and lanes
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss; out.firstOpen = { state: boss.state, vuln: !e.invulnerable };
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); W.projectiles?.clearEnemyShots?.(0, 0, 99); };
      const reset = (phase, state) => { clear(); boss.phase = phase; boss.state = state; boss.st = 0; boss.free = false; e.hp = e.maxHp; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 8, 0); B.vs = 0; step(4); };
      // shielded: bullets do nothing
      reset(1, 'shield'); boss.boltsLeft = 99; boss.boltT = 99; e.invulnerable = true; const hp0 = e.hp; for (let i = 0; i < 12; i++) { W.projectiles.fire('normal', e.s - 2.5, e.x, e.y + 1.5, 20, 0, 0); step(2); } step(20); out.shield = { hp: hp0 - e.hp, inv: e.invulnerable };
      // bolts: marked >= 1 s before they land
      reset(1, 'shield'); let first = null, g2 = 0; boss.boltsLeft = 3; boss.boltT = 0;
      while (g2++ < 400 && !first) { step(1); const k = fx.strikes.find((q) => q.on); if (k) first = { dur: k.dur, r: k.r, damage: k.damage, mk: !!k.mk }; } out.bolt = first;
      // lane: locked before the shield pops; no round leaves before it has been on the floor >= 0.85 s
      reset(1, 'shield'); boss.boltsLeft = 0; boss.st = 99; let lane = -1, shot = -1, t = 0; g2 = 0; const offS = g.events.on('eyeShot', () => { if (shot < 0) shot = t; });
      while (g2++ < 600 && shot < 0) { step(1); t++; if (lane < 0 && fx.lanes.some((q) => q.on)) lane = t; if (boss.state === 'open' && !e.invulnerable && boss.shotsLeft > 0 && shot < 0) { /* waiting for the first volley */ } }
      for (let i = 0; i < 40; i++) step(1); offS(); out.lane = { lead: lane > 0 && shot > 0 ? (shot - lane) / 60 : -1, lanes: fx.lanes.filter((q) => q.on).length, state: boss.state, vuln: !e.invulnerable };
      // open: hittable
      boss.state = 'open'; boss.st = 0.5; boss.shotsLeft = 0; boss.free = true; e.invulnerable = false; const hp1 = e.hp; for (let i = 0; i < 12; i++) { W.projectiles.fire('normal', e.s - 2.5, e.x, e.y + 1.5, 20, 0, 0); step(2); } step(20); out.open = { lost: hp1 - e.hp };
      // phase two: five bolts, three lanes, shorter window
      reset(2, 'shield'); boss.boltsLeft = boss.pattern().bolts; boss.boltT = 0; let seen = 0; g2 = 0; const offB = g.events.on('boltCall', () => seen++); while (g2++ < 400 && boss.state === 'shield') step(1); offB(); out.p2Bolts = seen;
      reset(2, 'shield'); boss.boltsLeft = 0; boss.st = 99; g2 = 0; let maxLanes = 0; while (g2++ < 200) { step(1); maxLanes = Math.max(maxLanes, fx.lanes.filter((q) => q.on).length); if (boss.state === 'open') break; } out.p2Lanes = maxLanes;
      return out;
    });
    console.log('THE EYE: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    if (!(r.firstOpen.vuln)) fail('the first window after the roar should be open: ' + JSON.stringify(r.firstOpen));
    if (!(r.shield.hp === 0 && r.shield.inv)) fail('a shielded eye must take no damage: ' + JSON.stringify(r.shield));
    if (!(r.bolt && r.bolt.dur >= 1.0 && r.bolt.mk)) fail('storm bolts should be marked on the floor >= 1.0 s: ' + JSON.stringify(r.bolt));
    if (!(r.lane.lead >= 0.85 && r.lane.lanes >= 1 && r.lane.state === 'open' && r.lane.vuln)) fail('the laser lane should be on the floor >= 0.85 s before the first round, then the eye opens: ' + JSON.stringify(r.lane));
    if (!(r.open.lost >= 5)) fail('an open eye should be hittable: ' + JSON.stringify(r.open));
    if (!(r.p2Bolts === 5)) fail('phase two should call five bolts a volley: ' + r.p2Bolts);
    if (!(r.p2Lanes >= 3)) fail('phase two should fan three lanes: ' + r.p2Lanes);
    await pg.close();
  }
}
