// Fixed 60 Hz simulation step with interpolated rendering. Pauses when the tab is hidden.
export const STEP = 1 / 60;
const MAX_FRAME = 0.25; // clamp long stalls so we never spiral

export function createLoop({ update, render, onFrame }) {
  let acc = 0, last = 0, raf = 0, running = false;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    let dt = t - last;
    last = t;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 8) { update(STEP); acc -= STEP; steps++; }
    if (steps === 8) acc = 0;
    render(acc / STEP, dt);
    if (onFrame) onFrame(dt);
  };
  const start = () => {
    if (running) return;
    running = true; acc = 0; last = performance.now() / 1000;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  return { start, stop, get running() { return running; } };
}
