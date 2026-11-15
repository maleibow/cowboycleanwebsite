import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One silhouette per power-up, so no pickup is told apart by colour alone (colour-blind safe, Settings > Pickup shapes).
// All are centred on the origin, about 1 unit across, and cheap (< 100 triangles). Drawn unlit, so the outline is what reads.
const at = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g; };
const merge = (list) => { const g = mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))); list.forEach((q) => q.dispose()); return g; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export function powerShapes() {
  return {
    health: merge([box(0.95, 0.34, 0.34), box(0.34, 0.95, 0.34), box(0.34, 0.34, 0.34)]),                                        // a plus
    super: merge([new THREE.OctahedronGeometry(0.55, 0), at(new THREE.OctahedronGeometry(0.55, 0), 0, 0, 0, 0, Math.PI / 4, Math.PI / 4)]), // an eight-point star
    spread: merge([-0.6, 0, 0.6].map((a) => at(new THREE.ConeGeometry(0.2, 0.85, 5), Math.sin(a) * -0.35, 0.02, 0, 0, 0, a))),       // three rays fanned out
    shield: at(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 6), 0, 0, 0, Math.PI / 2),                                              // a hexagon plate
    fourway: merge([[0.34, 0], [-0.34, 0], [0, 0.34], [0, -0.34]].map(([x, y]) => at(new THREE.IcosahedronGeometry(0.2, 0), x, y))), // four beads
    homing: new THREE.TorusGeometry(0.36, 0.12, 6, 12),                                                                           // a ring
    grenade: new THREE.CylinderGeometry(0.3, 0.3, 0.85, 8),                                                                       // a can
    spin: at(new THREE.OctahedronGeometry(0.5, 0), 0, 0, 0, 0, 0, 0).scale(0.62, 1.05, 0.62),                                     // a tall diamond
    bomb_refill: box(0.72, 0.72, 0.72),                                                                                           // a block
  };
}
