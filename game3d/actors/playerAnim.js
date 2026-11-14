import { spring, lerp } from './modelKit.js';

// Procedural animation for the hero. Gameplay feeds a plain `s` object each frame and fires events;
// every joint is eased toward a target pose, so all transitions blend. No allocation per frame.
//   anim.update(dt, { speed, grounded, vy, sliding, shooting, super, moveX, vehicle })
//   anim.land(impactSpeed) anim.jump() anim.shoot() anim.hurt() anim.victory(on)
//   anim.onFootstep = (x,y,z) => {}   (called when a foot hits the ground while running)
const TAU = Math.PI * 2;
const ease = (cur, tgt, k, dt) => cur + (tgt - cur) * (1 - Math.exp(-k * dt));

export function createAnimator(model) {
  const j = model.joints;
  const st = {
    t: 0, phase: 0, mode: 'idle', modeTime: 0, aimT: 0, hurtT: 0, landT: 0, jumpT: 0, victory: false,
    sq: { x: 1, v: 0 }, recoil: { x: 0, v: 0 }, lean: 0, blink: 0, lastStepSign: 1, spin: 0,
  };
  const pose = {};              // joint name -> {x,y,z} smoothed rotation, plus hips y
  for (const k of ['hips', 'torso', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR', 'hat', 'tail']) pose[k] = { x: 0, y: 0, z: 0 };
  let hipsY = 0.74;
  const T = {};                 // target scratch: filled each frame
  for (const k in pose) T[k] = { x: 0, y: 0, z: 0 };
  const api = { state: st, onFootstep: null, onLand: null };

  api.jump = () => { st.jumpT = 0.12; st.sq.v = -9; };                       // anticipation squash then stretch
  api.land = (impact = 8) => { st.landT = 0.28; st.sq.v = -Math.min(14, 3 + impact * 0.75); if (api.onLand) api.onLand(impact); };
  api.shoot = () => { st.aimT = 0.35; st.recoil.v = 12; };
  api.hurt = () => { st.hurtT = 0.4; st.sq.v = -8; };
  api.victory = (on = true) => { st.victory = on; };

  function zero() { for (const k in T) { const p = T[k]; p.x = p.y = p.z = 0; } }

  api.update = (dt, s) => {
    st.t += dt; st.landT = Math.max(0, st.landT - dt); st.hurtT = Math.max(0, st.hurtT - dt); st.aimT = Math.max(0, st.aimT - dt);
    st.jumpT = Math.max(0, st.jumpT - dt);
    if (s.shooting) st.aimT = Math.max(st.aimT, 0.25);
    const speed = Math.abs(s.speed || 0), moving = speed > 0.6;
    let mode = 'idle';
    if (st.victory) mode = 'victory';
    else if (st.hurtT > 0) mode = 'hurt';
    else if (s.vehicle) mode = 'ride';
    else if (!s.grounded) mode = s.vy > 0.5 ? 'jump' : 'fall';
    else if (s.sliding) mode = 'slide';
    else if (st.landT > 0.12) mode = 'land';
    else if (moving) mode = 'run';
    if (mode !== st.mode) { st.mode = mode; st.modeTime = 0; } else st.modeTime += dt;

    zero();
    const aim = st.aimT > 0 ? 1 : 0, t = st.t, rec = st.recoil.x;
    let hy = 0.74, squashTarget = 1, hipRotX = 0, lean = 0, yaw = 0;
    const cyc = st.phase;
    switch (mode) {
      case 'idle': {
        const br = Math.sin(t * 2.2);
        T.torso.x = -0.05 + br * 0.02; T.head.x = Math.sin(t * 0.7) * 0.05; T.head.y = Math.sin(t * 0.5) * 0.25 * (Math.sin(t * 0.23) > 0.3 ? 1 : 0.2);
        T.shL.x = 0.08 + br * 0.03; T.shL.z = 0.12; T.elL.x = 0.25;
        T.shR.x = 0.65; T.elR.x = 0.9; T.hipL.z = -0.04; T.hipR.z = 0.04; T.hipL.x = -0.05; T.hipR.x = 0.07;
        hy = 0.74 + br * 0.006 - 0.01; T.hat.x = br * 0.02; T.tail.x = 0.1 + Math.sin(t * 1.5) * 0.08; T.tail.z = Math.sin(t * 1.1) * 0.1;
        break;
      }
      case 'run': {
        const k = Math.min(1, speed / 9);
        st.phase += dt * (6 + speed * 1.15); const p = st.phase, s1 = Math.sin(p), s2 = Math.sin(p + Math.PI);
        T.hipL.x = s1 * 0.95 * (0.5 + 0.5 * k); T.hipR.x = s2 * 0.95 * (0.5 + 0.5 * k);
        T.knL.x = -(0.25 + Math.max(0, Math.cos(p)) * 1.1 * k + 0.1); T.knR.x = -(0.25 + Math.max(0, Math.cos(p + Math.PI)) * 1.1 * k + 0.1);
        T.shL.x = s2 * 0.85 * k; T.elL.x = 0.55 + Math.max(0, s2) * 0.5; T.shL.z = 0.1;
        T.shR.x = aim ? 1.45 : 0.75 + s1 * 0.12; T.elR.x = aim ? 0.15 : 0.9;
        T.torso.x = -0.18 * k - 0.04; T.torso.y = s1 * 0.16 * k; T.head.y = -T.torso.y * 0.8; T.head.x = 0.1 * k;
        hy = 0.74 - 0.05 * k + Math.abs(Math.cos(p)) * 0.075 * k;
        T.hat.x = -Math.abs(Math.cos(p)) * 0.12 * k; T.tail.x = -0.25 * k - 0.1; T.tail.z = Math.sin(t * 17) * 0.12 * k;
        // footstep: foot passes under the body when sin crosses zero
        const sg = Math.sign(Math.cos(p));
        if (sg !== st.lastStepSign) { st.lastStepSign = sg; if (api.onFootstep) api.onFootstep(s1 > 0 ? 1 : -1); }
        break;
      }
      case 'jump': {
        const up = Math.min(1, st.modeTime / 0.15);
        T.hipL.x = 0.65; T.knL.x = -1.1; T.hipR.x = -0.2; T.knR.x = -0.5;
        T.shL.x = 2.5; T.shL.z = 0.35; T.elL.x = 0.3; T.shR.x = aim ? 1.45 : 1.9; T.elR.x = aim ? 0.15 : 0.5;
        T.torso.x = -0.1; T.head.x = -0.2; hy = 0.74 + 0.02; T.hat.x = 0.25; T.tail.x = -0.5;
        squashTarget = 1 + 0.18 * (1 - up * 0.4); lean = 0;
        break;
      }
      case 'fall': {
        const f = Math.min(1, st.modeTime / 0.25);
        T.hipL.x = 0.35; T.knL.x = -0.6; T.hipR.x = 0.05; T.knR.x = -0.35; T.hipL.z = -0.25; T.hipR.z = 0.25;
        T.shL.x = 1.2; T.shL.z = 0.9; T.elL.x = 0.3; T.shR.x = aim ? 1.45 : 1.0; T.shR.z = aim ? 0 : 0.5; T.elR.x = aim ? 0.15 : 0.4;
        T.torso.x = 0.04; T.head.x = -0.12; T.hat.x = 0.5 * f; T.tail.x = -0.6; T.tail.z = Math.sin(t * 22) * 0.2;
        squashTarget = 1.08;
        break;
      }
      case 'land': {
        const q = st.landT / 0.28;
        T.hipL.x = 0.8; T.knL.x = -1.45; T.hipR.x = 0.65; T.knR.x = -1.3; T.hipL.z = -0.2; T.hipR.z = 0.2;
        T.torso.x = -0.35 * q; T.head.x = 0.2 * q; T.shL.x = 0.6; T.shL.z = 0.6; T.elL.x = 0.4; T.shR.x = aim ? 1.45 : 0.8; T.elR.x = aim ? 0.15 : 0.8;
        hy = 0.74 - 0.2 * q; T.hat.x = -0.3 * q;
        break;
      }
      case 'slide': {
        hipRotX = 1.15; hy = 0.36; st.phase += dt * 2;
        T.hipL.x = 0.1; T.hipR.x = 0.25; T.knL.x = -0.1; T.knR.x = -0.3; T.torso.x = -0.35; T.head.x = -0.55;
        T.shL.x = -0.5; T.shL.z = 0.9; T.elL.x = 0.4; T.shR.x = aim ? 1.45 - 1.15 : 0.5 - 1.15; T.elR.x = aim ? 0.2 : 0.9; T.shR.z = 0.0;
        T.hat.x = 0.25; T.tail.x = -0.5; squashTarget = 1;
        break;
      }
      case 'hurt': {
        const q = st.hurtT / 0.4;
        T.torso.x = 0.45 * q; T.head.x = 0.5 * q; T.torso.z = Math.sin(t * 60) * 0.06 * q;
        T.shL.x = 0.5; T.shL.z = 1.2 * q + 0.1; T.shR.x = 0.5; T.shR.z = 0.8 * q; T.elL.x = 0.3; T.elR.x = 0.3;
        T.hipL.x = 0.25; T.knL.x = -0.5; T.hipR.x = -0.15; T.knR.x = -0.3; hy = 0.72; T.hat.x = 0.6 * q; T.tail.x = -0.5 * q;
        squashTarget = 0.94 + 0.06 * (1 - q);
        break;
      }
      case 'victory': {
        const b = Math.abs(Math.sin(t * 5)), w = Math.sin(t * 10);
        T.shL.x = 3.0 + w * 0.2; T.shL.z = 0.35; T.elL.x = 0.2; T.shR.x = 3.0 - w * 0.2; T.shR.z = -0.35; T.elR.x = 0.2;
        T.hipL.x = 0.1 + b * 0.2; T.knL.x = -0.2 - b * 0.4; T.hipR.x = -0.1; T.knR.x = -0.2 - b * 0.4;
        T.torso.x = 0.12; T.head.x = -0.25; T.head.y = Math.sin(t * 2.5) * 0.4; hy = 0.74 + b * 0.22; T.hat.x = -b * 0.2;
        squashTarget = 1 + (b - 0.4) * 0.08; yaw = Math.sin(t * 2.5) * 0.6; T.tail.x = -0.2 + w * 0.2;
        break;
      }
      case 'ride': {
        st.phase += dt * 2;
        const g = Math.min(1, speed / 9) * (s.grounded ? 1 : 0.3), br = Math.sin(t * 9) * g;
        T.hipL.x = 1.05; T.hipR.x = 1.05; T.hipL.z = -0.55; T.hipR.z = 0.55; T.knL.x = -1.35; T.knR.x = -1.35;
        T.torso.x = -0.2 * g - 0.05; T.head.x = 0.08;
        T.shL.x = 0.95; T.shL.z = 0.15; T.elL.x = 0.8; T.shR.x = aim ? 1.45 : 0.85; T.elR.x = aim ? 0.15 : 0.9;
        hy = 1.1 + Math.abs(br) * 0.04; T.hat.x = -Math.abs(br) * 0.15; T.tail.x = -0.35 * g - 0.1; T.tail.z = Math.sin(t * 17) * 0.14 * g;
        if (!s.grounded) T.torso.x = s.vy > 0 ? -0.35 : 0.0;
        break;
      }
    }
    // aiming / shooting layer: right arm raises toward the target, recoil kicks it back
    const cur = st.recoil; spring(cur, 0, 380, 24, dt);
    if (mode !== 'ride' || aim) { /* aim pose already in the case blocks */ }
    T.shR.x -= rec * 0.45 * (aim ? 1 : 0); T.torso.x += rec * 0.06; T.elR.x += rec * 0.2; T.head.x += rec * 0.03;
    // lateral lean into turns
    st.lean = ease(st.lean, (s.moveX || 0) * -0.18, 8, dt); T.torso.z += st.lean; T.hips && 0;
    if (mode === 'slide') hipRotX = 1.15;

    // ease joints toward targets (faster for snappy actions)
    const fast = mode === 'jump' || mode === 'hurt' || mode === 'land' || mode === 'victory' ? 22 : 14;
    for (const k in pose) {
      const p = pose[k], tg = T[k], kk = (k === 'hat' || k === 'tail') ? 10 : fast;
      p.x = ease(p.x, tg.x, kk, dt); p.y = ease(p.y, tg.y, kk, dt); p.z = ease(p.z, tg.z, kk, dt);
      j[k].rotation.set(p.x, p.y, p.z);
    }
    hipsY = ease(hipsY, hy, 18, dt);
    j.hips.position.y = hipsY;
    j.hips.rotation.x = ease(j.hips.rotation.x, hipRotX, 12, dt);
    j.hips.rotation.y = ease(j.hips.rotation.y, yaw, 8, dt);
    j.gun.position.z = rec * 0.05;
    // squash & stretch about the feet, volume preserving; the spring settles it back to 1
    if (st.jumpT > 0) squashTarget = 0.82;
    spring(st.sq, squashTarget, 260, 14, dt);
    const sy = Math.max(0.5, Math.min(1.45, st.sq.x)), sxz = 1 / Math.sqrt(sy);
    j.body.scale.set(sxz, sy, sxz);
    if (model.vehicle) { model.horse.update(t, speed, s.grounded); j.body.position.y = 0; }
  };
  return api;
}
