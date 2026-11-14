# Cowboy Clean 3D — Coding Prompts

Paste one prompt into a **fresh** coding session, in order. Each assumes the repo
`maleibow/cowboycleanwebsite` is checked out with `remake/PLAN.md` present.

`remake/PLAN.md` and `remake/PROMPTS.md` are already on the branch `remake-3d`; start
every coding session on that branch. After each prompt: open `cleaningup3d.html` yourself, play for a minute, and
only move on when it works. If something is off, use prompt R.

---

## Prompt 0 — Scaffold and engine core

```
You are building a 3D remake of a browser game. Read remake/PLAN.md sections 1, 2, 3 and
4.1 first. Follow the house rules in section 2 exactly. Do not read cleaningup.html in
this session.

Work on branch remake-3d (create it from the current branch if it does not exist).

Build the scaffold:
1. Vendor Three.js: download three.module.min.js (pin one recent stable version) and the
   addons EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass and
   BufferGeometryUtils (plus anything they import) into game3d/vendor/. Wire them with
   an import map in cleaningup3d.html so modules import from "three" and "three/addons/".
2. cleaningup3d.html: 16:9 letterboxed canvas that fills its iframe (copy the scaling
   approach from the CSS at the top of cleaningup.html, lines 1–60 only), an empty HUD
   layer, the Bangers font.
3. game3d/core: loop.js (fixed 60 Hz step, interpolated render, pauses when tab hidden),
   input.js (keyboard + gamepad to one input object using the mapping in PLAN section 5;
   touch comes later), rng.js, pool.js, events.js, state.js, quality.js (three tiers,
   auto-picked, dynamic resolution scaling to hold frame rate).
4. game3d/render/renderer.js: WebGLRenderer with ACES tone mapping, sRGB output,
   composer with bloom, resize handling, pixel ratio caps from PLAN 4.1.
5. main.js: a state machine (BOOT, TITLE, CUTSCENE, PLAYING, BOSS, STORE, CASINO, PAUSED,
   GAMEOVER, VICTORY) with only PLAYING implemented: a lit test scene with a ground
   plane, a few boxes and an orbiting camera.
6. Debug: the URL parameters and window.__game hook from house rule 8, an FPS and
   draw-call panel for ?debug=1.
7. tools/smoke.mjs as described in house rule 9. Playwright and Chromium may already be
   installed globally; if require('playwright') fails, say so instead of installing a
   different browser.

Done when: the page loads with no console errors, shows the test scene at a steady frame
rate, resizes correctly, and node tools/smoke.mjs passes and writes a screenshot. Look at
the screenshot. Commit. Report what you built and anything that deviates from the plan.
```

---

## Prompt 1 — Track, player, camera (grey-box)

```
Read remake/PLAN.md sections 2, 3 (all of it) and 5. Follow the house rules. Continue on
branch remake-3d. Look at the existing game3d/ code before writing.

Build the grey-box platformer — no art yet, flat-coloured boxes are fine:
1. world/track.js: a Catmull-Rom centreline with precomputed frames; toWorld(s, x, y)
   and the tangent/right/up at s; a swept ground mesh built per segment; a windowed
   builder that creates geometry ~150 m ahead and disposes ~30 m behind.
2. world/segments.js: templates — flat, gentle curve, climb, drop, gap, double gap,
   stepping platforms, narrow beam, low barrier (must slide), side-view section,
   toward-camera chase section, checkpoint, rest, boss gate. Each declares its length,
   ground spans, gaps, and spawn slots for enemies/pickups/obstacles.
3. world/generator.js: builds the three-act segment list from (stageData, seed) per
   PLAN 3.3, obeying its rules. Use a placeholder stageData for stage 1.
4. actors/player.js: movement in track space with the numbers in PLAN 3.1 — acceleration,
   friction, coyote time, jump buffer, variable jump height, slide/duck with a lower
   hitbox, pit fall and respawn per PLAN 3.4, checkpoints. A capsule stands in for the
   model.
5. render/camera.js: the four modes in PLAN 3.2 with smooth blending, driven by the
   segment the player is in; shake and FOV kick hooks.
6. Collision: axis-aligned boxes in (s, x, y). Keep it in one small module.

Done when: ?stage=1 gives a full ~2 minute run from start to the boss gate that can be
completed with keyboard and gamepad; gaps kill-and-respawn; the low barrier requires a
slide; the camera changes mode in the side and chase sections without clipping through
the ground; ?seed= changes the layout. Extend tools/smoke.mjs to hold "forward" and jump
periodically and assert the player's s increases. Commit and report.
```

---

## Prompt 2 — Combat, enemies, pickups, HUD

```
Read remake/PLAN.md sections 1.1, 1.2, 2, 3.4, 5 and 7. Follow the house rules. Continue
on branch remake-3d. For original behaviour, read ONLY these line ranges of
cleaningup.html, as needed: 3041-3108 (powerups), 3200-3460 (player shooting, heat,
bombs, lasso), 3865-4270 (projectiles), 4272-4540 (enemy stats), 7093-7203 (spawning),
7224-7510 (collisions, damage, drops, score). Never read the whole file.

Build combat, still grey-box:
1. data/weapons.js and data/enemies.js: port the numbers (converted to per-second, with
   the original value in a comment). Include every enemy type's HP, size, speed and
   altitude, and its archetype from PLAN section 7.
2. actors/projectiles.js: pooled. Player spray with aim-assist (PLAN 5), and the powerup
   variants super, spread, fourway, homing, grenade, spin, plus the laser upgrade and
   bullet-size upgrade. Enemy projectiles.
3. Heat and overheat exactly as the original; bombs (3 per stage, clears nearby enemies
   and projectiles); shield; invulnerability frames; lasso upgrade as the original does it.
4. actors/enemy.js: the six archetypes as behaviours with per-type overrides, spawning
   from the generator's slots plus side/air ambushes, roster by act (stage 1 roster from
   PLAN section 6). Coloured primitive shapes stand in for models.
5. actors/pickups.js: coins (magnet to player), all nine powerup types with timers,
   breakable soap crates that hold coins or powerups, drop rates from the original.
6. actors/obstacles.js: the rolling stage obstacle coming down the path, and static ones.
7. ui/hud.js: score, health, coins, bombs, heat bar, stage name, active powerup
   indicators, combo counter, floating damage/score text, boss health bar (unused yet).

Done when: stage 1 is playable end to end with enemies of all three tiers, every powerup
can be picked up and visibly changes the weapon, overheating locks the spray, dying
shows a placeholder game-over, and the frame rate holds with 30 enemies and 200
projectiles on screen (test with a debug spawn key). Smoke test still passes. Commit and
report, listing any original behaviour you could not carry over and why.
```

---

## Prompt 3 — Art kit and the hero

```
Read remake/PLAN.md sections 2, 4 (all) and 6 (row 1 only). Follow the house rules.
Continue on branch remake-3d. For the hero's look read cleaningup.html lines 3540-3863
(player drawing) and 2833-2931 (portraits) only.

Build the look of the game. Everything is generated in code — no asset files.
1. render/materials.js: toon material factory (3-step ramp, per-stage shadow tint, rim
   light, vertex colours, optional emissive), inverted-hull outline helper, a "grime"
   uniform implementing the clean wave from PLAN section 4 (desaturate and darken beyond
   the player's s, bloom back to full colour behind it).
2. render/textures.js: small procedural CanvasTextures (value noise, stripes, planks,
   bricks, cracks, speckle) cached by key.
3. render/sky.js: shader dome with gradient, sun/moon disc, stars, drifting clouds, all
   driven by a palette object.
4. render/fluids.js: one animated shader plane configurable as water, sludge, acid,
   lava or ruby water.
5. render/particles.js: a single instanced particle system with presets: dust puff, soap
   bubbles, sparkle, splash, ember, smoke, confetti, hit spark, coin burst.
6. Post: bloom tuned so only emissive things glow, vignette, colour grade with
   lift/gamma/gain per stage, light film grain. All switchable by quality tier.
7. actors/playerModel.js: Cowboy Clean built from merged primitives with vertex colours —
   hat, bandana, vest, boots, spray gun — on a simple joint hierarchy. Procedural
   animation: idle, run, jump, fall, land (squash), slide, shoot recoil, hurt, victory.
   Add the Mecha-Horse variant for the vehicle upgrade.
8. Replace the grey-box track ground and props with stage 1's palette as a first pass
   (full stage dressing is the next prompt).

Done when: a screenshot of stage 1 looks like a finished stylised game rather than a
prototype — coloured sky, fog depth, toon-shaded hero with outline, soft shadow, glow on
emissives, particles on jump/land/shoot — and the budgets in PLAN 4.1 are met (check the
debug panel). Take screenshots at three points along the track and look at them
critically; fix what looks flat or ugly before finishing. Commit and report.
```

---

## Prompt 4 — Stage 1 vertical slice: Desert Scrub

```
Read remake/PLAN.md sections 2, 3.3, 4, 6 and 7. Follow the house rules. Continue on
branch remake-3d. Art and behaviour references in cleaningup.html — read only these:
7682-7754 (stage 1 background), 4549-4583 (boss1 behaviour), 5082-5350 (boss1 and stage
1 enemy drawing — skim for colours and shapes), 6618-6700 (obstacles).

Finish stage 1 to shipping quality. It is the template every other stage will copy, so
keep the structure clean and data-driven.
1. themes/stage01.js: palette, sky, fog, lights, colour grade; instanced scenery (mesas
   as far parallax layers, cacti, rocks, tumbleweeds, fence posts, a ghost-town street
   for the side-view section); canyon gaps and quicksand; the sand_pile obstacle.
2. actors/enemyModels.js: procedural models and animations for dirt, ice, vulture,
   rabbit, dirty_ice and spider, each recognisable from the original and readable at a
   distance. Build shared part builders (blob body, eyes, wings, legs) — later stages
   reuse them.
3. Set-piece: the runaway dust-ball chase in a toward-camera section.
4. world/arena.js and actors/bosses/boss01.js: the Dirt boss per PLAN section 6 —
   intro, telegraphed leap, ground slam with a ring shockwave to jump over, a second
   phase under half health, defeat animation, then the whole stage washes clean.
5. Stage intro card (stage name, track title placeholder), checkpoint flags, stage-clear
   tally (score, coins, time).
6. data/stages.js: stage 1 fully described as data in the shape all ten stages will use.

Done when: stage 1 can be played from intro card to stage-clear with no placeholders
left, the boss is beatable and fair (every attack is telegraphed), and the smoke test
passes with ?god=1&boss=1 reaching the boss. Screenshot the opening, the side section,
the chase and the boss; review them. Commit and report, including a short "how to add a
stage" note at the top of data/stages.js.
```

**Stop here and play.** Jump feel, camera distance, spray feel and difficulty are far
cheaper to fix now than after nine more stages are built on top.

---

## Prompt 5 — Game flow: title, story, store, casino, leaderboard

```
Read remake/PLAN.md sections 1.1, 1.2, 2, 3.4 and 9. Follow the house rules. Continue on
branch remake-3d. Read only these ranges of cleaningup.html: 1707-1822 (story), 1824-1870
(cutscene flow), 2108-2236 (cheats, start, init), 2238-2396 (game over, prize, score
submit), 2398-2545 (transition, store), 2547-2762 (casino), 2833-2931 (portraits),
8905-9012 (Firebase). Also the DOM for those screens — find it by grepping for the ids
start-screen, store-screen, casino-screen, game-over-screen, cheat-modal, victory-screen.

Build everything around the stages:
1. Title screen over a slow fly-through of stage 1; Start, Secret Code, Leaderboard,
   fullscreen button.
2. data/story.js with the dialogue copied verbatim; ui/cutscene.js showing 3D busts of
   Cowboy Clean, Miss Cowboy, Grime Overlord and Ghost with typewriter text, tap/key to
   advance, skip button. Same triggers as the original (intro, before each stage on
   loop 1, ending).
3. Store as a 3D saloon interior between stages: same six items, prices and max levels,
   the original saloon jingle, Next Stage button.
4. Casino: a glowing side-door spawned by the generator (rare, as in the original);
   same slot machine, symbols, cost and prizes.
5. Cheats exactly as the original. Pause menu (resume, restart, jukebox placeholder).
6. Game over with Retry stage per PLAN 3.4, name entry, leaderboard via
   services/leaderboard.js — port the Firebase module unchanged and write documents with
   exactly the original fields. Prize flow via services/prize.js posting form data to
   the public MailerLite form endpoint per PLAN section 9; if the original file still
   contains a bearer token, do NOT copy it into any new file.
7. Full loop: stage clear → store → cutscene → next stage; after stage 10 the ending,
   victory screen, then stage 1 with stageLoop + 1. Stages 2–10 use stage 1's theme with
   their own name and roster as stand-ins until they are built.

Done when: a full run title → stage 1 → store → stage 2 stand-in works; every cheat
works; a score reaches the leaderboard list (if the network blocks Firestore in your
environment, say so and leave it wired). Commit and report.
```

---

## Prompt 6 — Jukebox: music in three modes

```
Read remake/PLAN.md sections 2 and 8. Follow the house rules. Continue on branch
remake-3d. Read cleaningup.html lines 1416-1507 only (SFX and saloon jingle).

1. audio/sfx.js: port every sound in the original Sound object to a small WebAudio synth
   with a master SFX gain. Unlock audio on first user gesture.
2. data/music.js: 13 slots (title, stage1..stage10, boss, saloon), each
   { title, spotifyUrl, file, bpm } with clearly marked placeholders for the owner.
3. audio/jukebox.js with three sources:
   - Game mix: streams the slot's file with an <audio> element (preload="none") routed
     through WebAudio — loop, crossfade between stage/boss/saloon, duck under cutscene
     text, an AnalyserNode exposing bass/mid/high energy and a beat pulse.
   - Spotify mode: docks the official Spotify embed iframe for the slot's track in a
     corner (visible, never hidden or covered), mutes the game mix, shows "Press play to
     listen on Spotify", reloads the embed when the stage changes. Use Spotify's iFrame
     API if it loads; fall back to a plain embed iframe. Never try to auto-start it.
   - Synth fallback: audio/synthMusic.js, a simple procedural loop per stage mood, used
     when a slot has no file or the file fails.
4. UI: jukebox panel on the title screen and pause menu (source switch, music and SFX
   volume, remembered in localStorage); a now-playing chip in the HUD; "♪ Track —
   Cowboy Clean" with Listen on Spotify and Follow buttons on each stage intro card; a
   "Tracks you heard" list with Spotify links on the results and game-over screens.
   Follow links go to https://open.spotify.com/artist/6uiAnXipuNymu9Bd9ZYLN0
5. Beat reactivity from the analyser (Game mix and synth only): bloom pulse, emissive
   flicker, scenery bob. Subtle, and off on the lowest quality tier.

Done when: with no music files present the game plays synth music and never errors;
dropping an MP3 at the path named in data/music.js makes that stage use it; switching to
Spotify mode shows the embed and silences the game mix while SFX continue. Commit and
report, with a plain list of exactly what the owner must fill in.
```

---

## Prompts 7, 8, 9 — The remaining stages

Run this three times, replacing `{STAGES}` and the line ranges:

| Run | {STAGES} | Background lines | Boss behaviour lines | Boss/enemy drawing lines |
|---|---|---|---|---|
| 7 | 2, 3, 4 | 7755–7911 | 4584–4678 | 5351–6056 |
| 8 | 5, 6, 7 | 7912–8048 | 4679–4790 | 6057–6478 |
| 9 | 8, 9, 10 | 8049–8157 | 4791–5080 | 6479–6616 |

```
Read remake/PLAN.md sections 2, 4, 6 and 7, and the "how to add a stage" note in
game3d/data/stages.js. Study themes/stage01.js and actors/bosses/boss01.js — copy their
structure. Follow the house rules. Continue on branch remake-3d.

Build stages {STAGES}. References in cleaningup.html — read only: {BACKGROUND LINES} for
scenery and palette, {BOSS BEHAVIOUR LINES} for boss patterns, {DRAWING LINES} skimmed
for enemy and boss colours and shapes, 4420-4540 for enemy stats not yet ported, and
6618-7052 for the stage obstacles.

For each stage, per its row in PLAN section 6:
1. Theme: palette, sky, fog, lighting, colour grade, far parallax silhouettes, instanced
   scenery, the gap fluid, the stage hazard, the rolling obstacle.
2. Enemy models and behaviours for any type not built yet, reusing the shared part
   builders. Keep each recognisable from the original.
3. The stage's set-piece.
4. The boss in its own file: intro, at least two telegraphed attacks matching the
   original pattern translated to the arena, a harder phase under half health, defeat.
5. Stage data in data/stages.js; remove the stand-in.

Each stage must feel different to play, not only look different. Do one stage
completely, screenshot its opening, mid-point and boss, review, then start the next.

Done when: each stage runs intro to stage-clear with ?stage=N, each boss is beatable and
every attack is telegraphed, budgets in PLAN 4.1 hold, smoke test passes for each stage.
Commit after each stage. Report per stage, with anything you simplified.
```

For run 9, add this line: `Stage 10's story dialogue involves "Ghost" and the boss is
"Vacant Savior"; make this stage the visual climax — ruby water is emissive and reflects
in the charcoal streets.`

---

## Prompt 10 — Mobile, performance and polish

```
Read remake/PLAN.md sections 2, 4, 4.1 and 5. Follow the house rules. Continue on branch
remake-3d. Read cleaningup.html lines 1509-1615 (fullscreen and platform detection),
1962-2060 (touch controls) and 8607-8900 (juice layer) only.

1. ui/touch.js: left virtual joystick, JUMP / SPRAY / BOMB / SLIDE buttons, sized for
   thumbs, multi-touch safe, hidden on desktop. Port the original's iOS and fullscreen
   handling. Test at 390x844 landscape and portrait (portrait shows a rotate prompt).
2. Performance: profile each stage on the lowest tier with 4x CPU throttling; fix the
   worst offenders (merge static geometry, instance, pool, cut overdraw, shrink shadow
   and bloom cost). Dynamic resolution must hold 30 fps. No per-frame allocations —
   check with the performance panel.
3. Loading: a first-paint title in under 2 s; build stage geometry in slices across
   frames behind a short stage-intro card rather than freezing.
4. Juice pass: hit-stop, screen shake tuning, landing dust, speed lines, coin-to-HUD
   arcs, combo pop, low-health vignette, boss intro name cards, stage-clear clean wave.
5. Accessibility and settings: reduced-motion (no shake/flash), colour-blind-safe pickup
   shapes, remappable keys, volume, quality override. Saved in localStorage.
6. Robustness: WebGL context loss recovery, tab hide/show, resize, audio unlock.

Done when: every stage holds the mobile budget, touch controls complete stage 1 in the
smoke test using emulated touch, and no console errors appear across a full ten-stage
?god=1 run. Commit and report with a before/after frame-time table.
```

---

## Prompt 11 — Integration and launch

```
Read remake/PLAN.md sections 2 and 9. Continue on branch remake-3d. This is the only
prompt allowed to touch index.html.

1. In index.html, find the iframe that loads cleaningup.html and point it at
   cleaningup3d.html. Add a small "Play the classic 2D version" link next to it that
   opens cleaningup.html. Change nothing else on the page.
2. Add cleaningup3d.html to sitemap.xml. Give it a title, description and social
   preview meta tags.
3. Check the game inside the iframe at desktop and phone sizes: scaling, fullscreen,
   touch, audio unlock, Spotify embed placement.
4. Write remake/README.md: how to run locally, URL debug parameters, how to add music,
   how to add a stage.
5. Do NOT merge to main or open a pull request — stop and report so the owner can
   review the branch first.
```

---

## Prompt R — Bug-fix / tuning template (reuse as needed)

```
Read remake/PLAN.md section 2 (house rules) and continue on branch remake-3d.

Problem: {describe what you see, on which stage, on which device}
Expected: {what should happen instead}
How to reproduce: {URL parameters and steps, e.g. cleaningup3d.html?stage=3&seed=3001}

Find the cause before changing anything — reproduce it with tools/smoke.mjs or a
screenshot first. Make the smallest fix that addresses the cause, check you have not
broken the other stages, commit, and tell me what the cause was.
```

---

## What the owner needs to supply

1. For each of the 13 music slots (title, stages 1–10, boss, saloon): which song, and
   its Spotify track link. Needed before prompt 6; placeholders work until then.
2. The audio files for the songs to be heard in-game (MP3 or OGG, ~128 kbps), placed in
   `game3d/music/`. Optional — without them the game uses Spotify mode and synth music.
3. Revoke the old MailerLite API token in the MailerLite dashboard (it is still in git
   history) and merge branch `fix/remove-mailerlite-token`.
