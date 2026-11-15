import { createVines } from './hazVine.js';
import { createBelts } from './hazBelt.js';
import { createTraffic } from './hazTraffic.js';
import { createRocks } from './hazRocks.js';
import { createCollapse } from './hazCollapse.js';
import { createClouds } from './hazClouds.js';
import { createGates } from './hazGate.js';
import { createDark } from './hazDark.js';
import { createTide } from './hazTide.js';

// Moving things attached to segments, one small module per kind (each returns null when the stage has none of its data):
//   vines    stage 2 set-piece: hanging vines the player grabs and swings on         (hazVine.js)
//   traffic  stage 4: taxis sweeping across the road                                 (hazTraffic.js)
//   rocks    stage 6: falling boulders on marked circles                          (hazRocks.js)
//   planks   stage 6: collapsing bridge planks                                    (hazCollapse.js)
//   clouds   stage 8: drifting cloud platforms that carry the player           (hazClouds.js)
//   gates    stage 9: swinging cemetery gates that open and shut on a timer      (hazGate.js)
//   dark     stage 9: the lights-out set-piece (fog, light and sky fade; the spray lights the way)  (hazDark.js)
//   tides    stage 10: the rising ruby tide of the flooded avenue                          (hazTide.js)
//   belts    stage 3: conveyor belts that reverse, and crusher pistons over them     (hazBelt.js)
// The generator copies each template's lists (seg.vines ...) with absolute s. Theme geometry comes from theme.hazards.
// api: update(dt, input), render(alpha, t), reset(), dispose().
export function createHazards(ctx, scene, track) {
  const parts = [createVines(ctx, scene, track), createBelts(ctx, scene, track), createTraffic(ctx, scene, track), createRocks(ctx, scene, track), createCollapse(ctx, scene, track), createClouds(ctx, scene, track), createGates(ctx, scene, track), createDark(ctx, scene, track), createTide(ctx, scene, track)].filter(Boolean);
  return {
    parts,
    update(dt, input) { for (const p of parts) p.update(dt, input); },
    render(alpha, t) { for (const p of parts) p.render(alpha, t); },
    reset() { for (const p of parts) p.reset?.(); },
    dispose() { for (const p of parts) p.dispose?.(); },
  };
}
