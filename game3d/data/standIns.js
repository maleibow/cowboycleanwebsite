// Stages 2-10 are not built yet. Until their prompts land they play on stage 1's theme and track, but with their own
// name, tagline and enemy roster (PLAN section 6; tiers 1 -> 2 -> 3 on each act) so the whole loop can be tested.
const R = (a, b, c) => [a, b, c];
export const STAND_INS = {
  9:  { name: 'Haunted Village',  tagline: 'The dead stay dirty. Not on your watch.',             roster: R(['zombie'], ['ghost'], ['bat', 'spider']), boss: 'HOLLOW GHOST' },
  10: { name: 'Charcoal Streets', tagline: 'Ruby water runs through the ash. End it here.',       roster: R(['ghost', 'shadow_bat', 'ruby_slime'], ['ember', 'zombie'], ['storm_cloud']), boss: 'VACANT SAVIOR' },
};
export function standIn(base, n) {
  const d = STAND_INS[n] || { name: `Stage ${n}`, tagline: '', roster: base.roster, boss: base.boss.name };
  return { ...base, id: n, name: d.name, tagline: d.tagline, roster: d.roster, boss: { ...base.boss, name: d.boss }, standIn: true };
}
