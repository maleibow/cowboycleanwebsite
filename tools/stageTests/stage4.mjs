// Stage 4 (New York City) checks: the flooded trench, the trash can, open manholes, the traffic crossing, the rooftop set-piece, and PIZZA RAT's bombs and swoops.
export default async function ({ fresh, fail }) {
  { // layout content, fluid, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.manholes = n('manholes'); out.crossing = n('crossing'); out.rooftops = n('rooftops');
      return out;
    });
    console.log('trench/obstacle/hazards: ' + JSON.stringify(r));
    if (!r.types.includes('water') || !r.fluids.gap || !r.fluids.rooftops) fail('gaps and the rooftop alleys should be flooded: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'trash_can') fail('stage 4 rolling obstacle should be the trash can: ' + r.obstacle);
    if (!(r.manholes >= 1 && r.crossing >= 1 && r.rooftops === 1)) fail('layout should hold manholes, a traffic crossing and the rooftop set-piece: ' + JSON.stringify(r));
    await pg.close();
  }

  { // manholes: walk into one and fall (-20, back at the last safe ground); walk round one and stay up
    const pg = await fresh('seed=1&foes=0&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'manholes'), h = seg.holes[0], cx = (h.x0 + h.x1) / 2;
      out.holes = seg.holes.length; out.size = [h.s1 - h.s0, h.x1 - h.x0];
      const walk = (x) => { run.health = 100; P.invuln = 0; P.teleport(h.s0 - 6, x); step(20); const f0 = P.pitFalls, h0 = run.health; K.add('KeyW'); for (let i = 0; i < 160 && B.s < h.s1 + 3; i++) { step(1); if (P.pitFalls > f0) break; } K.clear(); return { fell: P.pitFalls - f0, hpLost: h0 - run.health, s: B.s }; };
      out.into = walk(cx); out.around = walk(cx + (cx > 0 ? -3.2 : 3.2));
      return out;
    });
    console.log('manholes: ' + JSON.stringify(r));
    if (!(r.holes === 3 && Math.abs(r.size[0] - 3.4) < 0.01 && Math.abs(r.size[1] - 2.4) < 0.01)) fail('a manhole segment should hold three 3.4 x 2.4 m holes: ' + JSON.stringify(r));
    if (!(r.into.fell === 1 && r.into.hpLost === 20)) fail('walking into a manhole should be a 20-damage pit fall: ' + JSON.stringify(r.into));
    if (!(r.around.fell === 0 && r.around.s > 0)) fail('walking round the manhole should be safe: ' + JSON.stringify(r.around));
    await pg.close();
  }

  { // traffic: a taxi honks as it enters (>= 1 s before it reaches the road), clips you for 15 if you stand in its lane, a jump clears it
    const pg = await fresh('seed=1&foes=0&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, run = g.run, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'crossing'), tr = W.hazards.parts.find((p) => p.cars), car = tr.cars[0], half = seg.width / 2;
      const trial = (jump) => {
        P.teleport(car.s - 3, 0); step(10); run.health = 100; P.invuln = 0; car.t = car.phase = 0; car.honked = false; car.hit = false; let horn = -1, edge = -1, t = 0, lost0 = run.health; const off = g.events.on('carHorn', () => { if (horn < 0) horn = t; });
        for (let i = 0; i < 60 * 5; i++) { B.s = car.s; B.x = 0; B.vs = 0; B.vx = 0; if (jump) { B.y = 2.4; B.vy = 0; } P.progress = Math.max(P.progress, B.s); step(1); t += 1 / 60; if (edge < 0 && car.on && Math.abs(car.x) <= half + 0.6) edge = t; if (!car.on && t > 1) break; }
        off(); return { lost: lost0 - run.health, lead: edge - horn, horn: horn >= 0 };
      };
      out.stay = trial(false); out.jump = trial(true); out.cars = tr.cars.filter((c) => c.seg === seg).length; return out;
    });
    console.log('traffic: ' + JSON.stringify(r));
    if (!(r.stay.horn && r.stay.lead >= 1.0)) fail('a taxi should honk and be on screen >= 1 s before it reaches the road: ' + JSON.stringify(r.stay));
    if (r.stay.lost !== 15) fail('standing in a taxi lane should cost 15: ' + JSON.stringify(r.stay));
    if (r.jump.lost !== 0) fail('jumping a taxi should cost nothing: ' + JSON.stringify(r.jump));
    if (r.cars !== 3) fail('the crossing should have three lanes: ' + r.cars);
    await pg.close();
  }

  { // rooftop set-piece: the bot climbs three fire escapes, crosses three rooftops and drops to the street without a pit fall
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'rooftops'); let maxY = 0;
      P.teleport(seg.s0 + 1); let n = 0; while (B.s < seg.s1 - 6 && n++ < 60 * 40) { bot(); window.__bot.step(1); maxY = Math.max(maxY, B.y); }
      for (let i = 0; i < 90; i++) { bot(); window.__bot.step(1); }
      return { s: B.s, end: seg.s1, y: B.y, grounded: B.grounded, maxY, pit: P.pitFalls, gaps: seg.gaps.length, roofs: seg.boxes.filter((b) => b.kind === 'ledge').length, escapes: seg.boxes.filter((b) => b.kind === 'platform').length };
    });
    console.log('rooftops: ' + JSON.stringify(r));
    if (!(r.roofs === 3 && r.escapes === 3 && r.maxY > 5)) fail('the set-piece should have three fire escapes and three rooftops: ' + JSON.stringify(r));
    if (!(r.s >= r.end - 6 && r.pit === 0 && r.grounded && Math.abs(r.y) < 0.5)) fail('the bot should cross the rooftops and land on the street: ' + JSON.stringify(r));
    await pg.close();
  }

  { // PIZZA RAT: bombs and swoops are telegraphed; staying in a circle hurts, leaving costs nothing; phase two adds a second swoop and rats
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); };
      const reset = (phase) => { clear(); boss.phase = phase; boss.state = 'orbit'; boss.st = 0; boss.bombsLeft = 0; boss.bombT = 99; boss.swoopsLeft = 0; e.hp = e.maxHp; boss.hy = 4.4; boss.theta = 0.6; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 6, 0); step(6); K.clear(); };
      // ---- bombs
      const bombs = (stay) => {
        reset(1); boss.bombsLeft = 2; boss.bombT = 0; boss.swoopsLeft = 1; let t = 0, first = -1, lands = 0, delay = 0, marks = [], g2 = 0; const off = g.events.on('strikeLand', () => { lands++; });
        while (g2++ < 400) {
          step(1); t++;
          const s0 = fx.strikes.find((q) => q.on);
          if (s0 && first < 0) { first = t; delay = s0.dur; marks = fx.strikes.filter((q) => q.on).map((q) => ({ s: q.s, x: q.x })); if (stay) P.teleport(s0.s, s0.x); else { let best = null, bd = -1; for (let a = 0; a < 6.28; a += 0.4) { const s = A.center.s + Math.cos(a) * 5, x = Math.sin(a) * 5, dm = Math.hypot(s - s0.s, x - s0.x); if (dm > bd) { bd = dm; best = [s, x]; } } P.teleport(best[0], best[1]); } }
          if (!stay) { B.vs = 0; B.vx = 0; }
          if (lands >= 1 && t - first > 90) break;
        }
        off(); K.clear(); return { delay, lands, lost: 100 - run.health };
      };
      out.bombAway = bombs(false); out.bombStay = bombs(true);
      // ---- swoop
      const swoop = (stay, phase) => {
        reset(phase); boss.bombsLeft = 0; boss.bombT = -0.6; boss.swoopsLeft = boss.pattern().swoops; let t = 0, tele = -1, land = -1, marker = null, minions = 0, lands = 0, g2 = 0; const off = g.events.on('bossCrash', () => { lands++; });
        while (g2++ < 900) {
          step(1); t++;
          if (boss.state === 'tele' && tele < 0) { tele = t; marker = fx.markers.filter((m) => m.on).map((m) => ({ s: m.s, x: m.x, r: m.r, t: m.t }))[0]; if (!stay && marker) P.teleport(Math.max(A.center.s - 9, Math.min(A.center.s + 9, marker.s + (marker.s > A.center.s ? -8 : 8))), marker.x); }
          if (boss.state === 'recover' && land < 0) { land = t; minions = W.enemies.list.filter((q) => !q.ctrl).length; }
          if (!stay) { B.vs = 0; B.vx = 0; }
          if (phase === 1 ? (land > 0 && t - land > 20) : (lands >= 2 || t > 700)) break;
        }
        off(); K.clear(); return { warn: (land - tele) / 60, hadMarker: !!marker, r: marker?.r, lost: 100 - run.health, lands, minions, landDist: marker ? Math.hypot(e.s - marker.s, e.x - marker.x) : -1 };
      };
      out.swoopAway = swoop(false, 1); out.swoopStay = swoop(true, 1); out.swoop2 = swoop(false, 2);
      return out;
    });
    console.log('PIZZA RAT: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    if (!(r.bombAway.delay >= 1.0 && r.bombStay.delay >= 1.0)) fail('every bomb should be marked >= 1.0 s before it lands: ' + JSON.stringify([r.bombAway.delay, r.bombStay.delay]));
    if (r.bombAway.lost !== 0) fail('standing clear of the bomb circle should cost nothing: ' + JSON.stringify(r.bombAway));
    if (!(r.bombStay.lost >= 20)) fail('standing in a bomb circle should hurt: ' + JSON.stringify(r.bombStay));
    for (const [name, x] of [['swoopAway', r.swoopAway], ['swoopStay', r.swoopStay]]) { if (!x.hadMarker) fail(name + ': no marker for the swoop'); if (!(x.warn >= 1.6)) fail(`${name}: only ${x.warn.toFixed(2)} s from the marker to the landing, want >= 1.6`); if (!(x.landDist < 0.6)) fail(`${name}: landed ${x.landDist.toFixed(2)} m from the marker`); }
    if (r.swoopAway.lost !== 0) fail('leaving the swoop marker should cost nothing: ' + JSON.stringify(r.swoopAway));
    if (!(r.swoopStay.lost >= 25)) fail('standing in the swoop marker should hurt: ' + JSON.stringify(r.swoopStay));
    if (!(r.swoop2.lands >= 2)) fail('phase two should swoop twice in a row: ' + JSON.stringify(r.swoop2));
    if (!(r.swoop2.minions >= 1)) fail('phase two landing should bring rats: ' + JSON.stringify(r.swoop2));
    await pg.close();
  }
}
