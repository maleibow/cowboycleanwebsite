import { stage01 } from './stage01.js';
import { stage02 } from './stage02.js';
import { stage03 } from './stage03.js';
import { stage04 } from './stage04.js';
import { stage05 } from './stage05.js';
import { stage06 } from './stage06.js';
import { stage07 } from './stage07.js';
import { stage08 } from './stage08.js';
import { stage09 } from './stage09.js';
// Theme registry: data/stages.js names a theme by key. Stages without a theme of their own fall back to stage 1's.
export const THEMES = { stage01, stage02, stage03, stage04, stage05, stage06, stage07, stage08, stage09 };
export const getTheme = (key) => THEMES[key] || stage01;
