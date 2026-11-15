# Mobile, performance and polish (PLAN prompt 10)

What was built, how to check it, and what is still open. Read this before touching touch controls, quality tiers, loading,
settings or the juice layer.

## Touch controls — `game3d/ui/touch.js`

- **Left floating joystick** (appears under the thumb anywhere in the left half; resting position bottom-left) and **JUMP / SPRAY /
  BOMB / SLIDE** buttons bottom-right, plus a pause button top-right. Buttons are 70–96 px at the 844×390 reference (hit areas are
  28 px larger than the drawn disc) and scale with the screen and with Settings > Touch button size.
- **Multi-touch safe**: Pointer Events with one `pointerId` per control, pointer capture, release on `pointercancel` /
  `lostpointercapture`. Everything writes into `input.touch`, which `core/input.js` merges with keyboard and gamepad.
- Lives on `<body>`, not inside the 16:9 box, so the controls use the letterbox margins of a wide phone. Honours safe-area insets
  (`viewport-fit=cover`).
- Shown only in the `PLAYING` state and only on touch-first devices (`(pointer: coarse)`, or `?touch=1`; `?touch=0` forces off).
  A real finger on a "desktop" page turns them on. Hidden on desktop.
- **Ported from `cleaningup.html` (1509–1615)**: portrait phones get a "ROTATE YOUR PHONE" prompt (`?ignore_rotation=1` turns it
  off) and the game pauses; the fullscreen button hides on iPhone (no API), falls back to "pseudo fullscreen" when the browser or
  an iframe refuses, and locks the screen to landscape after entering fullscreen. Fullscreen now targets the whole page so the
  controls come along.
- **Deliberate difference from the original**: the original treated any screen ≥ 1024 px wide as desktop, which hid the controls on
  iPads. This version decides by pointer type, not width.
- iOS: pinch / double-tap zoom and rubber-banding are blocked in JS (the viewport meta is ignored by iOS ≥ 10), `100dvh` is used for
  the box, audio unlocks on `touchend` / `click` and re-unlocks after an iOS "interrupted" state.
- On screens shorter than 540 px the HUD and menu layers are scaled down (`fitUi` in `main.js`) so a 390 px tall phone shows the same
  layout as the 960×540 desktop one.

Check: `node tools/smokeTouch.mjs` — emulated fingers (Chromium CDP, three at once) drive the on-screen controls through the whole of
stage 1 to the stage-clear screen with the keyboard untouched; also checks thumb sizes, no overlap, hidden on desktop, the portrait
prompt at 390×844.

## Performance

### How it is measured — `tools/perf.mjs`

Lowest tier (`quality=low`), 4× CPU throttle, the scripted bot plays act 1 (20 s, which crosses chunk and segment boundaries),
act 2, act 3 and the boss fight of every stage. Per window: frame p50 / p95 (one 60 Hz simulation step + one full render, main
thread), the worst streaming call, draw calls, triangles, heap allocation per frame (CDP sampling heap profiler), shader programs.
`node tools/perfTable.mjs remake/perf/before.json remake/perf/after.json` prints the table (`remake/perf/summary.md`).

**Limits you should know about**: headless Chromium rasterises on the CPU, so GPU time and fill-rate cannot be measured here; the
page is a 320×180 canvas so the software rasteriser does not stall the main thread. The numbers are the CPU side of a phone's
frame plus the draw-call / triangle budget. Dynamic resolution is what protects the GPU side on a device — see below.
`tools/sceneProbe.mjs` lists the heaviest draw groups.

### What changed

| Offender | Fix |
|---|---|
| Triangles over the 120k mobile budget (stage 7 reached 147k) | Lowest tier: scatter density 0.5 → 0.4, no inverted-hull outline on enemies (it doubled every enemy's triangles and draw calls; the hero keeps his) |
| Two full-screen passes at the end of every frame | The colour grade pass now also tone-maps and converts to sRGB, so `OutputPass` is gone (one pass fewer on every tier) |
| 120 m chunks and track segments built in one frame (stage 6: 118 ms at 4× throttle) | Both build in small steps, nearest first, within a ~2 ms budget per frame (`scenery.pump`, `builder.pump`); a teleport builds the ground under the player at once |
| First-use shader compile stalls (stage start, boss landing) | `render/warm.js` compiles every program during the load, in parallel where `KHR_parallel_shader_compile` exists; the boss is shown once its own programs are linked (≤ 0.7 s) |
| Coin batch boxed nine doubles per instance per frame | typed-array arguments (`batch.v` + `putA`) |
| Ambient particles ignored the tier | ambient particle rate follows `tier.density` |

### Dynamic resolution — `core/quality.js`

Low is a **30 fps tier**: its slow line sits just above 33.3 ms, so a display locked to every second vsync is on target and is not
pushed lower. Over the line: render scale drops in 5 % steps to the tier minimum (0.7); still slow: bloom off, then grade / vignette /
grain off, then the scale floor drops to 0.5. Headroom restores things last-shed-first; because a 30 fps lock hides headroom, the
controller also *probes* upward after a calm spell and backs off exponentially if the probe made it slow again.
`node tools/qualityTest.mjs` runs the controller against a device model (14 → 100 ms GPU cost): it settles at 33.3 ms for every device
up to 70 ms, never thrashes, and recovers. **This tests the control loop, not a real GPU.**

### Allocation

Avoidable per-frame garbage in game code was removed where the profiler found it. What remains is mostly the unavoidable boxing of
double-precision arguments in non-inlined calls (~25 KB/frame in game code) and ~40 KB/frame inside three.js's own render loop
(scales with draw calls). It is not zero; the heap sawtooth is shallow and minor GCs are short.

## Loading — `flow.js`, `world/level.js`

- `cleaningup3d.html` paints a plain HTML/CSS splash ("COWBOY CLEAN") immediately; the Google Font loads without blocking first
  paint (the old `@import` held the page until Google answered); `<link rel="modulepreload">` lists every module so the ~200 files
  load in parallel (`node tools/preload.mjs` regenerates the block, `--check` is part of the smoke test).
- The title menu is up as soon as the modules run; the fly-through appears when its stage has finished building.
- A stage is built by a generator (`createLevelSteps`); the flow spends 4–14 ms of each frame on it behind the title, a cutscene or
  the stage-intro card (the card shows a progress bar and waits). Longest single slice at 1× CPU: ~45–70 ms (was one 240 ms freeze).
- Automated browsers (`navigator.webdriver`) build stages at once so older tests that expect the new stage immediately keep
  working; `?load=slice` / `?load=sync` force either way.

## Juice — `ui/juice.js`, `core/hitstop.js`, `render/camera.js`

Hit-stop (kills 40 ms, bosses 140 ms, hits taken 70 ms, bombs 90 ms; chained stops are rate-limited), shake with diminishing returns and
lower amplitude, landing dust that grows with impact, speed lines (slide / boost / chase), coin-to-HUD arcs, combo pop, a pulsing
low-health vignette with heartbeat sound, boss name card with cinematic bars, and a "clean wave" ring at stage clear (the colour flood
itself is the grime shader driven by `arena.wash`). All pooled; reduced motion switches the motion effects off. `node tools/smokeJuice.mjs`.

## Settings and accessibility — `core/settings.js`, `ui/settingsPanel.js`

Saved in `localStorage` (`cc3d_settings`), opened from the title and the pause menu: master volume, quality override (`?quality=` wins),
reduced motion (auto = the OS setting; removes shake, flashes, hit-stop, speed lines, coin flight, FOV kick), colour-blind-safe pickup
shapes (each of the nine power-ups has its own silhouette: plus, star, fan, hexagon, beads, ring, can, diamond, block), touch button
size, and remappable keys (click a key, press the new one; Esc cancels, Backspace removes; a key can do one thing).

## Robustness

WebGL context loss pauses the game, shows "GRAPHICS RESET" and carries on when the context returns; hiding the tab pauses and
suspends audio; turning a phone upright pauses; resize / orientation keep renderer, camera aspect and UI in step; audio unlocks on
the first key / tap / `touchend` and again after the context was suspended. `node tools/smokeRobust.mjs`.

## Tests added

`tools/smokeTouch.mjs`, `smokeRobust.mjs`, `smokeJuice.mjs`, `qualityTest.mjs`, `preload.mjs --check` (all run by `tools/smoke.mjs`),
`smokeTen.mjs` (full ten-stage `?god=1` run through the real state machine; `tools/smoke.mjs --full`), `perf.mjs`, `perfTable.mjs`,
`sceneProbe.mjs`.

## Open

- GPU fill-rate and real-phone frame times were not measured (no GPU here). Triangles are within budget; overdraw is unmeasured.
- Heavy construction inside `createScenery` / `createPlayer` is still 40–70 ms at 1× CPU per slice.
- ~25 KB/frame of game-code allocation (double boxing) and the three.js internals remain.
- Pre-existing failures that are not from this work (they also fail on an untouched checkout of `main`, run side by side): `smokeStage1` ("Enter on the tally should start
  the next stage"), `smokeFlow` (cutscene tap, pause/restart), `smokeJukebox` (embed / intro-card text).
