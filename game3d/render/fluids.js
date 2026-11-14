import * as THREE from 'three';

// One animated shader plane that can be water, sludge, acid, lava, ruby water or quicksand.
// createFluid('lava', { width: 8, length: 12 }) -> { mesh, update(t) }.
// Colours above 1 are HDR on purpose: the bloom pass picks them up (lava, acid, ruby glints).
export const FLUID_TYPES = {
  water:   { deep: '#1f6f9c', shallow: '#4fc3d9', foam: '#e8fbff', hi: '#bff4ff', glow: 0.0, speed: 0.5, scale: 0.55, amp: 0.05, flow: 0.4, bands: 4 },
  sludge:  { deep: '#2c4a1e', shallow: '#6f9a2b', foam: '#b6d94a', hi: '#d6f06a', glow: 0.25, speed: 0.22, scale: 0.4, amp: 0.07, flow: 0.25, bands: 3 },
  acid:    { deep: '#0b6b2f', shallow: '#38e05a', foam: '#d8ff7a', hi: '#f2ffaa', glow: 1.1, speed: 0.55, scale: 0.6, amp: 0.05, flow: 0.4, bands: 4 },
  lava:    { deep: '#3a0a06', shallow: '#e8420f', foam: '#ffd23a', hi: '#fff0a0', glow: 2.2, speed: 0.18, scale: 0.35, amp: 0.06, flow: 0.18, bands: 3, crust: 1 },
  ruby:    { deep: '#4a0614', shallow: '#c8123a', foam: '#ff7a96', hi: '#ffc2d0', glow: 0.9, speed: 0.4, scale: 0.5, amp: 0.05, flow: 0.45, bands: 4 },
  quicksand: { deep: '#8a5a2b', shallow: '#d9a45a', foam: '#f1cf8a', hi: '#ffe7b0', glow: 0.0, speed: 0.1, scale: 0.7, amp: 0.02, flow: 0.05, bands: 3 },
};

export function createFluid(type = 'water', { width = 10, length = 10, segments = 24, overrides = {} } = {}) {
  const f = { ...FLUID_TYPES[type], ...overrides };
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uDeep: { value: new THREE.Color(f.deep) }, uShallow: { value: new THREE.Color(f.shallow) },
    uFoam: { value: new THREE.Color(f.foam) }, uHi: { value: new THREE.Color(f.hi) },
    uGlow: { value: f.glow }, uSpeed: { value: f.speed }, uScale: { value: f.scale }, uAmp: { value: f.amp },
    uFlow: { value: f.flow }, uBands: { value: f.bands }, uCrust: { value: f.crust || 0 }, uSize: { value: new THREE.Vector2(width, length) },
  }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true,
    vertexShader: /* glsl */`
      #include <fog_pars_vertex>
      uniform float uTime, uAmp, uSpeed, uScale; varying vec2 vUv; varying vec3 vW;
      void main(){
        vUv = uv; vec3 p = position;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        p.y += uAmp * (sin(wp.x * uScale * 1.7 + uTime * uSpeed * 3.0) + sin(wp.z * uScale * 1.3 - uTime * uSpeed * 2.3)) ;
        vW = (modelMatrix * vec4(p,1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <fog_pars_fragment>
      uniform float uTime, uGlow, uSpeed, uScale, uFlow, uBands, uCrust; uniform vec3 uDeep, uShallow, uFoam, uHi; uniform vec2 uSize;
      varying vec2 vUv; varying vec3 vW;
      vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
      // cellular noise: x = distance to nearest point, y = distance to the border between cells
      vec2 cell(vec2 p){
        vec2 n = floor(p), f = fract(p); float md = 8.; vec2 mr; vec2 mg;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o = hash2(n+g); o = .5+.5*sin(uTime*uSpeed*2.0 + 6.2831*o);
          vec2 r = g + o - f; float d = dot(r,r); if(d<md){ md = d; mr = r; mg = g; } }
        md = 8.;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = mg + vec2(i,j); vec2 o = hash2(n+g); o = .5+.5*sin(uTime*uSpeed*2.0 + 6.2831*o);
          vec2 r = g + o - f; if(dot(mr-r,mr-r) > 1e-5) md = min(md, dot(.5*(mr+r), normalize(r-mr))); }
        return vec2(sqrt(min(8.,1.0)), md);
      }
      void main(){
        vec2 p = vW.xz * uScale; p.y += uTime * uFlow * uSpeed * 2.0;
        float c1 = cell(p).y, c2 = cell(p * 1.9 + 3.7).y;
        float depth = 0.5 + 0.5 * sin(vW.x * 0.4 + vW.z * 0.23 + uTime * uSpeed);
        vec3 col = mix(uDeep, uShallow, floor(depth * uBands) / uBands * 0.7 + 0.15 + c1 * 0.3);
        // bright caustic / bubble lines on cell borders (stepped for the toon look)
        float line = 1.0 - smoothstep(0.02, 0.075, c1);
        float line2 = 1.0 - smoothstep(0.015, 0.05, c2);
        col = mix(col, uHi, line * 0.75 + line2 * 0.35);
        // foam at the edges of the plane
        vec2 e = min(vUv, 1.0 - vUv) * uSize;
        float edge = 1.0 - smoothstep(0.0, 0.55, min(e.x, e.y) + (c2 - 0.5) * 0.35);
        col = mix(col, uFoam, edge * 0.9);
        if (uCrust > 0.5) {                           // lava: dark crust plates, glowing seams
          float seam = 1.0 - smoothstep(0.04, 0.2, c1);
          vec3 crust = uDeep * 1.3; col = mix(crust, uShallow * 1.4, seam) ; col = mix(col, uHi * 1.6, line * 0.8); col = mix(col, uFoam * 1.4, edge * 0.5);
          gl_FragColor = vec4(col * (1.0 + uGlow * seam), 1.0);
        } else {
          gl_FragColor = vec4(col * (1.0 + uGlow * (line * 1.6 + 0.2)), 1.0);
        }
        #include <fog_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(width, length, segments, Math.max(1, Math.round(segments * length / width)));
  geo.rotateX(-Math.PI / 2);                      // lies flat in XZ
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = true;
  return { mesh, type, update(t) { uniforms.uTime.value = t; } };
}
