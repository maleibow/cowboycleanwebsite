import * as THREE from 'three';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';

// Shared boss tools (every boss uses these, PLAN section 6): floor markers that telegraph an attack, expanding
// shockwave rings, a blob shadow, and tiny state-machine helpers. All pooled, no per-frame allocation.
const _m = new THREE.Matrix4();
const ringMat = (hot, cool) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { uHot: { value: new THREE.Color(hot) }, uCool: { value: new THREE.Color(cool) }, uA: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 uHot, uCool; uniform float uA; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.4) * uA; gl_FragColor = vec4(mix(uHot, uCool, vUv.y) * 1.6, a); }',
});

export function createBossFx(scene, track, ctx = null) {
  const group = new THREE.Group(); group.name = 'bossFx'; scene.add(group);
  const discGeo = new THREE.CircleGeometry(1, 40), ringGeo = new THREE.RingGeometry(0.82, 1, 48), wallGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, 0.5, 0);
  const basic = (c, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, fog: false });
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.order = 'XYZ'; m.visible = false; m.frustumCulled = false; group.add(m); return m; };

  // ---- floor markers: a filled disc that pulses + an outline that closes in as the attack gets closer
  const markers = Array.from({ length: 12 }, () => ({ on: false, disc: mk(discGeo, basic(0xff3b30, 0.28)), edge: mk(ringGeo, basic(0xffe45a, 0.95)), s: 0, x: 0, y: 0, r: 1, t: 0, dur: 1 }));
  // ---- shockwaves: a glowing wall (alpha fades upward) + a bright ring on the floor, growing at `speed`
  const waves = Array.from({ length: 4 }, () => ({ on: false, wall: mk(wallGeo, ringMat(0xfff2a0, 0xff5a1a)), base: mk(ringGeo, basic(0xffd23a, 0.95)), s: 0, x: 0, y: 0, r: 0, speed: 8, thick: 1.2, height: 1, damage: 20, delay: 0, hit: false, harmless: false, maxR: 20 }));
  // ---- strikes: an object falls from the sky onto a marked circle; whoever stands in the circle when it lands is hit.
  // The marker is on the floor for the whole fall (`delay` seconds), so every strike is telegraphed. Used for acid rain, falling bombs...
  const dropGeo = new THREE.OctahedronGeometry(0.5, 1).scale(1, 1.7, 1), dropMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const strikes = Array.from({ length: 10 }, () => ({ on: false, mesh: mk(dropGeo, dropMat.clone()), s: 0, x: 0, r: 1, t: 0, dur: 1, hi: 16, damage: 20, color: 0x9bff3a, size: 0.6, mk: null }));
  // ---- blob shadow under a flying boss
  const shadow = mk(discGeo, basic(0x000000, 0.4));

  const put = (mesh, s, x, y, sx, sy, sz) => { placeMatrix(track, s, x, y, 0, sx, sy, sz, _m); mesh.matrixAutoUpdate = false; mesh.matrix.copy(_m); mesh.visible = true; };
  const flat = (mesh, s, x, y, r) => { placeMatrix(track, s, x, y + 0.04, 0, r, r, r, _m); mesh.matrixAutoUpdate = false; mesh.matrix.copy(_m).multiply(_rot); mesh.visible = true; };
  const _rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

  const api = {
    markers, waves, group, strikes,
    marker(s, x, y, r, dur) { const k = markers.find((q) => !q.on); if (!k) return null; Object.assign(k, { on: true, s, x, y, r, t: dur, dur }); return k; },
    shock(s, x, y, o = {}) { const k = waves.find((q) => !q.on); if (!k) return null; Object.assign(k, { on: true, s, x, y, r: 0.5, speed: 8, thick: 1.2, height: 1, damage: 20, delay: 0, hit: false, harmless: false, maxR: 24 }, o); if (!k.harmless && !k.delay) events.emit('shockwave'); return k; },
    // r = radius of the circle; delay = seconds until impact; o = { damage, color, size, height, splash(s, x) }
    strike(s, x, r, delay, o = {}) {
      const k = strikes.find((q) => !q.on); if (!k) return null;
      Object.assign(k, { on: true, s, x, r, t: delay, dur: delay, hi: o.height ?? 16, damage: o.damage ?? 20, color: o.color ?? 0x9bff3a, size: o.size ?? 0.6, splash: o.splash || null, delayLeft: o.after || 0 });
      k.mk = api.marker(s, x, 0, r, delay + k.delayLeft); k.mesh.material.color.setHex(k.color); return k;
    },
    shadow(s, x, y, r, a) { if (r <= 0) { shadow.visible = false; return; } flat(shadow, s, x, y, r); shadow.material.opacity = a; },
    update(dt, player, combat) {
      for (const k of strikes) {
        if (!k.on) continue;
        if (k.delayLeft > 0) { k.delayLeft -= dt; continue; }
        k.t -= dt; if (k.t > 0) continue;
        k.on = false; const b = player.body;                                                  // impact
        if (ctx) { ctx.fx.burst(k.s, k.x, 0.2, k.color, 14, 6, 0.18); ctx.fx.burst(k.s, k.x, 0.3, 0xffffff, 4, 3, 0.1, true); ctx.combat.shake(0.22); }
        events.emit('strikeLand', k.splash);
        if (Math.hypot(b.s - k.s, b.x - k.x) < k.r && b.y < 1.2) combat.damagePlayer(k.damage);
      }
      for (const k of markers) if (k.on) { k.t -= dt; if (k.t <= 0) k.on = false; }
      const b = player.body;
      for (const w of waves) {
        if (!w.on) continue;
        if (w.delay > 0) { w.delay -= dt; continue; }
        w.r += w.speed * dt; if (w.r > w.maxR) { w.on = false; continue; }
        if (!w.harmless && !w.hit) { // the player is hit when feet are below the wave and he stands inside the band
          const d = Math.hypot(b.s - w.s, b.x - w.x);
          if (Math.abs(d - w.r) < w.thick / 2 + b.hx * 0.6 && b.y < w.y + w.height) { w.hit = true; combat.damagePlayer(w.damage); }
        }
      }
    },
    render(t) {
      for (const k of strikes) {
        if (!k.on || k.delayLeft > 0) { k.mesh.visible = false; continue; }
        const u = Math.max(0, k.t / k.dur), y = u * u * k.hi + 0.2;
        placeMatrix(track, k.s, k.x, y, 0, k.size, k.size, k.size, _m); k.mesh.matrixAutoUpdate = false; k.mesh.matrix.copy(_m); k.mesh.visible = true;
      }
      for (const k of markers) {
        if (!k.on) { k.disc.visible = k.edge.visible = false; continue; }
        const u = 1 - k.t / k.dur, pulse = 0.75 + 0.25 * Math.sin(t * 22);
        flat(k.disc, k.s, k.x, k.y, k.r); k.disc.material.opacity = (0.16 + 0.3 * u) * pulse;
        flat(k.edge, k.s, k.x, k.y, k.r * (1.35 - 0.35 * u)); k.edge.material.opacity = 0.5 + 0.5 * u;
      }
      for (const w of waves) {
        if (!w.on || w.delay > 0) { w.wall.visible = w.base.visible = false; continue; }
        put(w.wall, w.s, w.x, w.y, w.r, w.height, w.r); w.wall.material.uniforms.uA.value = Math.max(0, 1 - w.r / w.maxR) * (w.harmless ? 0.6 : 1);
        placeMatrix(track, w.s, w.x, w.y + 0.06, 0, w.r, w.r, w.r, _m); w.base.matrixAutoUpdate = false; w.base.matrix.copy(_m).multiply(_rot); w.base.visible = true;
        w.base.material.opacity = 0.9 * Math.max(0, 1 - w.r / w.maxR);
      }
    },
    clear() { for (const k of strikes) { k.on = false; k.mesh.visible = false; } for (const k of markers) { k.on = false; k.disc.visible = k.edge.visible = false; } for (const w of waves) { w.on = false; w.wall.visible = w.base.visible = false; } shadow.visible = false; },
    dispose() { scene.remove(group); },
  };
  return api;
}

export const rangeRand = (r) => r[0] + Math.random() * (r[1] - r[0]);
export const easeOut = (u) => 1 - (1 - u) * (1 - u);
export const clamp01 = (u) => Math.min(1, Math.max(0, u));
