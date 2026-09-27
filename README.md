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

Start at 06:00, a few steps from the rental counter → pack free starter equipment → request the empty skiff's davit lowering → walk down the real left-side stair alignment → board → unmoor → start the engine and steer, or choose a waypoint after buying and carrying a chart → coast down, anchor and select a rig → hold/release to cast → watch the float and strike → reel and manage drag/tension → keep the fish or record/release → return, dock, walk to the counter and exchange retained catches → buy and pack equipment.

- **WASD / left joystick:** walk or swim; aboard, forward/reverse throttle and steering. Releasing the momentary control returns to neutral while the boat retains momentum.
- **E:** contextual interaction. **G:** walk to the hut or boarding platform.
- **R:** engine. **Q:** anchor. **I:** equipment. **M:** chart. **J:** catches.
- **Hold Space / cast button, then release:** charge and cast. Tap at a bite to strike. Hold while fishing to lift the lure or raise the rod.
- **Hold F / reel button:** reel. During a fight the on-screen − / + buttons change drag.
- Tap accessible ground to walk there; after carrying a chart, tap navigable water to choose an assisted course.
- The boat actions menu allows standing, moving on deck, entering the water, changing rigs and returning. Swimmers can approach the stern ladder and climb back. Settings includes free recovery.
- Opening a menu pauses simulation. Focus loss, orientation change and pointer cancellation clear held actions. Switching away pauses the trip.

The touch interface remains visible on all devices, supports separate pointer ownership for the two thumbs and keeps a tall world view in portrait. It does not rely on mouse hover or pointer lock.

## Implementation

- `pixel-sprites.js`: original authored low-resolution sprites; no downloaded sprite pack.
- `pixel-world.js`: nearest-neighbour rendering, edge-triggered deadzone camera, animated water/birds/wakes, left landing and davit, fishing line attached to rod tip and driver's hand attached to tiller.
- `pixel-sim.js`: DOM-free game model and validated player actions.
- `pixel-game.js` / `pixel.css`: interface, keyboard/touch input, menus, saves, audio and page-scoped accessible tools.

The edition reuses the real metre-coordinate OSM coastline, wharf and building footprints, NOAA depth grid, SI vessel dynamics, hull collisions, swimming model, gear catalogue and economic invariants. The 24-second davit sequence, walking and fishing use active real-time durations. The game calendar advances at 2× active real time to match the 1:2 offshore passage scale; physical dynamics do not receive a second time multiplier. New and resumed days start at 06:00. Menus pause the clock. Portrait and landscape share the same simulation.

The equipment catalogue has free starter gear plus rods, reel, line, leaders, several rigs/baits, sinkers, larger cooler, sounder and drift equipment. There are five representative fish species. Habitat, depth, bait and tackle affect probabilities; species are not locked behind specific purchases. The fish reward ledger prevents double settlement. Retained fish require a counter visit; released fish earn a recorded release reward.

## Data and scope

This is an artistic fishing simulator, not a surveyed digital twin. Geography is metre-scale; character, building and boat art are deliberately stylized/enlarged for a readable pixel world. Employees are fictional, not asserted real staff identities. Fish and sea dynamics are approximations. Five species are representative, not an exhaustive regional list. Virtual catches and credits are game systems, not real-world harvest or sale guidance.

Bathymetry is the historical NOAA Monterey 2012 MHW reference grid, not a live instrument reading. MLLW tide predictions remain separate. Wind/wave/temperature come from offshore NOAA buoys around 23–40 km away; they are regional observations, not measurements at the skiff. Settings shows the observation timestamp and freshness. GitHub Pages refreshes the snapshot at scheduled minutes 17/47 when GitHub scheduling permits; the page checks it every ten minutes and retains original timestamps on failure.

Sources: `dist/SOURCES.html`, `dist/credits.html`, `dist/data/`, and `qa/wharf-correction/REFERENCES.md`. © OpenStreetMap contributors. NOAA public data. Pixel art, interface and procedural audio are authored for this game. Legacy Three.js MIT and Poly Haven CC0 assets remain attributed with the preserved 3D edition.

## Validation

`npm run check` syntax-checks every shipped JavaScript module. `npm test` covers the pixel full journey, economy, casting/bait, swim/reboarding, resume recovery, momentary mobile input, rigs and destinations, plus existing vessel/collision/geography/depth/pointer suites. See `qa/pixel/PLAYTEST.md` for actual browser evidence and responsive screenshots. Page-scoped WebMCP tools expose only normal player actions and a read-only state report; they cannot teleport, skip time, force bites or create fish.

## September 27 gameplay expansion

- **Compressed passages:** offshore powered navigation uses a 1:2 game-distance scale, smoothly returning to full scale near the landing. GPS and shoreline coordinates are unchanged. Walking, swimming, the davit and fishing retain normal active-time pacing; the calendar beginning at 06:00 now runs at 2× active real time.
- **Earn your instruments:** no starting chart, GPS, compass or depth sounder. A purchased instrument must also be packed. A paper chart enables route selection but has no own-position marker. GPS adds position/speed; the compass adds heading; the sounder adds depth and a historical bottom profile.
- **Six fishing presentations:** single-hook bottom, two-hook dropper, sliding sinker, leadhead soft plastic, slip float and two-hook feather rig. Sinker mass, current, target layer, lifting/retrieval and structure affect sinking, attraction, snag risk and species weights. Every modelled species retains a nonzero encounter weight; there are no equipment species unlocks.
- **Wildlife:** occasional bait schools with feeding seabirds, dolphin pods and seasonal whales. Region, bottom depth, daylight and sea conditions affect availability. Wildlife uses its own random source. Rates are deliberately illustrative game tuning, not observed population/catch rates.
- **Unannounced inspections:** players decide whether to keep a fish with no advance legal warning or forced release. Random patrols and occasional dock inspections assess recorded capture evidence, then confiscate supported violations from current cargo. Legal and illegal cargo have the same inspection selection process. Checks do not invent violations when a legacy save lacks evidence.

### Rule scope and references

`dist/fishing-regulations.js` is a dated **2026 snapshot**, verified September 27, with explicit Santa Cruz coverage and unknown-evidence handling. It covers the five modelled species, seasons, length and daily/possession limits, applicable groundfish tackle, landing-net/descending-device evidence and the nearby Natural Bridges / Soquel Canyon MPAs. It does not claim to implement every California fishing law. Capture dates, coordinates and tackle are stored when the fish is hooked. Daily history persists after exchange/confiscation; physical possession is counted separately.

Primary references:
- [CDFW groundfish regulations](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Groundfish-Summary)
- [CDFW California halibut limit north of Point Sur](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/San-Francisco)
- [CDFW ocean gear and species rules](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs)
- [California FGC effective-date record](https://fgc.ca.gov/Regulations/2026-New-and-Proposed)
- [Natural Bridges](https://wildlife.ca.gov/Conservation/Marine/MPAs/Natural-Bridges) and [Soquel Canyon](https://wildlife.ca.gov/Conservation/Marine/MPAs/Soquel-Canyon)
- [NOAA Monterey Bay seasonal wildlife](https://montereybay.noaa.gov/visitor/seasons.html)
- Technique/ecology citations and game-tuning boundaries are embedded in `fishing-rigs.js` and `pixel-wildlife.js`.

## Pixel usability update

- Persistent 30-slot backpack and shore locker, with original icons for all 30 catalogue items. Tap an item for details; move to an empty slot or swap occupied slots. Mouse dragging and keyboard grid navigation are also supported. Buying and packing still require the counter.
- Walking keeps the camera still across a broad screen deadzone. Scene geometry uses cached horizontal/vertical art outlines with a shared integer camera offset, while real geographic collision polygons remain unchanged.
- The calendar runs at 2× active real time, including capture timestamps. Menus pause simulation. Every new or resumed day starts at 06:00.
- Worker, boarding, engine, anchor and ladder actions follow their scene targets. The joystick and held fishing controls stay in the thumb areas.
- Original 16-bar, 100 BPM background music plus interaction, footsteps, casting, water entry, bites, reeling, catches, purchase and engine effects. Music and master sound are separately switchable; music volume is adjustable and saved. Audio starts only after a user gesture, pauses in the background and continues through inventory menus.

See `qa/pixel-usability/PLAYTEST.md` for this update’s actual browser checks.
