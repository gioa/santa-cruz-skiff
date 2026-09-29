# Pacifica / Sharp Park and Half Moon Bay

The shore destinations in 潮汐之间 share Santa Cruz's `pixel.css` HUD, opening card, equipment icons, inventory grid, modal, and shop components. `pixel-locations.js` exposes all three destinations from the opening page and the in-game location control. The picker pauses every controller, including across focus and visibility changes.

## Coastline and play

Pacifica is now **Sharp Park Beach**, the dark-sand beach with Pacifica Municipal Pier, rather than Linda Mar. It has a long charcoal-gray strand, pebble bands, a rear seawall/promenade, the southern Mori Point headland, and an L-shaped concrete pier. Half Moon Bay is a compressed continuous **Dunes–Venice–Francis** coast with pale fine sand, low dunes, two creek channels, and a southern campground. Both maps scroll with the player; the coast is not squeezed into one screen.

Tap the ground or use WASD/arrow keys to walk. The shop counter and nearby anglers trigger interactions as you approach (the closed pier gate is scenery and opens nothing); walking near the water reveals the casting controls. Closing a dialog keeps the player in place; E can reopen the nearby interaction. Doorway, conversation and gate events fire on approach rather than every frame. They rearm only after leaving a wider surrounding area, and initialize quietly on new games, restored saves and pier ejection. NPCs appearing beside a stationary player do not interrupt. Location events stop the current walk route; manual movement cancels a clicked destination. No persistent surf/shop/pier destination buttons or floating conversation buttons cover the world.

Nearby anglers may share one local clue at a time. **沿岸手记 / M** records only places and information already learned, as text and a partial hand-drawn sketch. It offers no automatic navigation and does not reveal undiscovered locations. A shared continuous seabed model defines an inner trough, shifting alongshore bar distances, fixed channel gaps, gradual tide, and wave exposure. The same field determines visible dark water and breaking foam, tackle drift, encounter rates, and fight load. Different distances and positions produce different fishing conditions.

Start with a shore outfit, twelve sand crabs in stock, a baited Carolina rig and 120 game points. Visit Bait & Tackle for bait and upgrades. Tap the water to aim, hold the cast button or Space to charge, strike during a bite, and manage reel tension with the reel button or F. Keep or release catches; return to the store to exchange retained fish. Replacement bait and rigs must be purchased and equipped; the shop does not give free emergency supplies.

Bites have no fixed chance or deadline. Fish are simulated as schools by `fish-population.js`: they spawn around the angler from habitat carrying capacity (distance to the trough and bar, depth, sand, season, sea state), patrol and linger where habitat is good, find a bait by its scent plume (carried by the surf current, longer the longer the bait soaks), by sight or by motion, then inspect it and bite or leave depending on bait, hook and rig fit, bait depth, stability and hunger. A splash spooks wary fish; recasting restarts the scent trail; a hooked fish leaves its school and the strike cannot reroll its species or size. The rod tip twitches (竿尖轻点) while a fish is testing the bait. See [population model](fish-population-model.md).

The five shore species are barred surfperch, striped bass, California halibut, white croaker and jacksmelt. White croaker favor squid or cut fish near sandy bottom. Jacksmelt favor small baits presented higher in the water, with incidental sand-crab/Carolina catches still possible. Both occur in regional beach surveys; neither requires an arbitrary long-cast unlock or pier-only rule.

A quick tap now makes a short lob; hold up to 1.8 seconds for full effort. The charge meter previews real throw distance from the rod's release point. Rod length, sinker plus bait mass, loading and drag determine flight, and standing back or aiming sideways reduces offshore reach. A weak cast can land on sand or the pier deck and be recovered without entering fishing. This is the same trajectory shown by the flying tackle, not a fixed offshore offset. See [casting model](shore-casting-model.md).

The authored 1 oz/#1 Carolina and 3 oz/2/0 Fish-finder kits have different sink and holding behavior. The heavier rig can hold better in surf, while its larger-hook presentation is less suitable for small perch. The #6 float rig suspends a small bait portion approximately 1 m below the surface where depth permits; this is a fixed game configuration, not a universal real-world optimum. Jacksmelt use actual bait depth rather than requiring bottom contact. Wave height, period, shoaling, breaking and orbital motion act on settling, bottom contact, drift, bait wear and fight tension. The HUD reports offshore distance and observed tackle state; it does not reveal exact species probabilities or undiscovered habitat. Hs and period describe a simulated sea, not a local live forecast.

Pacifica's pier has a closed repair fence across its landward ramp. The game gives no notice, prompt or hint about it.

### Spoiler: the pier easter egg

Keep walking into the gate (about 1.2 s of pushing), press E beside it, or tap the deck while standing at it, and the angler slips through a gap. On the deck, tap or walk to move along the L; walk back to the gate to leave. Each visit rolls once: 10% of visits meet a patrol at a random moment 20–150 active seconds after climbing on (`PIER_RULES`). A caught angler is walked back to the gate and loses every carried fish; there is no fine. Leaving before the patrol arrives escapes it, and the roll is saved with the trip, so reloading cannot reroll it. The patrol and its odds are game rules, not a statement about real enforcement.

### Beach warden

A fisheries warden occasionally walks the beach (first after 4–9 minutes, then every 7–15 minutes) and checks carried fish against `shore-regulations.js`, the same rules as the in-game handbook: halibut 22 in and 2/day, striped bass 18 in and 2/day, surfperch 20 combined with 10 per species, white croaker 10, jacksmelt unlimited, 20 finfish overall. Daily bags count fish already sold that day. A legal bag gets a friendly word; any violation costs 100 points per violating fish plus the whole carried catch, as at Santa Cruz landings. Shore fish record their length (weight follows a length–weight relation) and show it in inches everywhere.

## Files and persistence

- `shore-data.js`: scene registry, coast profiles, pier geometry and shared depth/current sampling.
- `shore-fish-ecology.js`: evidence-informed species preferences split into habitat suitability, feeding, bait appeal and scent, plus the shore species' school, movement and sensory parameters.
- `fish-population.js`: shared agent-based school model (also used at Santa Cruz).
- `shore-regulations.js`: shore size and bag rules and the warden's assessment.
- `shore-presentation.js`: terminal-tackle settling, suspended bait depth, bottom contact, stability and wave/current drift.
- `pacifica-sim.js`: shared shore simulation, trades, pier routes/inspection and validated saves. `PacificaSimulation({sceneId})` supports both shores.
- `pacifica-world.js`: procedural pixel art, cached terrain chunks, waves and player-following camera.
- `pacifica-game.js`: shared shore controller and Santa Cruz shell bindings.
- `pacifica-menus.js`, `shore-navigation.js`: original-style bag, shop, catches, coastal map and patrol/warden dialogs.
- `pacifica.html`, `half-moon-bay.html`: scene entries. `pacifica.css` contains only shore-specific control and map adjustments; shared appearance stays in `pixel.css`.

Each destination retains its own progress. Existing v1/v2 saves migrate to version 3 without losing catches, bait stock, or owned equipment; old saves that did not track bait on hooks do not receive free mounted bait. Scene-specific keys keep journeys separate. Deployed lines are safely retrieved on reload without refunding bait or rerolling an unfinished encounter. Mounted bait condition, equipment, the trip's fishing date, undecided catches and pending inspections persist. Paused menus and background interruptions do not advance the simulation.

See [coastal research and modeling boundaries](coastal-model.md), [shore ecology evidence](shore-ecology-evidence.md) and [wave modeling](shore-wave-model.md). Ecological sources support preferences and habitat; numerical rates, distances and gear coefficients remain authored game parameters. Tests cover encounter-rate comparisons, physical presentation, persistence, the earned catch/trade loop, scene isolation, pier collision and inspection accounting. Browser evidence is in `qa/coastal-scenes/` and `qa/shore-first-person/`; older UI comparison evidence is in `qa/pacifica-shared-ui/`.
