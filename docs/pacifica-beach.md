# Pacifica Beach / Linda Mar

The second destination in 潮汐之间 is a playable, original pixel-art surf-fishing scene at `pacifica.html`. `pixel-locations.js` is the destination registry and provides the entry-page picker and in-game travel links. Santa Cruz's existing boat trip and equipment stay intact; each destination saves its own trip.

## The visit

Start at the beachside Bait & Tackle shop with a free shore outfit, twelve sand crabs, and 120 game credits. Walk to the surf by tapping the sand, using WASD/arrow keys, or selecting **去浪线**. Walking routes around the shop building and stays on the beach.

Set cast direction with the slider or a tap on the sea. Hold the cast button or Space to charge; release to cast. A cast consumes one selected bait. Watch for the bite, strike within its window, then hold the reel button or F to retrieve. Release during high tension and resume before the line goes slack. A successful catch may be kept or released; retained fish earn credits only after physically returning to the shop.

The shop sells three baits, a longer surf rod, a sealed spinning reel, and a fish-finder rig. Upgrades change distance, retrieval/tension, or encounter timing. If all bait is exhausted, the shop provides three free emergency sand crabs, avoiding a progression dead end. Menus and window/background interruptions pause play. Inventory, purchases, fish, and the player's position persist; reloading safely retrieves a deployed rig without refunding its bait. An undecided landed fish is preserved.

## Implementation

- `pacifica-sim.js`: DOM-free movement, cast/bite/fight state machine, inventory, economy, and validated save data. Uses `pacifica-surf-save-v1`, separate from Santa Cruz.
- `pacifica-world.js`: original procedural Canvas pixel art, shore surf animation, headlands, gulls, dune vegetation, cottages, shop, angler, and fishing line. Responsive camera and screen/world projection.
- `pacifica-game.js`, `pacifica.html`, `pacifica.css`: pointer/keyboard controls, interface, shop, bag, catches, audio, pause and persistence.
- `pixel-locations.js`, `pixel-locations.css`: expandable scene registry and destination selection.
- `tests/pacifica-sim.test.js`: ten deterministic tests including actual walking/casting/fighting/landing/trading progression, no duplicate rewards, missed bites, line failures, free bait, shop collision, and save validation.

The original Santa Cruz controller and boat simulation are not modified by this scene. The entry page only loads the scene-picker module and stylesheet.

## Reference and scope

[California State Parks describes Pacifica State Beach](https://parks.ca.gov/?page_id=524) as a wide crescent-shaped beach off Highway 1 and lists fishing among its activities. The [City of Pacifica](https://www.cityofpacifica.org/departments/parks-beaches-recreation/parks-and-beaches-locations-maps-safety-guides/pacifica-state-beach) also identifies it as Linda Mar Beach. These informed the setting; the authored map is deliberately compact and stylized rather than a geographic survey.

The Bait & Tackle shop, buildings, characters, weather and tide presentation are fictional. Species, encounters, fights, equipment prices and credits are game tuning. No live conditions or real-world fishing regulations are applied by the Pacifica simulation. UI measurements use feet and pounds; internal distance and mass remain SI.

Browser evidence and responsive screenshots are stored in `qa/pacifica/`.
