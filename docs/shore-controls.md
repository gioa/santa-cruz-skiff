# Continuous shore and bank fishing

Pacifica, Half Moon Bay and Benicia use the same world canvas from walking through casting, retrieving, hooking and landing. The camera eases toward activity and fits both the angler and tackle/fish inside the area above the controls. Changes of phase do not cut to another scene. Reduced motion suppresses secondary visual movement while retaining physical positions.

## Controls

| Input | Effect |
| --- | --- |
| Tap water before casting | Aim the next cast |
| Hold/release cast or Space | Pull back the rod, then release a physical cast; watch the rod loading |
| Right action button or F | Press to raise the rod; hold to wind; release to stop and lower it |
| Left drag slider, after casting | Loosen or tighten the drag; watch rod bend and line payout |
| Press the same action button, or Space, during a bite | Raise the rod to set the hook without changing views |

Live percentages, distance/depth counters, tension bars and predicted landing markers are absent from the fishing controls. Rod bend, line sag, current-driven motion and actual fish movement supply feedback. The reel handle and bail turn only with winding; the spool turns and the optional ratchet clicks only with loaded drag payout. These cues pause with the simulation. Equipment hook numbers and weights remain visible as useful tackle markings.

Controls remain in place during fights. Opening a menu, changing tabs or losing window focus pauses the simulation and clears held input. Saved trips retain the drag setting. Posture and reel-speed panels are absent: the rod responds to line load and the single lift/wind gesture. Drag stays hidden before casting, appears on the left while line is out, and hides again after landing. One combined lift/wind button sits on the right. Focused Space/Enter follows its press/hold/release gesture.

## Rigs and techniques

Only `float_rig` creates a visible float. Carolina and fish-finder rigs settle near the bottom; line entry, rod bend and submerged motion communicate wave/current loading. A float's hook remains below its float rather than becoming the surface object itself.

- **Spoon:** wind for swimming action, pause to sink, vary hold/pause timing or use a short lift to change motion.
- **Spinner:** relative water speed drives its action, so retrieve direction and tidal current matter.
- **Grub jig:** alternate slow winding, short lifts and pauses for hops and drops near the bottom.
- **Natural bait rigs:** cast and soak, or wind slowly to reposition. Surviving mounted bait and tackle stay mounted after retrieval; repeated casts do not create new supplies. Washout, snagging and line breaks still consume supplies.

Reeling changes actual tackle position and depth. Pausing allows settling. A short press lifts the rod and tackle without winding line; releasing lowers the rod. The model also preserves rod bend under load. These feed the school encounter model, so continuous winding or repeated lifts is not a universal catch bonus. The simulation keeps lateral current drift while taut-line winding can recover a rig against Benicia's tide.

Hooked fish use actual mass, species profile, energy and line loading. See [research and behavioural limits](shore-fight-behavior.md). Near-surface visibility, airborne position, splashes and the attached line all read the same physical state. A fish must reach the bank under control and at a reachable depth to land; there is no mandatory zero-energy wait.

## Validation

`tests/shore-retrieve-controls.test.js` exercises all six rigs/lures at all three destinations, repeated casting and supply conservation, current recovery, and the underlying effects of winding, rod loading and twitch. Species motion and continuous camera tests are in `tests/shore-fish-fight.test.js` and `tests/shore-action-view.test.js`.

`qa/shore-controls/hold-controls-playtest.mjs` exercises actual held pointer/keyboard controls, release/cancellation, post-cast drag visibility and left/right layout in Chromium. It checks phone, landscape and desktop bounds, pause behavior, mechanic-driven reel animation, absence of live numeric gauges, opaque controls and the persistent world canvas. Fixtures only place the angler, equip tackle and provide a known bite; cast, retrieval, strike and renderer paths are real.

## Authored visual proportions

The shore uses the original authored pixel-art sizes for people, rods, fish and props, with a broad walking camera and closer action framing. This presentation was restored at the user's request after the metric visual correction. It intentionally differs from the simulation's 3.2 world units per metre. The physical model retains equipped rod length, cast payload, line pickup, sink depth and fish motion; screen artwork is not a ruler for those quantities.

Walking, shop collision and conversation reach follow the original scene layout. The beach shops and arrivals return to their original positions. Saves at the short-lived relocated entrance migrate once; unrelated trip positions and equipment remain intact. Pressing and holding the action button do not drive camera magnification. Only actual cast/fish positions and fight phases influence action framing.

See `dist/shore-action-view.js`, `dist/shore-movement.js` and [casting details](shore-casting-model.md). Screen-sized touch padding is an input aid.

### One lift/wind gesture

Pressing the right action button raises the rod immediately. A short press only lifts; a continuous hold of 220 milliseconds starts winding. Release supplies zero crank input and returns the rod to its lowered position, with no queued turn or toggle. At a bite the same press sets the hook. F and focused Space/Enter behave the same way. Rod lift feeds actual tackle and fight physics, while fish resistance determines line pickup. Loaded drag may continue paying line out after the handle stops.

Pointer cancellation, lost capture, window focus loss, menus, page changes, line removal and landing all clear the gesture. Moving keyboard focus away clears focus-bound keys; a captured reel pointer remains held while a second thumb adjusts drag. Internal thresholds and mechanism values are not shown as numerical HUD readouts.

### Shared daily conditions

The three shore pages select `clockMode: 'shared'`. The public calendar follows the real `America/Los_Angeles` date and time. Climate, tide, waves, Benicia crowds and visiting beach anglers are derived from that clock. Old trip dates do not override today's conditions; inventory, catches and progress remain personal. Tide and wave phase use continuous epoch seconds across midnight and daylight-saving changes. A paused cast or fight still advances only by active physics seconds when play resumes.

Background schools are a pure function of scene, date, civil time and canonical spatial tiles. School identity, cohort size, background movement and decision channels do not depend on a player's random seed, cast counter or path through the map. Attraction, fright, local NPC competition and fish removed from a school remain personal simulation effects. Depletion survives reloads and leaving/re-entering an area. The regular angler's in-progress fishing remains a local interaction; this is shared background opportunity, not a networked multiplayer population or a promise of identical catches. The clock comes from the device, so this provides reproducibility rather than protection against clock tampering.

Surf-profile caches calculate from the same canonical inputs used in their keys, including every seabed parameter. Visiting another location or warming a cache in a different order therefore cannot alter the shared depth, waves or foam.

Offline tests may explicitly use the original trip clock and injected RNG. `scripts/simulate-shore-day.mjs` instead drives the production shared mode with an accelerated `now()` provider, natural schools, real casts/retrieval/landings and finite shop supplies. Its default experiment covers 36 scheduled 15-minute sessions: six tackle profiles, two positions and three California start times. `--verify` repeats every session. Reports distinguish bites, hooked fish, landed catches, ongoing fights, blanks and supply exhaustion. They measure an informed scripted policy with precise placement and tension feedback, not human-player probabilities or real-world catch forecasts.
