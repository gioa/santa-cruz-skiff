# 潮汐之间 · Santa Cruz Skiff

A self-contained WebGL 2 / Three.js first-person wooden-skiff fishing game, inspired by Santa Cruz's Municipal Wharf and the 16-foot, 8 hp rental skiffs operated by Santa Cruz Boat Rental / Capitola Boat & Bait.

## Play

Serve `dist/` through any HTTP server; the files are ready for GitHub Pages or Vercel static hosting. No API keys, backend, build step, analytics, or runtime CDN dependencies are required.

```sh
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. Desktop keyboard + mouse is recommended. A reduced touch interface is provided. WebGL 2 and hardware acceleration are required.

## Complete journey

Walk the wharf → collect eight pieces of equipment → descend the steps to the pontoon → board and stow gear → unmoor → start the 8 hp outboard → navigate to kelp, sand or reef → stop and anchor → choose bait/rig/drag → cast, wait, strike, manage line tension → net, record and release/keep a fish → navigate home → tie up and review the trip.

- WASD: walk; W/S adjust throttle and A/D steer while aboard.
- Drag the scene: look around. Shift: walk faster.
- E: contextual interaction, including gear preparation, boarding, unmooring, docking.
- G: accessible automatic walk along the pier. WASD takes over.
- R: engine; Q: anchor; I: equipment; J: log; M: chart.
- Hold/release Space: cast. Tap Space at a bite: strike. Hold Space during a fight: lift rod.
- Hold left mouse / on-screen reel button: reel. F: toggle continuous reeling.
- Up/Down: drag adjustment during a fish fight.
- V: first-person or chase camera; P: clean photo view; photo button: PNG download.
- Escape: instructions/pause; chart has course assistance and simulated VHF recovery.

## Simulation and boundaries

Local device save/resume; session log export; three fishing grounds; five regional fish species; depth-dependent rigs, bite windows, fish stamina, drag/tension, line break and escape; current drift, momentum, boat pitch/roll, wake, fuel consumption, pier/shore collision, engine/anchor interlocks; calm/breeze/mist; ocean, engine, gull and reel audio synthesized with Web Audio.

This is a playable artistic reconstruction, **not** a geographic digital twin, a navigational chart, a safety course or a legal harvest guide. The coastline and distances are compressed. Time and fish behavior are tuned for play. Depth, weather, fish sizes and conditions are simulated, not live. The 8 hp boat visual reference and wharf inspiration are factual; wildlife abundance and catch probability are not predictions.

## Research and licenses

See `RESEARCH.md` for primary source notes and `dist/credits.html` for in-game source and license information. Game geometry, UI, textures and audio are authored for this project. Three.js and its Water/Sky addons are MIT licensed; license included at `dist/vendor/THREE-LICENSE.txt`. Ocean normal texture is from the Three.js r180 examples.

## Validation

See `qa/PLAYTEST.md` and `qa/` screenshots for the actual browser test and its limitations. The game exposes a read-only state tool and normal start/waypoint tools through WebMCP when the browser supports it. Every tool uses the same validation as the UI.
