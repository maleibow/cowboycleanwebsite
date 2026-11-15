// Stage 5 (Paris Nights) checks: the river under the gaps, the café chair, awning bounce pads (the rooftop gap and the set-piece), and THE MIME's lanes and teleports.
export default async function ({ fresh, fail }) {
  { // layout content, fluid, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.bounceGap = n('bounceGap'); out.awnings = n('awnings');
      return out;
    });
    console.log('river/obstacle/hazards: ' + JSON.stringify(r));
    if (!r.fluids.gap || !r.fluids.awnings) fail('gaps and the awning run should sit over the river: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'cafe_chair') fail('stage 5 rolling obstacle should be the café chair: ' + r.obstacle);
    if (!(r.awnings === 1 && r.bounceGap >= 1)) fail('layout should hold the awning run and at least one awning gap: ' + JSON.stringify(r));
    await pg.close();
  }

  { // bounce: landing on an awning springs the player >= 4.5 m; the rooftop gap (9.5 m, wider than a jump) can only be crossed by bouncing
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'bounceGap'), aw = seg.boxes.find((b) => b.kind === 'bounce'), gap = seg.gaps[0];
      out.gap = gap.s1 - gap.s0; out.awning = [aw.s1 - aw.s0, aw.y1];
      let bounces = 0; const off = g.events.on('bounce', () => bounces++);
      P.teleport(aw.s0 - 3); B.y = aw.y1 + 2.5; B.vy = 0; B.s = (aw.s0 + aw.s1) / 2; B.x = 0; step(1); let top = 0; for (let i = 0; i < 90; i++) { step(1); top = Math.max(top, B.y); }
      out.bounces = bounces; out.apex = top; off();
      // run the gap: jump at the edge; with the awning in the middle the bot lands on the far roof, with a plain 9.5 m gap it could not
      P.teleport(gap.s0 - 6); step(20); K.add('KeyW'); let n = 0, f0 = P.pitFalls, jumped = 0; const bot = window.__bot.make();
      while (B.s < gap.s1 + 3 && n++ < 60 * 12) { bot(); step(1); } K.clear(); out.cross = { s: B.s, end: gap.s1, pit: P.pitFalls - f0 };
      return out;
    });
    console.log('bounce: ' + JSON.stringify(r));
    if (!(r.bounces >= 1 && r.apex >= r.awning[1] + 4.0)) fail('landing on an awning should spring the player up >= 4 m: ' + JSON.stringify(r));
    if (!(r.gap > 5.2)) fail('the awning gap should be wider than a plain jump: ' + r.gap);
    if (!(r.cross.s >= r.cross.end && r.cross.pit === 0)) fail('the bot should bounce across the rooftop gap: ' + JSON.stringify(r.cross));
    await pg.close();
  }

  { // set-piece: the bot rides the whole awning run without a pit fall
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'awnings'); let maxY = 0, bounces = 0; const off = g.events.on('bounce', () => bounces++);
      P.teleport(seg.s0 + 1); let n = 0; while (B.s < seg.s1 - 6 && n++ < 60 * 40) { bot(); window.__bot.step(1); maxY = Math.max(maxY, B.y); }
      for (let i = 0; i < 60; i++) { bot(); window.__bot.step(1); } off();
      return { s: B.s, end: seg.s1, grounded: B.grounded, maxY, pit: P.pitFalls, pads: seg.boxes.filter((b) => b.kind === 'bounce').length, bounces };
    });
    console.log('awning run: ' + JSON.stringify(r));
    if (r.pads !== 7) fail('the set-piece should have seven awnings: ' + r.pads);
    if (!(r.s >= r.end - 6 && r.pit === 0 && r.bounces >= 6)) fail('the bot should bounce along the whole run without falling: ' + JSON.stringify(r));
    await pg.close();
  }

  { // THE MIME: the lane is on the floor >= 0.8 s before the first round, walking out of it costs nothing, standing in it hurts; the arrival spot is marked >= 1 s and he is invulnerable while away; phase two fires three lanes
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); W.projectiles.clear?.(); };
      // one full cycle: open -> vanish -> away -> appear -> aim -> fire. `stay` keeps the player where the lane will be drawn.
      const cycle = (phase, stay) => {
        clear(); boss.phase = phase; e.hp = e.maxHp; boss.chain = 0; run.health = 100; P.invuln = 0; boss.state = 'open'; boss.st = 99; P.teleport(A.center.s + 1, 0); step(2); B.vs = 0; B.vx = 0;
        let t = 0, tele = -1, appear = -1, laneAt = -1, fireAt = -1, lanes = 0, inv = true, marker = 0, g2 = 0; const h0 = run.health, off = g.events.on('mimeShot', () => { if (fireAt < 0) fireAt = t; });
        while (g2++ < 900 && !(fireAt > 0 && t - fireAt > 50)) {
          step(1); t++;
          if (boss.state === 'away' || boss.state === 'vanish') { inv = inv && e.invulnerable; if (tele < 0) tele = t; marker = Math.max(marker, fx.markers.filter((m) => m.on).length); }
          if (boss.state === 'appear' && appear < 0) appear = t;
          if (laneAt < 0 && fx.lanes.some((q) => q.on)) { laneAt = t; lanes = fx.lanes.filter((q) => q.on).length; if (!stay) { P.teleport(A.center.s + 1, 8); step(1); } }
          B.vs = 0; B.vx = 0; if (stay) { B.s = A.center.s + 1; B.x = 0; }
        }
        off(); return { lead: fireAt > 0 && laneAt > 0 ? (fireAt - laneAt) / 60 : -1, lanes, lost: h0 - run.health, awayFor: tele > 0 && appear > 0 ? (appear - tele) / 60 : -1, inv, marker };
      };
      out.away = cycle(1, false); out.stay = cycle(1, true); out.p2 = cycle(2, false);
      return out;
    });
    console.log('THE MIME: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    for (const k of ['away', 'stay']) { const x = r[k]; if (!(x.lead >= 0.8)) fail(`${k}: the lane should be on the floor >= 0.8 s before the first round: ${JSON.stringify(x)}`); if (!(x.awayFor >= 1.4 && x.marker >= 1 && x.inv)) fail(`${k}: he should be marked >= 1 s, away >= 1.4 s and invulnerable while away: ${JSON.stringify(x)}`); }
    if (r.away.lost !== 0) fail('stepping out of the lane should cost nothing: ' + JSON.stringify(r.away));
    if (!(r.stay.lost >= 5)) fail('standing in the lane should get you shot: ' + JSON.stringify(r.stay));
    if (r.p2.lanes !== 3) fail('phase two should draw three lanes per burst: ' + JSON.stringify(r.p2));
    await pg.close();
  }
}
