// Stage 1: Desert Scrub. Palette + look. Dusk desert: purple sky, red mesas, orange sand.
// (original drawBackground: sky #2c3e50 -> #e67e22, sun #f1c40f, hills #4a235a / #c0392b / #d35400, floor #e67e22)
export const stage01 = {
  id: 1, name: 'Desert Scrub',
  sky: { top: '#2a1f66', mid: '#b24a7e', horizon: '#ff9a52', sunColor: '#ffc46a', sunDir: [-0.38, 0.17, -1], sunSize: 0.07, sunGlow: 0.55,
         sunBoost: 2.4, stars: 0.55, cloudColor: '#ffb394', cloudShade: '#7a4170', cloudAmount: 0.5, cloudSpeed: 0.01 },
  fog: { color: '#e99a78', near: 28, far: 175 },
  light: { hemiSky: '#e4d4f6', hemiGround: '#e0a07c', hemiIntensity: 2.5, sun: '#ffd09a', sunIntensity: 1.8, sunOffset: [-13, 19, 9] },
  look: { shadowTint: '#c79be6', rimColor: '#ffb070', rimStrength: 0.6, sunLuma: 0.6, grimeTint: '#6f7068' },
  // lift / gamma / gain per stage: warm highlights, violet shadows (original GRADE: rgba(255,140,40,.10))
  grade: { lift: [0.035, 0.0, 0.06], gamma: [1.0, 0.97, 0.93], gain: [1.08, 1.0, 0.9], sat: 1.14, vignette: 0.5, grain: 0.03 },
  ambient: { preset: 'mote', rate: 6 },
  colors: {
    sandLight: 0xe9bd88, sand: 0xe08a46, sandDark: 0xb04e38, rut: 0xc88a60, kerb: 0x8c4638, redRock: 0xc0452d, redRockLit: 0xe0643c,
    strata: [0xc0452d, 0xd9743c, 0x9a3a2e, 0xe59a56], purple: 0x5a3178, purpleFar: 0x7a4690, cactus: 0x58cc7a, cactusLight: 0xb4f59a,
    wood: 0x8a5a33, woodDark: 0x5c3a20, bush: 0xc9a24a,
  },
};
