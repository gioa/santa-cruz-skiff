# Shore and bank hooked-fish behaviour

Researched 2026-09-29 for Pacifica, Half Moon Bay and Benicia. `dist/shore-fish-fight.js` covers all 13 biological identities in the shore simulator, including Benicia Chinook. The boat fight model remains a separate system; its earlier evidence is in `docs/fish-fight-research.md`.

## Evidence and its limits

These sources establish identity, habitat, some observed angling behaviour and appropriate presentation. None supplies a complete measured set of hooked thrust, headshake frequencies, fatigue rates or probabilities of jumping for these 13 species. All numerical coefficients in the module are explicit gameplay calibration. A habitat preference does not by itself prove a particular hooked escape motion. Do not describe the module as a scientifically validated behavioural forecast.

- [CDFW, Surf Zone Fishes](https://wildlife.ca.gov/Conservation/Marine/Surf) distinguishes sandy surf-zone surfperches from kelp/deeper-water seaperches, and identifies every supported perch. [ODFW's identification key](https://www.dfw.state.or.us/mrp/fishid/FishIDSurfperch.asp) confirms species identities and differing adult sizes. [ODFW's surfperch guide](https://myodfw.com/articles/how-fish-surfperch), updated March 20, 2026, describes schools moving in and out of surging surf near the shoreline. This supports a surf-connected, small-fish family model; the individual fight patterns below are conservative design choices.
- [Smithsonian STRI, Jacksmelt](https://biogeodb.stri.si.edu/sftep/en/thefishes/species/811) places jacksmelt in coastal pelagic habitat, at the surface and through the upper water column. [CDFW life-history information](https://wildlife.ca.gov/Conservation/Marine/Life-History-Fish) lists shallow bays, sandy beaches and vegetation. [Ken Jones's firsthand angling account](https://www.pierfishing.com/jacksmelt/) describes strong fighting for their size. A reliable primary measurement of hooked jacksmelt jumping frequency was **not found**. Optional surface leaps reflect the user's observation and an explicitly bounded simulation inference; they are not an asserted species-wide measured rate.
- [California Sea Grant, California Halibut](https://caseagrant.ucsd.edu/seafood-profiles/california-halibut) describes bottom-dwelling juveniles and adults over sandy sediment. [Newport Landing's firsthand California-halibut technique notes](https://macws37.newportlanding.com/halibutfishing.html) describe generally controlled ascents and a strong bottomward escape when a fish is hurried to the surface. They also describe repeated casts, bottom contact, pauses and gentle sideways rod sweeps, and retrieving plastics with drops between movements. The game uses a possible submerged surface-startle dive, not a halibut jump. These observations concern California halibut, not Pacific halibut.
- [California Water Boards' white-croaker habitat account](https://www.waterboards.ca.gov/water_issues/programs/ocean/cwa316/powerplants/morro_bay/docs/mb_ip2011attb1.pdf), section 3.3.8, reports schooling bottom-associated fish over sand/mud nearshore. It does not measure hooked fighting effort. Short, lower-intensity kicks are model inference, not a finding that croakers never fight strongly.
- [CDFW, Fishing for Striped Bass](https://wildlife.ca.gov/Fishing/Inland/Striped-Bass) discusses strong tidal currents, bottom bait presentation and actively fished plugs, jigs and spoons. It establishes versatile fishing methods, not a line-force curve. The model gives stripers sustained swimming runs, lateral turns and headshakes without an automatic jumping phase.
- [ADF&G, The Chinook Tradition](https://www.newsrelease.adfg.alaska.gov/index.cfm?adfg=wildlifenews.view_article&articles_id=667) describes hooked Pacific salmon leaping/thrashing and the forceful struggle of a large Chinook; [its Chinook profile](https://www.adfg.alaska.gov/index.cfm?ADFG=chinook.main) documents substantial size differences and long freshwater migrations. These support vigorous swimming and occasional surface activity, but do not mean that every Chinook jumps, that Chinook jump as often as other salmon, or that Alaska observations determine a Benicia jump frequency. The model emphasizes runs/dives and permits only some vigorous individuals to breach.

## Species coverage

The motion column is simulation design inferred from the evidence above, not observed quantitative classification. Individual seed, actual mass, current energy and player pressure modify every profile.

| Biological identity | Evidence anchor | Implemented fight character | Airborne phase |
| --- | --- | --- | --- |
| Barred surfperch | CDFW sandy surf-zone identification | Short surges, quick shakes, side turns in the surf | None |
| Redtail surfperch | CDFW/ODFW surf habitat and size | Somewhat stronger, longer surf surges than small perch | None |
| Calico surfperch | CDFW/ODFW identity and size | Compact near-bottom surges and turns | None |
| Silver surfperch | CDFW/ODFW identity and size | Small, quick midwater kicks and lateral movement | None |
| Walleye surfperch | CDFW/ODFW identity and size | Short midwater runs and fast shakes | None |
| Shiner perch | CDFW/ODFW small adult size | Brief low-force darts with fast visible body motion | None |
| Pile perch | CDFW seaperch habitat; ODFW size | Stronger bottom-oriented resistance and dives | None |
| Striped seaperch | CDFW seaperch habitat; ODFW size | Submerged turns, shakes and bottomward surges | None |
| Jacksmelt | Smithsonian near-surface pelagic habitat; direct angling account; user observation | High activity relative to size, fast shakes, lateral bursts; can ascend under pressure | Optional only after reaching the surface |
| White croaker | Water Boards sandy/muddy bottom habitat | Brief lower-force kicks with bottom preference | None |
| California halibut | Sea Grant bottom habitat; Newport Landing direct angling account | Broad lateral resistance, intermittent bursts and a possible one-time hurried surface dive | None |
| Striped bass | CDFW estuary/current and lure-fishing account | Longer runs, turns and slower strong shakes | None |
| Chinook salmon | ADF&G fishery account and species profile | Long powerful runs, dives, slower strong shakes; large mass matters | Occasional, individual-dependent surface breach |

The absence of a programmed jump for a species is a conservative simulation decision, not a claim that an individual can never break the surface. Unsupported future species receive a generic submerged fallback and cannot become jumpers through a stale display label.

## Simulation contract

`createShoreFightMotion(fish, {depth, seed, energy})` initializes an encounter. `stepShoreFightMotion(previous, fish, {dt, time, waterDepth, lineDistance, tension, rodLift, reelSpeed, drag, surfLoad})` returns a new state without mutating its input. `fish.speciesId` is authoritative through the shared identity catalogue; `weightKg` or legacy `kg` gives actual mass.

- Distances, `depth`, `airHeight` and signed `lateral` offset use metres. `run` is outward potential swimming speed, in m/s; `lateralVelocity` and `diveVelocity` are signed m/s. `diveVelocity` is positive downward, `jumpVelocity` positive upward. The simulator determines achieved motion against reel and drag.
- `pull`, `headShake`, `energy` and `splash` are normalized to 0–1. Pull already includes species and body-mass scaling; do not multiply it by species strength again. `rodLift`, `reelSpeed`, `drag` and `tension` inputs are normalized controls/load.
- The state owns elapsed fight time. Changing the scenery clock does not teleport the fish or skip its arc. Internal steps of at most 1/60 second stabilize surface crossing and pressure fatigue across phone/desktop frame rates; calls accept at most one active second.
- Surface approach changes actual depth continuously. Jump initiation requires a permitted species/individual, adequate energy, expired cooldown, water deep enough for swimming, sufficient remaining line and actual depth at or above 2.5 cm. The subsequent arc uses gravity and returns to the local water surface with a splash. It cannot launch directly from deep water; the body cannot have positive air height and positive submerged depth simultaneously.
- Underwater movement is limited by the sampled bed, and lateral displacement is bounded by current line distance. Renderers and line geometry use the same state. Rod pressure and reeling near the bank raise fish; cumulative vertical pickup keeps working beside deep banks/piers after the horizontal approach is complete. Horizontal line distance is not substituted for water depth. Actual loaded effort reduces energy. Waiting with a slack line permits modest recovery.
- Landing should use bank distance, actual control, depth, run and jump state. There is no mandatory zero-energy or elapsed-fight-time requirement. A small energetic fish can be brought in on suitable tackle; a jumping or uncontrolled fish cannot already be landed.

This module never creates a bobber. The mounted float rig alone controls float rendering. Carolina, fish-finder and lure rigs show submerged presentation, line entry, rod load and actual hooked-fish movement.

## Mechanical feedback without numeric gauges

The shore simulator exposes `state.reelFeedback` for the rendered handle, spool, rod and optional drag sound. `handleRate` is the solved winding term divided by an authored 0.7 metres per handle rotation. `linePickupRate` and `linePayoutRate` are metres per second of shrinking/growing endpoint slant reach, including vertical movement beside a pier. These are **derived kinematic estimates**: the shore engine does not yet solve an elastic paid-line spool. They are not calibrated mechanical measurements or forces in newtons.

Only active winding produces handle rotation or pickup feedback. A strong run can still increase line reach while the angler turns the handle. Lure speed relative to water is deliberately not used as handle motion: a drifting lure can move through water with the angler's hand stopped. `dragSlip` requires actual outward endpoint travel under load at the configured drag limit; a high fish-run intent alone cannot trigger ratchet sounds. `load` is normalized simulated line tension, and `slack` is a normalized low-load visual-sag cue, not a measured length of loose line.

Before/after endpoint reach is compared against the same solved physical rod tip. This keeps the calculation consistent with rod height and pier geometry while ensuring that the blank straightening under reduced load cannot itself create a false drag-slip sound.

Animate rates against active simulation time, so blur/pause freezes the mechanism and stops sound. Clearing the line or landing resets all reel feedback. Persistent rod lift denotes held posture; raising the rod is a separate change in posture or explicit twitch. A held sideways rod applies side pressure and should not be animated as repeated sweeps.

## Winding by deliberate taps

`dist/shore-reel-input.js` turns each deliberate click or non-repeating key press into up to one crank turn completed over 0.4 seconds. The unfinished budget is capped at one turn, including the active stroke. Faster clicks therefore increase average winding until the authored 2.5-turn/s cadence cap; they cannot build a long queue. After the final click the requested motion stops within 0.4 seconds. Pausing, disabling or clearing the line discards the remaining stroke.

`stepShoreReelInput` returns an explicit `crankRate` in rotations/s for every active frame, including zero when idle. The simulator converts this through the same 0.7 m/turn gear assumption used by the mechanical feedback. Explicit crank input overrides legacy held-reel, stored speed and reel-home state. In calm water an unloaded lure recovers 0.7 m per completed requested turn; bottom-tackle drag and fish resistance can reduce achieved winding, which is the rate rendered by the handle. These cadence/gear values are game calibration, not measured human or commercial-reel limits. No speed slider or automatic key repetition is needed to choose a faster average retrieve.

## Verification

`node --test tests/shore-fish-fight.test.js` verifies all 13 identities, force scaling, stronger relative jacksmelt resistance, distinct species traces, work-dependent fatigue, player lift, continuous jump ascent/arc/splash, conservative no-jump species, submerged halibut dives, depth/lateral bounds, deterministic replay and phone/desktop timestep agreement.

`node --test tests/shore-reel-feedback.test.js` checks that water motion cannot turn a stopped handle, true winding generates pickup, loaded outward runs can slip drag, sub-threshold travel is silent, winding and outward net movement can coexist, deep-pier vertical pickup remains visible, and landing/clearing stops the mechanism.

`node --test tests/shore-reel-input.test.js` checks single-stroke budgets, linear tap-frequency/line-recovery response, the cadence/queue cap, pause cancellation, and explicit zero-crank suppression of stale held/reel-home input in both beach and Benicia simulation paths.
