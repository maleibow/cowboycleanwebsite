// Lucky 7 Casino: symbols, colours, cost and prizes as in the original (cleaningup.html 2519-2657).
export const CASINO = {
  cost: 10, winChance: 0.25,          // ~25% of pulls are forced jackpots
  symbols: ['COIN', 'HEALTH', 'SUPER', 'SPREAD', '4-WAY', 'HOMING', 'BOMB', 'SPIN'],
  colors: ['#f1c40f', '#2ecc71', '#e74c3c', '#3498db', '#e67e22', '#9b59b6', '#27ae60', '#f1c40f'],
  stopAt: [1.0, 1.5, 2.0],            // seconds until each reel is allowed to stop
  prizeSeconds: 1000 / 60,            // original: +1000 frames of the powerup timer
  coinPrize: 100,
};
// Which weapon timer / effect each symbol grants. BOMB = the grenade powerup (original: grenadeTimer).
export const PRIZE = { COIN: 'coins', HEALTH: 'health', SUPER: 'super', SPREAD: 'spread', '4-WAY': 'fourway', HOMING: 'homing', BOMB: 'grenade', SPIN: 'spin' };
// Decide a pull: returns the three stop indices (pass any rng for tests).
export function rollReels(rand = Math.random) {
  const n = CASINO.symbols.length, pick = () => Math.floor(rand() * n);
  if (rand() < CASINO.winChance) { const w = pick(); return [w, w, w]; }
  const t = [pick(), pick(), pick()];
  if (t[0] === t[1] && t[1] === t[2]) t[2] = (t[2] + 1) % n;
  return t;
}
export const isJackpot = (t) => t[0] === t[1] && t[1] === t[2];
// Apply a won symbol to the run / weapon. Returns a short label for the HUD.
export function applyPrize(sym, run, weapon) {
  const what = PRIZE[sym];
  if (what === 'coins') run.coins += CASINO.coinPrize;
  else if (what === 'health') run.health = 100;
  else if (weapon) weapon.timers[what] += CASINO.prizeSeconds;
  return sym;
}
