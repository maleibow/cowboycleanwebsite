import * as THREE from 'three';
import { moveBody, fits } from '../world/collision.js';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { createPlayerModel } from './playerModel.js';

// Player controller in track space (PLAN 3.1 / 3.4). A capsule stands in for the model.
export const PHYS = {
  speed: 9, speedPerUpgrade: 1.5, vehicleBonus: 2, lateral: 0.75, backward: 0.6,
  jumpApex: 2.6, jumpApexPerUpgrade: 0.5, gravity: 32, maxFall: 40,
  coyote: 0.1, buffer: 0.12, jumpCut: 0.4,
  accelGround: 55, accelAir: 28, frictionGround: 60, frictionAir: 8, turnBoost: 1.5,
  height: 1.8, duckHeight: 1.0, slideHeight: 0.7, halfS: 0.4, halfX: 0.4,
  slideTime: 0.7, slideBoost: 1.3, slideCooldown: 0.25, slideMinSpeed: 2.5, duckSpeed: 0.35,
  stepUp: 0.35, sandDrag: 0.5, pitY: -8, pitDamage: 20, pitInvuln: 1.5, hitInvuln: 1.0, backroom: 3,
};
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));

export function createPlayer(track, { startS = 4 } = {}) {
  const b = { s: startS, x: 0, y: 0, vs: 0, vx: 0, vy: 0, hs: PHYS.halfS, hx: PHYS.halfX, h: PHYS.height, grounded: false, ground: null, hitS: 0, hitX: 0 };
  const prev = { s: b.s, x: 0, y: 0, h: b.h };
  const boxes = [];
  const p = {
    body: b, seg: track.segmentAt(startS), progress: startS, // furthest s reached: the camera never goes back past it
    coyote: 0, jumpBuf: 0, jumping: false, sliding: false, slideT: 0, slideCd: 0, ducking: false, slidePrev: false,
    invuln: 0, respawns: 0, pitFalls: 0, deaths: 0, checkpointIdx: -1, safe: { s: startS, x: 0, y: 0 },
    respawnPoint: { s: startS, x: 0, y: 0 }, reachedGate: false, time: 0, dead: false, intentS: 0, intentX: 0,
  };

  p.maxSpeed = () => PHYS.speed + PHYS.speedPerUpgrade * run.upgrades.speed + (run.upgrades.vehicle ? PHYS.vehicleBonus : 0);
  p.jumpSpeed = () => Math.sqrt(2 * PHYS.gravity * (PHYS.jumpApex + PHYS.jumpApexPerUpgrade * run.upgrades.jump));

  const query = () => track.query(b.s - 2, b.s + 2, boxes);
  const stand = () => { b.h = PHYS.height; p.sliding = false; p.ducking = false; };

  p.hurt = (amount, invuln = PHYS.hitInvuln) => {
    if (p.invuln > 0 || run.cheats.god) return false;
    run.health = Math.max(0, run.health - amount); p.invuln = invuln;
    p.model.anim.hurt(); events.emit('hurt', amount);
    if (run.health <= 0) p.die();
    return true;
  };
  p.place = (pt) => { // put the body on solid ground and clear motion
    Object.assign(b, { s: pt.s, x: pt.x, y: pt.y + 0.02, vs: 0, vx: 0, vy: 0 });
    stand(); p.progress = b.s; p.jumpBuf = 0; p.coyote = 0; p.jumping = false;
    Object.assign(prev, { s: b.s, x: b.x, y: b.y, h: b.h });
    p.respawns++; events.emit('respawn', p);
  };
  p.fall = () => { // pit: -20 health, back to the last safe ground, 1.5 s invulnerable (PLAN 3.4)
    p.pitFalls++; events.emit('pitFall', p);
    if (!run.cheats.god) run.health = Math.max(0, run.health - PHYS.pitDamage);
    if (run.health <= 0) { p.die(); return; }
    p.place(p.safe); p.invuln = PHYS.pitInvuln;
  };
  p.die = () => { // health 0: the game flow (GAMEOVER state) takes over; the level stops simulating while `dead`
    if (p.dead) return; p.dead = true; p.deaths++; run.health = 0; events.emit('playerDied', p);
  };
  p.revive = (pt) => { // Retry stage: full health, back at `pt`, checkpoints and gate reset
    p.dead = false; p.checkpointIdx = -1; p.reachedGate = false; p.pitFalls = 0;
    p.respawnPoint = { s: pt.s, x: 0, y: pt.y }; p.safe = { ...pt }; p.place(pt); p.respawns--; p.invuln = PHYS.pitInvuln;
  };
  p.teleport = (s, x = 0) => {
    const top = track.heightUnder(s, x); const pt = { s, x, y: top === -Infinity ? 0 : top };
    p.safe = { ...pt }; p.place(pt); p.respawns--;
  };

  // `view` = { sideW, towardW } blend weights from the camera rig, so controls flip with what is on screen.
  p.update = (dt, input, view) => {
    prev.s = b.s; prev.x = b.x; prev.y = b.y; prev.h = b.h;
    p.time += dt; p.seg = track.segmentAt(b.s);
    const seg = p.seg;
    p.invuln = Math.max(0, p.invuln - dt); p.slideCd = Math.max(0, p.slideCd - dt);
    if (p.hold) { p.hold.step(dt, input); p.progress = Math.max(p.progress, b.s); p.animate(dt); return; }   // a vine swing carries the body (world/hazVine.js)
    p.coyote = b.grounded ? PHYS.coyote : Math.max(0, p.coyote - dt);
    p.jumpBuf = input.jumpPressed ? PHYS.buffer : Math.max(0, p.jumpBuf - dt);

    // ---- intent: controls follow the camera (side view: left/right runs the track; chase: x is mirrored)
    let sIn = input.moveY, xIn = input.moveX;
    if (view.towardW > 0.5) xIn = -xIn;
    if (view.sideW > 0.5 && Math.abs(sIn) < 0.2) { sIn = xIn; xIn = 0; }
    if (seg.lockX) xIn = 0;
    p.intentS = sIn; p.intentX = xIn; // read by the weapon to set the facing
    if (Math.hypot(sIn, xIn) > 0.2) { p.faceS = sIn; p.faceX = xIn; }   // the hero turns to face where he is heading (back button = turn around)
    p.inSand = b.grounded && b.ground?.kind === 'quicksand';   // quicksand drags: half speed (the lane at the side is firm)
    const max = p.maxSpeed() * (p.inSand ? PHYS.sandDrag : 1);

    // ---- slide / duck
    const slidePressed = input.slide && !p.slidePrev; p.slidePrev = input.slide;
    query();
    if (slidePressed && b.grounded && !p.sliding && p.slideCd <= 0 && b.vs > PHYS.slideMinSpeed) {
      p.sliding = true; p.slideT = PHYS.slideTime; b.h = PHYS.slideHeight; p.ducking = false;
      b.vs = Math.max(b.vs, max * PHYS.slideBoost); events.emit('slide', p);
    }
    if (p.sliding) {
      p.slideT -= dt;
      if (p.slideT <= 0 && fits(b, boxes, PHYS.height)) { stand(); p.slideCd = PHYS.slideCooldown; }
      else if (p.slideT <= 0) { p.sliding = false; p.ducking = true; b.h = PHYS.duckHeight; } // wedged under a bar: crawl on
    } else if (input.slide && b.grounded) { p.ducking = true; b.h = PHYS.duckHeight; }
    else if (p.ducking && fits(b, boxes, PHYS.height)) stand();
    const low = p.sliding || p.ducking;

    // ---- jump (buffered, coyote, variable height)
    if (p.jumpBuf > 0 && (b.grounded || p.coyote > 0) && (!low || fits(b, boxes, PHYS.height))) {
      if (low) { stand(); p.slideCd = PHYS.slideCooldown; }
      b.vy = p.jumpSpeed(); p.jumpBuf = 0; p.coyote = 0; p.jumping = true; b.grounded = false;
      p.model.anim.jump(); events.emit('jump', p);
    }
    if (p.jumping && !input.jump && b.vy > p.jumpSpeed() * PHYS.jumpCut) b.vy = p.jumpSpeed() * PHYS.jumpCut;
    if (p.jumping && (b.vy <= 0 || b.grounded)) p.jumping = false;

    // ---- horizontal velocity
    const ac = b.grounded ? PHYS.accelGround : PHYS.accelAir, fr = b.grounded ? PHYS.frictionGround : PHYS.frictionAir;
    if (p.sliding) {
      const u = 1 - Math.max(0, p.slideT) / PHYS.slideTime;
      b.vs = max * (PHYS.slideBoost - 0.5 * u); // glide, easing off
    } else {
      const tvs = sIn * max * (sIn < 0 ? PHYS.backward : 1) * (low ? PHYS.duckSpeed : 1);
      const turning = Math.sign(tvs) !== Math.sign(b.vs) && Math.abs(b.vs) > 0.5;
      b.vs = approach(b.vs, tvs, (Math.abs(tvs) < 0.01 ? fr : turning ? ac * PHYS.turnBoost : ac) * dt);
    }
    const tvx = xIn * max * PHYS.lateral * (low ? 0.4 : 1);
    b.vx = approach(b.vx, tvx, (Math.abs(tvx) < 0.01 ? fr : ac) * dt);
    if (seg.lockX) { b.vx = 0; b.x += (0 - b.x) * Math.min(1, 10 * dt); }
    b.vy = Math.max(-PHYS.maxFall, b.vy - PHYS.gravity * dt);

    // ---- move + collide
    const wasGrounded = b.grounded, vyBefore = b.vy;
    moveBody(b, query(), dt, PHYS.stepUp);
    if (b.grounded && !wasGrounded && vyBefore < -4) { p.model.anim.land(-vyBefore); events.emit('land', -vyBefore); }
    if (b.grounded && b.ground?.belt && !p.sliding) b.s += b.ground.belt * dt;   // a conveyor belt (stage 3) drags whatever stands on it
    for (let i = 0; i < boxes.length; i++) { const o = boxes[i]; if (o.kind === 'barrier' && b.grounded && b.s > o.s0 - 0.4 && b.s < o.s1 + 0.4 && b.y + b.h <= o.y0 + 0.02 && p.lastGate !== o) { p.lastGate = o; events.emit('gateWhoosh', o); } }   // slid under a gate
    // The "no going back" ratchet is for the corridor only: in the boss arena the player roams the whole disc
    // (world/arena.js keeps him inside it), so moving up-screen must not lock him out of moving back down.
    if (seg.mode !== 'arena') {
      if (b.s < p.progress - PHYS.backroom) { b.s = p.progress - PHYS.backroom; if (b.vs < 0) b.vs = 0; }
      p.progress = Math.max(p.progress, b.s);
    }

    // ---- bookkeeping: safe ground, checkpoints, gate, pit
    if (b.grounded && !low && track.supported(b.s, b.x, b.y)) { p.safe.s = b.s; p.safe.x = b.x; p.safe.y = b.y; }
    const cps = track.checkpoints;
    for (let i = p.checkpointIdx + 1; i < cps.length; i++) {
      if (b.s < cps[i].s) break;
      p.checkpointIdx = i; p.respawnPoint = { s: cps[i].s + 1, x: 0, y: 0 }; events.emit('checkpoint', i);
    }
    if (!p.reachedGate && b.s >= track.gateS) { p.reachedGate = true; events.emit('bossGate', p); }
    if (b.y < PHYS.pitY) p.fall();
    p.animate(dt);
  };

  // ---- visuals: the animated hero (playerModel.js). He faces +s; sliding/ducking, spraying and the vehicle feed the animator.
  const model = createPlayerModel(), group = model.group;
  p.model = model; p.mesh = group; p.shooting = false; p.faceS = 1; p.faceX = 0; p.yaw = 0; p.prevYaw = 0;
  const _qy = new THREE.Quaternion(), UPY = new THREE.Vector3(0, 1, 0);
  const fr = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }, m4 = new THREE.Matrix4(), ref = new THREE.Vector3();
  p.animate = (dt) => { // once per simulation step, after the physics
    const target = Math.atan2(-p.faceX, p.faceS), d = Math.atan2(Math.sin(target - p.yaw), Math.cos(target - p.yaw));
    p.prevYaw = p.yaw; p.yaw += d * Math.min(1, 14 * dt);
    if (model.vehicle !== !!run.upgrades.vehicle) model.setVehicle(!!run.upgrades.vehicle);
    model.anim.update(dt, { speed: Math.hypot(b.vs, b.vx), grounded: b.grounded, vy: b.vy, sliding: p.sliding || p.ducking, shooting: p.shooting, moveX: p.intentX * Math.max(0, Math.cos(p.yaw)), vehicle: model.vehicle });
  };
  p.render = (alpha) => {
    const s = prev.s + (b.s - prev.s) * alpha, x = prev.x + (b.x - prev.x) * alpha, y = prev.y + (b.y - prev.y) * alpha - (p.inSand ? 0.12 : 0);
    track.frameAt(s, fr);
    group.position.copy(fr.p).addScaledVector(fr.r, x).addScaledVector(fr.u, y);
    ref.copy(fr.t).negate(); m4.makeBasis(fr.r, fr.u, ref); group.quaternion.setFromRotationMatrix(m4);
    const yd = Math.atan2(Math.sin(p.yaw - p.prevYaw), Math.cos(p.yaw - p.prevYaw));
    group.quaternion.multiply(_qy.setFromAxisAngle(UPY, p.prevYaw + yd * alpha));
    group.visible = p.invuln <= 0 || Math.floor(p.time * 18) % 2 === 0;
  };
  p.interp = (alpha, out = {}) => { out.s = prev.s + (b.s - prev.s) * alpha; out.x = prev.x + (b.x - prev.x) * alpha; out.y = prev.y + (b.y - prev.y) * alpha; return out; };
  return p;
}
