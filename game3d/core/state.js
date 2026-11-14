// Run state shared across game states. Plain data; reset with newRun().
export const run = {
  score: 0, stageStartScore: 0, coins: 0, bombs: 3, health: 100,
  stage: 1, stageLoop: 1,
  upgrades: { jump: 0, speed: 0, size: 0, lasso: false, laser: false, vehicle: false },
  cheats: { god: false },
};
export function newRun(stage = 1) {
  Object.assign(run, {
    score: 0, stageStartScore: 0, coins: 0, bombs: 3, health: 100, stage, stageLoop: 1,
    upgrades: { jump: 0, speed: 0, size: 0, lasso: false, laser: false, vehicle: false },
  });
  return run;
}
// Difficulty multipliers per PLAN 3.3.
export const loopHpMul = () => run.stageLoop;
export const loopSpeedMul = () => 1 + (run.stageLoop - 1) * 0.25;
