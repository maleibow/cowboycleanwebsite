import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// WebGLRenderer + bloom composer. `box` is the 16:9 element whose size we track.
export function createRenderer(canvas, box, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // applied by OutputPass when composing
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false; // we reset once per frame so composer passes sum up
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.6, 0.85);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);

  const api = { renderer, composer, bloom, renderPass, width: 0, height: 0, pixelRatio: 1 };

  api.applyQuality = () => {
    const t = quality.tier;
    renderer.shadowMap.enabled = t.shadowMap > 0;
    bloom.enabled = t.bloom > 0;
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
    renderPass.scene = scene; renderPass.camera = camera;
    renderer.info.reset();
    composer.render();
  };

  new ResizeObserver(() => api.resize()).observe(box);
  window.addEventListener('resize', () => api.resize());
  quality.onChange = () => api.resize(true);
  api.applyQuality();
  return api;
}
