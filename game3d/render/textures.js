import * as THREE from 'three';
import { createRng } from '../core/rng.js';

// Small procedural CanvasTextures, cached by key. All tile seamlessly and are sRGB.
// getTexture('planks', { size: 128, a: '#8a5a33', b: '#6b4226', repeat: [2, 2] })
const cache = new Map();
const hex = (c) => '#' + new THREE.Color(c).getHexString();

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

// Tileable value noise (bilinear on a wrapped lattice), several octaves.
function valueNoise(size, cells, octaves, seed) {
  const r = createRng(seed), out = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o, g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = r.next();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * n, fy = (y / size) * n, x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[(y0 % n) * n + (x0 % n)], b = g[(y0 % n) * n + ((x0 + 1) % n)];
      const c = g[((y0 + 1) % n) * n + (x0 % n)], d = g[((y0 + 1) % n) * n + ((x0 + 1) % n)];
      out[y * size + x] += amp * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function lerpColor(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
const rgb = (c) => { const k = new THREE.Color(c); return [k.r * 255, k.g * 255, k.b * 255].map((v) => Math.min(255, Math.pow(v / 255, 1 / 2.2) * 255)); };

const GEN = {
  // two-colour fbm. o: a, b, cells, octaves, contrast
  noise(size, o, seed) {
    const n = valueNoise(size, o.cells ?? 4, o.octaves ?? 4, seed), c = canvas(size), g = c.getContext('2d');
    const img = g.createImageData(size, size), A = rgb(o.a ?? '#888'), B = rgb(o.b ?? '#bbb'), k = o.contrast ?? 1.4;
    for (let i = 0; i < n.length; i++) {
      const t = Math.min(1, Math.max(0, (n[i] - 0.5) * k + 0.5)), col = lerpColor(A, B, t);
      img.data.set([col[0], col[1], col[2], 255], i * 4);
    }
    g.putImageData(img, 0, 0); return c;
  },
  stripes(size, o) {
    const c = canvas(size), g = c.getContext('2d'), n = o.count ?? 8;
    g.fillStyle = hex(o.a ?? '#fff'); g.fillRect(0, 0, size, size); g.fillStyle = hex(o.b ?? '#c33');
    for (let i = 0; i < n; i += 2) {
      if (o.diagonal) { g.beginPath(); const w = size / n; g.moveTo(i * w - size, size); g.lineTo(i * w, size); g.lineTo(i * w + size, 0); g.lineTo(i * w, 0); g.fill(); g.translate(0, 0); }
      else g.fillRect(0, (i * size) / n, size, size / n);
    }
    return c;
  },
  planks(size, o, seed) {
    const c = canvas(size), g = c.getContext('2d'), r = createRng(seed), n = o.count ?? 4, h = size / n;
    const A = new THREE.Color(o.a ?? '#8a5a33'), B = new THREE.Color(o.b ?? '#6b4226');
    for (let i = 0; i < n; i++) {
      g.fillStyle = '#' + A.clone().lerp(B, r.next() * 0.8).getHexString(); g.fillRect(0, i * h, size, h);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const y = i * h + r.range(3, h - 3); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(size * .3, y + r.range(-2, 2), size * .6, y + r.range(-2, 2), size, y); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, i * h, size, 2);
      const sx = r.range(0.2, 0.8) * size; g.fillRect(sx, i * h, 2, h);   // plank end joint
    }
    return c;
  },
  bricks(size, o, seed) {
    const c = canvas(size), g = c.getContext('2d'), r = createRng(seed), rows = o.rows ?? 6, cols = o.cols ?? 4;
    const bh = size / rows, bw = size / cols, A = new THREE.Color(o.a ?? '#a8503a'), M = hex(o.mortar ?? '#4a3a36');
    g.fillStyle = M; g.fillRect(0, 0, size, size);
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols; x++) {
      const ox = (y % 2) * bw * 0.5;
      g.fillStyle = '#' + A.clone().offsetHSL(0, 0, r.range(-0.07, 0.07)).getHexString();
      g.fillRect(x * bw + ox + 1.5, y * bh + 1.5, bw - 3, bh - 3);
    }
    return c;
  },
  cracks(size, o, seed) {
    const c = canvas(size), g = c.getContext('2d'), r = createRng(seed);
    g.fillStyle = hex(o.a ?? '#c98a4b'); g.fillRect(0, 0, size, size);
    g.strokeStyle = hex(o.b ?? '#5a2e17'); g.lineCap = 'round';
    for (let i = 0; i < (o.count ?? 7); i++) {
      let x = r.range(0, size), y = r.range(0, size), a = r.range(0, 6.28); g.lineWidth = r.range(1, 2.5); g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        a += r.range(-0.8, 0.8); x += Math.cos(a) * size * 0.07; y += Math.sin(a) * size * 0.07; g.lineTo(x, y);
        if (r.chance(0.25)) { const bx = x + Math.cos(a + 1) * size * 0.06, by = y + Math.sin(a + 1) * size * 0.06; g.moveTo(bx, by); g.lineTo(x, y); }
      }
      g.stroke();
    }
    return c;
  },
  speckle(size, o, seed) {
    const c = canvas(size), g = c.getContext('2d'), r = createRng(seed);
    g.fillStyle = hex(o.a ?? '#d9a066'); g.fillRect(0, 0, size, size);
    const dots = [o.b ?? '#b8814a', o.c ?? '#f1c27d', o.d ?? '#8a5a33'];
    for (let i = 0; i < size * (o.density ?? 3); i++) {
      g.fillStyle = hex(dots[i % dots.length]); g.globalAlpha = r.range(0.25, 0.8);
      const s = r.range(0.6, 2.2), x = r.range(0, size), y = r.range(0, size);
      for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) g.fillRect(x + dx, y + dy, s, s);
    }
    return c;
  },
};

export function getTexture(type, o = {}) {
  const key = type + JSON.stringify(o);
  let t = cache.get(key);
  if (t) return t;
  const size = o.size ?? 128;
  const seed = o.seed ?? 7;
  t = new THREE.CanvasTexture(GEN[type](size, o, seed));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  cache.set(key, t);
  return t;
}
export const textureCount = () => cache.size;
