import { createVines } from './hazVine.js';

// Moving things attached to segments, one small module per kind (each returns null when the stage has none of its data):
//   vines    stage 2 set-piece: hanging vines the player grabs and swings on         (hazVine.js)
// The generator copies each template's lists (seg.vines ...) with absolute s. Theme geometry comes from theme.hazards.
// api: update(dt, input), render(alpha, t), reset(), dispose().
export function createHazards(ctx, scene, track) {
  const parts = [createVines(ctx, scene, track)].filter(Boolean);
  return {
    parts,
    update(dt, input) { for (const p of parts) p.update(dt, input); },
    render(alpha, t) { for (const p of parts) p.render(alpha, t); },
    reset() { for (const p of parts) p.reset?.(); },
    dispose() { for (const p of parts) p.dispose?.(); },
  };
}
