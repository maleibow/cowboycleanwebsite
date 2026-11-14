import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Colour grade (lift / gamma / gain + saturation), vignette and light film grain in ONE pass.
// Each part is switched by the quality tier: tier.vignette, tier.grade, tier.grain.
// Bloom lives in renderer.js (tuned with a >1.0 threshold so only HDR emissives glow).
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 }, uVignette: { value: 0.0 }, uGrain: { value: 0.0 }, uTime: { value: 0 }, uGradeOn: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 uLift, uGamma, uGain; uniform float uSat, uVignette, uGrain, uTime, uGradeOn; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 t = texture2D(tDiffuse, vUv); vec3 c = t.rgb;
      if (uGradeOn > 0.5) {
        c = uGain * (c + uLift * (1.0 - c));
        c = pow(max(c, vec3(0.0)), 1.0 / uGamma);
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, uSat);
      }
      vec2 q = vUv - 0.5; float v = dot(q, q * vec2(1.0, 1.15));
      c *= 1.0 - uVignette * smoothstep(0.08, 0.42, v);
      c += (h(vUv * 1000.0) - 0.5) * uGrain * (0.5 + l_(c));
      gl_FragColor = vec4(c, t.a);
    }`.replace('l_(c)', 'dot(c, vec3(0.33))'),
};

export function createPost(composer, quality, insertBefore) {
  const pass = new ShaderPass(GradeShader);
  composer.insertPass(pass, composer.passes.indexOf(insertBefore));   // before the OutputPass: grade in linear HDR
  const u = pass.uniforms;
  const api = {
    pass,
    // grade: { lift:[r,g,b], gamma:[..], gain:[..], sat, vignette, grain }
    setStage(g) {
      u.uLift.value.fromArray(g.lift ?? [0, 0, 0]); u.uGamma.value.fromArray(g.gamma ?? [1, 1, 1]);
      u.uGain.value.fromArray(g.gain ?? [1, 1, 1]); u.uSat.value = g.sat ?? 1;
      api.base = { vignette: g.vignette ?? 0.45, grain: g.grain ?? 0.035 };
      api.applyTier();
    },
    applyTier() {
      const t = quality.tier, b = api.base || { vignette: 0.45, grain: 0.035 };
      u.uGradeOn.value = t.grade ? 1 : 0;
      u.uVignette.value = t.vignette ? b.vignette : 0;
      u.uGrain.value = t.grain ? b.grain : 0;
      pass.enabled = !!(t.grade || t.vignette || t.grain);
    },
    update(t) { u.uTime.value = (t * 7.31) % 17; },
  };
  return api;
}
