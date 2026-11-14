// Axis-aligned collision in track space (s, x, y). The only collision code in the game.
// A body is { s, x, y (feet), vs, vx, vy, hs, hx (half extents), h (height), grounded, ground, hitS }.
// A box is { s0, s1, x0, x1, y0, y1, kind }. Ground is a box whose top (y1) is the walking surface.
const EPS = 1e-4;

export function hits(b, o, h = b.h) {
  return b.s + b.hs - EPS > o.s0 && b.s - b.hs + EPS < o.s1 &&
         b.x + b.hx - EPS > o.x0 && b.x - b.hx + EPS < o.x1 &&
         b.y + h - EPS > o.y0 && b.y + EPS < o.y1;
}

// Would the body overlap anything if it were `h` tall? (Used to decide whether it may stand up.)
export function fits(b, boxes, h) {
  for (let i = 0; i < boxes.length; i++) if (hits(b, boxes[i], h)) return false;
  return true;
}

// Integrates velocity and resolves against `boxes`, one axis at a time (s, x, then y).
// Low ledges (<= stepUp) are walked up instead of blocking.
export function moveBody(b, boxes, dt, stepUp = 0.35) {
  b.hitS = 0; b.hitX = 0; b.ground = null;

  b.s += b.vs * dt;
  for (let i = 0; i < boxes.length; i++) {
    const o = boxes[i];
    if (!hits(b, o)) continue;
    if (o.y1 - b.y <= stepUp && o.kind !== 'barrier') { b.y = o.y1; continue; }
    const pushFwd = b.vs > 0 || (b.vs === 0 && b.s < (o.s0 + o.s1) / 2);
    b.s = pushFwd ? o.s0 - b.hs : o.s1 + b.hs;
    b.hitS = pushFwd ? 1 : -1; b.vs = 0;
  }

  b.x += b.vx * dt;
  for (let i = 0; i < boxes.length; i++) {
    const o = boxes[i];
    if (!hits(b, o)) continue;
    if (o.y1 - b.y <= stepUp && o.kind !== 'barrier' && o.kind !== 'wall') { b.y = o.y1; continue; }
    const pushRight = b.vx > 0 || (b.vx === 0 && b.x < (o.x0 + o.x1) / 2);
    b.x = pushRight ? o.x0 - b.hx : o.x1 + b.hx;
    b.hitX = pushRight ? 1 : -1; b.vx = 0;
  }

  b.grounded = false;
  b.y += b.vy * dt;
  for (let i = 0; i < boxes.length; i++) {
    const o = boxes[i];
    if (!hits(b, o)) continue;
    if (b.vy <= 0) { b.y = o.y1; b.grounded = true; b.ground = o; }
    else b.y = o.y0 - b.h;
    b.vy = 0;
  }
  return b;
}
