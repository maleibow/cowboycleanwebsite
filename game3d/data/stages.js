// PLACEHOLDER stage data. The real Stage Bible (PLAN section 6) replaces this in the
// Stage 1 vertical-slice prompt; the generator only relies on the fields below.
export const POWERUP_TYPES = ['health', 'super', 'spread', 'shield', 'fourway', 'homing', 'grenade', 'spin', 'bomb_refill'];

const STAGE1 = {
  id: 1, name: 'Desert Scrub',
  length: 1100,                 // metres of track, ~2 minutes at run speed
  trackWidth: 8,
  obstacle: 'sand_pile',        // rolling obstacle (spawned by later prompts)
  roster: [['dirt'], ['ice', 'vulture'], ['rabbit', 'dirty_ice', 'spider']], // enemies by act (tier 1/2/3)
  density: [0.6, 0.85, 1],      // share of a template's enemy slots kept per act
  act3Special: 'chase',         // 'chase' | 'hard' | 'either'
  weights: [                    // template weights per act
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 2, gap: 3, doubleGap: 2, steps: 2, beam: 1.5, barrier: 2 },
    { flat: 1, curve: 2, climb: 1, drop: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3 },
  ],
  palette: { ground: 0xc9a066, platform: 0xe0b872, ledge: 0xb88a4e, beam: 0x9a6b43, barrier: 0xd94a3d, wall: 0x6b5b7a },
};

export function getStage(n) {
  return n === 1 ? STAGE1 : { ...STAGE1, id: n, name: `Stage ${n} (placeholder)` };
}
