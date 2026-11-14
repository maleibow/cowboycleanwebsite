// Saloon jingle (store music). PLACEHOLDER tune: the original `SaloonMusic` notes (cleaningup.html 1476-1507) were
// outside the line ranges this session was allowed to read, so a simple ragtime loop stands in. To use the original,
// replace `SALOON_TUNE` with its notes (frequency in Hz, 0 = rest) and `STEP` with its note length. Nothing else changes.
export const STEP = 0.16;                           // seconds per step
export const SALOON_TUNE = [
  // C  E  G  E | A  C5 A  F  | D  F  A  F | G  B  D5 B | repeated with a turn at the end
  262, 330, 392, 330, 440, 523, 440, 349, 294, 349, 440, 349, 392, 494, 587, 494,
  262, 392, 330, 392, 349, 440, 349, 440, 392, 494, 392, 330, 262, 0, 392, 0,
];
export const BASS = [131, 0, 196, 0, 175, 0, 220, 0, 147, 0, 220, 0, 196, 0, 247, 0, 131, 0, 196, 0, 175, 0, 220, 0, 196, 0, 165, 0, 131, 0, 98, 0];
