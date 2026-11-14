import * as THREE from 'three';
import { getStage } from '../data/stages.js';
import { generateStage, stageSeed } from './generator.js';
import { createTrack } from './track.js';
import { createTrackBuilder } from './trackBuilder.js';
import { createPlayer } from '../actors/player.js';
import { createCameraRig } from '../render/camera.js';
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

// Wires a generated stage into a playable scene: track, builder window, player, camera, chase hazard, and the
// combat actors (enemies, projectiles, pickups, obstacles). `foes: false` (?foes=0) gives the pure platformer.
export function createLevel(quality, { stage = 1, seed = null, debug = false, hud = null, foes = true } = {}) {
  const stageData = getStage(stage);
  const usedSeed = seed ?? stageSeed(stage, run.stageLoop);
  const layout = generateStage(stageData, usedSeed);
  const track = createTrack(layout);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec8e8);
  scene.fog = new THREE.Fog(0x9ec8e8, 40, 140);
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7a5a3a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1d0, 2.6);
  if (quality.tier.shadowMap) {
    sun.castShadow = true; sun.shadow.mapSize.set(quality.tier.shadowMap, quality.tier.shadowMap);
    const c = sun.shadow.camera; c.left = c.bottom = -25; c.right = c.top = 25; c.near = 1; c.far = 80; sun.shadow.bias = -0.0005;
  }
  scene.add(sun, sun.target);

  const builder = createTrackBuilder(track, scene, { palette: stageData.palette, showSlots: /slots=1/.test(location.search), shadows: !!quality.tier.shadowMap });
  const player = createPlayer(track, { startS: layout.startS });
  const rig = createCameraRig(track);
  scene.add(player.mesh);
  run.bombs = BOMB.perStage; run.stageStartScore = run.score;

  const ctx = { track, scene, player, rig, hud, stageData, layout, rng: createRng(usedSeed + 7), spawnEnabled: foes, level: null };
  ctx.fx = createFx(track, scene);
  ctx.projectiles = createProjectiles(ctx, scene, track);
  ctx.enemies = createEnemies(ctx, scene, track);
  ctx.pickups = createPickups(ctx, scene, track);
  ctx.obstacles = createObstacles(ctx, scene, track);
  ctx.combat = createCombat(ctx);
  ctx.weapon = createWeapon(ctx);
  ctx.spawner = createSpawner(ctx); ctx.spawner.enabled = foes;

  // Chase hazard: a big dust ball that rolls up behind the player inside a `chase` segment.
  const hazard = { active: false, s: 0, seg: null, hits: 0 };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 }));
  ball.visible = false; scene.add(ball);
  const startHazard = (seg) => { hazard.active = true; hazard.seg = seg; hazard.s = player.body.s - seg.chase.lag; };
  events.on('respawn', () => { if (hazard.active) hazard.s = player.body.s - hazard.seg.chase.lag; rig.reset(player.body); });

  const level = {
    scene, camera: rig.camera, rig, track, layout, player, builder, stageData, seed: usedSeed, hazard,
    fx: ctx.fx, projectiles: ctx.projectiles, enemies: ctx.enemies, pickups: ctx.pickups, obstacles: ctx.obstacles,
    combat: ctx.combat, weapon: ctx.weapon, spawner: ctx.spawner,
    finished: false, time: 0,
    update(dt, input) {
      level.time += dt;
      if (player.dead) { ctx.fx.update(dt); hud?.tick(dt); if (hud) hud.update(level, dt); return; } // frozen until GAMEOVER retry
      player.update(dt, input, rig.weights);
      const b = player.body, seg = player.seg;
      ctx.weapon.update(dt, input);
      ctx.spawner.update(dt); ctx.enemies.update(dt); ctx.projectiles.update(dt); ctx.combat.step(dt);
      ctx.pickups.update(dt); ctx.obstacles.update(dt); ctx.fx.update(dt);
      // chase hazard
      if (seg.chase && !hazard.active && b.s >= seg.s0) startHazard(seg);
      if (hazard.active) {
        if (!seg.chase || seg !== hazard.seg) { hazard.active = false; ball.visible = false; }
        else {
          hazard.s += seg.chase.speed * dt;
          if (hazard.s + 2.4 > b.s - b.hs) { ctx.combat.damagePlayer(15); hazard.s = b.s - seg.chase.lag; rig.addTrauma(0.5); hazard.hits++; }
        }
      }
      if (player.reachedGate && !level.finished) { level.finished = true; level.gateTime = level.time; }
      rig.update(dt, player);
      builder.update(b.s);
      if (hud) { hud.tick(dt); hud.update(level, dt); }
    },
    render(alpha) {
      player.render(alpha); ctx.weapon.render(); rig.render(alpha);
      ctx.enemies.render(alpha); ctx.projectiles.render(); ctx.pickups.render(); ctx.obstacles.render(alpha); ctx.fx.render();
      hud?.render();
      if (hazard.active) {
        track.toWorld(hazard.s, 0, 2.6, ball.position); ball.visible = true; ball.rotation.x -= 0.1; ball.rotation.z = 0.3;
      }
      const pp = player.mesh.position; sun.target.position.copy(pp); sun.position.set(pp.x + 12, pp.y + 20, pp.z + 8);
      sun.target.updateMatrixWorld();
    },
    // Debug / ?boss=1: put the player this far before the gate.
    jumpToGate(before = 12) { player.teleport(track.gateS - before); rig.reset(player.body); },
    // Retry stage after game over: restart this stage with the score it began with (original `stageStartScore`).
    restart() {
      run.score = run.stageStartScore; run.health = 100; run.bombs = BOMB.perStage;
      for (const a of [ctx.enemies, ctx.projectiles, ctx.pickups, ctx.obstacles, ctx.fx]) a.clear();
      ctx.weapon.reset(); ctx.combat.reset(); ctx.spawner.reset(); hazard.active = false; ball.visible = false;
      level.finished = false; level.gateTime = undefined;
      player.revive({ s: layout.startS, x: 0, y: 0 }); rig.reset(player.body); builder.update(player.body.s); hud?.reset();
    },
    // Debug helpers (?debug=1 keys 1-5, and window.__game.world.debug in tests)
    debug: {
      spawnEnemies: (n = 10) => ctx.spawner.spawnDebug(n),
      shoot: (n = 50) => { // n player projectiles in a fan, straight from the muzzle (stress test)
        const b = player.body; let made = 0;
        for (let i = 0; i < n; i++) { const a = (i / n - 0.5) * 1.2, sp = 14; if (ctx.projectiles.fire(i % 5 === 0 ? 'laser' : 'normal', b.s + 0.7, b.x, b.y + 1.1, Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.3) * 2)) made++; }
        return made;
      },
      allPowerups: () => ctx.weapon.giveAll(),
      killAll: () => { for (const e of [...ctx.enemies.list]) ctx.combat.killEnemy(e); },
      stress: () => { ctx.spawner.spawnDebug(30); return ctx.projectiles.count(); },
    },
    debugLine: () => `enemies ${ctx.enemies.count}  shots ${ctx.projectiles.count()}+${ctx.projectiles.countEnemy()}  fx ${ctx.fx.active}\nobst ${ctx.obstacles.list.length}  pickups ${JSON.stringify(ctx.pickups.counts())}`,
  };
  ctx.level = level;
  if (hud) { hud.attach(level, rig.camera); if (debug) hud.enableDebug(); }
  rig.reset(player.body);
  builder.update(player.body.s);
  return level;
}
