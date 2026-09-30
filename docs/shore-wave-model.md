# Shore waves, surf and whitewater

Pacifica (Sharp Park) and Half Moon Bay share one surf model, `dist/shore-surf.js`, read through `dist/shore-data.js`. The same field drives the continuous shore scene, tackle forcing and fish habitat. It is a deterministic game model built from buoy climate statistics and standard surf-zone formulas, not a forecast, a survey or a spectral wave solver.

## Sea state: buoy climate

Without an explicit scenario, each trip day draws its offshore sea state from that month's statistics at the nearest NOAA NDBC buoy (`climateSeaState`).

| Beach | Buoy | Record | Monthly Hs median (m) | Winter p90 (m) | Dominant period (s) |
|---|---|---|---|---|---|
| Pacifica | [46237 San Francisco Bar](https://www.ndbc.noaa.gov/station_page.php?station=46237) (nearshore) | hourly 2019–2024 | 1.08 (Aug) – 2.13 (Jan) | 3.36 (Jan) | 11.8–14.3 |
| Half Moon Bay | [46012 Half Moon Bay](https://www.ndbc.noaa.gov/station_page.php?station=46012) (24 nm offshore) | hourly 2019–2023 | 1.60 (Sep) – 2.97 (Jan) | 4.60 (Jan) | 9.1–13.8 |

- Height and period are lognormal fits to each month's median and 10th/90th percentiles ([NDBC historical data](https://www.ndbc.noaa.gov/historical_data.shtml)). They are deterministic per date and drift ±12% through the game day.
- The mean wave direction is refracted from deep water to about 8 m depth with Snell's law.
- Half Moon Bay's beaches sit in Pillar Point's shadow. An exposure factor of 0.42 (north, Dunes) to 0.72 (south, Francis) converts the offshore buoy height into the incident height. Pacifica's nearshore buoy needs only 1.00–1.08.
- Tests and QA can pass an explicit `seaState` (`waveHeightM`, `wavePeriodS`, `waveDirectionDeg`, `tideM`), which overrides the climate.

The tide is one 12.42-hour cycle on the shared game clock. It is not a local tide prediction.

## Beach shape

| | Sharp Park | Half Moon Bay |
|---|---|---|
| Beach face | 20 m at 1:10, coarse dark sand | 30 m at 1:25, fine sand |
| Nearshore slope | 1:45 | 1:77 |
| Bar | ~60 m out, 0.85 m relief | ~108 m out, 1.15 m relief |
| Rip channels | 5 | 4 (two at creek mouths) |

- The bar position wanders alongshore. Rip channels cut through it.
- The beach face continues inland of the mean-tide shoreline, so a rising tide moves the real waterline up the beach. At high tide on Half Moon Bay's flat face that is about 15 m.
- **Shoreline plan shape** (`coast` in `shore-data.js`) combines:
  - the bay's broad curve;
  - irregular shoreline sand waves;
  - an erosional embayment (mega-cusp) behind each rip channel ([MacMahan, Thornton & Reniers 2006](https://doi.org/10.1016/j.coastaleng.2005.10.009));
  - rhythmic beach cusps whose spacing and relief wander.

  Sharp Park's steep coarse face gets ~30 m cusps with about 2 m relief. Half Moon Bay's flatter face gets longer, fainter ones.

## Individual waves

- **Heights.** Each wave has its own height, Rayleigh distributed with Hs as the mean of the highest third (Longuet-Higgins 1952). [Thornton & Guza (1983)](https://doi.org/10.1029/JC088iC10p05925) found the distribution still holds approximately in the surf zone. A slow envelope groups waves into sets.
- **Short crests.** Real swell has directional spread, so a wave's height varies along its crest in sections of about 90 m (±22%).
- **Shoaling.** Heights shoal by energy-flux conservation with the linear-theory group velocity. The dispersion relation `ω² = g k tanh(k h)` is solved exactly.
- **Breaking.** A wave breaks when `H ≥ γb h`. γb is 0.72 on a flat bed (McCowan's 0.78 is the usual approximation) and rises to 1.15 on steep beds and for plunging waves.
- **Peeling.** Once part of a crest breaks, the break runs along the crest into neighbouring parts within about 15% of breaking, within ±60 m. Surfers call this peeling (Walker 1974; Hutt, Black & Mead 2001).
- **Breaker type.** The type comes from the Iribarren number at breaking: spilling below 0.4, plunging from 0.4 to 2, surging above 2 (Battjes 1974). Sharp Park's steep face gives a plunging shorebreak; Half Moon Bay's gentle outer bar breaks between spilling and weakly plunging.
- **Broken waves.** They follow [Dally, Dean & Dalrymple (1985)](https://doi.org/10.1029/JC090iC06p11917): the energy flux decays toward a stable height Γh (Γ = 0.4, K = 0.15).
  - Bigger bores stay bigger for longer.
  - A bore that crosses a bar into a deep trough decays to Γh and re-forms into an unbroken wave, which breaks again at the shorebreak.
  - Inner surf-zone heights settle around 0.5–0.6 h, consistent with the Hrms ≈ 0.42 h saturation of [Thornton & Guza (1982)](https://doi.org/10.1029/JC087iC12p09499).
- **Roller intensity.** Each cell records how far the bore still is above its stable height, so a dying bore fades rather than switching off.
- **Swash.** Every wave that reaches the still-water line ends as a bore in the swash.

## Whitewater and foam

Foam follows what can be seen from a pier or a time-exposure camera.
- The roller and bubble plume of a breaking wave are bright for a few seconds (e-folding 4 s).
- The foam mat a wave leaves behind lasts about a minute (e-folding 60 s). Bores and the surface mass transport push it shoreward at about 0.5 m/s, and it spreads as it goes.
- The last five waves are tracked individually. Older foam comes from an ensemble mean over Rayleigh height quantiles, summed geometrically.
- The result matches time-averaged (Argus) images of barred beaches (Holman & Stanley 2007): a bright band over the bar, a darker trough with drifting foam lace, and a bright band where every wave finishes at the shore.
- At low tide on Half Moon Bay the bar is only ~0.5 m deep. Waves dump on it and a sheltered runnel with small re-formed waves remains inside.

The foam lifetime, drift speed and spreading are game choices within the observed range. They are not measurements at these beaches.

**Rendering (`pacifica-world.js`).**
- Foam, bores and lips are drawn opaque into an offscreen layer and composited once, so neighbouring cells never double-blend into seams.
- Whitewater spreads a few metres sideways into unbroken parts of a crest.
- Floating foam gathers into patches that drift shoreward; thin foam is drawn as scattered lace off the cell grid.
- Depth shading blends between tones with a little grain.
- The sand bands (swash-wetted, damp, sand, dry) and the wrack line at the last high tide each wander independently of the shoreline.

## Runup and swash

[Stockdon et al. (2006)](https://doi.org/10.1016/j.coastaleng.2005.12.005) setup, incident and infragravity swash give the runup statistics on each beach face.
- Each arriving bore runs up in proportion to its own height over about 0.35 T, then drains back.
- The uprush is an aerated white sheet. Its lobed front differs from wave to wave.
- The backwash thins to glassy water with foam lace.

## Currents and tackle forcing

- **Longshore current:** [Longuet-Higgins (1970)](https://doi.org/10.1029/JC075i033p06778) scale, `V ≈ 1.17 √(g Hb) sinθb cosθb`, shaped by the Rayleigh breaking fraction `Qb = exp(−(0.78 h / Hrms)²)`.
- **Rip jets and undertow:** rips run through bar gaps and are fed by alongshore flow. Undertow is about 0.12 √(g h) Qb near the bed.
- **Bottom orbital velocity:** `U = 0.5 H ω / sinh(k h)`, from linear wave theory ([NOAA NOS CS 8](https://repository.library.noaa.gov/view/noaa/2466/noaa_2466_DS1.pdf)).

Coefficients that turn these into drag, turbidity or tackle load are game calibration. Heavy surf (for example 2.8 m / 16 s) moves rigs and turns fish off. The calibration shows trough fishing at Sharp Park nearly stopping in it.

## Visible tackle response

Most shore rigs have no bobber. Carolina and fish-finder rigs show wave effects through the rod, line, water-entry ripple and simulated underwater drift/holding. Their sinker and bait remain submerged. The mounted rig controls float artwork; stale presentation state cannot add a bobber to a bottom rig.

Both shore cameras use `shore-tackle-visual.js` to read the water at the visible contact point. The float rises and falls with `surfaceElevation`, leans with local flow, and has its base covered by passing breaker foam. Adjacent wave-height envelopes blend smoothly between crests so a new wave never produces a height jump. First-person height uses the same perspective scale as the drawn crests.

The waiting rod now bends with the simulation's tension. The line stays attached to the rod and water contact; tension takes up its sag and local flow bows it near the water. The simulation already moves the tackle horizontally, so rendering adds no second orbital drift. Bite dipping remains separate from wave motion.

These are read-only visual responses to the existing simplified physics, not a flexible-line or buoyancy solver. Calm water adds no artificial float bobbing. Pausing holds the same frame; reduced motion samples both surf artwork and water contact at the same fixed time, while gameplay positions and tension remain responsive.

## API

```js
climateSeaState(sceneId, 'YYYY-MM-DD', gameHours)  // → {waveHeightM, wavePeriodS, waveDirectionDeg, month, source, climate:true}
shoreProfile(sceneId, x, elapsed, seaState)          // bar, trough, slopes, tide, incident Hs/T/θ, exposure
sampleShore(sceneId, x, y, elapsed, seaState, {surf}) // depth, currents, orbital motion, Qb, foam, runup, crest state
shoreSurfField(sceneId, x, elapsed, seaState)       // renderer column: crests, foamAt(d), swash, waterline
shoreWaveCrests(sceneId, x, elapsed, seaState, max)  // crest roots (m offshore)
```

World coordinates use 3.2 px per metre. `sampleShore(..., {surf:false})` skips individual waves for fish and habitat queries, which only need the statistical fields.

## Verification

`tests/shore-waves.test.js` checks:
- calm-water force closure and zero-height behaviour;
- bar dissipation and rip gaps;
- the dispersion relation and orbital velocity;
- crest propagation, sets, tide and direction coupling;
- finite output for malformed input;
- short-crested breaking without single-column flicker;
- whitewater reaching the real waterline at every tide, with none on dry sand.

`tests/shore-sim.test.js` and `tests/shore-technique.test.js` check that winter swell and heavy surf change tackle and fishing outcomes. `qa/shore-surf/preview.html?scene=&hs=&tp=&x=&t=&focus=&tide=&animate` renders any sea state for visual review.

`tests/shore-tackle-visual.test.js` and `tests/shore-fight-view.test.js` cover crest continuity, calm-water stillness, local water contact, attached line endpoints, tension/flow response, foam layering and reduced motion. Browser scenarios and screenshots for both beaches are in `qa/shore-wave-tackle/`.

Shore gameplay now keeps casting, retrieval and fighting on the same world canvas. Action zoom follows the physical rod, line entry and fish rather than switching to the legacy first-person renderer. See [shore controls](shore-controls.md) and [species fight behaviour](shore-fight-behavior.md).
