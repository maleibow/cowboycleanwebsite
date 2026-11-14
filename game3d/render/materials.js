import * as THREE from 'three';

// Toon material factory (PLAN 4): 3-step light ramp, coloured shadow tint, rim light,
// vertex colours, optional emissive, and the "clean wave" grime uniform.
// All materials made here share ONE set of uniform objects (`look`, `grime`), so changing
// the stage look or the wave position updates every material without touching them.

export const look = {                       // per-stage look, shared by every toon material
  shadowTint: { value: new THREE.Color(0.78, 0.62, 0.92) },  // multiplies unlit areas
  rimColor:   { value: new THREE.Color(1.0, 0.75, 0.5) },
  rimStrength:{ value: 0.45 },
  sunLuma:    { value: 0.7 },               // brightness of a fully sun-lit white surface
};

// The clean wave. Everything with s > front + band is grimy; everything behind `front`
// is full colour; in between it blooms back. `dir`/`origin` map world space to path
// distance s (straight track along -Z for now; track.js will replace this mapping).
export const grime = {
  front:  { value: 0 },                     // path distance of the wave front (player s + lead)
  band:   { value: 10 },                    // how far the bloom-back takes
  amount: { value: 0.85 },                  // 0 = no grime anywhere, 1 = fully grey ahead of the wave
  dir:    { value: new THREE.Vector3(0, 0, -1) },
  origin: { value: new THREE.Vector3(0, 0, 0) },
  tint:   { value: new THREE.Color(0.5, 0.46, 0.5) },       // colour grime is pulled toward
  glow:   { value: 0.8 },                   // brightness of the ring at the wave front
};

export function setStageLook(p) {
  if (p.shadowTint !== undefined) look.shadowTint.value.set(p.shadowTint);
  if (p.rimColor !== undefined) look.rimColor.value.set(p.rimColor);
  if (p.rimStrength !== undefined) look.rimStrength.value = p.rimStrength;
  if (p.sunLuma !== undefined) look.sunLuma.value = p.sunLuma;
  if (p.grimeTint !== undefined) grime.tint.value.set(p.grimeTint);
}
// Drive the wave from the player's track distance. Pass wash=1 to clean the whole stage.
export function setCleanWave(s, { lead = 12, wash = 0 } = {}) {
  grime.front.value = s + lead;
  grime.amount.value = grime.baseAmount * (1 - wash);
}
grime.baseAmount = grime.amount.value;

// ---- 3-step ramp: dark / mid / lit, nearest-filtered so the bands stay crisp ----
let rampTex = null;
export function getRamp() {
  if (rampTex) return rampTex;
  // coord = dot(N,L)*0.5+0.5, so texels 0-3 are facing away, 4-5 are grazing, 6-7 are lit.
  const v = [0.2, 0.2, 0.2, 0.2, 0.62, 0.62, 1, 1];
  const d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(x * 255); d[i * 4 + 3] = 255; });
  rampTex = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  rampTex.minFilter = rampTex.magFilter = THREE.NearestFilter;
  rampTex.generateMipmaps = false; rampTex.needsUpdate = true;
  return rampTex;
}

const VERT_PARS = /* glsl */`
varying vec3 vGrimeW;
`;
const VERT_BODY = /* glsl */`
{
  vec4 gw = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    gw = instanceMatrix * gw;
  #endif
  vGrimeW = ( modelMatrix * gw ).xyz;
}
`;
const FRAG_PARS = /* glsl */`
varying vec3 vGrimeW;
uniform vec3 uShadowTint; uniform vec3 uRimColor; uniform float uRimStrength; uniform float uSunLuma;
uniform float uGrimeFront; uniform float uGrimeBand; uniform float uGrimeAmount;
uniform vec3 uGrimeDir; uniform vec3 uGrimeOrigin; uniform vec3 uGrimeTint; uniform float uGrimeGlow;
`;
const FRAG_BODY = /* glsl */`
{
  vec3 emi = totalEmissiveRadiance;
  vec3 base = outgoingLight - emi;
  #ifdef TOON_TINT
    float lit = clamp( dot( reflectedLight.directDiffuse, vec3( 0.3, 0.59, 0.11 ) ) /
      ( dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) ) * uSunLuma + 1e-4 ), 0.0, 1.0 );
    base *= mix( uShadowTint, vec3( 1.0 ), smoothstep( 0.05, 0.6, lit ) );
  #endif
  #ifdef TOON_RIM
    float rim = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 2.6 );
    base += uRimColor * rim * uRimStrength;
  #endif
  #ifdef TOON_GRIME
    float gs = dot( vGrimeW - uGrimeOrigin, uGrimeDir );
    float clean = 1.0 - smoothstep( uGrimeFront, uGrimeFront + uGrimeBand, gs ) * uGrimeAmount;
    float g = 1.0 - clean;                                   // 0 clean .. amount grimy
    float luma = dot( base, vec3( 0.3, 0.59, 0.11 ) );
    base = mix( base, vec3( luma ) * uGrimeTint * 1.9, g * 0.95 );   // desaturate toward grime tint
    base *= 1.0 - g * 0.4;                                   // and darken
    float ring = exp( -pow( ( gs - uGrimeFront ) / 3.0, 2.0 ) ) * step( 0.001, uGrimeAmount ); // bright bloom at the front
    base += base * ring * uGrimeGlow * 0.6;
    emi *= 1.0 - g * 0.35;
  #endif
  outgoingLight = base + emi;
}
#include <opaque_fragment>
`;

// opts: color, vertexColors, emissive, emissiveIntensity, map, side, transparent, opacity,
//       alphaTest, grime (default true), rim (default true), tint (default true), fog (true)
export function createToon(opts = {}) {
  const useGrime = opts.grime !== false, useRim = opts.rim !== false, useTint = opts.tint !== false;
  const m = new THREE.MeshToonMaterial({
    color: opts.color ?? 0xffffff, gradientMap: getRamp(),
    vertexColors: !!opts.vertexColors, map: opts.map || null,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide, transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    alphaTest: opts.alphaTest ?? 0, fog: opts.fog !== false,
  });
  const key = `toon${useGrime ? 'G' : ''}${useRim ? 'R' : ''}${useTint ? 'T' : ''}`;
  m.customProgramCacheKey = () => key;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uShadowTint: look.shadowTint, uRimColor: look.rimColor, uRimStrength: look.rimStrength, uSunLuma: look.sunLuma,
      uGrimeFront: grime.front, uGrimeBand: grime.band, uGrimeAmount: grime.amount, uGrimeDir: grime.dir,
      uGrimeOrigin: grime.origin, uGrimeTint: grime.tint, uGrimeGlow: grime.glow,
    });
    const defs = (useTint ? '#define TOON_TINT\n' : '') + (useRim ? '#define TOON_RIM\n' : '') + (useGrime ? '#define TOON_GRIME\n' : '');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BODY);
    sh.fragmentShader = defs + sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <opaque_fragment>', FRAG_BODY);
  };
  m.userData.toon = true;
  return m;
}

// Cache for flat-coloured scenery materials (one material per colour/emissive combo).
const cache = new Map();
export function toonColor(color, o = {}) {
  const k = [color, o.emissive ?? 0, o.emissiveIntensity ?? 1, o.vertexColors ? 1 : 0, o.grime === false ? 0 : 1].join('|');
  let m = cache.get(k);
  if (!m) { m = createToon({ color, ...o }); cache.set(k, m); }
  return m;
}

// ---- Inverted-hull outline ----
// Adds a smoothed-normal attribute (so hard edges don't split open) and returns a Mesh that
// draws the back faces pushed out by a constant SCREEN-space width.
function smoothNormals(geo) {
  if (geo.getAttribute('aSmooth')) return geo;
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
  const acc = new Map(), keyOf = (i) => `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = keyOf(i); let a = acc.get(k);
    if (!a) acc.set(k, (a = [0, 0, 0]));
    a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = acc.get(keyOf(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute('aSmooth', new THREE.BufferAttribute(out, 3));
  return geo;
}
const outlineMats = new Map();
export function outlineMaterial(color = 0x2a1420, width = 0.0034) {
  const k = color + '|' + width;
  let m = outlineMats.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uWidth: { value: width }, uFlash: { value: 0 } },
      vertexShader: /* glsl */`
        attribute vec3 aSmooth; uniform float uWidth;
        void main() {
          vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          vec3 n = normalize( normalMatrix * aSmooth );
          vec2 d = ( projectionMatrix * vec4( n, 0.0 ) ).xy;
          p.xy += normalize( d + 1e-5 ) * uWidth * p.w * vec2( 0.5625, 1.0 );   // 16:9 aspect-correct
          gl_Position = p;
        }`,
      fragmentShader: /* glsl */`uniform vec3 uColor; void main() { gl_FragColor = vec4( uColor, 1.0 ); }`,
      side: THREE.BackSide, fog: false,
    });
    outlineMats.set(k, m);
  }
  return m;
}
export function makeOutline(mesh, { color, width } = {}) {
  smoothNormals(mesh.geometry);
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(color, width));
  o.name = 'outline'; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = mesh.frustumCulled;
  mesh.add(o);
  return o;
}
