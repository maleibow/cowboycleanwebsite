import * as THREE from 'three';

// One instanced, billboarded particle system = one draw call. CPU-simulated, fixed pool.
// Premultiplied blending lets a single material draw both normal (smoke) and additive
// (sparkle, ember) particles. particles.emit('dust', x, y, z, { dir?: Vector3-like, scale?, color? })
const MAX = 1400;
const SHAPE = { soft: 0, bubble: 1, star: 2, square: 3, smoke: 4, drop: 5 };

// Presets are data. life/speed/size are [min,max]. add: 0 = normal blend, 1 = additive.
export const PRESETS = {
  dust:      { n: 7,  life: [0.35, 0.6], speed: [0.6, 2.0], up: 0.5, spread: 1, grav: -1.5, drag: 2.2, size: [0.28, 0.5], grow: 1.8, shape: 'smoke', colors: ['#e8c48c', '#d6a96b'], alpha: 0.7, add: 0, ring: 1 },
  bubbles:   { n: 7,  life: [0.9, 1.6], speed: [0.8, 2.2], up: 1.2, spread: 1, grav: 1.6, drag: 1.2, size: [0.2, 0.46], grow: 0.1, shape: 'bubble', colors: ['#bfefff', '#ffffff', '#ffd6f5'], alpha: 0.95, add: 0.4, wobble: 1.5 },
  sparkle:   { n: 8,  life: [0.4, 0.8], speed: [0.5, 2.2], up: 0.6, spread: 1, grav: 0.0, drag: 1.5, size: [0.15, 0.32], grow: -0.8, shape: 'star', colors: ['#fff6b0', '#ffffff', '#9ff0ff'], alpha: 1, add: 1, hdr: 2.2, spin: 4 },
  splash:    { n: 14, life: [0.45, 0.8], speed: [2.5, 5.5], up: 3.5, spread: 0.6, grav: -14, drag: 0.4, size: [0.1, 0.22], grow: -0.1, shape: 'drop', colors: ['#bff4ff', '#4fc3d9'], alpha: 0.95, add: 0.2 },
  ember:     { n: 5,  life: [0.9, 1.8], speed: [0.3, 1.2], up: 1.8, spread: 0.7, grav: 0.8, drag: 0.8, size: [0.07, 0.15], grow: -0.5, shape: 'soft', colors: ['#ff9a30', '#ff5a1a', '#ffd25a'], alpha: 1, add: 1, hdr: 2.6, wobble: 2.5 },
  smoke:     { n: 4,  life: [1.0, 1.8], speed: [0.2, 0.7], up: 1.0, spread: 0.5, grav: 0.4, drag: 0.9, size: [0.5, 0.9], grow: 1.6, shape: 'smoke', colors: ['#6a6070', '#8a8090'], alpha: 0.55, add: 0 },
  confetti:  { n: 40, life: [1.4, 2.4], speed: [2, 7], up: 5, spread: 1, grav: -7, drag: 1.8, size: [0.1, 0.18], grow: 0, shape: 'square', colors: ['#ff4d6d', '#ffd23a', '#3ad1ff', '#7cff6b', '#c06bff'], alpha: 1, add: 0, spin: 9, flutter: 1 },
  hitSpark:  { n: 9,  life: [0.12, 0.26], speed: [3, 8], up: 0.5, spread: 1, grav: 0, drag: 5, size: [0.12, 0.3], grow: -1.2, shape: 'star', colors: ['#ffffff', '#fff2a0', '#ffb347'], alpha: 1, add: 1, hdr: 3, spin: 8 },
  mote:      { n: 1,  life: [4, 7], speed: [0.1, 0.4], up: 0.1, spread: 1, grav: 0.0, drag: 0.5, size: [0.03, 0.07], grow: 0, shape: 'soft', colors: ['#ffd9a0', '#ffe9c0'], alpha: 0.7, add: 1, hdr: 1.4, wobble: 0.6 },
  coinBurst: { n: 14, life: [0.5, 0.9], speed: [2.5, 5.5], up: 4, spread: 1, grav: -10, drag: 0.6, size: [0.12, 0.24], grow: -0.1, shape: 'star', colors: ['#ffd23a', '#fff2a0', '#ffb800'], alpha: 1, add: 1, hdr: 2.4, spin: 6 },
};

export function createParticles() {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index; geo.setAttribute('position', quad.getAttribute('position')); geo.setAttribute('uv', quad.getAttribute('uv'));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);   // xyz, size
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);   // rgb(hdr), alpha
  const aMisc = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);  // rotation, shape, additive
  for (const a of [aPos, aCol, aMisc]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aPos', aPos); geo.setAttribute('aCol', aCol); geo.setAttribute('aMisc', aMisc);
  geo.instanceCount = 0;

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
      attribute vec4 aPos; attribute vec4 aCol; attribute vec3 aMisc;
      varying vec2 vUv; varying vec4 vCol; varying vec3 vMisc;
      void main(){
        vUv = uv; vCol = aCol; vMisc = aMisc;
        vec4 mv = modelViewMatrix * vec4(aPos.xyz, 1.0);
        float c = cos(aMisc.x), s = sin(aMisc.x);
        vec2 q = (position.xy) * aPos.w; q = vec2(q.x*c - q.y*s, q.x*s + q.y*c);
        mv.xy += q;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying vec4 vCol; varying vec3 vMisc;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = 0.0; float shape = vMisc.y;
        if (shape < 0.5) a = smoothstep(1.0, 0.1, r);                                           // soft
        else if (shape < 1.5) { a = smoothstep(1.0, 0.82, r) * (0.28 + 0.72 * smoothstep(0.55, 0.9, r)) + smoothstep(0.35, 0.0, length(p - vec2(-0.35, 0.35))) * 0.9; a = min(a, 1.0) * step(r, 1.0); } // bubble ring + highlight
        else if (shape < 2.5) { vec2 q = abs(p); a = smoothstep(0.12, 0.0, min(q.x, q.y) * 1.0 + max(0.0, r - 0.2) * 0.9) * smoothstep(1.0, 0.7, r) + smoothstep(0.35, 0.0, r); } // 4-point star
        else if (shape < 3.5) a = step(max(abs(p.x), abs(p.y) * 1.6), 0.9);                       // confetti
        else if (shape < 4.5) a = smoothstep(1.0, 0.25, r) * (0.7 + 0.3 * sin(p.x * 7.0 + p.y * 5.0));   // smoke puff
        else a = smoothstep(1.0, 0.7, length(p * vec2(1.0, 0.7)));                                 // drop
        a *= vCol.a; if (a < 0.01) discard;
        // additive 0..1: output alpha shrinks so ONE_MINUS_SRC_ALPHA leaves the background intact
        gl_FragColor = vec4(vCol.rgb * a, a * (1.0 - vMisc.z));
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 10;

  // Pool as structure-of-arrays: no per-particle objects, no allocation per frame.
  const px = new Float32Array(MAX), py = new Float32Array(MAX), pz = new Float32Array(MAX);
  const vx = new Float32Array(MAX), vy = new Float32Array(MAX), vz = new Float32Array(MAX);
  const age = new Float32Array(MAX), life = new Float32Array(MAX).fill(0), size = new Float32Array(MAX);
  const rot = new Float32Array(MAX), spin = new Float32Array(MAX), seed = new Float32Array(MAX);
  const cr = new Float32Array(MAX), cg = new Float32Array(MAX), cb = new Float32Array(MAX);
  const preset = new Array(MAX).fill(null);
  const parsed = {}; // preset name -> array of [r,g,b]
  const tmp = new THREE.Color();
  let head = 0, live = 0, time = 0;
  const R = Math.random;

  function emit(name, x, y, z, o = {}) {
    const P = PRESETS[name]; if (!P) return;
    const cols = parsed[name] || (parsed[name] = P.colors.map((c) => { tmp.set(c); return [tmp.r, tmp.g, tmp.b]; }));
    const n = Math.max(1, Math.round(P.n * (o.count ?? 1))), sc = o.scale ?? 1, hdr = P.hdr ?? 1;
    for (let k = 0; k < n; k++) {
      const i = head; head = (head + 1) % MAX;
      const a = R() * 6.2832, e = (R() - 0.5) * 2;
      let dx = Math.cos(a), dz = Math.sin(a), dy = 0;
      if (o.dir) { dx = o.dir.x + dx * 0.5 * P.spread; dy = o.dir.y + e * 0.5 * P.spread; dz = o.dir.z + dz * 0.5 * P.spread; }
      const sp = (P.speed[0] + R() * (P.speed[1] - P.speed[0])) * sc;
      px[i] = x + (o.dir ? 0 : dx * 0.15 * sc); py[i] = y; pz[i] = z + (o.dir ? 0 : dz * 0.15 * sc);
      vx[i] = dx * sp * (P.ring ? 1 : 0.7); vz[i] = dz * sp * (P.ring ? 1 : 0.7); vy[i] = dy * sp + (P.up * (0.5 + R() * 0.7)) * Math.min(sc, 1.5);
      life[i] = P.life[0] + R() * (P.life[1] - P.life[0]); age[i] = 0;
      size[i] = (P.size[0] + R() * (P.size[1] - P.size[0])) * sc;
      rot[i] = R() * 6.2832; spin[i] = (P.spin ? (R() - 0.5) * 2 * P.spin : 0); seed[i] = R() * 100;
      const c = o.color ? (tmp.set(o.color), [tmp.r, tmp.g, tmp.b]) : cols[(R() * cols.length) | 0];
      cr[i] = c[0] * hdr; cg[i] = c[1] * hdr; cb[i] = c[2] * hdr;
      preset[i] = P;
    }
  }

  function update(dt, camera) {
    time += dt; let n = 0;
    for (let i = 0; i < MAX; i++) {
      const P = preset[i]; if (!P) continue;
      age[i] += dt;
      if (age[i] >= life[i]) { preset[i] = null; continue; }
      const t = age[i] / life[i], drag = Math.exp(-P.drag * dt);
      vx[i] *= drag; vz[i] *= drag; vy[i] = vy[i] * drag + P.grav * dt;
      if (P.wobble) { vx[i] += Math.sin(time * 5 + seed[i]) * P.wobble * dt; vz[i] += Math.cos(time * 4 + seed[i]) * P.wobble * dt; }
      if (P.flutter) vy[i] += Math.sin(time * 9 + seed[i]) * 4 * dt;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
      if (P.grav < 0 && py[i] < 0.02) { py[i] = 0.02; vy[i] *= -0.25; vx[i] *= 0.6; vz[i] *= 0.6; }
      rot[i] += spin[i] * dt;
      const s = Math.max(0.01, size[i] * (1 + P.grow * t));
      const fade = t < 0.12 ? t / 0.12 : 1 - Math.pow((t - 0.12) / 0.88, 1.6);
      aPos.array[n * 4] = px[i]; aPos.array[n * 4 + 1] = py[i]; aPos.array[n * 4 + 2] = pz[i]; aPos.array[n * 4 + 3] = s;
      aCol.array[n * 4] = cr[i]; aCol.array[n * 4 + 1] = cg[i]; aCol.array[n * 4 + 2] = cb[i]; aCol.array[n * 4 + 3] = P.alpha * Math.max(0, fade);
      aMisc.array[n * 3] = rot[i]; aMisc.array[n * 3 + 1] = SHAPE[P.shape]; aMisc.array[n * 3 + 2] = P.add;
      n++;
    }
    live = n; geo.instanceCount = n;
    aPos.needsUpdate = aCol.needsUpdate = aMisc.needsUpdate = true;
    mesh.visible = n > 0;
  }
  return { mesh, emit, update, get live() { return live; }, MAX };
}
