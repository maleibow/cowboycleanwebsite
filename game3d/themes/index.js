import { stage01 } from './stage01.js';
import { stage02 } from './stage02.js';
// Theme registry: data/stages.js names a theme by key. Stages without a theme of their own fall back to stage 1's.
export const THEMES = { stage01, stage02 };
export const getTheme = (key) => THEMES[key] || stage01;
