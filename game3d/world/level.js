import * as THREE from 'three';
import { getStage } from '../data/stages.js';
import { generateStage, stageSeed } from './generator.js';
import { createTrack } from './track.js';
import { createTrackBuilder } from './trackBuilder.js';
import { createPlayer } from '../actors/player.js';
import { createCameraRig } from '../render/camera.js';
import { run } from '../core/state.js';
import { events } from '../core/events.js';

// Wires a generated stage into a playable scene: track, builder window, player, camera, chase hazard.
export function createLevel(quality, { stage = 1, seed = null, debug = false, hud = null } = {}) {
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

  const builder = createTrackBuilder(track, scene, { palette: stageData.palette, showSlots: !/slots=0/.test(location.search), shadows: !!quality.tier.shadowMap });
  const player = createPlayer(track, { startS: layout.startS });
  const rig = createCameraRig(track);
  scene.add(player.mesh);

  // Chase hazard: a big dust ball that rolls up behind the player inside a `chase` segment.
  const hazard = { active: false, s: 0, seg: null, hits: 0 };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 }));
  ball.visible = false; scene.add(ball);
  const startHazard = (seg) => { hazard.active = true; hazard.seg = seg; hazard.s = player.body.s - seg.chase.lag; };
  events.on('respawn', () => { if (hazard.active) hazard.s = player.body.s - hazard.seg.chase.lag; rig.reset(player.body); });

  const level = {
    scene, camera: rig.camera, rig, track, layout, player, builder, stageData, seed: usedSeed, hazard,
    finished: false, time: 0,
    update(dt, input) {
      level.time += dt;
      player.update(dt, input, rig.weights);
      const b = player.body, seg = player.seg;
      // chase hazard
      if (seg.chase && !hazard.active && b.s >= seg.s0) startHazard(seg);
      if (hazard.active) {
        if (!seg.chase || seg !== hazard.seg) { hazard.active = false; ball.visible = false; }
        else {
          hazard.s += seg.chase.speed * dt;
          if (hazard.s + 2.4 > b.s - b.hs) { player.hurt(15); hazard.s = b.s - seg.chase.lag; rig.addTrauma(0.5); hazard.hits++; }
        }
      }
      if (player.reachedGate && !level.finished) { level.finished = true; level.gateTime = level.time; }
      rig.update(dt, player);
      builder.update(b.s);
      if (hud) hud.update(level);
    },
    render(alpha) {
      player.render(alpha); rig.render(alpha);
      if (hazard.active) {
        track.toWorld(hazard.s, 0, 2.6, ball.position); ball.visible = true; ball.rotation.x -= 0.1; ball.rotation.z = 0.3;
      }
      const pp = player.mesh.position; sun.target.position.copy(pp); sun.position.set(pp.x + 12, pp.y + 20, pp.z + 8);
      sun.target.updateMatrixWorld();
    },
    // Debug / ?boss=1: put the player this far before the gate.
    jumpToGate(before = 12) { player.teleport(track.gateS - before); rig.reset(player.body); },
  };
  rig.reset(player.body);
  builder.update(player.body.s);
  return level;
}
