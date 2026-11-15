import * as THREE from 'three';

// Stage 9 set-piece: LIGHTS OUT. Inside a segment flagged `dark` the world fades to black: fog closes in to a few metres, the sky and the lights dim, and the only way to see is the spray: while the
// player is shooting, a pale green light rides on the muzzle and the fog opens up in front of him (it eases back when he lets go, or overheats). The path edges carry faint glow-stones so the way is
// never invisible; enemies show their glowing eyes. Beyond the section everything fades back in (about 8 m each way). Stage code never changes a thing outside the section: the original fog and lights
// are restored on dispose. Lights are created at level start (the set-piece's stage only) so no shader recompiles mid-run.
export const DARK = { fogNear: 1.5, fogFar: 10, sprayNear: 4, sprayFar: 30, ambient: 0.1, light: 46, ramp: 7, spray: 0.12, hold: 0.35 };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _c = new THREE.Color(), _v = new THREE.Vector3();

export function createDark(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.dark);
  if (!segs.length) return null;
  const P = ctx.player, b = P.body, fog = scene.fog, f0 = { near: fog.near, far: fog.far, color: fog.color.clone() }, bg0 = scene.background?.clone?.();
  const lights = []; scene.traverse((o) => { if (o.isHemisphereLight || o.isDirectionalLight) lights.push([o, o.intensity]); });
  const lamp = new THREE.PointLight(0xb8ffd8, 0, 20, 1.6); scene.add(lamp);
  const sky = ctx.sky, su = sky?.mesh.material.uniforms, sky0 = su ? { top: su.uTop.value.clone(), mid: su.uMid.value.clone(), hor: su.uHorizon.value.clone(), stars: su.uStars.value, boost: su.uSunBoost.value, cloud: su.uCloudAmt.value, glow: su.uSunGlow.value, size: su.uSunSize.value } : null;
  const black = new THREE.Color('#020504'), api = { d: 0, lit: 0, segs };
  let held = 0;

  api.update = (dt) => {
    const s = b.s; let d = 0;
    for (const g of segs) d = Math.max(d, smooth(g.s0 - 3, g.s0 + DARK.ramp, s) * (1 - smooth(g.s1 - DARK.ramp - 2, g.s1 + 2, s)));
    api.d = d;
    if (P.shooting && d > 0.05) held = DARK.hold; else held = Math.max(0, held - dt);
    const want = held > 0 ? 1 : 0; api.lit += (want - api.lit) * Math.min(1, dt * (want ? 14 : 5));
    const lit = api.lit * d;
    fog.near = f0.near + (DARK.fogNear + (DARK.sprayNear - DARK.fogNear) * api.lit - f0.near) * d; fog.far = f0.far + (DARK.fogFar + (DARK.sprayFar - DARK.fogFar) * api.lit - f0.far) * d;
    fog.color.copy(f0.color).lerp(black, d); if (scene.background?.isColor) scene.background.copy(fog.color);
    for (const [l, i0] of lights) l.intensity = i0 * (1 - d * (1 - DARK.ambient));
    if (su) { su.uTop.value.copy(sky0.top).lerp(black, d); su.uMid.value.copy(sky0.mid).lerp(black, d); su.uHorizon.value.copy(sky0.hor).lerp(black, d); su.uStars.value = sky0.stars * (1 - d); su.uSunBoost.value = sky0.boost * (1 - d); su.uCloudAmt.value = sky0.cloud * (1 - d); su.uSunGlow.value = sky0.glow * (1 - d); su.uSunSize.value = sky0.size * (1 - d); }
    lamp.intensity = DARK.light * lit * (0.9 + 0.1 * Math.sin(performance.now() * 0.05));
    track.toWorld(b.s + (P.faceS || 1) * 1.6, b.x + (P.faceX || 0) * 1.6, b.y + 1.5, _v); lamp.position.copy(_v);
  };
  api.render = () => {};
  api.reset = () => { held = 0; api.lit = 0; };
  api.dispose = () => { fog.near = f0.near; fog.far = f0.far; fog.color.copy(f0.color); if (scene.background?.isColor) scene.background.copy(f0.color); for (const [l, i0] of lights) l.intensity = i0; scene.remove(lamp); lamp.dispose?.(); };
  return api;
}
