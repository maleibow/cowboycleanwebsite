import { createBossFx } from '../actors/bosses/bossKit.js';
import { events } from '../core/events.js';

// Stage 6 rockfall. Inside a `rocks` zone ({ s0, s1 } on a segment) boulders fall from the ash cloud onto the path ahead of the player. Every rock is announced by a circle on
// the floor for its whole fall (ROCKS.delay s, the same marker + strike machinery the bosses use, actors/bosses/bossKit.js), so stepping out of the circle always works.
// One rock lands near the player's lane, the next a lane away. Damage is dealt only to someone standing in the circle when the rock lands.
export const ROCKS = { period: 1.15, delay: 1.35, radius: 1.55, damage: 15, ahead: [4, 9], window: 6 };

export function createRocks(ctx, scene, track) {
  const zones = track.segments.flatMap((g) => (g.rocks || []).map((z) => ({ ...z, seg: g })));
  if (!zones.length) return null;
  const fx = createBossFx(scene, track, ctx), P = ctx.player, b = P.body, api = { zones, fx, dropped: 0, landed: 0 };
  const half = (zones[0].seg.width || 8) / 2;
  let t = 0, flip = 1;
  const off = events.on('strikeLand', (k) => { if (k === 'rock') api.landed++; });

  api.update = (dt) => {
    const z = zones.find((q) => b.s > q.s0 - 3 && b.s < q.s1 - 2);
    if (z) {
      t -= dt;
      if (t <= 0) {
        t = ROCKS.period; flip = -flip;
        const s = b.s + ROCKS.ahead[0] + Math.random() * (ROCKS.ahead[1] - ROCKS.ahead[0]), x = Math.max(-half + 1, Math.min(half - 1, b.x * 0.5 + flip * (1.2 + Math.random() * 2.2)));
        if (s < z.s1 - 1) { fx.strike(s, x, ROCKS.radius, ROCKS.delay, { damage: ROCKS.damage, color: 0xff7a2a, size: 0.75, height: 18, splash: 'rock' }); api.dropped++; }
      }
    } else t = 0.8;
    fx.update(dt, P, ctx.combat);
  };
  api.render = (alpha, tt) => fx.render(tt);
  api.reset = () => { fx.clear(); t = 0.8; };
  api.dispose = () => { off?.(); fx.dispose(); };
  return api;
}
