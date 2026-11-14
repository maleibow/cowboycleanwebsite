// Keyboard + gamepad (touch comes later) -> one `input` object. Mapping per PLAN section 5.
// Call input.update() once per simulation step; `*Pressed` flags are true for that step only.
const KEYS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space'], spray: ['KeyJ'], bomb: ['KeyK', 'KeyE'],
  slide: ['ShiftLeft', 'ShiftRight', 'KeyC'], pause: ['Escape', 'KeyP'],
};
const GAME_KEYS = new Set(Object.values(KEYS).flat());
const DEAD = 0.18;

export function createInput(target = window) {
  const down = new Set();
  let mouseSpray = false;
  const input = {
    moveX: 0, moveY: 0, // +x right, +y forward (into the screen)
    jump: false, spray: false, bomb: false, slide: false, pause: false,
    jumpPressed: false, bombPressed: false, pausePressed: false, anyPressed: false,
    keys: down, source: 'keyboard',
  };
  const prev = { jump: false, bomb: false, pause: false };

  target.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    down.add(e.code);
  });
  target.addEventListener('keyup', (e) => down.delete(e.code));
  target.addEventListener('blur', () => { down.clear(); mouseSpray = false; });
  target.addEventListener('mousedown', (e) => { if (e.button === 0) mouseSpray = true; });
  target.addEventListener('mouseup', (e) => { if (e.button === 0) mouseSpray = false; });

  const held = (a) => { for (const c of a) if (down.has(c)) return true; return false; };

  input.update = () => {
    let mx = (held(KEYS.right) ? 1 : 0) - (held(KEYS.left) ? 1 : 0);
    let my = (held(KEYS.up) ? 1 : 0) - (held(KEYS.down) ? 1 : 0);
    let jump = held(KEYS.jump), spray = held(KEYS.spray) || mouseSpray;
    let bomb = held(KEYS.bomb), slide = held(KEYS.slide), pause = held(KEYS.pause);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const ax = p.axes[0] || 0, ay = -(p.axes[1] || 0);
      if (Math.abs(ax) > DEAD) mx = ax;
      if (Math.abs(ay) > DEAD) my = ay;
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      // Standard mapping: 0=A 1=B 2=X 3=Y 6=LT 7=RT 9=Start, 12-15 dpad
      jump = jump || b(0); bomb = bomb || b(1); spray = spray || b(2) || b(7);
      slide = slide || b(3) || b(6); pause = pause || b(9);
      if (b(14)) mx = -1; if (b(15)) mx = 1; if (b(12)) my = 1; if (b(13)) my = -1;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    input.moveX = mx; input.moveY = my;
    input.jumpPressed = jump && !prev.jump;
    input.bombPressed = bomb && !prev.bomb;
    input.pausePressed = pause && !prev.pause;
    input.anyPressed = input.jumpPressed || input.bombPressed || input.pausePressed;
    prev.jump = jump; prev.bomb = bomb; prev.pause = pause;
    input.jump = jump; input.spray = spray; input.bomb = bomb; input.slide = slide; input.pause = pause;
  };
  return input;
}
