# Continuous shore and bank fishing

Pacifica, Half Moon Bay and Benicia use the same world canvas from walking through casting, retrieving, hooking and landing. The camera eases toward activity and fits both the angler and tackle/fish inside the area above the controls. Changes of phase do not cut to another scene. Reduced motion suppresses secondary visual movement while retaining physical positions.

## Controls

| Input | Effect |
| --- | --- |
| Tap water before casting | Aim the next cast |
| Hold/release cast or Space | Pull back the rod, then release a physical cast; watch the rod loading |
| Click the reel or press F once | Request one short crank stroke; repeated clicks set the winding cadence |
| Drag slider | Loosen or tighten the drag; watch rod bend and line payout |
| Twitch or T | Brief rod pulse for lure action |
| Strike or Space during a bite | Set the hook without changing views |

Live percentages, distance/depth counters, tension bars and predicted landing markers are absent from the fishing controls. Rod bend, line sag, current-driven motion and actual fish movement supply feedback. The reel handle and bail turn only with winding; the spool turns and the optional ratchet clicks only with loaded drag payout. These cues pause with the simulation. Equipment hook numbers and weights remain visible as useful tackle markings.

Controls remain in place during fights. Opening a menu, changing tabs or losing window focus pauses the simulation and clears held input. Saved trips retain the drag setting. Posture and reel-speed panels are absent: the rod responds to line load and discrete twitches, and the player sets winding speed by tapping.

## Rigs and techniques

Only `float_rig` creates a visible float. Carolina and fish-finder rigs settle near the bottom; line entry, rod bend and submerged motion communicate wave/current loading. A float's hook remains below its float rather than becoming the surface object itself.

- **Spoon:** wind for swimming action, pause to sink, vary tap cadence or twitch to change motion.
- **Spinner:** relative water speed drives its action, so retrieve direction and tidal current matter.
- **Grub jig:** alternate slow winding, lifts/twitches and pauses for hops and drops near the bottom.
- **Natural bait rigs:** cast and soak, or wind slowly to reposition. Surviving mounted bait and tackle stay mounted after retrieval; repeated casts do not create new supplies. Washout, snagging and line breaks still consume supplies.

Reeling changes actual tackle position and depth. Pausing allows settling. Twitch is a brief rod movement; the ordinary rod posture follows load rather than a separate posture panel. These feed the school encounter model, so maximum speed or repeated twitching is not a universal catch bonus. The simulation keeps lateral current drift while taut-line winding can recover a rig against Benicia's tide.

Hooked fish use actual mass, species profile, energy and line loading. See [research and behavioural limits](shore-fight-behavior.md). Near-surface visibility, airborne position, splashes and the attached line all read the same physical state. A fish must reach the bank under control and at a reachable depth to land; there is no mandatory zero-energy wait.

## Validation

`tests/shore-retrieve-controls.test.js` exercises all six rigs/lures at all three destinations, repeated casting and supply conservation, current recovery, and the underlying effects of winding, rod loading and twitch. Species motion and continuous camera tests are in `tests/shore-fish-fight.test.js` and `tests/shore-action-view.test.js`.

`qa/shore-controls/playtest.mjs` exercises actual pointer/keyboard controls, physical casting windup, gradual retrieval and strike transitions in Chromium. It checks phone, landscape and desktop bounds, pause behavior, mechanic-driven reel animation, absence of live numeric gauges, opaque controls and the persistent world canvas. Fixtures only place the angler, equip tackle and provide a known bite; cast, retrieval, strike and renderer paths are real.

## Consistent world scale

The shore uses the original authored pixel-art sizes for people, rods, fish and props, with a broad walking camera and closer action framing. This presentation was restored at the user's request after the metric visual correction. It intentionally differs from the simulation's 3.2 world units per metre. The physical model retains equipped rod length, cast payload, line pickup, sink depth and fish motion; screen artwork is not a ruler for those quantities.

Walking, shop collision and conversation reach follow the original scene layout. The beach shops and arrivals return to their original positions. Saves at the short-lived relocated entrance migrate once; unrelated trip positions and equipment remain intact. Reel clicks and twitches do not drive camera magnification. Only actual cast/fish positions and fight phases influence action framing.

See `dist/shore-action-view.js`, `dist/shore-movement.js` and [casting details](shore-casting-model.md). Screen-sized touch padding is an input aid.

### Tap cadence

A deliberate reel click or individual F press requests one crank stroke lasting at most 0.4 active seconds. A maximum of one turn remains pending, so rapid input cannot queue an extended unattended retrieve. At one click per second the authored unloaded 0.7 m/turn reel averages 0.7 m/s; at two clicks per second it averages 1.4 m/s. The mechanical stroke rate caps further acceleration. Fish resistance can reduce actual winding below requested motion. Holding the button or key does not repeatedly reel. Pause, line removal and landing cancel pending strokes. The UI always supplies explicit crank input, including zero, to override stale legacy automatic-retrieve state. These mechanism constants are internal and not numerical HUD readouts.
