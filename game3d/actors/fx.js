import * as THREE from 'three';

// Pooled soap-bubble / spark bursts: one InstancedMesh, one draw call, no allocation per frame.
const CAP = 192;
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _c = new THREE.Color();
const IDENT = new THREE.Quaternion(), _s = new THREE.Vector3();

export function createFx(track, scene) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  const P = Array.from({ length: CAP }, () => ({ on: false, s: 0, x: 0, y: 0, vs: 0, vx: 0, vy: 0, t: 0, max: 1, size: 0.1, color: 0xffffff, g: 10 }));
  let n = 0, cursor = 0;
  const fx = {
    mesh, get active() { return n; },
    // Burst of `count` bits at a track-space point. bubble=true makes slow floaty soap bubbles.
    burst(s, x, y, color = 0xffffff, count = 8, speed = 4, size = 0.12, bubble = false) {
      for (let i = 0; i < count; i++) {
        const p = P[cursor]; cursor = (cursor + 1) % CAP;
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, k = Math.sqrt(1 - u * u), sp = speed * (0.4 + Math.random() * 0.6);
        p.on = true; p.s = s; p.x = x; p.y = y; p.vs = Math.cos(a) * k * sp; p.vx = Math.sin(a) * k * sp; p.vy = (u * 0.6 + 0.5) * sp;
        p.t = p.max = (bubble ? 0.9 : 0.45) * (0.7 + Math.random() * 0.6); p.size = size * (0.6 + Math.random() * 0.8);
        p.color = color; p.g = bubble ? -1.5 : 12;
      }
    },
    update(dt) {
      n = 0;
      for (let i = 0; i < CAP; i++) {
        const p = P[i]; if (!p.on) continue;
        p.t -= dt; if (p.t <= 0) { p.on = false; continue; }
        p.vy -= p.g * dt; p.s += p.vs * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        n++;
      }
    },
    render() {
      let k = 0;
      for (let i = 0; i < CAP; i++) {
        const p = P[i]; if (!p.on) continue;
        track.toWorld(p.s, p.x, p.y, _v);
        const sc = p.size * (0.3 + 0.7 * (p.t / p.max));
        _m.compose(_v, IDENT, _s.set(sc, sc, sc)); mesh.setMatrixAt(k, _m); mesh.setColorAt(k, _c.setHex(p.color)); k++;
      }
      mesh.count = k; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    clear() { for (const p of P) p.on = false; n = 0; },
  };
  return fx;
}
