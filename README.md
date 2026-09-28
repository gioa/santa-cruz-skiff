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

Start at 06:00, a few steps from the rental counter → check the personal backpack (free starter gear is already enabled) → pay the 15-credit boat rental, then watch the empty skiff move from its deck cradle to the davit and water → walk down the real left-side stair alignment → board → unmoor → start the engine and steer, or choose a waypoint after buying and carrying a chart → coast down, deploy a purchased anchor or drift, and select a rig → lower vertically beside the boat → watch the rod and line, then strike → turn the reel and manage drag/tension → keep the fish or record/release → return, dock, walk to the counter and exchange retained catches → buy equipment and assemble each rod independently.

- **Left joystick / WASD:** walk. Aboard, the bottom console has a retained outboard tiller, twist-throttle touch surface and F/N/R gear selector. Move the tiller opposite the forward turn; slide the ribbed grip up/down to rotate the throttle. Release holds the friction settings. N idles the motor; interruption clears manual power while preserving momentum. WASD is also available for momentary keyboard steering/throttle.
- **E:** contextual interaction. **G:** walk to the hut or boarding platform.
- **R:** engine. **Q:** anchor. **I:** equipment. **M:** chart. **J:** catches.
- **Space / 船边下放:** lower the rig directly beside the boat. Casting is temporarily disabled; every rig enters the water beneath the rod tip. Tap at a bite to strike; Space while fishing provides a finite lift stroke.
- **Rod posture:** drag the bottom rod vertically to raise/lower it and horizontally to swing it. Rod load changes the bend in both the world and control panel. Arrow keys work when the rod control has focus.
- **Reel:** turn its handle clockwise or hold the handle / F to retrieve. 打开线杯 releases line; 锁住线杯 stops free spool. Drag the ✳ control up/down to adjust fighting drag. Line is finite and reeling cannot silently feed more line.
- **Rod holders:** choose 左舷 or 右舷 to place the rod in a side holder and use the outboard for slow trolling. 鱼竿 / 操船 switches controls while a small rod monitor remains on the helm. Idle and take the rod back into your hands to fight or retrieve. Only float rigs display a float; the other rigs show a line entering the water.
- Tap accessible ground once to walk there automatically. Tap the counter attendant or rental hut to approach the counter; tap the skiff or landing to take the left-side stair route. A small ground marker shows the destination. A new tap replaces the route, and the joystick/WASD takes over immediately. After enabling a chart, tap navigable water to choose an assisted course.
- The boat actions menu allows standing, moving within the deck rails, assembling rods and returning. Wharf edges and boat rails block the player; the pixel edition has no falling or swimming mechanic. Settings includes free recovery.
- Opening a menu pauses simulation. Focus loss, orientation change and pointer cancellation clear held actions. Switching away pauses the trip.

The touch interface remains visible on all devices, supports separate pointer ownership for the two thumbs and keeps a tall world view in portrait. It does not rely on mouse hover or pointer lock.

## Implementation

- `pixel-sprites.js`: original authored low-resolution sprites; no downloaded sprite pack.
- `pixel-world.js`: nearest-neighbour rendering, edge-triggered deadzone camera, animated water/birds/wakes, left landing and davit, fishing line attached to rod tip and driver's hand attached to tiller.
- `pixel-sim.js`: DOM-free game model and validated player actions.
- `pixel-seafloor.js`: categorical USGS substrate sampling with explicit gaps and a bounded, separately flagged wharf approximation.
- `pixel-fish-ecology.js`: shared per-species encounter intensities for bite timing and selection; twelve-month availability and presentation effects.
- `pixel-game.js` / `pixel.css`: interface, keyboard/touch input, menus, saves, audio and page-scoped accessible tools.

The edition reuses the real metre-coordinate OSM coastline and building footprints, NOAA depth grid, SI vessel dynamics, hull collisions, gear catalogue and economic invariants. Its wharf is simplified to one straight, constant-width deck; artwork, walking and boat collision share that outline. Walking is 2.90 m/s before the carried-weight adjustment, twice the former speed. The 24-second davit sequence and fishing use active real-time durations. The game calendar advances at 2× active real time to match the 1:2 offshore passage scale; physical dynamics do not receive a second time multiplier. New and resumed days start at 06:00. Menus pause the clock. Portrait and landscape share the same simulation.

The equipment catalogue has free starter gear plus rods, reel, line, leaders, several rigs/baits, sinkers, larger cooler, sounder and drift equipment. There are eleven representative fish species. Historical USGS substrate, NOAA depth, bait layer, month, bait form, ground-relative drift and tackle action jointly affect both the absolute bite rate and species mix; species are not locked behind specific purchases. The fish reward ledger prevents double settlement. Retained fish require a counter visit; released fish earn a recorded release reward.

## Data and scope

This is an artistic fishing simulator, not a surveyed digital twin. Geography is metre-scale; character, building and boat art are deliberately stylized/enlarged for a readable pixel world. Employees are fictional, not asserted real staff identities. Fish and sea dynamics are approximations. Eleven species are representative, not an exhaustive regional list. Virtual catches and credits are game systems, not real-world harvest or sale guidance.

Bathymetry is the historical NOAA Monterey 2012 MHW reference grid, not a live instrument reading. MLLW tide predictions remain separate. Wind/wave/temperature come from offshore NOAA buoys around 23–40 km away; they are regional observations, not measurements at the skiff. Settings shows the observation timestamp and freshness. GitHub Pages refreshes the snapshot at scheduled minutes 17/47 when GitHub scheduling permits; the page checks it every ten minutes and retains original timestamps on failure.

Sources: `dist/SOURCES.html`, `dist/credits.html`, `dist/data/`, and `qa/wharf-correction/REFERENCES.md`. © OpenStreetMap contributors. NOAA public data. Pixel art, interface and procedural audio are authored for this game. Legacy Three.js MIT and Poly Haven CC0 assets remain attributed with the preserved 3D edition.

## Validation

`npm run check` syntax-checks every shipped JavaScript module. `npm test` covers the pixel full journey, economy, vertical lowering/bait, edge blocking, personal inventory, independent rod assemblies, resume recovery, momentary mobile input, rigs and destinations, plus existing vessel/collision/geography/depth/pointer suites. See `qa/pixel/PLAYTEST.md` for actual browser evidence and responsive screenshots. Page-scoped WebMCP tools expose only normal player actions and a read-only state report; they cannot teleport, skip time, force bites or create fish.

## September 27 gameplay expansion

- **Compressed passages:** offshore powered navigation uses a 1:2 game-distance scale, smoothly returning to full scale near the landing. GPS and shoreline coordinates are unchanged. The davit and fishing retain normal active-time pacing; the calendar beginning at 06:00 now runs at 2× active real time.
- **Earn your instruments:** no starting chart, GPS, compass or depth sounder. A purchased instrument must also be enabled in the personal backpack. A paper chart enables route selection but has no own-position marker. GPS adds position/speed; the compass adds heading; the sounder adds depth and a historical bottom profile.
- **Seven fishing presentations:** single-hook bottom, two-hook dropper, sliding sinker, leadhead soft plastic, slip float, small #6 sabiki and distinct two-dropper 4/0 feather rig. Sinker mass, current, target layer, lifting/retrieval and structure affect sinking, attraction, snag risk and species weights. Every modelled species retains a nonzero encounter weight; there are no equipment species unlocks.
- **Wildlife:** occasional bait schools with feeding seabirds, dolphin pods and seasonal whales. Region, bottom depth, daylight and sea conditions affect availability. Wildlife uses its own random source. Rates are deliberately illustrative game tuning, not observed population/catch rates.
- **Unannounced inspections:** players decide whether to keep a fish with no advance legal warning or forced release. Random sea patrols and mandatory eight-second landing inspections assess recorded capture evidence, then confiscate supported violations from current cargo. Violating fish cannot be exchanged; each incurs a 100-game-credit fine, with any unpaid balance retained as debt. Legal and illegal cargo have the same inspection selection process. Checks do not invent violations when a legacy save lacks evidence.

### Rule scope and references

`dist/fishing-regulations.js` is a dated **2026 snapshot**, verified September 27, with explicit Santa Cruz coverage and unknown-evidence handling. It covers the eleven modelled species, seasons, length and daily/possession limits, applicable groundfish tackle, landing-net/descending-device evidence and the nearby Natural Bridges / Soquel Canyon MPAs. It does not claim to implement every California fishing law. Capture dates, coordinates and tackle are stored when the fish is hooked. Daily history persists after exchange/confiscation; physical possession is counted separately.

Primary references:
- [CDFW groundfish regulations](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Groundfish-Summary)
- [CDFW California halibut limit north of Point Sur](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/San-Francisco)
- [CDFW ocean gear and species rules](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs)
- [California FGC effective-date record](https://fgc.ca.gov/Regulations/2026-New-and-Proposed)
- [Natural Bridges](https://wildlife.ca.gov/Conservation/Marine/MPAs/Natural-Bridges) and [Soquel Canyon](https://wildlife.ca.gov/Conservation/Marine/MPAs/Soquel-Canyon)
- [NOAA Monterey Bay seasonal wildlife](https://montereybay.noaa.gov/visitor/seasons.html)
- Technique/ecology citations and game-tuning boundaries are embedded in `fishing-rigs.js` and `pixel-wildlife.js`.

## Pixel usability update

- Persistent personal backpack with at least 30 slots and original icons for catalogue items. All owned items remain in its grid, whether enabled or put away; previous locker contents migrate into it. Tap an item for details; move to an empty slot or swap occupied slots. Mouse dragging and keyboard grid navigation are also supported. Organizing and enabling equipment works anywhere. Only purchases, supplies and fish exchange require the counter.
- Walking keeps the camera still across a broad screen deadzone. Coastal and building artwork uses cached horizontal/vertical outlines with a shared integer camera offset. The straight wharf shares its exact outline with walking and vessel collision.
- The calendar runs at 2× active real time, including capture timestamps. Menus pause simulation. Every new or resumed day starts at 06:00.
- Worker and boarding actions follow their scene targets. Once aboard, engine, purchased anchor, gear, tiller and fishing actions sit in the bottom thumb area.
- Original 16-bar, 100 BPM background music plus interaction, footsteps, water entry, bites, reeling, catches, purchase and engine effects. Music and master sound are separately switchable; music volume is adjustable and saved. Audio starts only after a user gesture, pauses in the background and continues through inventory menus.

See `qa/pixel-usability/PLAYTEST.md` for this update’s actual browser checks.

## Personal equipment and rod assembly update

- Each owned rod has its own seven assembly slots: reel, main line, leader, rig, bait, weight and fishing layer; drag is saved separately for each rod too. Editing another rod does not change the held rod. A separate action picks it up. Parts have ownership and stock requirements, and a unique paid component transfers between rods instead of being duplicated.
- The active rod's parts drive the fishing model, including retrieval, line diameter, drag and presentation. Rig changes reset weight/layer to compatible defaults. Saves preserve each rod's assembly and hook-bait condition.
- Walking is twice as fast. Swept collision checks block wharf edges and deck movement stays within the rails. Old swimming saves recover safely at the dock while preserving equipment and catches.
- Mobile UI disables text selection and callouts. The map jump on pointer-down was a shared `.held` rule translating the entire canvas by 2 CSS pixels; that press effect now applies only to buttons. The canvas and joystick remain stationary under touch.

See `qa/pixel-rods/PLAYTEST.md` for responsive browser verification.

## Clearer dock and one-tap walking

The opening dock keeps only its functional counter attendant; three decorative bystanders are removed. The attendant has an independent sprite with a navy work cap, yellow oilskin, teal apron, silver moustache and clipboard, visibly distinct from the angler's cream sunhat and coral lifejacket. Pointer targets follow the actual enlarged artwork with a minimum 44 CSS-pixel hit area. Touch-down captures the destination, so camera movement during a tap cannot move the intended target. Building detours are planned in small batches across frames; slower phones receive more planning frames instead of a false “unreachable” result. Direct walks and the precise left-side stair corridor remain the first choices.

See `qa/pixel-walking/PLAYTEST.md` for the browser checks.

## Purchased anchor and outboard console

A physical anchor and rode costs 65 game credits and must be enabled in the personal backpack. It is separate from the drift sock and never part of free starter gear. Old saves with an active anchor but no owned/enabled anchor safely release it; no item is silently granted.

Boat actions are in a bottom console. The touch tiller and throttle retain their positions on normal release; N idles immediately, while switching F/R requires idle power, neutral and low speed. Pointer cancellation, menus, focus loss and resizing idle manual controls. Assisted chart routes retain their route through a pause; touching manual controls takes over. The interaction is based on the [Honda BF5A manual, printed pages 15 and 33–34](https://cdn.powerequipment.honda.com/marine/pdf/manuals/00X31ZV16630.pdf); touch travel and low-speed interlocks are game tuning, not manufacturer limits.

The edge-camera previously eased after integer pixel overflow, producing alternating one-pixel motion. Camera and hull now consume the same pixel overflow synchronously. Starting/stopping the engine no longer changes map scale. The camera reserves the lower console area while preserving the walking deadzone.

See `qa/pixel-helm/PLAYTEST.md` for validation and responsive screenshots.

## Rent before launching

New trips start with the skiff on its wharf cradle. The counter's explicit **付款租船 · ✦ 15** action debits 15 game credits once and begins the 24-second launch. Boarding, propulsion and fishing require both payment and the completed launch. Shopping before payment preserves the 15-credit rental balance. The price is game tuning, not a quote from the real Santa Cruz operator.

All three rental skiffs use the same hull art and scale. The selected boat moves from its actual shore cradle to the davit, then descends to the left landing; stored boats have no water wake, wave bob or mooring line. Occupancy does not resize the hull.

Version-5 saves retain payment and launch progress. Existing earlier saves already afloat or in a launch continue without a retroactive fee; unpaid shore sessions remain on shore. Recovery cannot launch an unpaid boat. If an existing paid voyage has insufficient balance for a new rental, the main entry continues that voyage and the model refuses to overwrite it with an unaffordable new trip. See `qa/pixel-rental/PLAYTEST.md`.

## Straight pixel wharf

The pixel wharf is now a single 54-metre-wide rectangle with parallel edges and a square seaward end. `pixel-geography.js` supplies the same outline to the renderer, paper chart, wildlife, walking and boat navigation. It spans the original wharf's shore-to-tip extent, connects to the beach, and retains the rental buildings, three equal-size boat cradles, left stairs and launch berth. The preserved 3D edition retains its original wharf geography. See `qa/pixel-straight-wharf/PLAYTEST.md` for validation.

## Rod, reel and vertical fishing

The bottom tackle console connects rod posture, load-dependent bending, actual paid line, a conventional reel, free spool and fighting drag. Rod movement takes up slack before lifting the rig; it never creates line. Excess fish load can slip the drag even while the handle is turning. Rod/reel/line upgrades apply only through the active rod's assembly. Normal retrieval winds the rig back to the boat; the compatibility reset remains reserved for rescue, a lost rig and patrol interruption.

Port/starboard holders support slow trolling with the bait's position responding to relative water flow and vessel movement. The current build has one actively deployed rig. Numerical rod forces, payout rates and the slow-trolling envelope are bounded game approximations, not measured performance of a particular rod or reel. The pixel-sized rod/hull artwork is enlarged for readability. Only the slip-float rig has a physical float and float-stop depth; other depth selections are reference marks and cannot automatically suspend a feather rig.

References and browser evidence are in `qa/pixel-tackle/PLAYTEST.md`.

## Measured seabed and seasonal presentations

The pixel chart now samples historical USGS Santa Cruz seafloor-character raster and habitat polygons instead of painting named-spot habitat circles. Unknown survey cells remain unknown. The encounter model uses substrate at the actual hook location; a separately documented, bounded near-wharf approximation accounts for sand and outer-pile structure where mapping is absent. NOAA depth is sampled independently.

Stationary squid strips on sand mainly attract small local bottomfish; halibut has a low incidental weight. Slow drift with a baitfish presentation is substantially more effective in the model. Rockfish and lingcod favor structure and suitable bottom presentations; feather rigs benefit from lifting. Monthly availability is soft, not an equipment or legal-season gate. Every poor-but-possible combination remains possible at a lower absolute rate. Numerical coefficients are authored game calibration, not measured field catch rates.

See [ecology evidence and monthly plan](docs/pixel-fishing-ecology-evidence.md), [seafloor reproduction](docs/pixel-seafloor-data.md), [landing checks](docs/pixel-landing-inspections.md) and [small local fish](docs/pixel-nearshore-small-fish.md). `node scripts/calibrate-pixel-ecology.mjs` records 324 month/location/method comparisons with source hashes.


## Electric-only automatic recovery

Manual reels have no automatic "recover rig" action. Turn the reel or hold its
handle / F to wind line; releasing stops manual winding. The 320-credit electric
reel boat-rod set includes a power pack and must be bought, carried and selected
as the active rod before **电动收线** appears. Ownership alone does not unlock it
for other rods. Rigs and bait remain independently consumable premade assemblies.
Automatic recovery winds real line and stops on cancellation, menus, a bite,
rod-holder changes or loss of the electric set. Fish fighting remains manual.

## Bottom contact, slack and rock snags

The controlled free-spool descent follows the sinker's actual demand with light rod loading. On seabed contact the sinker unloads the rod; only slow residual feed and line demanded by drift remain. The slack loop is bounded rather than dumping the entire spool. Closing the spool and winding/lifting clears slack and raises the rig.

Bottom contact now has a four-second grace period followed by gradually increasing snag exposure. Risk uses the actual hook-position substrate (USGS reef, mixed hard bottom and artificial structure), rig, relative current, slack, wind and waves. Clean mapped sand/mud and unknown cells are not invented rock. Lifting promptly resets unattended contact. Rates and the grace period are authored simulation tuning, not measured Santa Cruz catch or snag probabilities.

A snag fixes the terminal tackle to a world-space point; it does not immediately delete equipment or trigger a fish fight. Winding consumes slack, bends the rod, then stalls/slips at the selected drag. Loaded repeated winding or boat drift abrades the leader until remaining strength is insufficient and the line breaks. Opening the spool unloads the rod; stopping unloaded movement arrests abrasion. A broken rig and its bait are actually lost, and the player must fit replacement consumables. Pauses freeze the sequence and resumed voyages clear transient snag/force state.

Mechanical references: [ODFW bottom-fishing technique](https://myodfw.com/articles/oregon-marine-shore-fishing), [Shimano controlled fall mechanism](https://fish.shimano.com/ja-JP/content/technology/baitreel/fallever/index.html), [Temple Reef descent, drift and snag guidance](https://templereef.com/deep-dropping/), and [Shimano drag / snag precautions](https://www.shimanofishingservice.jp/img/product/manual/manual_13BIOMASTER_SW.pdf). Deep-dropping advice is used for mechanical principles only, not as a claim about Santa Cruz water depth or empirical risk.

## Fish display scale

Fish artwork uses the catch's stored length in centimetres. Catch cards and journal thumbnails share a 60 in / 5 ft measuring-board span for each viewport: 8, 16 and 32 in fish have a 1:2:4 silhouette-length ratio. Transparent sprite margins are measured once and cropped, with the species silhouette's aspect ratio preserved. Larger historical catches extend the board horizontally instead of shrinking to fit. Mobile resizing redraws at a common scale for the new width; displayed units remain US customary. This is a consistent scene/reference scale, not a claim that an inch on every physical phone screen is calibrated to a real inch.

The first-person surface fish uses the same species artwork, actual fish length, and physical fish-to-boat distance with a fixed 62-degree horizontal camera field of view and 1.35 m eye-height approximation. It appears only near the water surface, with the mouth at the line entry; deep fish do not become visible markers. Size is never inflated to a minimum icon width. Fish size rendering does not alter catch generation, line mechanics, fight strength, consumables or credits.
