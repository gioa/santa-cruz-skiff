# 潮汐之间 · Santa Cruz Skiff

A self-contained WebGL 2 / Three.js first-person wooden-skiff fishing game, inspired by Santa Cruz's Municipal Wharf and the 16-foot, 8 hp rental skiffs operated by Santa Cruz Boat Rental / Capitola Boat & Bait.

## Play

Serve `dist/` through any HTTP server; the files are ready for GitHub Pages or Vercel static hosting. No API keys, backend, build step, analytics, or runtime CDN dependencies are required.

```sh
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. Desktop keyboard/mouse and a dedicated dual-thumb touch interface are supported. Touch devices are detected automatically; Settings can force touch or keyboard mode. WebGL 2 and hardware acceleration are required.

## Complete journey

Walk the wharf → visit the counter, freely pack free starter gear or upgrades, lower the empty skiff with the davit → descend the steps to the pontoon → board and stow gear → unmoor → start the 8 hp outboard → navigate to four mapped coastal destinations or an arbitrary water waypoint → stop and anchor → choose bait/rig/drag → cast, wait, strike, manage line tension → net, record and release/keep a fish → navigate home → tie up, walk back to the hut, exchange virtual retained fish for credits, restock, buy upgrades, and recover the empty skiff with the davit.

- WASD: walk; W/S adjust throttle and A/D steer while aboard.
- Drag the scene: look around. Shift: walk faster.
- E: contextual interaction, including gear preparation, boarding, unmooring, docking.
- G: accessible automatic walk along the pier. WASD takes over.
- B: full trip tools (also available on the desktop toolbar); C: stand/sit aboard. Overboard: move/swim, use the stern ladder, or free game assistance.
- R: engine; Q: anchor; I: equipment; J: log; M: chart.
- Hold/release Space: cast. Tap Space at a bite: strike. Hold Space during a fight: lift rod.
- Hold left mouse / on-screen reel button: reel. F: toggle continuous reeling.
- Up/Down: drag adjustment during a fish fight.
- V: first-person or chase camera; P: clean photo view; photo button: PNG download.
- Escape: instructions/pause; chart has course assistance and simulated VHF recovery.

## Phone controls

- Left analog stick: camera-relative walking; horizontal steering aboard. Release returns to neutral.
- Drag the sea with a separate finger to look. Looking never reels in touch mode.
- Throttle stays where set. Use Neutral to ease down, Engine to stop the motor. These are separate from the steering stick.
- Gold action: hold/release to cast, tap to strike, hold to pump during a fight.
- Reel: hold/release, or toggle continuous reel. Minus/plus changes drag during the fight.
- Context action: gear, boarding, unmooring and docking. Bag contains equipment, log, camera and settings.
- Each surface owns its pointer. Interruptions cancel charging; modal opening, focus loss, rotation and resize clear held actions. App switching pauses the trip.
- Portrait and short landscape layouts, safe-area insets, 44–48 px minimum interactive targets, native modal scrolling and 16 px select inputs.

`npm run check` checks scripts; `npm test` exercises pointer ownership, cancellation, multitouch source isolation and analog deadzone behavior. See `qa/mobile/TESTING.md` for browser evidence and limits.

## Simulation and boundaries

Actual meter-scale OSM coast, wharf, roads and building footprints; four fishing areas and arbitrary chart waypoints; NOAA 2012 MHW elevation grid for reference depth and a purchased sounder profile; Pacific local clock 1:1 and solar day/night; attributed NOAA regional wind/wave/temperature and separate MLLW tidal predictions. Twenty-four gear/supply items, free starter equipment, virtual credits, stock, capacity, soft species probabilities, once-only catch settlement, save migration. Overboard gravity, PFD flotation, swimming effort and cold feedback, engine cut-off lanyard, stern reboarding ladder and explicit free game assistance. Empty-skiff davit lowering/recovery, authored dock workers, upgraded hull/motor details.

This is an evolving simulator, **not a surveyed digital twin**. The horizontal geography is derived from OSM at real-world scale; buildings, waves, drift, fish and propulsion remain approximate. No precise local sediment classification or verified current employee names were available: bottom materials are illustrative and staff are clearly labeled simulated characters. Historical MHW bathymetry is never presented as a live depth measurement or combined with unconverted MLLW tides. Source buoy observations come from 23/40 km offshore, not at the skiff. Five representative fish species are implemented; this is not the full regional species list. Custom morning lighting and custom seas are explicit options, while real local time/observations are the defaults.

GitHub Pages attempts a new NOAA snapshot deployment at minutes 17/47 each hour; GitHub may delay scheduled jobs. The page checks the same-origin snapshot every ten minutes. Failed refreshes retain original observation timestamps; stale observations are labeled. No account, location permission or secret API key is used.

## Research and licenses

See `dist/SOURCES.html` for current primary source notes and `dist/credits.html` for in-game source and license information. Game geometry, UI, procedural textures and audio are authored for this project, except the attributed external resources below. Three.js and its Water/Sky addons are MIT licensed; license included at `dist/vendor/THREE-LICENSE.txt`. Ocean normal texture is from the Three.js r180 examples.

## Validation

See `qa/v2/PLAYTEST.md` for this version, and `qa/PLAYTEST.md` for the historical initial-version run; `qa/` contains screenshots for the actual browser test and its limitations. The game exposes a read-only state tool and normal start/waypoint tools through WebMCP when the browser supports it. Every tool uses the same validation as the UI.

## Model authoring and reproducibility

`models/build_harbor.py` is the authored Blender scene script. Blender 5.0.1 crashed in this environment before executing it, so the shipped boat, davit and workers use authored Three.js geometry (`boat.js`, `harbor-assets.js`, `harbor-shapes.js`), not a claimed Blender export. See `models/README.md`.

`python3 scripts/refresh-marine.py` updates the public NOAA snapshot. `scripts/build-geography.py --coast <overpass-coast-buildings.json> --pier <overpass-wharf.json>` converts the attributed OSM extract. The compact source data and NOAA grid metadata ship in `dist/data/`. `npm test` verifies pointer isolation, economic invariants, geographic projection, 8 coast-safe navigation legs, immersion and vertical-datum separation.
