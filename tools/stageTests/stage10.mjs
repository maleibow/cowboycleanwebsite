// Stage 10 (Charcoal Streets) checks: ruby canals (under the gaps and down both sides of the street), the coal pile obstacle, stepping stones, the RISING TIDE (arms on the first step, rises at 0.7 m/s,
// washes a dawdler off and falls 3 m, a runner stays ahead) and VACANT SAVIOR's fans of laser lanes, locked dive line, marked acid, rings and hittable weave.
export default async function ({ fresh, fail }) {
  { // layout content, fluids, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      out.canals = [...W.scenery.chunks.values()].reduce((n, g) => n + g.userData.fluids.filter((f) => f.type === 'ruby' && f.mesh.geometry.attributes.position.count > 30).length, 0);
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.stones = n('canalStones'); out.tide = n('risingTide');
      return out;
    });
    console.log('canals/obstacle: ' + JSON.stringify(r));
    if (!r.types.includes('ruby') || !r.fluids.gap || !r.fluids.canalStones) fail('gaps and the stepping-stone canals should run ruby: ' + JSON.stringify(r.fluids));
    if (!(r.canals >= 3)) fail('every chunk should have its ruby street canals: ' + r.canals);
    if (r.obstacle.join() !== 'coal_pile') fail('stage 10 rolling obstacle should be the coal pile: ' + r.obstacle);
    if (!(r.stones >= 1 && r.tide === 1)) fail('layout should hold stepping-stone canals and the rising-tide climb: ' + JSON.stringify(r));
    await pg.close();
  }

  { // stepping stones: a runner crosses the canal without falling
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'canalStones'), gap = seg.gaps[0]; let n = 0;
      P.teleport(seg.s0 + 1); while (B.s < gap.s1 + 2 && n++ < 60 * 20) { bot(); window.__bot.step(1); }
      return { s: B.s, end: gap.s1, pit: P.pitFalls, width: gap.s1 - gap.s0, stones: seg.boxes.filter((b) => b.kind === 'platform').length };
    });
    console.log('canal stones: ' + JSON.stringify(r));
    if (!(r.s >= r.end + 1 && r.pit === 0 && r.width > 5.2 && r.stones === 5)) fail('five stones over a canal too wide to jump should be crossable: ' + JSON.stringify(r));
    await pg.close();
  }

  { // rising tide: sleeps until the first step, climbs 0.7 m/s, drowns a dawdler (-20, falls 3 m), a runner stays ahead of it to the roof
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const hz = W.hazards.parts.find((p) => p.tides), seg = W.layout.segments.find((s) => s.name === 'risingTide'), q = hz.tides[0];
      P.teleport(seg.s0 + 4); step(30); out.asleep = { on: q.on, level: q.level, from: q.from };
      P.teleport(q.s + 3); step(1); const l0 = q.level; step(60); const l1 = q.level; out.rate = l1 - l0; out.on = q.on;
      // a dawdler on the first step is washed off
      P.teleport(q.s + 4); step(2); q.t = 0; q.level = q.from; run.health = 100; P.invuln = 0; const f0 = P.pitFalls; let t = 0, hit = -1, peak = -9; const off = g.events.on('tideHit', () => { if (hit < 0) hit = t; });
      while (t++ < 60 * 12 && hit < 0) { B.vs = 0; B.vx = 0; step(1); peak = Math.max(peak, q.level); } off(); out.drown = { at: hit / 60, falls: P.pitFalls - f0, health: run.health, peak, after: q.level, drop: peak - q.level };
      // a runner climbs the whole flight
      P.invuln = 0; run.health = 100; P.teleport(seg.s0 + 1); step(5); const bot = window.__bot.make(), f1 = P.pitFalls; let n = 0, minGap = 99; while (B.s < seg.s1 - 5 && n++ < 60 * 40) { bot(); step(1); if (q.on) minGap = Math.min(minGap, B.y - q.level); }
      out.run = { s: B.s, end: seg.s1, y: B.y, falls: P.pitFalls - f1, margin: minGap, secs: n / 60, level: q.level, max: q.max };
      // leaving the stretch resets the tide
      P.teleport(seg.s1 + 6); step(10); out.reset = { on: q.on, level: q.level };
      return out;
    });
    console.log('rising tide: ' + JSON.stringify(r));
    if (!(!r.asleep.on && r.asleep.level === r.asleep.from)) fail('the tide should sleep until the first step: ' + JSON.stringify(r.asleep));
    if (!(r.on && Math.abs(r.rate - 0.7) < 0.08)) fail('the tide should rise at about 0.7 m/s: ' + JSON.stringify({ rate: r.rate, on: r.on }));
    if (!(r.drown.falls === 1 && r.drown.health === 80 && r.drown.drop > 2.5 && r.drown.at > 3 && r.drown.at < 9)) fail('a dawdler should be washed off once (-20) and the tide should fall 3 m: ' + JSON.stringify(r.drown));
    if (!(r.run.s >= r.run.end - 5 && r.run.falls === 0 && r.run.margin > 0.4)) fail('a runner should climb the flight ahead of the tide: ' + JSON.stringify(r.run));
    if (!(r.reset.on === false && r.reset.level === -2.6)) fail('leaving the stretch should reset the tide: ' + JSON.stringify(r.reset));
    await pg.close();
  }

  { // VACANT SAVIOR: fan lanes on the floor >= 0.8 s before the rounds, 3 lanes then 5; the reticle locks and the dive line is drawn >= 1 s before the swoop; acid marked >= 0.95 s; a ring in phase two; hittable while weaving and resting
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss; out.first = { state: boss.state, vuln: !e.invulnerable };
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); for (const s of W.projectiles.enemy) s.on = false; };
      const reset = (phase, state) => { clear(); boss.phase = phase; boss.state = state; boss.st = 0; boss.th = 0; boss.volleysLeft = 2; boss.volleyT = 99; e.hp = e.maxHp; e.invulnerable = false; boss.passive = false; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 8, 0); B.vs = 0; step(3); };
      const fan = (phase) => { reset(phase, 'weave'); boss.volleyT = 0; let lane = -1, shot = -1, t = 0, g2 = 0, lanes = 0, dirOk = false; const off = g.events.on('savior', () => { if (shot < 0) shot = t; });
        while (g2++ < 500 && shot < 0) { step(1); t++; B.s = A.center.s - 8; B.x = 0; B.vs = 0; const on = fx.lanes.filter((q) => q.on).length; if (lane < 0 && on) lane = t; lanes = Math.max(lanes, on); }
        step(8); off(); const shots = W.projectiles.enemy.filter((s) => s.on && s.style === 'ruby_laser'); dirOk = shots.length >= 1 && shots.every((s) => Math.abs(s.vy) < 1e-6 && Math.hypot(s.vs, s.vx) > 10); return { lead: lane > 0 && shot > 0 ? (shot - lane) / 60 : -1, lanes, shots: shots.length, level: dirOk }; };
      out.f1 = fan(1); out.f2 = fan(2);
      // swoop: rise -> lock (line drawn) -> dive; acid circles marked >= 0.95 s
      const swoop = (phase) => { reset(phase, 'rise'); boss.swoopsLeft = phase === 2 ? 2 : 1; let g2 = 0, line = -1, dive = -1, t = 0, drops = 0, minDur = 99, ring = 0, landed = false; const off = g.events.on('saviorDive', () => { if (dive < 0) dive = t; }), off2 = g.events.on('saviorLand', () => { landed = true; });
        while (g2++ < 700 && !landed) { step(1); t++; B.s = A.center.s - 8; B.x = 0; B.vs = 0; if (line < 0 && fx.lanes.some((q) => q.on)) line = t; const k = fx.strikes.filter((q) => q.on); if (k.length) { drops = Math.max(drops, k.length); minDur = Math.min(minDur, ...k.map((q) => q.dur)); } if (fx.waves.some((w) => w.on && !w.harmless)) ring++; }
        step(3); if (fx.waves.some((w) => w.on && !w.harmless)) ring++; let g3 = 0; while (g3++ < 90 && boss.state === 'land') step(1); off(); off2(); return { lead: line > 0 && dive > 0 ? (dive - line) / 60 : -1, drops, minDur, ring, landed, next: boss.state }; };
      out.s1 = swoop(1); out.s2 = swoop(2);
      // hittable while weaving and while resting
      const hit = (state) => { reset(1, state); boss.st = 0; boss.volleyT = 99; boss.volleysLeft = 2; const hp0 = e.hp; if (state === 'weave') { boss.th = 0; for (let i = 0; i < 10; i++) { W.projectiles.fire('normal', e.s - 1.2, e.x, e.y + 1.5, 24, 0, 0); step(1); } step(10); return !e.invulnerable && !boss.passive ? 10 + hp0 - e.hp : 0; } for (let i = 0; i < 10; i++) { W.projectiles.fire('normal', e.s - 2.5, e.x, e.y + 1.5, 20, 0, 0); step(2); } step(15); return hp0 - e.hp; };
      out.hitWeave = hit('weave'); out.hitRest = hit('rest');
      return out;
    });
    console.log('VACANT SAVIOR: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    if (!r.first.vuln) fail('he should be hittable after the roar: ' + JSON.stringify(r.first));
    if (!(r.f1.lead >= 0.8 && r.f1.lanes === 3 && r.f1.shots >= 3 && r.f1.level)) fail('phase one: three lanes on the floor >= 0.8 s before the rounds, which fly level along them: ' + JSON.stringify(r.f1));
    if (!(r.f2.lead >= 0.7 && r.f2.lanes === 5 && r.f2.shots >= 5)) fail('phase two: five lanes: ' + JSON.stringify(r.f2));
    if (!(r.s1.lead >= 0.95 && r.s1.drops >= 6 && r.s1.minDur >= 0.95 && r.s1.landed && r.s1.ring === 0)) fail('swoop: the dive line should be on the floor >= 0.95 s before he moves, acid marked >= 0.95 s: ' + JSON.stringify(r.s1));
    if (!(r.s2.ring >= 1 && r.s2.next === 'rise')) fail('phase two: a ring at each landing and a second swoop: ' + JSON.stringify(r.s2));
    if (!(r.hitWeave >= 5 && r.hitRest >= 5)) fail('he should be hittable while weaving and resting: ' + JSON.stringify({ w: r.hitWeave, r: r.hitRest }));
    await pg.close();
  }
}
