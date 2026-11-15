import { stage01 } from './stage01.js';
import { stage02 } from './stage02.js';
import { stage03 } from './stage03.js';
import { stage04 } from './stage04.js';
// Theme registry: data/stages.js names a theme by key. Stages without a theme of their own fall back to stage 1's.
export const THEMES = { stage01, stage02, stage03, stage04 };
export const getTheme = (key) => THEMES[key] || stage01;
