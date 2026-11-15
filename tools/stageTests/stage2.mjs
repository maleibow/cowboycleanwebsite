// Stage 2 (Toxic Jungle) checks: the sludge river and mire, the log, the vine-swing set-piece, and BIG SLUDGE's attacks and telegraphs.
export default async function ({ fresh, fail }) {
  { // gap fluid, mire, obstacle
    const pg = await fresh('seed=1&god=1&foes=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { fluids: {}, obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i) };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      return out;
    });
    console.log('river/mire/obstacle: ' + JSON.stringify(r));
    if (!(r.fluids.gap && r.fluids.vines)) fail('gaps and the vine set-piece should be filled with sludge: ' + JSON.stringify(r.fluids));
    if (!r.types.includes('sludge')) fail('the gap fluid should be sludge');
    if (r.obstacle.length !== 1 || r.obstacle[0] !== 'log') fail('stage 2 rolling obstacle should be the log: ' + r.obstacle);
    await pg.close();
  }

  { // vine swings: jump at the edge -> grab -> swing -> land on the island; no jump -> pit; Jump lets go early
    const pg = await fresh('seed=1&foes=0&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'vines'), gap = seg.gaps[0], isl = seg.boxes.find((b) => b.kind === 'platform');
      out.gapW = gap.s1 - gap.s0; out.vines = seg.vines.length;
      let grabs = 0, rels = []; const o1 = g.events.on('vineGrab', () => grabs++), o2 = g.events.on('vineRelease', (j) => rels.push(j));
      const attempt = (jumpAt, earlyRelease) => {
        run.health = 100; P.invuln = 0; P.teleport(gap.s0 - 8); step(40); const f0 = P.pitFalls, g0 = grabs; K.clear(); K.add('KeyW'); let jumped = false, t = 0, swingT = 0, rel = false, tHold = 0;
        for (let i = 0; i < 60 * 8; i++) {
          if (!jumped && B.s > gap.s0 - jumpAt) { K.add('Space'); jumped = true; t = 0; } if (jumped && ++t > 12) K.delete('Space');
          if (P.hold) { swingT += 1 / 60; if (earlyRelease && swingT > 0.35 && !rel) { K.add('Space'); rel = true; } } else if (rel) K.delete('Space');
          step(1); if (P.pitFalls > f0) break; if (grabs > g0 && !P.hold && B.grounded && B.s > gap.s1) break;
        }
        K.clear(); step(2); return { grabbed: grabs - g0, fell: P.pitFalls - f0, s: B.s, grounded: B.grounded, swing: swingT, onIsland: B.s > gap.s1 && B.s < gap.s1 + 8 };
      };
      out.jump = attempt(0.4, false);
      out.early = attempt(0.4, true);
      out.nojump = attempt(-99, false);
      // a player standing in the air next to a vine with no jump press still grabs it (auto-grab): covered by `jump`.
      out.rel = rels;
      o1(); o2(); return out;
    });
    console.log('vines: ' + JSON.stringify(r));
    if (!(r.gapW > 8.5 && r.vines === 3)) fail('vine set-piece should have 3 wide gaps with 3 vines: ' + JSON.stringify(r));
    if (!(r.jump.grabbed === 1 && r.jump.fell === 0 && r.jump.onIsland)) fail('jumping at the vine should grab it and land on the island: ' + JSON.stringify(r.jump));
    if (!(r.early.grabbed === 1 && r.early.fell === 0 && r.early.onIsland && r.rel.includes(true))) fail('Jump during the swing should let go early and still land: ' + JSON.stringify(r.early));
    if (!(r.nojump.fell === 1 && r.nojump.grabbed === 0)) fail('a gap of 9.5 m without the vine should be a pit fall: ' + JSON.stringify(r.nojump));
    await pg.close();
  }

  { // the whole set-piece with the scripted platforming bot (it jumps at every edge): three swings, no falls
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'vines'); let grabs = 0; const off = g.events.on('vineGrab', () => grabs++);
      P.teleport(seg.s0 + 1); let n = 0; while (B.s < seg.s1 + 2 && n++ < 60 * 40) { bot(); window.__bot.step(1); } off();
      return { s: B.s, end: seg.s1, grabs, pit: P.pitFalls };
    });
    console.log('vine run: ' + JSON.stringify(r));
    if (!(r.s >= r.end && r.pit === 0 && r.grabs === 3)) fail('the bot should swing across all three gaps: ' + JSON.stringify(r));
    await pg.close();
  }

  { // BIG SLUDGE: every attack is telegraphed, the landing and the acid circles hurt only those who stay, phase two adds a ring and more rain
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2000) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); };
      const reset = (state) => { clear(); boss.state = state; boss.st = 0; boss.timer = 99; boss.series = true; boss.hopsLeft = 1; e.hp = e.maxHp; e.s = A.center.s + 4; e.x = 0; e.y = 0; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 6, 0); step(8); K.clear(); boss.timer = 0; };
      // ---- a hop: the marker is on the floor from the start of the windup; leaving it costs nothing, standing in it hurts
      const hop = (stay) => {
        reset('idle'); let t = 0, wind = -1, land = -1, marker = null, g2 = 0, away = false;
        while (g2++ < 900) {
          step(1); t++;
          if (boss.state === 'windup' && wind < 0) { wind = t; marker = fx.markers.filter((m) => m.on).map((m) => ({ s: m.s, x: m.x, r: m.r, t: m.t })); if (!stay) K.add('KeyA'); }
          if (boss.state === 'splat' && land < 0) { land = t; K.delete('KeyA'); }
          if (land > 0 && t - land > 20) break;
        }
        K.clear(); const m = marker?.[0];
        return { warn: (land - wind) / 60, hadMarker: !!m, markerR: m?.r, landDist: m ? Math.hypot(e.s - m.s, e.x - m.x) : -1, lost: 100 - run.health };
      };
      out.hopAway = hop(false); out.hopStay = hop(true);
      // ---- the acid rain: every circle is marked from the moment the boss rears back
      const rain = (stay, phase2) => {
        reset('idle'); boss.hopsLeft = 0; boss.phase = phase2 ? 2 : 1; let t = 0, spit = -1, firstImpact = -1, impacts = 0, marks = [], g2 = 0; const off = g.events.on('strikeLand', () => { impacts++; if (firstImpact < 0) firstImpact = t; });
        while (g2++ < 1200) {
          step(1); t++;
          if (boss.state === 'spit' && spit < 0) {
            spit = t; marks = fx.markers.filter((m) => m.on).map((m) => ({ s: m.s, x: m.x, r: m.r, t: m.t }));
            if (!stay) { let best = null, bd = -1; for (let a = 0; a < 6.28; a += 0.4) for (const d of [6, 9, 12]) { const s = A.center.s + Math.cos(a) * d, x = Math.sin(a) * d, dm = Math.min(...marks.map((q) => Math.hypot(q.s - s, q.x - x) - q.r)); if (dm > bd && Math.hypot(s - A.center.s, x) < A.center.r - 2 && Math.hypot(s - e.s, x - e.x) > 6) { bd = dm; best = [s, x]; } } P.teleport(best[0], best[1]); }
          }
          if (spit > 0 && impacts >= marks.length && marks.length) break;
        }
        off(); K.clear(); return { marks: marks.length, warn: (firstImpact - spit) / 60, impacts, lost: 100 - run.health, r: marks[0]?.r };
      };
      out.rainAway = rain(false, false); out.rainStay = rain(true, false); out.rain2 = rain(true, true);
      // ---- phase two: a landing sends a jumpable ring
      reset('idle'); clear(); boss.phase = 2; run.cheats.god = true; boss.state = 'idle'; boss.timer = 0; boss.series = true; boss.hopsLeft = 1; P.teleport(A.center.s - 6, 0); let ring = 0, minions = 0;
      for (let i = 0; i < 900; i++) { step(1); if (boss.state === 'splat') { ring = Math.max(ring, fx.waves.filter((w) => w.on && !w.harmless).length); minions = W.enemies.list.filter((q) => !q.ctrl).length; if (i > 0 && ring) break; } }
      out.p2 = { ring, minions }; run.cheats.god = false;
      return out;
    });
    console.log('BIG SLUDGE: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    for (const [name, x] of [['hopAway', r.hopAway], ['hopStay', r.hopStay]]) {
      if (!x.hadMarker) fail(`${name}: no floor marker during the windup`);
      if (!(x.warn >= 1.7)) fail(`${name}: only ${x.warn.toFixed(2)} s from windup to landing, want >= 1.7`);
      if (!(x.landDist < 0.6)) fail(`${name}: boss landed ${x.landDist.toFixed(2)} m from its marker`);
    }
    if (r.hopAway.lost !== 0) fail('leaving the landing marker should cost nothing, cost ' + r.hopAway.lost);
    if (!(r.hopStay.lost >= 20)) fail('standing in the landing marker should hurt, cost ' + r.hopStay.lost);
    if (r.rainAway.marks !== 4 || r.rain2.marks !== 6) fail(`acid rain circle counts: phase 1 ${r.rainAway.marks}, phase 2 ${r.rain2.marks} (want 4 and 6)`);
    for (const [name, x] of [['rainAway', r.rainAway], ['rainStay', r.rainStay], ['rain2', r.rain2]]) if (!(x.warn >= 1.8)) fail(`${name}: only ${x.warn.toFixed(2)} s from the first marker to the first impact, want >= 1.8`);
    if (r.rainAway.lost !== 0) fail('standing clear of every acid circle should cost nothing, cost ' + r.rainAway.lost);
    if (!(r.rainStay.lost >= 20)) fail('standing in an acid circle should hurt, cost ' + r.rainStay.lost);
    if (!(r.p2.ring >= 1)) fail('phase two landing should send a ring');
    await pg.close();
  }
}
