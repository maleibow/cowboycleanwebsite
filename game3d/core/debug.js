// ?debug=1 helpers: FPS / draw-call panel and a free-cam toggle (key F).
export function createDebugPanel(renderer, quality) {
  const el = document.createElement('div');
  el.id = 'debug-panel';
  el.style.cssText = 'position:absolute;top:6px;left:6px;z-index:50;padding:4px 8px;' +
    'font:12px/1.4 monospace;color:#7CFC7C;background:rgba(0,0,0,.6);pointer-events:none;white-space:pre';
  document.getElementById('hud').appendChild(el);
  let frames = 0, acc = 0, fps = 0;
  return {
    stats: { fps: 0 },
    frame(dt) {
      frames++; acc += dt;
      if (acc >= 0.5) { fps = frames / acc; frames = 0; acc = 0; this.stats.fps = fps;
        const i = renderer.renderer.info;
        el.textContent = `fps ${fps.toFixed(0)}  ${quality.avgMs.toFixed(1)}ms\n` +
          `calls ${i.render.calls}  tris ${i.render.triangles}\n` +
          `tier ${quality.tier.name}  res ${quality.scale.toFixed(2)}x  pr ${renderer.pixelRatio.toFixed(2)}`;
      }
    },
  };
}

// Simple free-cam: WASD/QE to move, hold right mouse and drag to look. Toggle with F.
export function createFreeCam(camera, input, canvas) {
  const f = { active: false, yaw: 0, pitch: 0 };
  let drag = false;
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF') return;
    f.active = !f.active;
    if (f.active) { const e2 = camera.rotation; f.yaw = e2.y; f.pitch = e2.x; }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => { if (e.button === 2) drag = true; });
  addEventListener('mouseup', () => (drag = false));
  addEventListener('mousemove', (e) => {
    if (!f.active || !drag) return;
    f.yaw -= e.movementX * 0.004; f.pitch = Math.max(-1.5, Math.min(1.5, f.pitch - e.movementY * 0.004));
  });
  f.apply = (dt) => {
    camera.rotation.order = 'YXZ'; camera.rotation.set(f.pitch, f.yaw, 0);
    const k = input.keys, sp = (k.has('ShiftLeft') ? 30 : 10) * dt;
    const fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    camera.translateZ(-fwd * sp); camera.translateX(side * sp); camera.position.y += up * sp;
  };
  return f;
}
