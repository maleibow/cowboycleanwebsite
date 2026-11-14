// Saloon jingle (store music): the original `SaloonMusic` (cleaningup.html 1476-1507), note for note.
// 16 lead notes (Hz) and a 4-note bass, one step every 220 ms. The lead is a 0.15 s square at 0.05 volume, the bass a
// 0.2 s triangle at 0.08. Both loop independently (the bass wraps every 4 steps) until stopped.
export const STEP = 0.22;                           // seconds per step (original: setTimeout 220)
export const SALOON_TUNE = [392.0, 329.63, 261.63, 329.63, 392.0, 329.63, 261.63, 261.63, 392.0, 329.63, 261.63, 329.63, 440.0, 392.0, 349.23, 329.63];
export const BASS = [130.81, 196.0, 130.81, 196.0];
