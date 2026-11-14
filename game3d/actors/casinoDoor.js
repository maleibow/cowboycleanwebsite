import * as THREE from 'three';
import { events } from '../core/events.js';
import { Builder } from './modelKit.js';
import { createToon, makeOutline } from '../render/materials.js';

// The casino side-door (PLAN 1.1): a glowing doorway at the edge of the path, spawned by the generator as a `door`
// slot (rare: at most one per stage, in act 2, 45% of stages as laid out in world/generator.js). Walking into it
// emits `casinoDoor` and the game flow opens the slot machine. Once used it fizzles out (until the stage restarts).
const HALF_W = 1.1, H = 3.0, ZONE_S = 1.3, ZONE_X = 1.6;
const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);

export function createCasinoDoors(ctx, scene, track) {
  const doors = [], toon = createToon({ vertexColors: true, grime: false, rimBoost: 1.2 });
  const frameGeo = (() => {
    const b = new Builder({ boxSeg: 2 });
    b.box(0.3, H + 0.3, 0.5, 0x5b2a8a, { p: [-HALF_W - 0.15, (H + 0.3) / 2, 0], radius: 0.08 }); b.box(0.3, H + 0.3, 0.5, 0x5b2a8a, { p: [HALF_W + 0.15, (H + 0.3) / 2, 0], radius: 0.08 });
    b.box(HALF_W * 2 + 0.9, 0.35, 0.55, 0x7a3aa8, { p: [0, H + 0.2, 0], radius: 0.1 });
    b.box(1.9, 0.62, 0.12, 0x1a0a28, { p: [0, H + 0.85, 0.05], radius: 0.06 });                          // sign board
    for (let i = 0; i < 7; i++) b.sphere(0.07, 0xffd84a, { p: [-1.05 + i * 0.35, H + 0.2, 0.3], ao: 0 });    // bulbs
    return b.build();
  })();
  const portalGeo = new THREE.PlaneGeometry(HALF_W * 2, H);
  const portalMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uT, uA;
      void main(){ vec2 p = vUv - vec2(0.5, 0.5); p.y *= 1.4; float r = length(p), a = atan(p.y, p.x);
        float sw = 0.5 + 0.5 * sin(a * 3.0 + r * 14.0 - uT * 3.0), ring = smoothstep(0.55, 0.15, r);
        vec3 c = mix(vec3(1.4, 0.35, 2.0), vec3(2.6, 1.9, 0.5), sw * ring); float edge = 0.55 + 0.45 * sin(uT * 4.0 + r * 18.0);
        gl_FragColor = vec4(c * (0.7 + 0.5 * edge), ring * 0.95 * uA); }`,
  });
  const sign = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80; const g = cv.getContext('2d'); g.fillStyle = '#1a0a28'; g.fillRect(0, 0, 256, 80); g.fillStyle = '#ffd84a'; g.font = '56px Bangers, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LUCKY 7', 128, 44); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const signMat = new THREE.MeshBasicMaterial({ map: sign, color: hdr(0xffffff, 1.6), fog: false }), signGeo = new THREE.PlaneGeometry(1.8, 0.56);
  const f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }, m = new THREE.Matrix4(), rot = new THREE.Matrix4(), v = new THREE.Vector3(), nx = new THREE.Vector3();

  for (const sl of ctx.layout.slots) {
    if (sl.kind !== 'door') continue;
    const side = Math.sign(sl.x) || 1, half = (track.segmentAt(sl.s).width || 8) / 2, lat = side * (half - 0.9);
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const frame = new THREE.Mesh(frameGeo, toon); makeOutline(frame, { width: 0.003 }); g.add(frame);
    const portal = new THREE.Mesh(portalGeo, portalMat.clone()); portal.position.y = H / 2; g.add(portal);
    const board = new THREE.Mesh(signGeo, signMat); board.position.set(0, H + 0.85, 0.12); g.add(board);
    const light = new THREE.PointLight(0xc070ff, 9, 12, 1.6); light.position.set(0, 1.8, 1.2); g.add(light);
    track.frameAt(sl.s, f); nx.copy(f.t).multiplyScalar(-side);                           // local x runs along the path so the door faces the track centre
    m.makeBasis(nx, f.u, v.copy(nx).cross(f.u)); m.multiply(rot.makeRotationY(side * 0.75)); track.toWorld(sl.s, lat, 0, v); m.setPosition(v);   // turned 43 degrees toward the runner coming up the path
    g.matrix.copy(m); g.matrixWorldNeedsUpdate = true; scene.add(g);
    doors.push({ slot: sl, s: sl.s, x: lat, group: g, portal, light, used: false, fade: 1 });
  }

  const api = {
    list: doors,
    update(dt) {
      const b = ctx.player.body;
      for (const d of doors) {
        if (d.used) { d.fade = Math.max(0, d.fade - dt * 1.5); continue; }
        if (Math.abs(b.s - d.s) < ZONE_S && Math.abs(b.x - d.x) < ZONE_X && b.y < 2.5 && !ctx.player.dead) { d.used = true; events.emit('warp'); events.emit('casinoDoor', d); }
      }
    },
    render(t) {
      for (const d of doors) {
        d.portal.material.uniforms.uT.value = t; d.portal.material.uniforms.uA.value = d.fade; d.light.intensity = 9 * d.fade * (0.85 + 0.15 * Math.sin(t * 6));
        d.group.visible = d.fade > 0.01;
        if (!d.used && Math.random() < 0.06) { track.toWorld(d.s + (Math.random() - 0.5) * 1.8, d.x - Math.sign(d.x) * 0.4, 0.3 + Math.random() * 2.6, v); ctx.particles.emit('sparkle', v.x, v.y, v.z, { count: 0.4, scale: 0.8 }); }
      }
    },
    reset() { for (const d of doors) { d.used = false; d.fade = 1; } },
    dispose() { for (const d of doors) scene.remove(d.group); },
  };
  return api;
}
