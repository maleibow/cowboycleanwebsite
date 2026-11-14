import { CASINO, rollReels, isJackpot } from '../data/casino.js';

// Slot machine state, independent of rendering. Reel positions are in symbols (a float); symbol i faces the player when pos % 8 == i.
// Same rules as the original: 10c a pull, reels spin at 15 / 20 / 30 symbols per second and stop after 1 / 1.5 / 2 s,
// ~25% of pulls are a forced jackpot, and a non-winning roll never lands three of a kind.
export function createSlot(rand = Math.random) {
  const n = CASINO.symbols.length, k = { state: 'IDLE', pos: [0, 0, 0], speed: [0, 0, 0], target: [0, 0, 0], stopping: [false, false, false], t: 0, result: null, justStopped: -1 };
  k.reset = () => { k.state = 'IDLE'; k.pos = [0, 0, 0]; k.speed = [0, 0, 0]; k.stopping = [false, false, false]; k.t = 0; k.result = null; };
  // Returns false when the player cannot pay (original: "NOT ENOUGH COINS!").
  k.pull = (run) => {
    if (k.state !== 'IDLE' && k.state !== 'DONE') return false;
    if (run.coins < CASINO.cost) return 'broke';
    run.coins -= CASINO.cost;
    k.state = 'SPINNING'; k.t = 0; k.result = null; k.speed = [15, 20, 30]; k.stopping = [false, false, false]; k.target = rollReels(rand);
    return true;
  };
  // Advances the reels; returns the winning symbol name when the last reel stops on a jackpot, '' for a miss, null otherwise.
  k.update = (dt) => {
    k.justStopped = -1; if (k.state !== 'SPINNING') return null;
    k.t += dt; let out = null;
    for (let i = 0; i < 3; i++) {
      if (k.speed[i] <= 0) continue;
      if (k.t >= CASINO.stopAt[i]) k.stopping[i] = true;
      const before = k.pos[i]; let after = before + k.speed[i] * dt;
      if (k.stopping[i]) { // snap to the target the first time the reel passes it
        const base = Math.floor(before / n) * n, tgt = [base + k.target[i], base + n + k.target[i]].find((v) => v >= before - 1e-9 && v <= after + 1e-9);
        if (tgt !== undefined) { after = tgt; k.speed[i] = 0; k.justStopped = i; }
      }
      k.pos[i] = after;
      if (k.speed[i] === 0 && i === 2) { k.state = 'DONE'; k.result = isJackpot(k.target) ? CASINO.symbols[k.target[0]] : ''; out = k.result; }
    }
    return out;
  };
  return k;
}
