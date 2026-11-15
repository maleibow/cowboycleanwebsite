// Stage 6 (Volcano Peak) checks: lava under the gaps, the ash pile, rockfall circles, the collapsing bridge, the lava-wave chase and MAGMA MAW's lobs, burrow and eruption.
export default async function ({ fresh, fail }) {
  { // layout content, fluid, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.rockfall = n('rockfall'); out.collapse = n('collapse'); out.lavaChase = n('lavaChase');
      return out;
    });
    console.log('lava/obstacle/hazards: ' + JSON.stringify(r));
    if (!r.types.includes('lava') || !r.fluids.gap || !r.fluids.lavaChase) fail('gaps and the chase should run over lava: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'ash_pile') fail('stage 6 rolling obstacle should be the ash pile: ' + r.obstacle);
    if (!(r.rockfall >= 1 && r.lavaChase === 1)) fail('layout should hold rockfall and the lava-wave chase: ' + JSON.stringify(r));
    await pg.close();
  }

  { // rockfall: every rock is marked >= 1.3 s before it lands; standing on a circle hurts (15), stepping off costs nothing
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'rockfall'), rocks = W.hazards.parts.find((p) => p.zones), fx = rocks.fx;
      const trial = (stay) => {
        P.teleport(seg.s0 + 10, 0); step(20); run.health = 100; P.invuln = 0; fx.clear(); let lead = 0, lands = 0, g2 = 0, first = null; const h0 = run.health, off = g.events.on('strikeLand', () => lands++);
        while (g2++ < 600 && lands < 1) {
          if (!first) { B.vs = 0; B.vx = 0; B.s = seg.s0 + 10; B.x = 0; } step(1);
          const k = fx.strikes.find((q) => q.on); if (k && !first) { first = { s: k.s, x: k.x, dur: k.dur, r: k.r }; lead = k.dur; if (stay) P.teleport(k.s, k.x); else { P.teleport(seg.s0 + 10, k.x > 0 ? -3.4 : 3.4); } }
          if (!stay && first) { B.vs = 0; B.vx = 0; }
          if (stay && first) { B.s = first.s; B.x = first.x; B.vs = 0; B.vx = 0; }
        }
        off(); return { lead, lands, lost: h0 - run.health, hadRock: !!first };
      };
      out.zone = seg.rocks.length; out.stay = trial(true); out.away = trial(false); return out;
    });
    console.log('rockfall: ' + JSON.stringify(r));
    if (!(r.zone === 1 && r.stay.hadRock && r.stay.lead >= 1.3)) fail('rocks should be marked >= 1.3 s before they land: ' + JSON.stringify(r.stay));
    if (!(r.stay.lost >= 15)) fail('standing on a rock circle should hurt: ' + JSON.stringify(r.stay));
  }

  { // collapsing bridge: a plank burns ~0.55 s after you step on it and falls; a runner crosses; standing still on it drops you; planks return after a respawn
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'collapse'), col = W.hazards.parts.find((p) => p.planks), gap = seg.gaps[0], mine = col.planks.filter((q) => q.seg === seg);
      out.planks = mine.length; out.span = gap.s1 - gap.s0;
      P.teleport(gap.s0 - 6); step(20); K.add('KeyW'); let n = 0, f0 = P.pitFalls; const bot = window.__bot.make();
      while (B.s < gap.s1 + 2 && n++ < 60 * 12) { bot(); step(1); } K.clear(); out.cross = { s: B.s, end: gap.s1, pit: P.pitFalls - f0, fallen: mine.filter((q) => q.state !== 'ok').length };
      // stand still on the first plank
      step(10); P.teleport(gap.s0 - 4); step(5); const p0 = mine[0]; B.s = (p0.s0 + p0.s1) / 2; B.x = 0; B.vs = 0; step(2); let t = 0, f1 = P.pitFalls, fuse = -1, fall = -1;
      while (t < 240 && P.pitFalls === f1) { B.vs = 0; B.vx = 0; B.s = (p0.s0 + p0.s1) / 2; step(1); t++; if (fuse < 0 && p0.state === 'fuse') fuse = t; if (fall < 0 && p0.state === 'fall') fall = t; }
      out.stand = { fell: P.pitFalls - f1, after: (fall - fuse) / 60 };
      step(5); out.restored = mine.every((q) => q.state === 'ok'); out.safeOffBridge = P.safe.s < gap.s0;
      return out;
    });
    console.log('collapse: ' + JSON.stringify(r));
    if (r.planks !== 9) fail('the bridge should have nine planks: ' + r.planks);
    if (!(r.cross.s >= r.cross.end && r.cross.pit === 0 && r.cross.fallen >= 4)) fail('a runner should cross the collapsing bridge, and the planks should fall behind: ' + JSON.stringify(r.cross));
    if (!(r.stand.fell === 1 && r.stand.after >= 0.4 && r.stand.after <= 0.7)) fail('standing on a plank should drop you after ~0.55 s: ' + JSON.stringify(r.stand));
    if (!r.restored) fail('planks should come back after a respawn');
    if (!r.safeOffBridge) fail('a collapsing plank must never be the respawn point: ' + JSON.stringify(r.stand));
    await pg.close();
  }

  { // lava-wave chase: the wave starts behind the player, standing still gets you hit, running keeps ahead of it; the bridge inside the chase collapses
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'lavaChase'); out.mode = seg.mode; out.chase = !!seg.chase; out.planks = seg.planks.length; out.rocks = seg.rocks.length;
      P.teleport(seg.s0 + 1); step(30); const hz = W.hazard; out.started = hz.active; out.lag = B.s - hz.s;
      run.health = 100; P.invuln = 0; const h0 = hz.hits; for (let i = 0; i < 60 * 4; i++) { B.vs = 0; B.vx = 0; step(1); } out.stoodHits = hz.hits - h0;
      P.teleport(seg.s0 + 1); step(5); run.health = 100; hz.s = B.s - seg.chase.lag; const h1 = hz.hits, bot = window.__bot.make(); K.add('KeyW'); let n = 0; while (B.s < seg.s1 - 4 && n++ < 60 * 30) { bot(); step(1); } K.clear();
      out.run = { s: B.s, end: seg.s1, hits: hz.hits - h1 }; return out;
    });
    console.log('lava chase: ' + JSON.stringify(r));
    if (!(r.mode === 'toward' && r.chase && r.started)) fail('the chase should turn the camera round and start the wave: ' + JSON.stringify(r));
    if (!(r.stoodHits >= 1)) fail('standing still in the chase should get you hit by the wave: ' + JSON.stringify(r));
    if (!(r.run.s >= r.run.end - 4 && r.run.hits === 0)) fail('running the chase should outpace the wave: ' + JSON.stringify(r.run));
    await pg.close();
  }

  { // MAGMA MAW: bombs and globs marked >= 1.1 s; the burrow marker locks >= 1.1 s before the eruption; standing in it hurts, leaving costs nothing; phase two burrows twice
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); };
      const reset = (phase) => { clear(); boss.phase = phase; boss.state = 'slide'; boss.st = 0; boss.volleys = 0; e.hp = e.maxHp; e.invulnerable = false; boss.vis = 1; e.s = A.center.s + 6; e.x = 0; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 6, 0); step(4); };
      const lobs = (stay) => { reset(1); boss.state = 'lob'; boss.volleys = 1; boss.lobs = 1; boss.lobT = 0; let first = null, g2 = 0, lands = 0; const off = g.events.on('strikeLand', () => lands++); const h0 = run.health;
        while (g2++ < 400 && lands < 1) { step(1); const k = fx.strikes.find((q) => q.on); if (k && !first) { first = { dur: k.dur }; } if (stay && k) { B.s = k.s; B.x = k.x; B.vs = 0; B.vx = 0; } else if (!stay && k) { const far = fx.strikes.filter((q) => q.on).every((q) => Math.hypot(q.s - B.s, q.x - B.x) > q.r + 1); if (!far) { P.teleport(A.center.s - 6, B.x > 0 ? -7 : 7); } } }
        off(); return { delay: first?.dur ?? -1, lost: h0 - run.health }; };
      out.lobStay = lobs(true); out.lobAway = lobs(false);
      const burrow = (stay, phase) => { reset(phase); boss.burrows = boss.pattern().burrows; boss.state = 'sink'; boss.st = 0; let t = 0, markAt = -1, lockAt = -1, eruptAt = -1, g2 = 0, erupts = 0, mk0 = null, tr = 0; const h0 = run.health, off = g.events.on('magmaErupt', () => { erupts++; if (eruptAt < 0) eruptAt = t; });
        while (g2++ < 900 && !(erupts >= boss.pattern().burrows && t - eruptAt > 40)) {
          step(1); t++; B.vs = 0; B.vx = 0;
          if (markAt < 0 && boss.state === 'burrow' && boss.mk) { markAt = t; mk0 = { s: boss.mk.s, x: boss.mk.x }; }
          if (boss.state === 'burrow' && boss.mk && lockAt < 0 && boss.locked) { lockAt = t; if (!stay) { P.teleport(A.center.s - 6, boss.mk.x > 0 ? -8 : 8); step(1); } }
          if (stay && boss.state === 'burrow') { B.s = (boss.mk?.s ?? B.s); B.x = (boss.mk?.x ?? B.x); }
          if (!stay) { B.vs = 0; B.vx = 0; }
        }
        off(); return { mark: markAt > 0 && eruptAt > 0 ? (eruptAt - markAt) / 60 : -1, lock: lockAt > 0 && eruptAt > 0 ? (eruptAt - lockAt) / 60 : -1, erupts, lost: h0 - run.health, tracked: mk0 }; };
      out.burrowAway = burrow(false, 1); out.burrowStay = burrow(true, 1); out.burrow2 = burrow(false, 2);
      return out;
    });
    console.log('MAGMA MAW: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    if (!(r.lobStay.delay >= 1.1)) fail('bombs should be marked >= 1.1 s: ' + JSON.stringify(r.lobStay));
    if (!(r.lobStay.lost >= 20)) fail('standing in a bomb circle should hurt: ' + JSON.stringify(r.lobStay));
    for (const k of ['burrowAway', 'burrowStay']) { const x = r[k]; if (!(x.mark >= 1.8 && x.lock >= 1.1)) fail(`${k}: marker on the floor >= 1.8 s and locked >= 1.1 s before the eruption: ${JSON.stringify(x)}`); }
    if (r.burrowAway.lost !== 0) fail('leaving the locked circle should cost nothing: ' + JSON.stringify(r.burrowAway));
    if (!(r.burrowStay.lost >= 25)) fail('standing in the locked circle should hurt: ' + JSON.stringify(r.burrowStay));
    if (!(r.burrow2.erupts >= 2)) fail('phase two should erupt twice in a row: ' + JSON.stringify(r.burrow2));
    await pg.close();
  }
}
