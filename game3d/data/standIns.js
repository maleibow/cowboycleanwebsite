// Every stage 1-10 is built now, so this table is empty. A stage number without data (an unbuilt stage, or a typo in ?stage=N) still plays on stage 1's theme and track under its own name
// (`standIn` below); add an entry here to give such a placeholder a name, tagline, roster and boss.
const R = (a, b, c) => [a, b, c];
export const STAND_INS = {
};
export function standIn(base, n) {
  const d = STAND_INS[n] || { name: `Stage ${n}`, tagline: '', roster: base.roster, boss: base.boss.name };
  return { ...base, id: n, name: d.name, tagline: d.tagline, roster: d.roster, boss: { ...base.boss, name: d.boss }, standIn: true };
}
