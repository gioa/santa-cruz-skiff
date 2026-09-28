# Pacifica / Sharp Park and Half Moon Bay

The shore destinations in 潮汐之间 share Santa Cruz's `pixel.css` HUD, opening card, equipment icons, inventory grid, modal, and shop components. `pixel-locations.js` exposes all three destinations from the opening page and the in-game location control. The picker pauses every controller, including across focus and visibility changes.

## Coastline and play

Pacifica is now **Sharp Park Beach**, the dark-sand beach with Pacifica Municipal Pier, rather than Linda Mar. It has a long charcoal-gray strand, pebble bands, a rear seawall/promenade, the southern Mori Point headland, and an L-shaped concrete pier. Half Moon Bay is a compressed continuous **Dunes–Venice–Francis** coast with pale fine sand, low dunes, two creek channels, and a southern campground. Both maps scroll with the player; the coast is not squeezed into one screen.

Use **地图 / M** to inspect six coastal positions and walk to one. A shared continuous seabed model defines an inner trough, shifting alongshore bar distances, fixed channel gaps, gradual tide, and wave exposure. The same field determines visible dark water and breaking foam, tackle drift, bite timing, species weights, and fight load. Different distances and positions produce different fishing conditions.

Start with a shore outfit, twelve sand crabs and 120 game points. Visit Bait & Tackle for bait and upgrades. Tap the water to aim, hold the cast button or Space to charge, strike during a bite, and manage reel tension with the reel button or F. Keep or release catches; return to the store to exchange retained fish. If every bait is exhausted, the shop gives emergency sand crabs.

Pacifica's pier has a closed gate. At the gate, choose **翻越围栏进入**, then walk the deck or **走向桥端**. This is an explicit fictional game choice. Every 30 active seconds spent inside carries a 35% chance of inspection. A check retrieves the line, returns the player to the gate, and charges 80 points; insufficient points become debt. Leaving or reloading preserves accumulated exposure and debt. Catches sold at the shop repay debt first. These probabilities, amounts and enforcement are game rules, not statements of actual law.

## Files and persistence

- `shore-data.js`: scene registry, coast profiles, pier geometry and shared depth/current sampling.
- `pacifica-sim.js`: shared shore simulation, trades, pier routes/inspection and validated saves. `PacificaSimulation({sceneId})` supports both shores.
- `pacifica-world.js`: procedural pixel art, cached terrain chunks, waves and player-following camera.
- `pacifica-game.js`: shared shore controller and Santa Cruz shell bindings.
- `pacifica-menus.js`, `shore-navigation.js`: original-style bag, shop, catches, coastal map and gate/patrol dialogs.
- `pacifica.html`, `half-moon-bay.html`: scene entries. `pacifica.css` contains only shore-specific control and map adjustments; shared appearance stays in `pixel.css`.

Each destination retains its own progress. Pacifica's existing v1 save is upgraded without losing catches, bait, or owned equipment; new saves use version 2 and scene-specific keys. Deployed lines are safely retrieved on reload without refunding bait. Undecided catches and pending inspections persist. Paused menus and background interruptions do not advance the simulation.

See [coastal research and modeling boundaries](coastal-model.md). Tests cover the earned catch/trade loop, scene isolation, sampling and drift, pier collision, inspection accounting and save migration. Browser evidence is in `qa/coastal-scenes/`; older UI comparison evidence is in `qa/pacifica-shared-ui/`.
