Low tier, 4x CPU throttle, 320x180 canvas (main-thread cost; software GL cannot time the GPU). Per stage over act 1 (20 s run), act 2, act 3 and the boss fight.

| Stage | frame p50 (ms) | frame p95 (ms) | streaming hitch max (ms) | draw calls max | triangles max | alloc KB/frame (app only) | shader programs |
|---|---|---|---|---|---|---|---|
| 1 Desert Scrub | 10.2 → 9.9 | 23.8 → 25.9 | 17.9 → 19.5 | 94 → 83 | 109k → 94k | 28.3 → 25.0 | 28 → 51 |
| 2 Toxic Jungle | 9.9 → 9.7 | 26.8 → 23.2 | 11.0 → 12.8 | 93 → 86 | 113k → 95k | 26.4 → 23.7 | 26 → 48 |
| 3 Neo-Scrap City | 11.5 → 9.5 | 35.4 → 20.1 | 14.1 → 17.2 | 91 → 86 | 85k → 78k | 26.2 → 23.6 | 28 → 51 |
| 4 New York City | 9.6 → 9.4 | 33.6 → 24.3 | 10.0 → 8.7 | 106 → 105 | 87k → 77k | 27.5 → 23.5 | 28 → 51 |
| 5 Paris Nights | 9.5 → 9.7 | 30.1 → 21.3 | 8.0 → 15.2 | 94 → 82 | 97k → 86k | 26.6 → 24.4 | 28 → 50 |
| 6 Volcano Peak | 11.9 → 8.6 | 33.3 → 25.2 | 117.9 → 51.1 | 80 → 78 | 120k → 113k | 36.6 → 28.9 | 29 → 53 |
| 7 Rainbow Island | 11.5 → 8.9 | 29.5 → 23.4 | 13.8 → 7.0 | 85 → 83 | 147k → 129k | 25.5 → 22.3 | 28 → 53 |
| 8 Cloud Dream | 8.8 → 9.0 | 26.1 → 21.9 | 15.6 → 18.7 | 82 → 74 | 116k → 99k | 22.0 → 19.9 | 30 → 54 |
| 9 Haunted Village | 11.4 → 9.3 | 29.2 → 22.3 | 77.8 → 8.6 | 95 → 79 | 111k → 89k | 29.6 → 26.0 | 29 → 51 |
| 10 Charcoal Streets | 10.2 → 9.3 | 26.5 → 22.6 | 16.1 → 6.0 | 85 → 78 | 72k → 63k | 34.9 → 27.5 | 29 → 54 |

All windows: median frame p50 9.8 → 9.3 ms, median p95 23.8 → 20.2 ms, worst triangles 147486 → 128571, worst draw calls 106 → 105; windows over the 120k-triangle mobile budget: 3/40 → 1/40.
