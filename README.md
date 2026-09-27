# 潮汐之间 · Santa Cruz Pixel Fishing

A self-contained, top-down **2D cartoon pixel fishing game** set around Santa Cruz Wharf and Monterey Bay. The default page is the new pixel edition. Original hand-drawn Canvas sprites include the wood skiff, outboard, holding/steering/fishing poses, rental hut, dock workers, tackle and fish. The previous Three.js edition is preserved at `legacy-3d.html`.

Play: https://joyx.design/santa-cruz-skiff/

## Run

```sh
python3 -m http.server 4173 --directory dist
npm run check
npm test
```

No build step, API key, backend or account. The pixel edition uses Canvas 2D and does not load Three.js or require WebGL. Fonts have system fallbacks. Saves stay in local storage, under a separate pixel-edition key.

## The journey

Start at 06:00, a few steps from the rental counter → pack free starter equipment → request the empty skiff's davit lowering → walk down the real left-side stair alignment → board → unmoor → start the engine and steer, or choose a chart waypoint → coast down, anchor and select a rig → hold/release to cast → watch the float and strike → reel and manage drag/tension → keep the fish or record/release → return, dock, walk to the counter and exchange retained catches → buy and pack equipment.

- **WASD / left joystick:** walk or swim; aboard, forward/reverse throttle and steering. Releasing the momentary control returns to neutral while the boat retains momentum.
- **E:** contextual interaction. **G:** walk to the hut or boarding platform.
- **R:** engine. **Q:** anchor. **I:** equipment. **M:** chart. **J:** catches.
- **Hold Space / cast button, then release:** charge and cast. Tap at a bite to strike. Hold during a fight to raise the rod.
- **Hold F / reel button:** reel. During a fight the on-screen − / + buttons change drag.
- Tap accessible ground to walk there; tap navigable water to choose an assisted course.
- The boat actions menu allows standing, moving on deck, entering the water, changing rigs and returning. Swimmers can approach the stern ladder and climb back. Settings includes free recovery.
- Opening a menu pauses simulation. Focus loss, orientation change and pointer cancellation clear held actions. Switching away pauses the trip.

The touch interface remains visible on all devices, supports separate pointer ownership for the two thumbs and keeps a tall world view in portrait. It does not rely on mouse hover or pointer lock.

## Implementation

- `pixel-sprites.js`: original authored low-resolution sprites; no downloaded sprite pack.
- `pixel-world.js`: nearest-neighbour rendering, smooth camera, animated water/birds/wakes, left landing and davit, fishing line attached to rod tip and driver's hand attached to tiller.
- `pixel-sim.js`: DOM-free game model and validated player actions.
- `pixel-game.js` / `pixel.css`: interface, keyboard/touch input, menus, saves, audio and page-scoped accessible tools.

The edition reuses the real metre-coordinate OSM coastline, wharf and building footprints, NOAA depth grid, SI vessel dynamics, hull collisions, swimming model, gear catalogue and economic invariants. The 24-second davit sequence and normal walking/boating/fishing time advance at 1:1 active time. New and resumed days start at 06:00. Menus pause the clock. Portrait and landscape share the same simulation.

The equipment catalogue has free starter gear plus rods, reel, line, leaders, several rigs/baits, sinkers, larger cooler, sounder and drift equipment. There are five representative fish species. Habitat, depth, bait and tackle affect probabilities; species are not locked behind specific purchases. The fish reward ledger prevents double settlement. Retained fish require a counter visit; released fish earn a recorded release reward.

## Data and scope

This is an artistic fishing simulator, not a surveyed digital twin. Geography is metre-scale; character, building and boat art are deliberately stylized/enlarged for a readable pixel world. Employees are fictional, not asserted real staff identities. Fish and sea dynamics are approximations. Five species are representative, not an exhaustive regional list. Virtual catches and credits are game systems, not real-world harvest or sale guidance.

Bathymetry is the historical NOAA Monterey 2012 MHW reference grid, not a live instrument reading. MLLW tide predictions remain separate. Wind/wave/temperature come from offshore NOAA buoys around 23–40 km away; they are regional observations, not measurements at the skiff. Settings shows the observation timestamp and freshness. GitHub Pages refreshes the snapshot at scheduled minutes 17/47 when GitHub scheduling permits; the page checks it every ten minutes and retains original timestamps on failure.

Sources: `dist/SOURCES.html`, `dist/credits.html`, `dist/data/`, and `qa/wharf-correction/REFERENCES.md`. © OpenStreetMap contributors. NOAA public data. Pixel art, interface and procedural audio are authored for this game. Legacy Three.js MIT and Poly Haven CC0 assets remain attributed with the preserved 3D edition.

## Validation

`npm run check` syntax-checks every shipped JavaScript module. `npm test` covers the pixel full journey, economy, casting/bait, swim/reboarding, resume recovery, momentary mobile input, rigs and destinations, plus existing vessel/collision/geography/depth/pointer suites. See `qa/pixel/PLAYTEST.md` for actual browser evidence and responsive screenshots. Page-scoped WebMCP tools expose only normal player actions and a read-only state report; they cannot teleport, skip time, force bites or create fish.
