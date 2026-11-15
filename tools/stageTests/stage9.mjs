// Stage 9 (Haunted Village) checks: the bog under the gaps and in the bog patches, the gravestone obstacle, swinging gates (a wall that opens, warns, shuts and never traps), the lights-out set-piece
// (fog and light close in; the spray opens them up) and HOLLOW GHOST's wisps, phasing and marked spectral bursts.
export default async function ({ fresh, fail }) {
  { // layout content, fluids, obstacle
    const pg = await fresh('seed=1&god=1&intro=0');
    const r = await pg.evaluate(() => {
      const W = window.__game.world; W.scenery.buildAll(); const out = { obstacle: W.layout.slots.filter((s) => s.kind === 'obstacle').map((s) => s.type).filter((v, i, a) => a.indexOf(v) === i), fluids: {} };
      for (const [seg, d] of W.scenery.dressed) if (d.fluids?.length) out.fluids[seg.name] = (out.fluids[seg.name] || 0) + d.fluids.length;
      out.types = [...W.scenery.dressed.values()].flatMap((d) => d.fluids || []).map((f) => f.type).filter((v, i, a) => a.indexOf(v) === i);
      const n = (nm) => W.layout.segments.filter((s) => s.name === nm).length; out.bog = n('bog'); out.swingGate = n('swingGate'); out.lightsOut = n('lightsOut');
      out.dark = W.layout.segments.filter((s) => s.dark).length; out.gates = W.hazards.parts.find((p) => p.gates)?.gates.length;
      return out;
    });
    console.log('bog/gates/obstacle: ' + JSON.stringify(r));
    if (!r.types.includes('sludge') || !r.fluids.gap || !r.fluids.bog) fail('gaps and bog patches should hold the black bog: ' + JSON.stringify(r.fluids));
    if (r.obstacle.join() !== 'gravestone') fail('stage 9 rolling obstacle should be the gravestone: ' + r.obstacle);
    if (!(r.swingGate >= 1 && r.bog >= 1 && r.lightsOut === 1 && r.dark === 1 && r.gates >= 2)) fail('layout should hold bogs, swinging gates and the lights-out section: ' + JSON.stringify(r));
    await pg.close();
  }

  { // swinging gates: closed = a wall (a runner stops), it opens by itself, warns >= 0.8 s before it shuts, and never closes on top of someone standing in the gateway
    const pg = await fresh('seed=1&foes=0&intro=0&god=1');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, step = (n) => window.__bot.step(n), out = {};
      const hz = W.hazards.parts.find((p) => p.gates), seg = W.layout.segments.find((s) => s.name === 'swingGate'), q = hz.gates.find((x) => x.seg === seg), dyn = () => W.track.dyn.includes(q.box);
      P.teleport(q.s - 6); step(10); q.state = 'closed'; q.t = 0; q.closed = 99; if (!dyn()) W.track.dyn.push(q.box); q.on = true;
      K.add('KeyW'); step(90); out.blockedS = B.s; out.wallS = q.box.s0; K.clear();
      // the cycle, watched from a distance: closed -> opening -> open -> warn -> closing -> closed
      P.teleport(q.s - 30); step(5); q.closed = 1.4; q.state = 'closed'; q.t = 0; const seen = [], solid = []; let warnLen = 0, openLen = 0;
      for (let i = 0; i < 60 * 14; i++) { B.s = q.s - 30; B.vs = 0; step(1); if (seen[seen.length - 1] !== q.state) { seen.push(q.state); solid.push(dyn()); } if (q.state === 'warn') warnLen += 1 / 60; if (q.state === 'open') openLen += 1 / 60; }
      out.sequence = seen.join('>'); out.solid = solid.join(); out.warn = warnLen; out.open = openLen;
      // a runner who steps up when it opens gets through
      q.closed = 0.3; q.state = 'closed'; q.t = 0; P.teleport(q.s - 6); K.add('KeyW'); for (let i = 0; i < 60 * 8 && B.s < q.s + 2; i++) { step(1); } K.clear(); out.crossed = B.s > q.s + 1;
      // never trapped: stand in the gateway while it tries to close
      q.closed = 99; P.teleport(q.s, 0); step(5); q.state = 'closing'; q.t = 0; for (let i = 0; i < 60 * 3; i++) { B.s = q.s; B.vs = 0; step(1); } out.waited = { state: q.state, solid: dyn() };
      B.s = q.s + 3; B.vs = 0; step(60); out.closedAfter = { state: q.state, solid: dyn() };
      return out;
    });
    console.log('swing gates: ' + JSON.stringify(r));
    if (!(r.blockedS < r.wallS)) fail('a closed gate should block the runner: ' + JSON.stringify(r));
    if (!(r.crossed && /^closed>opening>open>warn>closing>closed/.test(r.sequence) && /^true,false,false,false,false,true/.test(r.solid))) fail('the gate should cycle closed > opening > open > warn > closing > closed, solid only when closed: ' + JSON.stringify(r));
    if (!(r.warn >= 0.85 && r.open >= 1.8)) fail('the gate should stay open >= 1.8 s and warn >= 0.85 s before it shuts: ' + JSON.stringify({ warn: r.warn, open: r.open }));
    if (!(r.waited.state === 'closing' && !r.waited.solid)) fail('the gate must not close on someone standing in it: ' + JSON.stringify(r.waited));
    if (!(r.closedAfter.state === 'closed' && r.closedAfter.solid)) fail('the gate should shut once the gateway is clear: ' + JSON.stringify(r.closedAfter));
    await pg.close();
  }

  { // lights out: fog and sky close in inside the section, the spray opens them, everything returns outside
    const pg = await fresh('seed=1&foes=0&intro=0&god=1');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, step = (n) => window.__bot.step(n), out = {};
      const dk = W.hazards.parts.find((p) => p.segs), seg = W.layout.segments.find((s) => s.name === 'lightsOut'), fog = W.scene.fog, lamp = [...W.scene.children].find((o) => o.isPointLight), far0 = fog.far;
      const lit = W.scene.children.filter((o) => o.isHemisphereLight)[0], i0 = lit.intensity;
      P.teleport(seg.s0 - 20); step(30); out.before = { far: fog.far, d: dk.d, hemi: lit.intensity };
      P.teleport(seg.s0 + 30); step(40); out.dark = { far: fog.far, near: fog.near, d: dk.d, hemi: lit.intensity, lamp: lamp.intensity };
      K.add('KeyJ'); P.shooting = true; for (let i = 0; i < 30; i++) { P.shooting = true; step(1); } out.spray = { far: fog.far, d: dk.d, lamp: lamp.intensity }; K.clear(); P.shooting = false;
      step(120); out.after = { far: fog.far, lamp: lamp.intensity };
      P.teleport(seg.s1 + 14); step(60); out.outside = { far: fog.far, d: dk.d, hemi: lit.intensity };
      out.far0 = far0; out.i0 = i0; return out;
    });
    console.log('lights out: ' + JSON.stringify(r));
    if (!(Math.abs(r.before.far - r.far0) < 1 && r.before.d < 0.01)) fail('before the section the fog should be normal: ' + JSON.stringify(r.before));
    if (!(r.dark.d > 0.95 && r.dark.far < 14 && r.dark.hemi < r.i0 * 0.3)) fail('inside the section the fog and the light should close in: ' + JSON.stringify(r.dark));
    if (!(r.spray.far > 22 && r.spray.lamp > 10)) fail('the spray should open the fog and light the way: ' + JSON.stringify(r.spray));
    if (!(r.after.far < 14 && r.after.lamp < 1)) fail('the light should fade when the trigger is released: ' + JSON.stringify(r.after));
    if (!(Math.abs(r.outside.far - r.far0) < 1 && Math.abs(r.outside.hemi - r.i0) < 0.05)) fail('after the section everything should return: ' + JSON.stringify(r.outside));
    await pg.close();
  }

  { // HOLLOW GHOST: a lane + a swelling flame >= 0.5 s before each wisp (three in phase two); phasing makes him invulnerable and harmless; every spectral burst is marked >= 1.1 s; a marker shows where he re-forms
    const pg = await fresh('seed=1&boss=1&intro=0');
    const r = await pg.evaluate(() => {
      const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, A = W.arena, step = (n) => window.__bot.step(n), out = {};
      K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2500) step(1); K.clear();
      const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss; out.first = { state: boss.state, vuln: !e.invulnerable };
      const clear = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); fx.clear(); for (const s of W.projectiles.enemy) s.on = false; };
      const reset = (phase, state) => { clear(); boss.phase = phase; boss.state = state; boss.st = 0; boss.charging = 0; boss.wispT = 99; e.hp = e.maxHp; e.invulnerable = state === 'phase'; boss.passive = state === 'phase'; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 7, 0); B.vs = 0; step(4); e.s = A.center.s + 2; e.x = 0; };
      const wisps = (phase) => { reset(phase, 'haunt'); boss.st = 0; boss.wispT = 0; let lane = -1, shot = -1, t = 0, fired = 0, g2 = 0; const off = g.events.on('wispShot', () => { if (shot < 0) { shot = t; fired = W.projectiles.enemy.filter((s) => s.on && s.homing).length; } });
        while (g2++ < 400 && shot < 0) { step(1); t++; B.s = A.center.s - 7; B.x = 0; B.vs = 0; if (lane < 0 && fx.lanes.some((q) => q.on)) lane = t; } off(); return { lead: lane > 0 && shot > 0 ? (shot - lane) / 60 : -1, fired }; };
      out.w1 = wisps(1); out.w2 = wisps(2);
      // fade -> phase: a marker for the re-forming spot, invulnerable + harmless, bursts marked >= 1.1 s, bursts count
      const phaseRun = (phase) => { reset(phase, 'haunt'); boss.st = 99; boss.charging = 0; let g2 = 0, markers = 0, first = null, calls = 0, ring = 0; const off = g.events.on('spiritCall', () => calls++);
        const sawInv = { inv: false, passive: false, vis: 1 }; step(1);
        while (g2++ < 900 && boss.state !== 'haunt') { step(1); B.s = A.center.s - 8; B.x = 0; B.vs = 0; markers = Math.max(markers, fx.markers.filter((m) => m.on).length); if (boss.state === 'phase') { sawInv.inv = e.invulnerable; sawInv.passive = boss.passive; sawInv.vis = Math.min(sawInv.vis, boss.vis); } const k = fx.strikes.find((q) => q.on); if (k && !first) first = { dur: k.dur }; if (fx.waves.some((w) => w.on && !w.harmless)) ring++; }
        off(); return { markers, burst: first, calls, ...sawInv, ring, ended: boss.state }; };
      out.p1 = phaseRun(1); out.p2 = phaseRun(2);
      // while phased a bullet does nothing; solid it does
      reset(1, 'phase'); const hp0 = e.hp; for (let i = 0; i < 10; i++) { W.projectiles.fire('normal', e.s - 2.5, e.x, e.y + 1.5, 20, 0, 0); step(2); } step(15); out.phased = { lost: hp0 - e.hp };
      reset(1, 'haunt'); boss.st = 0; const hp1 = e.hp; for (let i = 0; i < 10; i++) { W.projectiles.fire('normal', e.s - 2.5, e.x, e.y + 1.5, 20, 0, 0); step(2); } step(15); out.solid = { lost: hp1 - e.hp };
      return out;
    });
    console.log('HOLLOW GHOST: ' + JSON.stringify(r));
    if (!r.reached) fail('boss never appeared');
    if (!r.first.vuln) fail('he should be hittable after the roar: ' + JSON.stringify(r.first));
    if (!(r.w1.lead >= 0.5 && r.w1.fired === 1)) fail('a wisp should be announced (lane + flame) >= 0.5 s before it leaves: ' + JSON.stringify(r.w1));
    if (!(r.w2.fired === 3 && r.w2.lead >= 0.5)) fail('phase two should loose three wisps: ' + JSON.stringify(r.w2));
    if (!(r.p1.markers >= 1 && r.p1.inv && r.p1.passive && r.p1.vis < 0.5 && r.p1.burst && r.p1.burst.dur >= 1.1 && r.p1.calls === 3 && r.p1.ended === 'haunt')) fail('phase one: marked re-forming spot, invulnerable + harmless + translucent, 3 marked bursts: ' + JSON.stringify(r.p1));
    if (!(r.p2.calls === 5 && r.p2.ring >= 1)) fail('phase two should call five bursts and a wail ring when he re-forms: ' + JSON.stringify(r.p2));
    if (!(r.phased.lost === 0 && r.solid.lost >= 5)) fail('invulnerable while phased, hittable while solid: ' + JSON.stringify({ phased: r.phased, solid: r.solid }));
    await pg.close();
  }
}
