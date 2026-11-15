import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createPost } from './post.js';
import { events } from '../core/events.js';

// WebGLRenderer + bloom composer. `box` is the 16:9 element whose size we track.
export function createRenderer(canvas, box, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // applied by the final grade pass (render/post.js)
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false; // we reset once per frame so composer passes sum up
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 1.05); // threshold >1 = only HDR emissives glow
  composer.addPass(renderPass); composer.addPass(bloom);
  const post = createPost(composer, quality);        // grade + vignette + grain + tone mapping + sRGB in ONE final pass (render/post.js)

  const api = { renderer, composer, bloom, renderPass, post, width: 0, height: 0, pixelRatio: 1, lost: false };
  // WebGL context loss (a phone backgrounding the tab, a GPU reset): stop drawing, tell the game (it pauses and shows a notice),
  // and carry on when the context returns. three.js rebuilds its GPU state itself; geometry, textures and targets re-upload lazily.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); api.lost = true; events.emit('glLost'); });
  canvas.addEventListener('webglcontextrestored', () => { api.lost = false; api.resize(true); events.emit('glRestored'); });

  api.applyQuality = () => {
    const t = quality.tier;
    renderer.shadowMap.enabled = t.shadowMap > 0;
    bloom.enabled = t.bloom > 0;
    post.applyTier();
    api.resize(true);
  };

  api.resize = (force) => {
    const w = Math.max(1, Math.floor(box.clientWidth));
    const h = Math.max(1, Math.floor(box.clientHeight));
    const pr = Math.min(window.devicePixelRatio || 1, quality.tier.pixelCap) * quality.scale;
    if (!force && w === api.width && h === api.height && Math.abs(pr - api.pixelRatio) < 1e-3) return;
    api.width = w; api.height = h; api.pixelRatio = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false); // CSS size is handled by the stylesheet
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    const bs = quality.tier.bloomScale;
    bloom.resolution.set(Math.max(1, w * pr * bs), Math.max(1, h * pr * bs));
    bloom.setSize(w * pr * bs, h * pr * bs);
    api.camera && (api.camera.aspect = w / h, api.camera.updateProjectionMatrix());
  };

  api.render = (scene, camera) => {
    api.camera = camera;
    if (api.lost) return;
    renderPass.scene = scene; renderPass.camera = camera;
    renderer.info.reset();
    composer.render();
  };

  new ResizeObserver(() => api.resize()).observe(box);
  window.addEventListener('resize', () => api.resize());
  quality.onChange = (effectsChanged) => (effectsChanged ? api.applyQuality() : api.resize(true));   // scale step: just resize; an effect shed / restored or a tier change: re-apply bloom / post
  api.applyQuality();
  return api;
}
