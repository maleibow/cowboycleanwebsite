// Shader warm-up: compile every program in a scene BEFORE the first frame that needs it, in parallel where the browser has
// KHR_parallel_shader_compile (then renderer.compile() only queues the work), and resolve once the programs are linked.
// three.js has compileAsync(), but its polling throws if a material is disposed while it waits (a stage restarted or quit
// mid-load, a boss removed), so this does the polling itself and treats a missing program as "nothing to wait for".
// Never rejects; gives up waiting after `timeout` ms (the programs then finish compiling on their first draw, as before).
export function warm(renderer, scene, camera, timeout = 1500) {
  return new Promise((resolve) => {
    let mats; try { mats = renderer.compile(scene, camera); } catch { resolve(); return; }
    if (!mats || !mats.size) { resolve(); return; }
    const t0 = performance.now();
    const poll = () => {
      for (const m of mats) {
        let ready = true;
        try { const p = renderer.properties.get(m)?.currentProgram; ready = !p || p.isReady(); } catch { ready = true; }
        if (ready) mats.delete(m);
      }
      if (!mats.size || performance.now() - t0 > timeout) resolve(); else setTimeout(poll, 16);
    };
    poll();
  });
}
