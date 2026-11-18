// The Jukebox track list (PLAN 8.3): 13 slots = title, stage1..stage10, boss, saloon.
//
// ===== OWNER: FILL THESE IN =====================================================================================
// For each slot:
//   title       the track's name (shown on the stage intro card, the HUD chip and the results list)
//   spotifyUrl  the track's Spotify link, e.g. https://open.spotify.com/track/XXXXXXXXXXXXXXXXXXXXXX
//               (Spotify: track "..." menu > Share > Copy Song Link). Leave '' until you have it: the Spotify
//               embed then shows your artist page instead, and the "Listen on Spotify" button opens it too.
//   file        path of the audio file, relative to game3d/. Just drop the MP3 / OGG at that path: no code change.
//               If the file is missing the slot plays synth music. Change the name here if yours differs.
//   bpm         the track's tempo. Used by the synth fallback only (the beat pulse is read from the audio itself).
// Every value marked PLACEHOLDER below is a stand-in for you to replace.
// ================================================================================================================
export const ARTIST = 'Cowboy Clean';
export const ARTIST_URL = 'https://open.spotify.com/artist/6uiAnXipuNymu9Bd9ZYLN0';   // the Follow button

const PLACEHOLDER = 'Track title to be announced';   // PLACEHOLDER

const slot = (key, file, bpm, title = PLACEHOLDER) => ({ key, title, spotifyUrl: '', file: 'music/' + file, bpm });

export const MUSIC = {
  title:   slot('title', 'title.mp3', 100),
  stage1:  slot('stage1', 'stage01.mp3', 100),       // Desert Scrub
  stage2:  slot('stage2', 'stage02.mp3', 110, 'Grendel'),       // Toxic Jungle
  stage3:  slot('stage3', 'stage03.mp3', 120, 'Speed Up'),       // Neo-Scrap City
  stage4:  slot('stage4', 'stage04.mp3', 112, 'Leaning on the Exit'),       // New York City
  stage5:  slot('stage5', 'stage05.mp3', 96, 'End Game'),        // Paris Nights
  stage6:  slot('stage6', 'stage06.mp3', 130, 'Shelter'),       // Volcano Peak
  stage7:  slot('stage7', 'stage07.mp3', 120, 'Charcoal'),       // Rainbow Island
  stage8:  slot('stage8', 'stage08.mp3', 80, 'Coins Live'),        // Cloud Dream
  stage9:  slot('stage9', 'stage09.mp3', 72, 'Charcoal Live'),        // Haunted Village
  stage10: slot('stage10', 'stage10.mp3', 108, 'Charcoal'),   // Charcoal Streets: the original embeds "Charcoal" here (spotifyUrl still needed)
  boss:    slot('boss', 'boss.mp3', 150),
  saloon:  slot('saloon', 'saloon.mp3', 82),         // no file = the original saloon jingle (audio/saloon.js)
};
export const SLOT_KEYS = Object.keys(MUSIC);
export const slotFor = (stage) => MUSIC['stage' + stage] || MUSIC.stage1;

// Parse a Spotify link into { type, id, uri, embed, open }. Returns null for '' / anything that is not a Spotify link.
export function parseSpotify(url) {
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/.exec(url || '');
  return m ? { type: m[1], id: m[2], uri: `spotify:${m[1]}:${m[2]}`, embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`, open: url } : null;
}
// What Spotify should show for a slot: its own track, else the artist page.
export const spotifyFor = (s) => parseSpotify(s?.spotifyUrl) || parseSpotify(ARTIST_URL);
export const listenUrl = (s) => (parseSpotify(s?.spotifyUrl) ? s.spotifyUrl : ARTIST_URL);
