// Lets Node resolve the browser import map ("three") to the vendored copy, for offline layout/track tests.
// Usage: node --import ./tools/three-loader.mjs script.mjs
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
  const url = new URL('../game3d/vendor/three.module.min.js', ${JSON.stringify(import.meta.url)}).href;
  export async function resolve(spec, ctx, next) { return spec === 'three' ? { url, shortCircuit: true } : next(spec, ctx); }
`));
