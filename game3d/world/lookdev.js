import * as THREE from 'three';
import { stage01 as stage } from '../themes/stage01.js';
import { buildStage01, groundHeight, TRACK_LEN } from '../themes/stage01Props.js';
import { createSky } from '../render/sky.js';
import { createParticles } from '../render/particles.js';
import { setStageLook, setCleanWave } from '../render/materials.js';
import { createPlayerModel } from '../actors/playerModel.js';

// Look-dev world for the art kit: stage 1 first-pass dressing, the animated hero on a simple
// kinematic controller (run / jump / slide / spray) and a behind-the-player camera. This is a
// stand-in for the real track + player controller, which plug into the same render kit.
const GRAV = -32, RUN = 9, JUMP_V = Math.sqrt(2 * 32 * 2.6);

export function createLookdev(quality, gfx, input, params) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 500);
  const sky = createSky(stage.sky); scene.add(sky.mesh);
  scene.fog = new THREE.Fog(stage.fog.color, stage.fog.near, stage.fog.far);
  setStageLook(stage.look); gfx.post.setStage(stage.grade);

  const L = stage.light;
  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
  const sun = new THREE.DirectionalLight(L.sun, L.sunIntensity);
  if (quality.tier.shadowMap) {
    sun.castShadow = true; sun.shadow.mapSize.set(quality.tier.shadowMap, quality.tier.shadowMap);
    const c = sun.shadow.camera; c.left = c.bottom = -16; c.right = c.top = 16; c.near = 1; c.far = 70;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3.5;
  }
  scene.add(sun, sun.target);

  const dressing = buildStage01(stage.colors, quality); scene.add(dressing.group);
  const particles = createParticles(); scene.add(particles.mesh);
  const hero = createPlayerModel(); scene.add(hero.group);
  if (params.get('horse') === '1') hero.setVehicle(true);

  // blob shadow for tiers without a shadow map (mobile)
  const blobCv = document.createElement('canvas'); blobCv.width = blobCv.height = 64;
  { const g = blobCv.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(30,10,40,.55)'); r.addColorStop(1, 'rgba(30,10,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCv), transparent: true, depthWrite: false, fog: false }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; blob.visible = !quality.tier.shadowMap; scene.add(blob);

  const P = { s: 0, x: 0, y: 0, vy: 0, grounded: true, slideT: 0, sliding: false, speed: 0, prevS: 0, prevX: 0, prevY: 0, spray: false, sprayT: 0, hold: 0 };
  const autorun = params.get('autorun') !== '0';
  const cam = { x: 0, prevX: 0, fov: 58, trauma: 0 };
  const t = { time: 0 };
  const v3 = new THREE.Vector3();
  const pz = () => -P.s;

  hero.anim.onFootstep = () => { if (P.speed > 4) particles.emit('dust', P.x, P.y + 0.05, pz() + 0.3, { count: 0.45, scale: 0.7 }); };
  hero.anim.onLand = (imp) => { particles.emit('dust', P.x, P.y + 0.05, pz(), { count: 1.4, scale: 0.8 + Math.min(1, imp / 14) }); particles.emit('sparkle', P.x, P.y + 0.1, pz(), { count: 0.5, scale: 0.8 }); };
  const jump = () => { P.vy = JUMP_V; P.grounded = false; hero.anim.jump(); particles.emit('dust', P.x, P.y + 0.05, pz(), { count: 1, scale: 0.8 }); };

  const api = {
    inspect: null, force: null, jump,
    scene, camera, hero, particles, player: P, sky, dressing, sun,
    // test / screenshot hook: place the hero at track distance s (and optionally force a pose)
    teleport(s, x = 0) { P.s = P.prevS = s; P.x = P.prevX = x; P.y = P.prevY = Math.max(0, groundHeight(x, -s)); cam.x = cam.prevX = x * 0.6; },
    update(dt) {
      t.time += dt; P.prevS = P.s; P.prevX = P.x; P.prevY = P.y;
      const run = autorun ? 1 : input.moveY;
      P.speed = ((run > 0 ? RUN : run < 0 ? -RUN * 0.5 : 0)) * (P.sliding ? 1.15 : 1);
      P.s = Math.max(0, Math.min(TRACK_LEN - 20, P.s + P.speed * dt));
      P.x = Math.max(-3.4, Math.min(3.4, P.x + input.moveX * 5.5 * dt));
      if (input.jumpPressed && P.grounded) jump();
      if (input.slide && P.grounded && !P.sliding && P.slideT <= 0) { P.sliding = true; P.slideT = 0.7; particles.emit('dust', P.x, P.y + 0.05, pz() + 0.4, { count: 1, scale: 1 }); }
      if (P.sliding) { P.slideT -= dt; if (P.slideT <= 0 || !P.grounded) { P.sliding = false; P.slideT = 0.0; } if (P.sliding && Math.random() < 0.5) particles.emit('dust', P.x, P.y + 0.05, pz() + 0.6, { count: 0.25, scale: 0.6 }); }
      // vertical
      const ground = Math.max(0, groundHeight(P.x, pz()) * 0 );
      const pit = dressing && isOverPit(pz()) && Math.abs(P.x) < 5;
      const floor = pit ? -50 : ground;
      P.vy += GRAV * dt; P.y += P.vy * dt;
      if (P.y <= floor + 1e-4 && P.vy <= 0 && !pit) {
        const impact = -P.vy; P.y = floor;
        if (!P.grounded && impact > 3) hero.anim.land(impact);
        P.grounded = true; P.vy = 0;
      } else if (P.y > floor + 0.02) P.grounded = false;
      if (pit && P.y < -3) { P.y = 3; P.vy = 0; P.s -= 6; }
      // spray
      P.spray = input.spray; if (P.spray) {
        P.sprayT -= dt; if (P.sprayT <= 0) {
          P.sprayT = 0.11; hero.anim.shoot(); hero.muzzleWorld(v3);
          particles.emit('bubbles', v3.x, v3.y, v3.z, { count: 0.6, dir: { x: 0, y: 0.08, z: -3.2 }, scale: 1 });
          particles.emit('hitSpark', v3.x, v3.y, v3.z - 0.15, { count: 0.35, dir: { x: 0, y: 0, z: -2 }, scale: 0.5 });
        }
      }
      sun.position.set(P.x + L.sunOffset[0], P.y + L.sunOffset[1], pz() + L.sunOffset[2]); sun.target.position.set(P.x, P.y, pz()); sun.target.updateMatrixWorld();
      cam.prevX = cam.x; cam.x += (P.x * 0.65 - cam.x) * Math.min(1, dt * 4);
      if (Math.random() < dt * stage.ambient.rate) particles.emit('mote', P.x + (Math.random() - 0.5) * 16, 0.5 + Math.random() * 5, pz() - 6 - Math.random() * 18, { count: 1 });
      particles.update(dt, camera);
      hero.anim.update(dt, Object.assign({ speed: P.speed, grounded: P.grounded, vy: P.vy, sliding: P.sliding, shooting: P.spray, moveX: input.moveX, vehicle: hero.vehicle }, api.force));
      setCleanWave(P.s, { lead: 14 });
    },
    render(alpha) {
      const s = P.prevS + (P.s - P.prevS) * alpha, x = P.prevX + (P.x - P.prevX) * alpha, y = P.prevY + (P.y - P.prevY) * alpha, z = -s;
      hero.group.position.set(x, y, z);
      blob.position.set(x, 0.03, z); blob.scale.setScalar(1 - Math.min(0.5, y * 0.15)); blob.material.opacity = 1 - Math.min(0.6, y * 0.2);
      const cx = cam.prevX + (cam.x - cam.prevX) * alpha, speedK = Math.min(1, Math.abs(P.speed) / 10);
      camera.fov = 54 + speedK * 3;
      if (api.inspect) { const a = api.inspect; camera.position.set(x + Math.sin(a.yaw) * a.dist, y + a.h, z + Math.cos(a.yaw) * a.dist); camera.lookAt(x, y + a.look, z); }
      else { camera.position.set(cx, 3.4 + y * 0.45, z + 6.3); camera.lookAt(cx * 0.6 + x * 0.4, 1.35 + y * 0.35, z - 5); }
      camera.aspect = gfx.width / gfx.height; camera.updateProjectionMatrix();
      sky.update(camera, t.time); dressing.update(t.time, camera.position); gfx.post.update(t.time);
    },
    get time() { return t.time; },
  };
  return api;
}
const PITS = [[-58, -69], [-176, -184]];
function isOverPit(z) { for (const p of PITS) if (z < p[0] - 0.8 && z > p[1] + 0.8) return true; return false; }
