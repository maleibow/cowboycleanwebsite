// Secret codes, exactly as the original (cleaningup.html 2125-2148): SKIPTO1-9, HORSE / MECHAHORSE, CHARCOAL.
// Returns what to do ({ stage, vehicle }) or null for an invalid code. Every cheat starts a fresh run (score 0,
// coins 0, no upgrades); HORSE then grants the Mecha-Horse on stage 1, CHARCOAL starts on stage 10.
export function parseCheat(raw) {
  const code = String(raw || '').toUpperCase().trim();
  if (!code) return undefined;                     // empty input: ignored, no error (original)
  const m = code.match(/^SKIPTO([1-9])$/);
  if (m) return { stage: parseInt(m[1], 10), vehicle: false };
  if (code === 'HORSE' || code === 'MECHAHORSE') return { stage: 1, vehicle: true };
  if (code === 'CHARCOAL') return { stage: 10, vehicle: false };
  return null;
}
