# Cowboy Clean: Ultimate World Tour — 3D Remake Plan

This is the design spec for rebuilding `cleaningup.html` (the 2D canvas game) as a 3D
corridor platformer-shooter. Coding sessions should read the sections their prompt names,
not the whole file. The prompts themselves are in `remake/PROMPTS.md`.

---

## 1. What we are building

A behind-the-camera 3D action platformer: Cowboy Clean runs **into the screen** down a
winding path, jumping gaps, sliding under hazards, smashing soap crates and spraying grime
monsters, then fights a boss in an arena at the end of each stage. Same 10 stages, same
enemies, bosses, story, store, casino, cheats and leaderboard as the original — re-staged
in depth.

Everything visual and every sound effect is generated in code at load time. The only
files fetched are the game's own JavaScript, the Three.js library (vendored in the repo),
and — optionally — the artist's music.

**Not in scope:** copying any existing game's characters, crates, masks, levels or music.
The corridor-platformer *genre* is the reference, nothing more specific.

### 1.1 How the original maps to 3D

| Original (2D) | Remake (3D) |
|---|---|
| Endless arena, enemies walk in from the sides | A ~2 minute procedurally built track per stage; enemies are placed along it and ambush from the sides, air and ground |
| Boss appears at +1500 score | Boss gate at the end of the track, fight in a round arena |
| Enemy roster unlocks by score within the stage | Roster unlocks by **act**: each track has 3 acts, later acts add the later enemy types |
| Rolling low obstacle per stage (sand pile, log, barrel…) | Same obstacle per stage, rolling down the path toward the player, plus static versions |
| Duck (Down) | Slide (dedicated key) — duck when standing, slide when moving |
| Spray gun with heat/overheat, bombs ×3 | Unchanged numbers; spray gets aim-assist |
| Powerups: health, super, spread, shield, fourway, homing, grenade, spin, bomb_refill | Unchanged; dropped by enemies and found in crates |
| Store upgrades: jump, speed, size, lasso, laser, vehicle (Mecha-Horse) | Unchanged prices and effects, shown in a 3D saloon |
| Casino warp (random portal, slot machine, 10c a pull) | A glowing side-door off the path, same slot machine |
| Cutscenes with portraits (intro, stage2…stage10, ending) | Same script verbatim, 3D character busts |
| Stage loop (after stage 10 → stage 1, harder) | Unchanged (`stageLoop` multiplies HP, speed) |
| Firebase leaderboard, prize email, cheat codes | Unchanged behaviour (see §9) |
| Bandcamp embed on stage 10 | Replaced by the Jukebox (§8) for every stage |

### 1.2 Where things are in the original file

`cleaningup.html` is 9,000 lines. **Never read it whole.** Use these ranges:

| Lines | Content |
|---|---|
| 1416–1475 | `Sound` — every SFX as oscillator recipes (port these) |
| 1476–1507 | `SaloonMusic` — store jingle notes |
| 1682–1694 | `stageNames` |
| 1707–1822 | `Story` — all cutscene dialogue (copy verbatim) |
| 2125–2150 | Cheat codes (`SKIPTO1`–`9`, `HORSE`/`MECHAHORSE`, `CHARCOAL`) |
| 2177–2236 | `startGame`, `initLevel` |
| 2238–2396 | Game over, prize claim, score submit |
| 2398–2545 | Stage transition, store purchases and prices |
| 2547–2762 | Casino slot machine |
| 2833–2931 | `drawPortrait` — what each speaker looks like |
| 2933–2937 | Physics constants |
| 3041–3108 | `Powerup` types and colours |
| 3110–3863 | `Player` — movement, heat, weapons, lasso, vehicle, drawing |
| 3865–4270 | `Projectile`, `EnemyProjectile` — weapon behaviours |
| 4272–4540 | `Enemy` constructor — HP, size, speed, altitude per type |
| 4541–5080 | Enemy and boss **behaviour** (boss patterns start ~4549) |
| 5082–6616 | Enemy and boss **appearance** (colours, shapes — use as the art brief) |
| 6618–7052 | `Obstacle` — per-stage obstacle appearance |
| 7093–7203 | `spawnManager` — roster per stage, spawn pacing, difficulty formula |
| 7224–7510 | `checkCollisions` — damage values, drop rates, scoring |
| 7679–8157 | `drawBackground` — per-stage scenery and palette (the art brief for each stage) |
| 8607–8900 | "Juice" layer: ambient particles, colour grade per stage, combo counter, trails |
| 8905–9012 | Firebase leaderboard module |

---

## 2. House rules for every coding session

1. **Stack:** plain ES modules, no build step, no framework, no npm runtime dependencies.
   Three.js is vendored at `game3d/vendor/` and loaded through an import map. The site is
   static GitHub Pages; the whole repo is published on every push to `main`.
2. **Work on the branch `remake-3d`.** Never edit `cleaningup.html` or `index.html`
   until the final integration prompt. Pushing to `main` deploys to the live site.
3. **No downloaded assets.** No image, model, font-file or audio-sample files. Geometry
   from code, textures from `CanvasTexture`/shaders, SFX from WebAudio oscillators and
   noise. The only exception is music under `game3d/music/` (§8). Google Fonts `Bangers`
   via CSS link is allowed (the original uses it).
4. **File size:** no module over ~400 lines. Split instead.
5. **Data over code:** stages, enemies, bosses and weapons are described by plain data
   objects in `game3d/data/`. Adding a stage should mean adding data and a theme file,
   not touching the engine.
6. **Fixed timestep:** simulation at 60 Hz (`dt = 1/60`), render interpolated. All
   gameplay numbers ported from the original are per-frame at 60 fps; convert once to
   per-second in the data files and note the original value in a comment.
7. **Pool everything that spawns often** (projectiles, particles, coins, floating text).
   No allocation in the per-frame path.
8. **Debug hooks:** `?stage=N` starts on a stage, `?debug=1` shows an FPS/draw-call
   panel and enables free-cam, `?seed=N` fixes the level seed, `?god=1` disables damage,
   `?boss=1` jumps to the boss gate. `window.__game` exposes state for tests.
9. **Verify before finishing:** run `node tools/smoke.mjs` (headless Chromium via
   Playwright: loads the page, plays for 10 s with scripted input, fails on any console
   error, saves a screenshot to `remake/shots/`). Look at the screenshot.
10. **Commit at the end of each prompt** with a short message. Report what was built,
    what was skipped, and anything that looks wrong.

---

## 3. Architecture

```
cleaningup3d.html            page shell: canvas, HUD/menus DOM, import map
game3d/
  vendor/                    three.module.min.js + the few addons used
  main.js                    boot, state machine, main loop
  core/
    loop.js                  fixed-step loop with interpolation
    input.js                 keyboard, gamepad, touch joystick + buttons → one `input` object
    rng.js                   seeded PRNG (mulberry32) + helpers
    pool.js                  generic object pool
    quality.js               quality tiers + dynamic resolution
    state.js                 run state: score, coins, bombs, upgrades, stage, loop
    events.js                tiny pub/sub
  render/
    renderer.js              WebGLRenderer, composer, bloom, colour grade, resize
    materials.js             toon material factory, outline, shared ramps
    textures.js              procedural CanvasTextures (noise, stripes, bricks, wood…)
    sky.js                   shader sky dome (gradient, sun/moon, stars, clouds)
    fluids.js                water / lava / acid / ruby-water shader plane
    particles.js             one GPU-instanced particle system
    camera.js                camera rig with modes (behind, side, toward, arena)
  world/
    track.js                 spline centreline, track-space ↔ world-space, ground mesh
    generator.js             builds a stage's segment list from seed + stage data
    segments.js              segment templates (flat, gap, steps, narrow, side-view, chase…)
    props.js                 instanced scenery scatter along the track
    arena.js                 boss arena
  actors/
    player.js                controller, weapons, heat, upgrades
    playerModel.js           procedural Cowboy Clean + animation
    enemy.js                 enemy base, archetype behaviours
    enemyModels.js           procedural models per enemy type
    bosses/boss01.js …       one file per boss
    projectiles.js           player + enemy projectiles
    pickups.js               coins, powerups, crates
    obstacles.js             rolling/static obstacles
  data/
    stages.js                the Stage Bible (§6) as data
    enemies.js               stats per type (§7)
    weapons.js  story.js  store.js  music.js
  themes/stage01.js …        per-stage scenery builders + palette
  ui/
    hud.js  menus.js  cutscene.js  store.js  casino.js  touch.js
  audio/
    sfx.js                   ported synth SFX
    jukebox.js               music manager (§8)
    synthMusic.js            procedural fallback music
  services/
    leaderboard.js           Firebase (ported as-is)
    prize.js
tools/smoke.mjs              headless smoke test
```

### 3.1 Track space (the key simplification)

All gameplay happens in **track space**: `s` = distance along the path, `x` = lateral
offset from the centre line, `y` = height. Collision is axis-aligned boxes in `(s, x, y)`.
A `track.toWorld(s, x, y)` function maps onto a smooth 3D spline, so the path can curve,
climb and dip visually while the game logic stays as simple as a straight corridor.

- Units are metres. Player is 1.8 tall, 0.8 wide. Track width 6–10 (narrow sections 3).
- Run speed 9 m/s (+1.5 per speed upgrade, +2 on Mecha-Horse), jump apex 2.6 m
  (+0.5 per jump upgrade), gravity −32 m/s². Coyote time 0.1 s, jump buffer 0.12 s,
  variable jump height. These replace `SPEED 7 / JUMP_FORCE −16 / GRAVITY 0.8`.
- The player moves freely in `x` and `s` (can back up); the camera only ever advances.

### 3.2 Camera modes

| Mode | Use |
|---|---|
| `behind` | Default. 7 m behind, 4 m up, looks 6 m ahead of the player. Slight lateral lag. |
| `side` | Homage sections: camera swings 90° to a side view and the path becomes a 2D run, like the original. |
| `toward` | Chase sections: player runs toward the camera with a hazard behind. |
| `arena` | Boss fights: raised, pulled back, keeps both player and boss in frame. |

Blend between modes over ~1 s. Add trauma-based screen shake and a small FOV kick on speed.

### 3.3 Stage generation

`generator.js` takes `(stageData, seed)` and emits a list of segments totalling ~1,100 m
(≈2 minutes at run speed), in three acts:

- **Act 1** (0–35%): tier-1 enemies only, gentle platforming, teaches the stage's hazard.
- **Act 2** (35–70%): adds tier-2 enemies, one `side` section, one casino door chance.
- **Act 3** (70–100%): adds tier-3 enemies, one `toward` chase or a hard platforming run,
  then the boss gate.

A checkpoint flag sits at each act boundary. Segment templates are shared across stages;
the theme decides how they look and which fluid fills the gaps. Rules: never two gap
segments in a row in Act 1; always a rest segment before the boss; every powerup type
must be obtainable at least once per stage. Seed = `stage * 1000 + stageLoop`, so a stage
is the same for everyone (fair leaderboard) but different on each loop.

Difficulty per loop follows the original: enemy HP × `stageLoop`, speed × `1 + (stageLoop−1)·0.25`.

### 3.4 Health, death, scoring

- Health 100, as in the original. Enemy contact and projectile damage use the original
  values (lines 7224–7510).
- Falling in a pit: −20 health, respawn at the last safe ground, 1.5 s invulnerability.
- Health 0: game over → name entry → leaderboard, with a **Retry stage** button that
  restarts the current stage with the score it began with (the original's
  `stageStartScore`). Beating a boss restores 25 health (original behaviour).
- Score sources unchanged; keep the combo counter from the juice layer (lines 8750–8780).

---

## 4. Visual direction

Stylised, saturated, chunky low-poly with toon shading — reads well at phone size and
costs little to render.

- **Materials:** one toon material factory: 3-step light ramp, coloured shadow tint per
  stage, rim light. Vertex colours instead of textures wherever possible. Characters get
  an inverted-hull outline; scenery does not.
- **Geometry:** built from merged primitives (`BufferGeometryUtils.mergeGeometries`) with
  vertex colours, so each character is 1–3 draw calls. Bevel/soften with a little vertex
  noise so nothing looks like a raw box.
- **Lighting:** hemisphere light + one directional sun/moon with a single shadow map that
  follows the player. Emissive accents (neon, lava, windows, ruby water) feed the bloom.
- **Sky:** shader dome per stage — gradient, sun or moon disc, stars, drifting fbm clouds.
- **Depth:** distance fog tinted to the horizon colour, three parallax layers of big
  silhouette scenery (mesas, skyline, volcano) placed far off the track.
- **Post:** bloom, vignette, per-stage colour grade (lift/gamma/gain), subtle film grain.
  The original's `GRADE` and `AMB` tables (lines 8625–8645) give the mood per stage.
- **Motion:** squash and stretch on jumps and landings, lean into turns, hit-flash and
  hit-stop on kills, soap-bubble bursts when grime is cleaned, coins that arc to the HUD.
- **Signature effect — "the clean wave":** scenery near the path starts desaturated and
  grimy; as the player passes, colour floods back (a shader uniform driven by player `s`).
  Beating the boss washes the whole stage clean. This is the game's story told visually.

### 4.1 Performance budget

| | Desktop | Mobile |
|---|---|---|
| Frame rate | 60 | 30–60 |
| Draw calls | ≤ 200 | ≤ 120 |
| Triangles on screen | ≤ 300k | ≤ 120k |
| Pixel ratio cap | 2 | 1.5, dynamic scaling down to 0.7 |
| Shadows | 2048 map | blob shadows only |
| Bloom | full | half-res or off |

Use `InstancedMesh` for all repeated scenery. Only build geometry for the segments near
the player (window of ~150 m ahead, 30 m behind) and dispose behind.

---

## 5. Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / arrows | left stick | left joystick |
| Jump | Space | A | JUMP |
| Spray (hold) | J or left mouse | X / RT | SPRAY |
| Bomb | K or E | B | BOMB |
| Slide / duck | Shift or C | Y / LT | SLIDE |
| Pause | Esc / P | Start | pause button |

Spray fires along the facing direction with aim-assist: it bends toward the nearest enemy
within a 30° cone and 30 m, including flying enemies (so the player never has to aim
vertically). Heat numbers are the original's: +15 per shot (+8 during Super), cools 1.5
per frame, 0.6 while overheated.

---

## 6. Stage Bible

Palettes and scenery come from `drawBackground` (lines 7679–8157) — read the stage's
block before building its theme. "Tier 1/2/3" = the act in which the enemy first appears.

| # | Name | Setting and look | Path hazard / gap fluid | Rolling obstacle | Enemies (tier 1 → 2 → 3) | Boss and 3D pattern |
|---|---|---|---|---|---|---|
| 1 | Desert Scrub | Dusk desert: purple sky, red mesas, orange sand, cacti, a ghost-town main street for the `side` section | Canyon drops, quicksand patches | sand_pile | dirt → ice, vulture → rabbit, dirty_ice, spider | **Dirt** — leaps across the arena and ground-slams, sending a ring shockwave to jump |
| 2 | Toxic Jungle | Layered greens, giant leaves, hanging vines, glowing spores | Sludge river, lily-pad hops | log | slime, bloom → bat → frog, sludge, centipede | **Slime** — bounces around lobbing acid that rains in marked circles |
| 3 | Neo-Scrap City | Night, deep purple, cyan/magenta neon, scrap towers, conveyor belts | Conveyors, crusher pistons, toxic gaps | barrel | smog, slag → drone → rat, trash, roach | **Trash** — hovers, telegraphs, then charges down a lane |
| 4 | New York City | Navy night skyline, lit yellow windows, wet street, taxis, steam vents | Open manholes, traffic crossing the path | trash_can | pizza, rat → pigeon → police | **Pizza** — hovers dropping bombs, then swoops |
| 5 | Paris Nights | Near-black blue, warm window lights, rooftops, a tower silhouette, café terraces | Rooftop gaps, awnings as bounce pads | cafe_chair | mime → gargoyle → bat | **Mime** — teleports around the arena edge, rapid-fires |
| 6 | Volcano Peak | Black rock, orange/red glow, ash fall, lava rivers | Lava gaps, falling rocks, collapsing bridge chase | ash_pile | magma → ember → slag | **Magma** — submerges in the lava ring and erupts under the player |
| 7 | Rainbow Island | Bright tropical greens, rainbow arcs, pastel sky | Rainbow bridges, mud pools that slow | cloud_bump | paint_blob → mud_cloud → frog | **Rainbow** — figure-8 sweeps trailing a beam |
| 8 | Cloud Dream | White and soft pastel, cloud platforms, floating islands | Cloud hops over open sky, moving clouds | sleep_sheep | storm_cloud → bat → pigeon | **Cloud** — a shielded eye; only vulnerable when the shield opens |
| 9 | Haunted Village | Black and grey, crooked houses, dead trees, green-lit fog, moon | Graveyard, swinging gates, bog | gravestone | zombie → ghost → bat, spider | **Ghost** — phases in and out, fires homing shots |
| 10 | Charcoal Streets | Charcoal buildings with pale ghostly windows, ruby-red water flowing through the streets, rising ash | Ruby canals, stepping stones | coal_pile | ghost, shadow_bat, ruby_slime → ember, zombie → storm_cloud | **Vacant Savior** — charcoal entity, fast figure-8 flight and swoops, 300 HP |

Each stage also gets one **set-piece** so they feel different to play, not just to look at:
1 runaway dust-ball chase · 2 vine swings · 3 conveyor reversal · 4 rooftop-to-street
drop · 5 awning bounce run · 6 lava-wave chase toward camera · 7 rainbow slide ·
8 moving-cloud ride · 9 lights-out section lit only by the spray · 10 ruby-water
rising-tide climb.

Boss HP (× `stageLoop`): 60, 80, 100, 120, 150, 200, 180, 220, 250, 300.

---

## 7. Enemy archetypes

About 35 enemy types reduce to six behaviours. Stats (HP, size, speed, altitude) come
from the `Enemy` constructor (lines 4272–4540); looks from lines 5082–6616.

| Archetype | Behaviour in 3D | Types |
|---|---|---|
| Walker | Advances down the path at the player, some weave | dirt, slime, slag, pizza, mime, magma, paint_blob, zombie, ruby_slime, police |
| Heavy | Slow, wide, blocks a lane, more HP | dirty_ice, sludge, trash |
| Hopper | Jumps in arcs, lands near the player | rabbit, frog, ice |
| Flyer | Hovers above head height, dives or strafes | vulture, bat, drone, pigeon, gargoyle, ember, shadow_bat, ghost |
| Crawler | Fast, low, hard to hit; some climb in from the track edge | spider, centipede, roach, rat |
| Floater | Drifts at mid-height, shoots or rains | bloom, smog, mud_cloud, storm_cloud |

Any type-specific quirk in the original behaviour block should be kept as a small
override on top of the archetype.

---

## 8. Music: the Jukebox

### 8.1 What Spotify allows

- **Spotify's playback SDK is not an option.** It only works for listeners who have
  Premium and who log in to your app, and Spotify's developer policy excludes games and
  syncing its audio to visuals.
- **The Spotify embed player is allowed** — it is the same widget already on the home
  page. A logged-in listener hears the full track inside the embed; a logged-out one gets
  a 30-second preview. The game cannot start it without the listener pressing play, cannot
  hide it, cannot read its audio (so no beat-sync), and cannot loop it reliably.
- Whether an embed play is credited as a stream is Spotify's call and could not be
  confirmed from their documentation in the planning session. Treat it as likely for
  logged-in listeners who play more than 30 seconds, not guaranteed.

### 8.2 Design: three sources, one switch

A small jukebox panel (title screen, pause menu, and a "now playing" chip in the HUD):

1. **Game mix (default)** — the artist's own files streamed from `game3d/music/`, one
   track per stage. Starts automatically, loops, crossfades into boss music, and drives
   visuals through a WebAudio analyser (bloom pulse, neon flicker, crowd of cacti bobbing
   on the beat). This is what makes the game feel scored.
2. **Spotify mode** — docks the official Spotify embed for the stage's track in a corner,
   mutes the game mix (SFX stay on), and shows "Press play to listen on Spotify". When the
   stage changes, the embed loads the next stage's track.
3. **Synth fallback** — procedural chiptune in the stage's key, used when a track file is
   missing or fails to load, so the game is never silent.

Every stage intro card shows **"♪ Track name — Cowboy Clean"** with **Listen on Spotify**
and **Follow** buttons, and the results/game-over screen lists the tracks heard with
Spotify links. That is the most dependable route from game to real streams.

### 8.3 What the artist supplies

`game3d/data/music.js` has 13 slots: title, stage 1–10, boss, saloon. For each: track
title, Spotify track URL, and (for Game mix) an audio file.

- File format: MP3 or OGG, 128 kbps, loudness-normalised; ~3 MB per track. Files are
  streamed on demand, never preloaded, so they do not slow the first load.
- Stage 10 is "Charcoal" (the original embeds it there). The saloon keeps the original
  jingle if no track is assigned.
- Slots left empty fall back to synth music.

---

## 9. Services carried over unchanged

- **Leaderboard:** port the Firebase module (lines 8905–9012) as-is. Write documents with
  exactly the same fields as today — the database security rules may reject new ones.
- **Prize email:** keep the flow. Post to the public MailerLite embedded-form endpoint
  (the `MAILERLITE_FORM_URL` constant next to `claimPrizeAction` in `cleaningup.html`,
  on branch `fix/remove-mailerlite-token`). Never put an API token in client code.
- **Cheats:** `SKIPTO1`–`SKIPTO9`, `HORSE` / `MECHAHORSE`, `CHARCOAL`.
- **Embedding:** the game runs inside an iframe on `index.html` at 16:9; keep the
  fullscreen button and the iOS handling in `checkPlatform` (lines 1566–1615).

---

## 10. Build order

| # | Prompt | Result | Suggested model |
|---|---|---|---|
| 0 | Scaffold and engine core | Empty 3D scene, loop, input, debug, smoke test | Sonnet |
| 1 | Track, player, camera | Grey-box run-and-jump on a generated path | Sonnet |
| 2 | Combat and pickups | Spray, heat, bombs, enemies, coins, crates, HUD | Sonnet |
| 3 | Art kit and hero | Toon look, sky, post, particles, animated Cowboy Clean | Opus if budget allows |
| 4 | Stage 1 vertical slice | Desert Scrub complete with boss | Sonnet |
| — | **Play it. Tune feel before going wider.** | | |
| 5 | Game flow | Title, cutscenes, store, casino, cheats, game over, leaderboard | Sonnet |
| 6 | Jukebox | Music in all three modes, beat-reactive visuals | Sonnet |
| 7 | Stages 2–4 | | Sonnet |
| 8 | Stages 5–7 | | Sonnet |
| 9 | Stages 8–10 | | Sonnet |
| 10 | Mobile, performance, polish | Touch controls, quality tiers, juice | Sonnet |
| 11 | Integration and launch | Swap into `index.html`, keep the classic game linked | Haiku or Sonnet |
| R | Bug-fix template | Reusable | Haiku or Sonnet |

One prompt per fresh session. Do not continue a long session into the next prompt — a
fresh session re-reads only the plan sections it needs and costs far less.
