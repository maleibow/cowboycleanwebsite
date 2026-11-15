import { spawnBoss01 } from './boss01.js';
import { spawnBoss02 } from './boss02.js';
import { spawnBoss03 } from './boss03.js';
import { spawnBoss04 } from './boss04.js';
import { spawnBoss05 } from './boss05.js';
import { spawnBoss06 } from './boss06.js';
import { spawnBoss07 } from './boss07.js';
// Boss registry: data/stages.js names a boss id; the arena asks here for its spawn function.
// A spawn function takes (ctx, arena, stageBoss) and returns the controller (see boss01.js for the contract).
export const BOSS_FACTORIES = { boss1: spawnBoss01, boss2: spawnBoss02, boss3: spawnBoss03, boss4: spawnBoss04, boss5: spawnBoss05, boss6: spawnBoss06, boss7: spawnBoss07 };
