// Stage 7 (Rainbow Island) checks: the lagoon, the cloud bump, mud pools that slow, the rainbow slide, and DOUBLE RAINBOW's marked path, beam and bomb fans.
export default async function ({ fresh, fail }) {
  { // layout content, fluids, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.mudPool = n('mudPool'); out.slide = n('rainbowSlide'); out.beam = n('beam');
      return out;
    });
    console.log('lagoon/mud/obstacle: ' + JSON.stringify(r));
    if (!r.types.includes('water') || !r.types.includes('sludge') || !r.fluids.gap || !r.fluids.mudPool) fail('gaps should be a lagoon and mud pools should be filled with mud: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'cloud_bump') fail('stage 7 rolling obstacle should be the cloud bump: ' + r.obstacle);
    if (!(r.mudPool >= 1 && r.slide === 1)) fail('layout should hold mud pools and the rainbow slide: ' + JSON.stringify(r));
    await pg.close();
  }

  { // mud: the player moves at about half speed in a pool and at full speed on the firm lane beside it
    const pg = await fresh('seed=1&foes=0&intro=0&god=1');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, step = (n) => window.__bot.step(n), out = {};
      const seg = W.layout.segments.find((s) => s.name === 'mudPool'), pt = seg.patches[0], mudBox = seg.boxes.find((b) => b.kind === 'mud'), lane = seg.boxes.find((b) => b.kind === 'ground' && b.s0 === mudBox.s0 && b.x0 !== mudBox.x0);
      const speed = (x) => { P.teleport(pt.s0 - 3, x); step(25); K.add('KeyW'); step(20); const s0 = B.s; step(60); K.clear(); return { v: B.s - s0, kind: B.ground?.kind }; };
      out.mud = speed((mudBox.x0 + mudBox.x1) / 2); out.firm = speed((lane.x0 + lane.x1) / 2); out.pools = seg.patches.length; return out;
    });
    console.log('mud: ' + JSON.stringify(r));
    if (!(r.mud.kind === 'mud' && r.firm.kind === 'ground')) fail('the test should walk on mud and on the firm lane: ' + JSON.stringify(r));
    if (!(r.mud.v < r.firm.v * 0.65 && r.mud.v > r.firm.v * 0.35)) fail('mud should slow the player to about half speed: ' + JSON.stringify(r));
    if (r.pools !== 2) fail('a mud segment should hold two pools: ' + r.pools);
    await pg.close();
  }

  { // rainbow slide: the ribbon carries you faster than a normal run; the bot jumps the cloud bumps and gets to the bottom without a pit fall
    const pg = await fresh('seed=1&foes=0&intro=0&god=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, bot = window.__bot.make(), seg = W.layout.segments.find((s) => s.name === 'rainbowSlide'); let vmax = 0, n = 0, jumps = 0, last = null; const off = g.events.on('jump', () => jumps++);
      P.teleport(seg.s0 + 1); last = B.s; while (B.s < seg.s1 - 6 && n++ < 60 * 40) { bot(); window.__bot.step(1); vmax = Math.max(vmax, (B.s - last) * 60); last = B.s; }
      for (let i = 0; i < 60; i++) { bot(); window.__bot.step(1); } off();
      return { s: B.s, end: seg.s1, pit: P.pitFalls, vmax, rise: seg.rise, belt: seg.boxes.find((b) => b.kind === 'slide')?.belt, bumps: seg.boxes.filter((b) => b.kind === 'ledge').length, jumps, hp: g.run.health };
    });
    console.log('rainbow slide: ' + JSON.stringify(r));
    if (!(r.belt === 9 && r.bumps === 6 && r.rise < 0)) fail('the slide should be a downhill ribbon with six cloud bumps: ' + JSON.stringify(r));
    if (!(r.vmax > 14)) fail('the slide should carry the player faster than a normal run (> 14 m/s): ' + r.vmax);
    if (!(r.s >= r.end - 6 && r.pit === 0)) fail('the bot should ride the slide to the bottom without falling: ' + JSON.stringify(r));
    await pg.close();
  }

  { // DOUBLE RAINBOW: the path is marked >= 1.5 s before the beam lights; standing under the beam hurts, stepping off the path costs nothing; bomb fans are marked >= 1.1 s; phase two adds a second beam
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); boss.beamOn = false; };
      const reset = (phase) => { clear(); boss.phase = phase; boss.state = 'rest'; boss.st = 99; e.hp = e.maxHp; e.invulnerable = false; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 9, 0); step(4); };
      const sweep = (stay, phase) => { reset(phase); let t = 0, mark = -1, beam = -1, g2 = 0, marks = 0, hurt = 0, beams2 = 0; const h0 = run.health, off = g.events.on('beamOn', () => { if (beam < 0) beam = t; });
        while (g2++ < 900 && !(boss.state === 'rain' || boss.state === 'rage')) {
          step(1); t++; B.vs = 0; B.vx = 0;
          if (mark < 0 && fx.markers.filter((m) => m.on).length >= 8) { mark = t; marks = fx.markers.filter((m) => m.on).length; }
          if (boss.state === 'sweep') { beams2 = Math.max(beams2, W.arena.boss ? 1 : 0); if (stay) { B.s = e.s; B.x = e.x; B.y = 0; if (run.health < 100) break; } else { B.s = A.center.s - 11; B.x = 0; } }
        }
        off(); return { lead: mark > 0 && beam > 0 ? (beam - mark) / 60 : -1, marks, lost: h0 - run.health, ended: boss.state }; };
      out.stay = sweep(true, 1); out.away = sweep(false, 1);
      // bombs
      reset(1); boss.state = 'rain'; boss.st = 0; boss.volleysLeft = 1; boss.volleyT = 0; let first = null, g2 = 0, lands = 0; const off = g.events.on('strikeLand', () => lands++);
      while (g2++ < 300 && lands < 1) { step(1); const k = fx.strikes.filter((q) => q.on); if (k.length && !first) first = { n: k.length, dur: k[0].dur }; } off(); out.bombs = first;
      // phase two: two beams
      reset(2); boss.state = 'sweep'; boss.st = 1; boss.beamOn = true; step(2); boss.render(e, 1); out.p2Beams = boss.beams.filter((m) => m.visible).length;
      return out;
    });
    console.log('DOUBLE RAINBOW: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    for (const k of ['stay', 'away']) if (!(r[k].lead >= 1.5 && r[k].marks >= 8)) fail(`${k}: the figure-eight should be on the floor >= 1.5 s before the beam lights: ${JSON.stringify(r[k])}`);
    if (!(r.stay.lost >= 20)) fail('standing under the beam should hurt: ' + JSON.stringify(r.stay));
    if (r.away.lost !== 0) fail('standing clear of the beam should cost nothing: ' + JSON.stringify(r.away));
    if (!(r.bombs && r.bombs.n === 3 && r.bombs.dur >= 1.1)) fail('a bomb fan should be three circles marked >= 1.1 s: ' + JSON.stringify(r.bombs));
    if (!(r.p2Beams >= 2)) fail('phase two should light two beams: ' + r.p2Beams);
    await pg.close();
  }
}
