// Stages 2-10 are not built yet. Until their prompts land they play on stage 1's theme and track, but with their own
// name, tagline and enemy roster (PLAN section 6; tiers 1 -> 2 -> 3 on each act) so the whole loop can be tested.
const R = (a, b, c) => [a, b, c];
export const STAND_INS = {
  2:  { name: 'Toxic Jungle',     tagline: 'The jungle is oozing. Hose it down.',                roster: R(['slime', 'bloom'], ['bat'], ['frog', 'sludge', 'centipede']), boss: 'BIG SLUDGE' },
  3:  { name: 'Neo-Scrap City',   tagline: 'A city made of trash needs a very big mop.',          roster: R(['smog', 'slag'], ['drone'], ['rat', 'trash', 'roach']), boss: 'TRASH KING' },
  4:  { name: 'New York City',    tagline: 'The city that never sleeps is also never clean.',     roster: R(['pizza', 'rat'], ['pigeon'], ['police']), boss: 'PIZZA RAT' },
  5:  { name: 'Paris Nights',     tagline: 'The city of lights, in need of a polish.',            roster: R(['mime'], ['gargoyle'], ['bat']), boss: 'THE MIME' },
  6:  { name: 'Volcano Peak',     tagline: 'Hot, black and filthy. Bring the bleach.',            roster: R(['magma'], ['ember'], ['slag']), boss: 'MAGMA MAW' },
  7:  { name: 'Rainbow Island',   tagline: 'Pretty colours, real mud.',                           roster: R(['paint_blob'], ['mud_cloud'], ['frog']), boss: 'DOUBLE RAINBOW' },
  8:  { name: 'Cloud Dream',      tagline: 'Soft, fluffy and secretly grimy.',                    roster: R(['storm_cloud'], ['bat'], ['pigeon']), boss: 'THE EYE' },
  9:  { name: 'Haunted Village',  tagline: 'The dead stay dirty. Not on your watch.',             roster: R(['zombie'], ['ghost'], ['bat', 'spider']), boss: 'HOLLOW GHOST' },
  10: { name: 'Charcoal Streets', tagline: 'Ruby water runs through the ash. End it here.',       roster: R(['ghost', 'shadow_bat', 'ruby_slime'], ['ember', 'zombie'], ['storm_cloud']), boss: 'VACANT SAVIOR' },
};
export function standIn(base, n) {
  const d = STAND_INS[n] || { name: `Stage ${n}`, tagline: '', roster: base.roster, boss: base.boss.name };
  return { ...base, id: n, name: d.name, tagline: d.tagline, roster: d.roster, boss: { ...base.boss, name: d.boss }, standIn: true };
}
