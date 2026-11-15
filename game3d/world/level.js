import * as THREE from 'three';
import { getStage } from '../data/stages.js';
import { getTheme } from '../themes/index.js';
import { generateStage, stageSeed } from './generator.js';
import { createTrack } from './track.js';
import { createTrackBuilder } from './trackBuilder.js';
import { createScenery } from './scenery.js';
import { createArena } from './arena.js';
import { createPlayer } from '../actors/player.js';
import { createCameraRig } from '../render/camera.js';
import { createSky } from '../render/sky.js';
import { createParticles } from '../render/particles.js';
import { createToon, setStageLook, grime } from '../render/materials.js';
import { warm as warmShaders } from '../render/warm.js';
import { Builder } from '../actors/modelKit.js';
import { eyes } from '../actors/partKit.js';
import { createRng } from '../core/rng.js';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { BOMB } from '../data/weapons.js';
import { createFx } from '../actors/fx.js';
import { createProjectiles } from '../actors/projectiles.js';
import { createEnemies } from '../actors/enemy.js';
import { createPickups } from '../actors/pickups.js';
import { createObstacles } from '../actors/obstacles.js';
import { createCombat } from '../actors/combat.js';
import { createWeapon } from '../actors/weapon.js';
import { createSpawner } from '../actors/spawner.js';
import { createCasinoDoors } from '../actors/casinoDoor.js';
import { createHazards } from './hazards.js';

// Wires a generated, themed stage into a playable scene: sky + lights + look from the theme, the track builder
// window, scenery chunks, player, camera, the chase hazard, combat actors, checkpoints, and the boss arena.
// `foes: false` (?foes=0) gives the pure platformer. gfx = the renderer wrapper (for the colour grade).
export function createLevel(quality, opts) {          // synchronous build (tests, lookdev, ?stage= dev starts): runs every step at once
  const g = createLevelSteps(quality, { ...opts, warm: false }); let r; while (!(r = g.next()).done);
  return r.value;
}
// The same build as a generator: every `yield` is a point where the game may draw a frame (flow.js spends a few ms per frame on
// it behind the stage-intro card), so a stage never freezes the page while it loads.
export function* createLevelSteps(quality, { stage = 1, seed = null, debug = false, hud = null, foes = true, gfx = null, cards = null, warm = !!gfx } = {}) {
  const stageData = getStage(stage), theme = getTheme(stageData.theme);
  const usedSeed = seed ?? stageSeed(stage, run.stageLoop);
  const layout = generateStage(stageData, usedSeed);
  const track = createTrack(layout); yield;

  // ---- look: sky, fog, lights, colour grade, all from the theme
  const scene = new THREE.Scene();
  const sky = createSky(theme.sky); scene.add(sky.mesh); yield;
  scene.background = new THREE.Color(theme.fog.color);
  scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
  setStageLook(theme.look); gfx?.post.setStage(theme.grade);
  const L = theme.light;
  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
  const sun = new THREE.DirectionalLight(L.sun, L.sunIntensity);
  if (quality.tier.shadowMap) {
    sun.castShadow = true; sun.shadow.mapSize.set(quality.tier.shadowMap, quality.tier.shadowMap);
    const c = sun.shadow.camera; c.left = c.bottom = -22; c.right = c.top = 22; c.near = 1; c.far = 90; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  }
  scene.add(sun, sun.target);
  const particles = createParticles(); scene.add(particles.mesh); yield;

  const pathMat = createToon({ vertexColors: true, rimBoost: theme.groundRim ?? 1 });
  yield;
  const builder = createTrackBuilder(track, scene, { palette: theme.pathPalette || stageData.palette, showSlots: /slots=1/.test(location.search), shadows: !!quality.tier.shadowMap, material: pathMat, style: theme.path, theme, seed: usedSeed });
  const scenery = createScenery(track, theme, { quality, scene, seed: usedSeed });
  yield;
  scenery.ctx.emit = (name, x, y, z, o) => particles.emit(name, x, y, z, o);   // theme dressing (manhole steam) can puff particles
  yield;
  const player = createPlayer(track, { startS: layout.startS }); yield;
  const rig = createCameraRig(track);
  scene.add(player.mesh);
  run.bombs = BOMB.perStage; run.stageStartScore = run.score;

  // blob shadow for tiers without a shadow map (mobile)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, fog: false }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; blob.visible = !quality.tier.shadowMap; scene.add(blob);

  const ctx = { quality, gfx, track, scene, sky, player, rig, hud, cards, stageData, theme, layout, rng: createRng(usedSeed + 7), spawnEnabled: foes, level: null, particles, scenery, shadows: !!quality.tier.shadowMap };
  ctx.fx = createFx(track, scene);
  yield;
  ctx.projectiles = createProjectiles(ctx, scene, track); yield;
  ctx.enemies = createEnemies(ctx, scene, track); yield;
  ctx.pickups = createPickups(ctx, scene, track); yield;
  ctx.obstacles = createObstacles(ctx, scene, track); yield;
  ctx.combat = createCombat(ctx);
  ctx.weapon = createWeapon(ctx);
  ctx.spawner = createSpawner(ctx); ctx.spawner.enabled = foes;
  yield; for (const t of [...stageData.roster.flat(), 'dirt']) { ctx.enemies.models.ensure(t); yield; }   // one enemy model per step
  ctx.doors = createCasinoDoors(ctx, scene, track);
  ctx.hazards = createHazards(ctx, scene, track); yield;   // vines / conveyors / pistons / traffic (stages 2-4)
  const arena = createArena(ctx); yield;

  // ---- the chase hazard: a giant angry dust ball that rolls up behind the player inside a `chase` segment
  const hazard = { active: false, s: 0, seg: null, hits: 0 }, ball = theme.chase?.() ?? createDustBall();   // the chaser: stage 1's dust ball, or the theme's own (stage 6: a lava wave)
  scene.add(ball.group);
  const startHazard = (seg) => { hazard.active = true; hazard.seg = seg; hazard.s = player.body.s - seg.chase.lag; cards?.shout(stageData.setPiece.warning, '#ff9a52', 2000); events.emit('chaseStart', seg); if (theme.chase) events.emit('lavaWave'); };
  const offs = [];
  offs.push(events.on('respawn', () => { if (hazard.active) hazard.s = player.body.s - hazard.seg.chase.lag; rig.reset(player.body); }));
  offs.push(events.on('checkpoint', (i) => {
    const cp = track.checkpoints[i]; scenery.passed.add(cp.s); for (const [seg, d] of scenery.dressed) if (seg.checkpoint === cp.s) d.activate?.();
    const p = player.mesh.position; particles.emit('sparkle', p.x, p.y + 1.6, p.z, { count: 3, scale: 1.2 }); particles.emit('confetti', p.x, p.y + 1.5, p.z, { count: 0.6 });
    hud?.toast('CHECKPOINT  ·  ' + (stageData.checkpoints?.[i] || i + 1), 0x6dffb0);
  }));
  player.model.anim.onFootstep = () => { if (Math.abs(player.body.vs) > 4) { events.emit('footstep'); const p = player.mesh.position; particles.emit('dust', p.x, p.y + 0.05, p.z, { count: 0.45, scale: player.inSand ? 1.1 : 0.7 }); } };
  player.model.anim.onLand = (imp) => { const p = player.mesh.position; const k = Math.min(1, imp / 14); particles.emit('dust', p.x, p.y + 0.05, p.z, { count: 1 + 2.2 * k, scale: 0.8 + k }); };   // a harder landing kicks up a bigger puff
  offs.push(events.on('bossIntro', (o) => cards?.showBoss(o.name, o.line)), events.on('bossRage', () => cards?.shout('IT\'S FURIOUS!', '#ff7a3a', 1400)));
  offs.push(events.on('slide', () => { const p = player.mesh.position; particles.emit('dust', p.x, p.y + 0.05, p.z, { count: 1, scale: 1 }); }));

  const v3 = new THREE.Vector3(), fr = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };
  const level = {
    scene, camera: rig.camera, rig, track, layout, player, builder, scenery, arena, particles, sky, stageData, theme, seed: usedSeed, hazard,
    hazards: ctx.hazards, fx: ctx.fx, projectiles: ctx.projectiles, enemies: ctx.enemies, pickups: ctx.pickups, obstacles: ctx.obstacles,
    combat: ctx.combat, weapon: ctx.weapon, spawner: ctx.spawner, doors: ctx.doors,
    finished: false, time: 0, runTime: 0, coinsAtStart: run.coins,
    update(dt, input) {
      level.time += dt;
      if (player.dead) { ctx.fx.update(dt); hud?.tick(dt); if (hud) hud.update(level, dt); return; } // frozen until GAMEOVER retry
      level.runTime += dt;
      player.shooting = input.spray && !ctx.weapon.overheated;
      player.update(dt, input, rig.weights);
      const b = player.body, seg = player.seg;
      ctx.weapon.update(dt, input);
      ctx.hazards.update(dt, input);
      if (!level.announced && seg.name === stageData.setPiece?.template && !seg.chase) { level.announced = true; cards?.shout(stageData.setPiece.warning, stageData.setPiece.color || '#7dff9a', 2200); events.emit('setPieceStart', stageData.setPiece.id); }
      ctx.spawner.update(dt); ctx.enemies.update(dt); ctx.projectiles.update(dt); ctx.combat.step(dt);
      ctx.pickups.update(dt); ctx.obstacles.update(dt); ctx.fx.update(dt);
      arena.update(dt); ctx.doors.update(dt);
      if (arena.state !== 'sealed') for (const e of ctx.enemies.list) if (!e.ctrl) arena.confine(e, 0.8);   // minions stay in the disc
      // chase hazard
      if (seg.chase && !hazard.active && b.s >= seg.s0) startHazard(seg);
      if (hazard.active) {
        if (!seg.chase || seg !== hazard.seg) { hazard.active = false; ball.group.visible = false; }
        else {
          hazard.s += seg.chase.speed * dt;
          if (hazard.s + 2.4 > b.s - b.hs) { ctx.combat.damagePlayer(seg.chase.damage ?? 15); hazard.s = b.s - seg.chase.lag; rig.addTrauma(0.5); hazard.hits++; }
        }
      }
      if (player.reachedGate && !level.finished) { level.finished = true; level.gateTime = level.time; }
      rig.update(dt, player);
      builder.update(b.s, level.time); scenery.update(b.s, level.time, rig.camera.position, dt);
      if (Math.random() < dt * theme.ambient.rate * quality.tier.density) { const p = player.mesh.position; particles.emit(theme.ambient.preset, p.x + (Math.random() - 0.5) * 16, p.y + 0.5 + Math.random() * 5, p.z + (Math.random() - 0.5) * 16, { count: 1 }); }
      particles.update(dt, rig.camera);
      level.wave();
      if (hud) { hud.tick(dt); hud.update(level, dt); }
    },
    // The clean wave (PLAN 4): colour floods back around the player; the arena stays grimy until the boss falls.
    wave() {
      const s = Math.min(player.progress, layout.gateS - 26), f = track.frameAt(s, fr);
      grime.origin.value.copy(f.p); grime.dir.value.copy(f.t); grime.front.value = 22; grime.band.value = 16;
      grime.amount.value = grime.baseAmount * (1 - arena.wash);
    },
    render(alpha) {
      player.render(alpha); ctx.weapon.render(); rig.render(alpha);
      ctx.enemies.render(alpha); ctx.projectiles.render(); ctx.pickups.render(); ctx.obstacles.render(alpha); ctx.fx.render();
      arena.render(level.time); ctx.doors.render(level.time); ctx.hazards.render(alpha, level.time); hud?.render();
      if (hazard.active) ball.place(track, hazard.s, level.time, particles);
      const pp = player.mesh.position; sun.target.position.copy(pp); sun.position.set(pp.x + L.sunOffset[0], pp.y + L.sunOffset[1], pp.z + L.sunOffset[2]);
      sun.target.updateMatrixWorld();
      if (!quality.tier.shadowMap) { const gy = track.heightUnder(player.body.s, player.body.x); blob.visible = gy !== -Infinity; if (blob.visible) { track.toWorld(player.body.s, player.body.x, gy + 0.03, blob.position); blob.scale.setScalar(1 - Math.min(0.5, (player.body.y - gy) * 0.15)); } }
      sky.update(rig.camera, level.time); scenery.far?.update(rig.camera.position); gfx?.post.update(level.time);
    },
    // Debug / ?boss=1: put the player this far before the gate.
    jumpToGate(before = 12) { player.teleport(track.gateS - before); rig.reset(player.body); builder.update(player.body.s); scenery.update(player.body.s, level.time, rig.camera.position, 0); },
    clearStats() { return { score: run.score, gained: run.score - run.stageStartScore, coins: run.coins - level.coinsAtStart, kills: ctx.combat.kills, time: level.runTime, hurt: ctx.combat.hurtCount }; },
    // Retry stage after game over: restart this stage with the score it began with (original `stageStartScore`).
    restart() {
      run.score = run.stageStartScore; run.health = 100; run.bombs = BOMB.perStage;
      for (const a of [ctx.enemies, ctx.projectiles, ctx.pickups, ctx.obstacles, ctx.fx]) a.clear();
      ctx.weapon.reset(); ctx.combat.reset(); ctx.spawner.reset(); ctx.hazards.reset(); level.announced = false; hazard.active = false; ball.group.visible = false; arena.reset(); ctx.doors.reset();
      level.finished = false; level.gateTime = undefined; level.runTime = 0; level.coinsAtStart = run.coins;
      player.revive({ s: layout.startS, x: 0, y: 0 }); rig.reset(player.body); builder.update(player.body.s); hud?.reset();
      scenery.passed.clear(); for (const d of scenery.dressed.values()) d.reset?.();
    },
    dispose() { offs.forEach((f) => f?.()); ctx.hazards.dispose(); ctx.doors.dispose(); arena.dispose(); scenery.dispose(); builder.dispose(); ctx.enemies.models.dispose(); scene.remove(ball.group); },
    // Debug helpers (?debug=1 keys 1-5, and window.__game.world.debug in tests)
    debug: {
      spawnEnemies: (n = 10) => ctx.spawner.spawnDebug(n),
      shoot: (n = 50) => { // n player projectiles in a fan, straight from the muzzle (stress test)
        const b = player.body; let made = 0;
        for (let i = 0; i < n; i++) { const a = (i / n - 0.5) * 1.2, sp = 14; if (ctx.projectiles.fire(i % 5 === 0 ? 'laser' : 'normal', b.s + 0.7, b.x, b.y + 1.1, Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.3) * 2)) made++; }
        return made;
      },
      allPowerups: () => ctx.weapon.giveAll(),
      killAll: () => { for (const e of [...ctx.enemies.list]) if (!e.ctrl) ctx.combat.killEnemy(e); },
      stress: () => { ctx.spawner.spawnDebug(30); return ctx.projectiles.count(); },
      bossHp: (hp) => { const e = ctx.enemies.list.find((q) => q.ctrl); if (e && hp != null) e.hp = hp; return e ? e.hp : null; },
    },
    debugLine: () => `enemies ${ctx.enemies.count}  shots ${ctx.projectiles.count()}+${ctx.projectiles.countEnemy()}  fx ${ctx.fx.active}\nobst ${ctx.obstacles.list.length}  pickups ${JSON.stringify(ctx.pickups.counts())}  arena ${arena.state}`,
  };
  ctx.level = level;
  if (hud) { hud.attach(level, rig.camera); if (debug) hud.enableDebug(); }
  rig.reset(player.body);
  builder.update(player.body.s, 0); scenery.update(player.body.s, 0, rig.camera.position, 0);   // queues the first 150 m of track and scenery...
  while (builder.pending || scenery.pending) { builder.pump(6); scenery.pump(6); yield; }          // ...and builds it a slice at a time
  // Compile every shader program now (in parallel where the browser allows it) instead of on the first frame, which would freeze for
  // a moment on a phone. The loader (flow.js) draws frames while this waits: `yield 'wait'` tells it to stop spending the frame's budget.
  if (warm && gfx) { let done = false; const fin = () => { done = true; }; warmShaders(gfx.renderer, scene, rig.camera).then(fin, fin); while (!done) yield 'wait'; }
  return level;
}

function blobTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  r.addColorStop(0, 'rgba(30,10,40,.55)'); r.addColorStop(1, 'rgba(30,10,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
}

// The runaway dust ball: a huge lumpy ball of dirt that rolls (the body spins, the face stays) with a snarl and a dust trail.
function createDustBall() {
  const group = new THREE.Group(); group.visible = false; group.matrixAutoUpdate = false;
  const mat = createToon({ vertexColors: true, grime: false, rimStrength: 0.9 });
  const body = new THREE.Mesh(new Builder().sphere(3, 0x7a5a3c, { p: [0, 0, 0], jitter: 0.5, ao: 0.1 })
    .sphere(2.2, 0x9a7650, { p: [-0.5, 0.7, -1.0], ao: 0, jitter: 0.3 }).sphere(0.9, 0x5d4037, { p: [1.8, 1.6, 1.2], jitter: 0.2 }).sphere(0.7, 0x5d4037, { p: [-2.2, -1.2, 1.4], jitter: 0.2 })
    .sphere(0.8, 0x8d6e63, { p: [0.4, 2.4, 1.2], jitter: 0.2 }).sphere(0.6, 0x4a2e24, { p: [-1.6, 2.1, -1.4], jitter: 0.2 }).build(), mat);
  body.castShadow = true; group.add(body);
  const face = new THREE.Group(); face.rotation.y = Math.PI; group.add(face);   // looks forward (+s)
  const fb = new Builder(); eyes(fb, { y: 0.5, z: 2.7, gap: 0.95, r: 0.62, pr: 0.5, brow: 0.45, look: 0.3 }); fb.box(2.0, 0.28, 0.3, 0x2a160f, { p: [0, -0.9, 3.0], radius: 0.1, ao: 0 });
  for (let i = 0; i < 5; i++) fb.cone(0.16, 0.5, 0xe8dcc8, { p: [-0.8 + i * 0.4, -0.65, 3.05], r: [Math.PI, 0, 0], seg: 4, ao: 0 });
  face.add(new THREE.Mesh(fb.build(), mat));
  const _p = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4(), f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };
  return {
    group,
    place(track, s, t, particles) {
      const hop = Math.abs(Math.sin(t * 5)) * 0.35; track.frameAt(s, f);
      _p.copy(f.p).addScaledVector(f.u, 3 + hop); _z.copy(f.t).negate(); _m.makeBasis(f.r, f.u, _z).setPosition(_p);
      group.matrix.copy(_m); group.matrixWorldNeedsUpdate = true; group.visible = true; body.rotation.x = -t * 2.6;
      if (Math.random() < 0.7) particles.emit('dust', _p.x + (Math.random() - 0.5) * 4, _p.y - 2.6, _p.z + (Math.random() - 0.5) * 4, { count: 0.8, scale: 2 });
    },
  };
}
