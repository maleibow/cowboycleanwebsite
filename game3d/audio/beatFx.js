// Beat reactivity (PLAN 8.2): the Jukebox analyser drives three subtle effects while the Game mix or the synth plays:
//   bloom pulse        the bloom strength swells a little on each beat
//   emissive flicker   glowing materials (lamps, neon, lava) brighten a few percent on the beat
//   scenery bob        the far scenery layer lifts a touch on the beat
// Off when the quality tier says so (tier.beat = 0, the lowest tier), in Spotify mode (the embed cannot be read), and on any
// screen without a world. Everything it changes is restored when it switches off. No allocation per frame.
const BLOOM = 0.2, EMISSIVE = 0.14, BOB = 0.35, RESCAN = 1.5;

export function createBeatFx({ jukebox, gfx, quality }) {
  let on = false, baseBloom = 0, mats = [], scanT = 0, world = null, bobbed = null;
  const scan = (scene) => {                                  // emissive materials in the scene, refreshed now and then (stages stream chunks in and out)
    const seen = new Set(); mats.length = 0;
    scene.traverse((o) => {
      const m = o.material; if (!m || Array.isArray(m) || seen.has(m)) return; seen.add(m);
      if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.01 && m.emissiveIntensity > 0.2) { if (m.userData.beatBase === undefined) m.userData.beatBase = m.emissiveIntensity; mats.push(m); }
    });
  };
  const restore = () => {
    if (!on) return; on = false;
    gfx.bloom.strength = baseBloom; for (const m of mats) m.emissiveIntensity = m.userData.beatBase; mats.length = 0;
    if (bobbed) { bobbed.position.y = 0; bobbed = null; }
  };
  return {
    // Call once per rendered frame with the current world (or null) and the frame time.
    update(w, dt) {
      const allowed = w && quality.tier.beat && jukebox.beatActive();
      if (!allowed) { restore(); world = null; return; }
      if (!on) { on = true; baseBloom = gfx.bloom.strength; scanT = 0; }
      if (w !== world) { world = w; scanT = 0; if (bobbed) { bobbed.position.y = 0; bobbed = null; } }
      if ((scanT -= dt) <= 0) { scanT = RESCAN; scan(w.scene); }
      const p = jukebox.energy.pulse, p2 = p * p, e = jukebox.energy;
      gfx.bloom.strength = baseBloom + BLOOM * p2 + 0.1 * e.bass;
      for (const m of mats) m.emissiveIntensity = m.userData.beatBase * (1 + EMISSIVE * p2);
      const far = w.scenery?.far?.group; if (far) { bobbed = far; far.position.y = BOB * p2; }
    },
    restore,
  };
}
