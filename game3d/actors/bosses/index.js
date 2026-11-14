import { spawnBoss01 } from './boss01.js';
// Boss registry: data/stages.js names a boss id; the arena asks here for its spawn function.
// A spawn function takes (ctx, arena, stageBoss) and returns the controller (see boss01.js for the contract).
export const BOSS_FACTORIES = { boss1: spawnBoss01 };
