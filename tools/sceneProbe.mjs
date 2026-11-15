// Where do the triangles and draw calls go? node tools/sceneProbe.mjs [--stages=1,7] [--quality=low]
// For each stage and a few positions along it, lists the heaviest draw groups (name prefix) by triangles and calls, so the next
// thing to merge / instance / thin out is obvious. Counts what three.js would actually draw: visible, in-frustum, instances included.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const STAGES = arg('stages', '1,7').split(',').map(Number), QUALITY = arg('quality', 'low'), AT = arg('at', '0.12,0.78').split(',').map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const N of STAGES) {
  const pg = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=${N}&seed=1&god=1&intro=0&quality=${QUALITY}&dynres=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready && window.__game.world, null, { timeout: 90000 });
  await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  for (const f of AT) {
    const r = await pg.evaluate(async (f) => {
      const THREE = await import('three'), g = window.__game, W = g.world, cam = W.camera, fr = new THREE.Frustum(), m = new THREE.Matrix4(), sph = new THREE.Sphere();
      W.player.teleport(W.track.gateS * f); window.__bot.step(120, window.__bot.make()); W.render(0.5); g.gfx.render(W.scene, cam);
      cam.updateMatrixWorld(); m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(m);
      const groups = new Map(); let tris = 0, calls = 0;
      W.scene.traverseVisible((o) => {
        if (!(o.isMesh || o.isInstancedMesh) || !o.geometry) return; const geo = o.geometry;
        if (o.isInstancedMesh && o.count === 0) return;
        if (o.frustumCulled !== false) { if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); sph.copy(o.boundingSphere).applyMatrix4(o.matrixWorld); } else { if (!geo.boundingSphere) geo.computeBoundingSphere(); sph.copy(geo.boundingSphere).applyMatrix4(o.matrixWorld); } if (!fr.intersectsSphere(sph)) return; }
        const per = (geo.index ? geo.index.count : geo.attributes.position.count) / 3, n = o.isInstancedMesh ? o.count : 1, t = per * n * (geo.instanceCount !== undefined && geo.isInstancedBufferGeometry ? geo.instanceCount : 1);
        let nm = o.name, q = o; while (!nm && q.parent) { q = q.parent; nm = q.name; } const key = ((nm || o.type) + (o.name ? '' : ' (' + (o.isInstancedMesh ? 'inst ' : '') + (geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3) + 't)')).replace(/chunk\d+/g, 'chunk').split(':').slice(0, 2).join(':'); const e = groups.get(key) || { tris: 0, calls: 0, inst: 0 };
        e.tris += t; e.calls++; e.inst += n; groups.set(key, e); tris += t; calls++;
      });
      const top = [...groups.entries()].sort((a, b) => b[1].tris - a[1].tris).slice(0, 14).map(([k, v]) => `${k.padEnd(26)} ${String(Math.round(v.tris)).padStart(7)} tris ${String(v.calls).padStart(3)} calls ${String(v.inst).padStart(5)} inst`);
      return { tris: Math.round(tris), calls, info: { calls: g.gfx.renderer.info.render.calls, tris: g.gfx.renderer.info.render.triangles }, top };
    }, f);
    console.log(`stage ${N} @${f}: counted ${r.tris} tris / ${r.calls} meshes; renderer.info ${r.info.tris} tris / ${r.info.calls} calls\n   ` + r.top.join('\n   '));
  }
  await pg.close();
}
await browser.close(); server.close();
