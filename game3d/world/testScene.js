import * as THREE from 'three';

// Lit placeholder scene: ground, boxes, orbiting camera. Replaced by the real world later.
export function createTestScene(quality) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc3e8);
  scene.fog = new THREE.Fog(0x8fc3e8, 30, 120);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7a5a3a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1d0, 2.6);
  sun.position.set(12, 20, 8);
  if (quality.tier.shadowMap) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.tier.shadowMap, quality.tier.shadowMap);
    const c = sun.shadow.camera; c.left = c.bottom = -25; c.right = c.top = 25; c.near = 1; c.far = 60;
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xc9a066, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const palette = [0xe8453c, 0x3c9be8, 0xf2c230, 0x4fc46a, 0xb05fe0];
  const boxes = [];
  for (let i = 0; i < 9; i++) {
    const s = 1 + (i % 3) * 0.6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s),
      new THREE.MeshStandardMaterial({ color: palette[i % 5], roughness: 0.6,
        emissive: i === 4 ? 0xffaa00 : 0x000000, emissiveIntensity: i === 4 ? 1.5 : 0 })); // feeds bloom
    const a = (i / 9) * Math.PI * 2, r = 5 + (i % 3) * 2.5;
    m.position.set(Math.cos(a) * r, s / 2, Math.sin(a) * r);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    boxes.push({ mesh: m, spin: 0.4 + i * 0.07, rot: 0, prevRot: 0 });
  }

  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const cam = { angle: 0, prev: 0 };
  const t = { time: 0 };

  return {
    scene, camera, boxes,
    update(dt) { // fixed step: store previous state, advance current
      t.time += dt;
      cam.prev = cam.angle; cam.angle += dt * 0.25;
      for (const b of boxes) { b.prevRot = b.rot; b.rot += dt * b.spin; }
    },
    render(alpha) { // interpolate between previous and current step
      const a = cam.prev + (cam.angle - cam.prev) * alpha;
      camera.position.set(Math.cos(a) * 16, 7 + Math.sin(a * 2), Math.sin(a) * 16);
      camera.lookAt(0, 1, 0);
      for (const b of boxes) b.mesh.rotation.y = b.prevRot + (b.rot - b.prevRot) * alpha;
    },
    get time() { return t.time; },
  };
}
