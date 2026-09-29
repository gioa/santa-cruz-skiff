# Shore casting: equipment, flight and landing

Reviewed 2026-09-28. Pacifica and Half Moon Bay share this model. Rod classes and loading behavior are grounded in manufacturer specifications and guidance; launch effort, tackle aerodynamics and cast-distance tuning are authored game parameters. No measured distribution of casts by local anglers is claimed.

## Evidence and equipment classes

| Primary source | Supported use | Boundary |
| --- | --- | --- |
| [Daiwa, How to choose the right fishing rod](https://www.daiwa.com/scandinavia/fishing_tips/How_to_choose_rod?category=ALL&page=1), casting weight and rod length sections | Light loads fail to load the blank effectively; excessive loads reduce control; a longer rod can improve casting distance. A 7–8 ft rod is a typical beginner all-round class. | Does not supply launch energy, distance distributions or numerical penalties. |
| [PENN Battalion III Inshore specifications](https://www.pennfishing.com/products/battalion-iii-inshore-spinning-1656704), model BATINIII1220S70 | Example 7 ft medium-heavy rod rated ½–1½ oz; used as the reference class for the authored starter rod, 2.13 m and 14–42 g. | This is a specific class, not a claim that all 7 ft rods have this rating. |
| [PENN Squadron IV Surf specifications](https://www.pennfishing.com/collections/shop-by-technique/products/squadron-iv-surf-conventional-rod-1641598), model SQDSFIV1220C10 | Example 10 ft medium rod rated 1–4 oz; used as the reference class for the authored surf rod, 3.05 m and 28–113 g. | No guaranteed extra distance comes with the longer rod. |

Ratings apply to the modeled total payload, including sinker, rig and bait. The existing Carolina rig has a 28 g sinker; the fish-finder rig has an 85 g sinker. Bait and remaining terminal tackle add mass and aerodynamic drag. The 85 g sinker alone already exceeds the starter rod's rating. It remains possible to equip this rig, but its overload penalty impairs the cast. Buying the surf rod no longer grants a fixed 72 ft bonus.

## Flight and control

The model integrates gravity at 9.81 m/s², quadratic aerodynamic drag and an authored line-drag term. Quadratic drag follows `F = ½ ρ Cd A v²`, opposing relative motion through air; see [NASA Glenn's drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/). NASA establishes the equation, not fishing-tackle coefficients: projected areas, drag coefficients and line losses here remain game tuning.

Launch energy depends on rod length and the player's 0–1 effort. A nonlinear energy curve preserves gentle near-shore lobs. Weight below the rod's useful loading range and payload above its rating both impair transfer. The model does not add a universal minimum distance or force a short tap to 25% effort. Air time follows the calculated flight, so long casts stay airborne longer.

The predicted landing is derived from the actual casting origin and aim. Turning sideways redistributes a cast's range instead of adding free lateral distance. Shoreline setback consumes the same range as any other horizontal travel. A cast can finish on sand or on the pier deck; landing checks must not snap such casts out to a minimum offshore distance. Only a water landing proceeds into sinking, wave-driven presentation and encounter sampling.

## Shared prediction and simulation

```js
sim.previewCast({power, aim});
sim.cast({power, aim});
```

Both entry points use the same pure `createShoreCast` calculation. The preview must not mutate equipment, statistics or the encounter hazard budget. Releasing at the previewed effort uses the same trajectory inputs; the UI must not compute a separate distance formula.

Scene geometry uses 3.2 world units per metre. Cast travel is the horizontal origin-to-target distance; offshore distance is measured separately from the local shoreline. They are different quantities when the player stands inland, aims diagonally or casts from the pier. Fish habitat sampling continues to use the actual target and its shoreline-relative position.

## Calibration and model limits

The following are reproducible model outputs for a fresh sand crab, still air, a beach release and a straight cast. They are authored game calibration, not measured angler distances:

| Action and equipment | Horizontal travel |
| --- | ---: |
| Starter + Carolina, tap / half / full effort | 5.1 / 20.6 / 45.2 m |
| Surf + Carolina, tap / half / full effort | 5.3 / 31.2 / 67.1 m |
| Surf + fish-finder, tap / half / full effort | 5.3 / 26.1 / 61.8 m |
| Overloaded starter + fish-finder, full effort | 14.9 m |

Pointer, global Space, focused-button Space/Enter and accessibility clicks share the same input curve. Full effort takes 1.8 seconds; a click without a hold is a gentle lob. A 90-millisecond press is 5% effort. The charge meter uses the real preview to show estimated throw distance and whether the cast can reach water. The normal walk-to-surf target moves to 25 world units behind the shore reference, rather than the old 57 units. The animation samples the same flight trajectory and projects its height at 3.2 world units per metre; it no longer adds a fixed 115-unit arc.

`createShoreCast(sceneId, state, {power, aim})` returns the origin, target, actual horizontal `distance`, separate `offshoreDistance`, `landing`, `flightDuration`, time-stamped `trajectory`, payload and loading details. `shoreCastPosition(cast, elapsed)` samples that trajectory for rendering. The plan is transient and is not restored as a deployed line after reloading.

The version-3 ecology calibration uses an explicitly equipped surf rod in all comparisons so requested habitat targets are physically reachable. Channel scenarios target the actual bar gap at `barDistance`, and the long cast is the fitted rig's calculated maximum. It records both requested offshore position and actual origin-to-landing travel. The previous 18–72 m algebra is not used to place a hook. The float rig adds 2 g of float mass to 12 g of lead and 3 g of terminal tackle; squid and anchovy are trimmed to 2.5 g for the small hook. Its extra effective drag area of 0.0006 m² is an authored float approximation. The listed bottom-rig casting outputs are unchanged.

Exact results depend on payload, bait, rod and geometry. A 3–6 m lob cannot reach water if the angler stands farther inland than its travel range. No landing is moved into a productive fish band to compensate.

This is a compact projectile model, not a flexible-rod finite-element simulation, a casting-skill measurement or a weather forecast. It does not claim measured human release speeds, bait shapes, reel friction, line aerodynamics or rod failure thresholds. After water entry, the existing [shore wave model](shore-wave-model.md) controls sinking and drift. The casting model does not reinterpret wave height as wind speed.

`tests/shore-casting.test.js` and `tests/shore-cast-render.test.js` compare preview with actual landing, short taps with sustained holds, loaded with overloaded rods, diagonal with straight casts, and dry/deck with water landings. `qa/shore-ecology/playtest.mjs` checks actual pointer/keyboard interactions, cancellation, short accessibility clicks, charge feedback and dry landing in both scenes. These checks establish consistent game behavior, not empirical validation of real casting distances.
