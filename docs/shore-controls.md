# Continuous shore and bank fishing

Pacifica, Half Moon Bay and Benicia use the same world canvas from walking through casting, retrieving, hooking and landing. The camera eases toward activity and fits both the angler and tackle/fish inside the area above the controls. Changes of phase do not cut to another scene. Reduced motion suppresses secondary visual movement while retaining physical positions.

## Controls

| Input | Effect |
| --- | --- |
| Tap water before casting | Aim the next cast |
| Hold/release cast or Space | Charge/release a physical cast; the preview uses the same trajectory solver |
| Hold reel or F | Wind at the selected speed; release to pause |
| Reel-speed slider | Select 20–100% winding speed |
| Drag slider | Select 10–100% drag; low drag permits more line slip, high drag increases transmitted load |
| Rod pad | Lift/lower and sweep left/right; arrow keys adjust it, Home centers it |
| Twitch or T | Brief rod pulse for lure action |
| Retrieve or R | Start/stop gradual winding back to shore |
| Strike or Space during a bite | Set the hook without changing views |

Controls remain in place during fights. Opening a menu, changing tabs or losing window focus pauses the simulation and clears held input. Saved trips retain the selected speed, drag and rod posture.

## Rigs and techniques

Only `float_rig` creates a visible float. Carolina and fish-finder rigs settle near the bottom; line entry, rod bend and submerged motion communicate wave/current loading. A float's hook remains below its float rather than becoming the surface object itself.

- **Spoon:** wind for swimming action, pause to sink, vary speed or sweep to change motion.
- **Spinner:** relative water speed drives its action, so retrieve direction and tidal current matter.
- **Grub jig:** alternate slow winding, lifts/twitches and pauses for hops and drops near the bottom.
- **Natural bait rigs:** cast and soak, or wind slowly to reposition. Surviving mounted bait and tackle stay mounted after retrieval; repeated casts do not create new supplies. Washout, snagging and line breaks still consume supplies.

Reeling changes actual tackle position and depth. Pausing allows settling. Rod sweep changes the presentation and sideways path; twitch is a brief transient. These feed the school encounter model, so maximum speed or repeated twitching is not a universal catch bonus. The simulation keeps lateral current drift while taut-line winding can recover a rig against Benicia's tide.

Hooked fish use actual mass, species profile, energy and line loading. See [research and behavioural limits](shore-fight-behavior.md). Near-surface visibility, airborne position, splashes and the attached line all read the same physical state. A fish must reach the bank under control and at a reachable depth to land; there is no mandatory zero-energy wait.

## Validation

`tests/shore-retrieve-controls.test.js` exercises all six rigs/lures at all three destinations, repeated casting and supply conservation, current recovery, and the effects of speed, rod posture and twitch. Species motion and continuous camera tests are in `tests/shore-fish-fight.test.js` and `tests/shore-action-view.test.js`.

`qa/shore-controls/playtest.mjs` exercises actual pointer/keyboard controls, charge previews, gradual retrieval and strike transitions in Chromium. It checks phone, landscape and desktop bounds, pause behavior, opaque controls and the persistent world canvas. Fixtures only place the angler, equip tackle and provide a known bite; cast, retrieval, strike and renderer paths are real.
