import * as THREE from 'three';
import { setStageLook } from '../render/materials.js';

// Shared set-up for the small indoor scenes (cutscene busts, saloon, casino): a Scene + Camera + lights, plus the
// colour look / grade that must be (re)applied whenever the scene becomes the visible one, because both are global.
export function createRoom({ bg = '#140a1c', fog = null, hemi = ['#ffe6c8', '#5a3a2a', 1.4], look = {}, grade = {}, fov = 45 } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog.color || bg, fog.near, fog.far);
  scene.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 200);
  const room = {
    scene, camera, time: 0,
    // Call when this room is about to be shown.
    enter(gfx) {
      setStageLook({ shadowTint: '#8a6a8a', rimColor: '#ffd9a0', rimStrength: 0.5, sunLuma: 0.8, ...look });
      gfx?.post.setStage({ lift: [0.02, 0, 0.03], gamma: [1, 1, 1], gain: [1.05, 1, 0.95], sat: 1.1, vignette: 0.55, grain: 0.03, ...grade });
      room.time = 0; camera.aspect = gfx ? gfx.width / gfx.height : 16 / 9; camera.updateProjectionMatrix();
    },
    resize(w, h) { if (camera.aspect !== w / h) { camera.aspect = w / h; camera.updateProjectionMatrix(); } },
  };
  return room;
}

// A canvas gradient texture, for backdrops.
export function gradientTexture(stops, w = 4, h = 256) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, h);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
