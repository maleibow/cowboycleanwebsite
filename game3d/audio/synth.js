// Tiny WebAudio synth engine: oscillators + filtered noise into ONE master gain (-> compressor -> speakers). No audio files.
// The AudioContext is created on the first key press or tap (browsers keep it suspended until then, and a context built
// earlier logs a console warning). Voices are capped, so rapid fire never stacks into crackle.
export function createSynth({ maxVoices = 14, volume = 0.8 } = {}) {
  let masterVol = 1, ac = null, master = null, music = null, noiseBuf = null, muted = false, sfxVol = 1, musicVol = 1, musicOn = true;
  const ends = [];                                    // audio-clock end time of every sound still playing
  const api = {
    get ready() { return !!ac && ac.state === 'running'; },
    get muted() { return muted; },
    get voices() { const t = ac ? ac.currentTime : 0; return ends.filter((e) => e > t).length; },
    get now() { return ac ? ac.currentTime : 0; },
    // The music bus (a second gain beside the SFX master, into the same compressor): the saloon jingle, game-mix files and
    // synth music all play through it, so the Jukebox's music volume / Spotify mode governs every one of them.
    get ctx() { return ac; }, get musicBus() { return music; },
    // Create / resume the context. Call from a user gesture. Returns true once audio can play.
    unlock() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        ac = new AC();
        const comp = ac.createDynamicsCompressor(); master = ac.createGain(); music = ac.createGain();
        master.connect(comp); music.connect(comp); comp.connect(ac.destination); api.applyGains(true);
        noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.5), ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state !== 'running' && ac.state !== 'closed') ac.resume().catch(() => {});   // 'suspended' (autoplay policy) or iOS 'interrupted' (call, lock screen)
      return ac.state !== 'closed';
    },
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); },   // tab hidden: stop the audio clock
    setMuted(m) { muted = !!m; api.applyGains(); },
    setMaster(v) { masterVol = Math.min(1, Math.max(0, v)); api.applyGains(); },   // the Settings screen's master volume: scales SFX and music together
    // Jukebox volumes (0..1): SFX level, music level, and whether music is audible at all (false in Spotify mode).
    setLevels({ sfx = sfxVol, music: m = musicVol, musicAudible = musicOn }) { sfxVol = sfx; musicVol = m; musicOn = musicAudible; api.applyGains(); },
    applyGains(now = false) {
      if (!master) return; const t = ac.currentTime, set = (n, v) => (now ? (n.gain.value = v) : n.gain.setTargetAtTime(v, t, 0.03));
      set(master, muted ? 0 : volume * sfxVol * masterVol); set(music, muted || !musicOn ? 0 : musicVol * masterVol);
    },
    // Reserve a voice for `dur` seconds. Returns false when the cap is reached (priority sounds may exceed it a little).
    take(dur, prio = 0) {
      if (!api.ready || muted) return false;
      const t = ac.currentTime; for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= t) ends.splice(i, 1);
      if (ends.length >= maxVoices + prio * 4) return false;
      ends.push(t + dur); return true;
    },
    // One oscillator: f -> f2 (exponential glide) over dur, with a click-free attack and a decaying envelope.
    tone({ f, f2 = null, type = 'sine', dur = 0.15, vol = 0.1, at = 0, attack = 0.004, out = master }) {
      const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
    },
    // Filtered noise burst: the filter glides f -> f2 (a whoosh, a hiss, a crunch).
    noise({ dur = 0.2, vol = 0.1, at = 0, filter = 'lowpass', f = 1000, f2 = null, q = 1, attack = 0.004, out = master }) {
      const t0 = ac.currentTime + at, s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; b.type = filter; b.Q.value = q; b.frequency.setValueAtTime(f, t0); if (f2) b.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(b); b.connect(g); g.connect(out); s.start(t0, Math.random() * 0.3, dur + 0.02);
    },
  };
  return api;
}
