import * as THREE from 'three';

// Shader sky dome: 3-stop gradient, sun or moon disc with glow, stars, drifting fbm clouds.
// Everything is driven by one palette object (see themes/stage01.js). Follows the camera.
export const SKY_DEFAULT = {
  top: '#2b2160', mid: '#a8447a', horizon: '#ff9a4a',
  sunColor: '#ffd58a', sunDir: [-0.35, 0.16, -1], sunSize: 0.075, sunGlow: 0.6, sunBoost: 2.2, moon: false,
  stars: 0.5, cloudColor: '#ffb89a', cloudShade: '#6a3a6a', cloudAmount: 0.45, cloudSpeed: 0.012, cloudHeight: 0.16,
};

export function createSky(palette = {}) {
  const p = { ...SKY_DEFAULT, ...palette };
  const u = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunSize: { value: 0 },
    uSunGlow: { value: 0 }, uSunBoost: { value: 1 }, uMoon: { value: 0 }, uStars: { value: 0 },
    uCloud: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() }, uCloudAmt: { value: 0 },
    uCloudSpeed: { value: 0 }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uTop, uMid, uHorizon, uSunColor, uSunDir, uCloud, uCloudShade;
      uniform float uSunSize, uSunGlow, uSunBoost, uMoon, uStars, uCloudAmt, uCloudSpeed, uTime;
      float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+7.1; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        // gradient: horizon -> mid -> top
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
        col = mix(col, uTop, smoothstep(0.18, 0.85, h));
        col = mix(col, uHorizon * 0.7, smoothstep(0.0, -0.4, h));   // below the horizon
        // stars (cell hash on direction), fade near horizon and with sun glow
        if (uStars > 0.0) {
          vec2 sp = vec2(atan(d.z, d.x) * 90.0, d.y * 160.0);
          vec2 id = floor(sp), f = fract(sp) - 0.5;
          float r = hash(id), tw = 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
          float star = step(0.985, r) * smoothstep(0.35, 0.0, length(f)) * tw;
          col += star * uStars * smoothstep(0.1, 0.6, h) * 1.6;
        }
        // sun / moon disc and glow
        float sd = dot(d, normalize(uSunDir));
        float ang = acos(clamp(sd, -1., 1.));
        float disc = smoothstep(uSunSize, uSunSize * 0.92, ang);
        float glow = exp(-ang * 4.5) * uSunGlow + exp(-ang * 14.0) * uSunGlow * 0.8;
        col += uSunColor * glow;
        vec3 discCol = mix(uSunColor * uSunBoost, vec3(0.85, 0.9, 1.0) * 1.3, uMoon);
        // sun banding for the dusk look
        float band = mix(1.0, 0.9 + 0.1 * step(0.5, fract(ang * 26.0)), 1.0 - uMoon);
        col = mix(col, discCol * band, disc);
        // clouds: project onto a plane above, drifting
        if (uCloudAmt > 0.0 && h > 0.01) {
          vec2 cp = d.xz / (h + 0.25) * 1.6 + vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3);
          float c = fbm(cp * 1.2);
          float m = smoothstep(1.0 - uCloudAmt - 0.1, 1.0 - uCloudAmt + 0.12, c) * smoothstep(0.0, 0.14, h);
          float lit = smoothstep(0.35, 0.75, fbm(cp * 1.2 + normalize(uSunDir.xz) * 0.12));
          vec3 cc = mix(uCloudShade, uCloud, lit) + uSunColor * glow * 0.25;
          col = mix(col, cc, m * 0.92);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.scale.setScalar(300);
  const api = {
    mesh,
    set(pal) {
      Object.assign(p, pal);
      u.uTop.value.set(p.top); u.uMid.value.set(p.mid); u.uHorizon.value.set(p.horizon);
      u.uSunColor.value.set(p.sunColor); u.uSunDir.value.fromArray(p.sunDir).normalize();
      u.uSunSize.value = p.sunSize; u.uSunGlow.value = p.sunGlow; u.uSunBoost.value = p.sunBoost; u.uMoon.value = p.moon ? 1 : 0;
      u.uStars.value = p.stars; u.uCloud.value.set(p.cloudColor); u.uCloudShade.value.set(p.cloudShade);
      u.uCloudAmt.value = p.cloudAmount; u.uCloudSpeed.value = p.cloudSpeed;
    },
    update(camera, t) { mesh.position.copy(camera.position); u.uTime.value = t; },
  };
  api.set(p);
  return api;
}
