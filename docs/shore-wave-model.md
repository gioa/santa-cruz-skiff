# Shore waves and tackle forcing

The Pacifica and Half Moon Bay surf scenes use **authored scenarios**, not measured bathymetry, a live buoy feed, or a forecast. This model preserves each existing beach's sandbars, troughs, channels, and pier geometry. The previous free-running renderer wave bands and fixed-strength currents have been replaced with one deterministic field shared by both cameras and shore tackle physics.

## Evidence and scope

- [NWS significant wave height](https://www.weather.gov/mfl/waves): significant height describes the highest third of a wave population; individual waves vary. The model retains a scenario significant height and gives representative waves a repeatable set/lull envelope. It is not a statistical extreme-wave generator.
- [NOAA Technical Memorandum NOS CS 8](https://repository.library.noaa.gov/view/noaa/2466/noaa_2466_DS1.pdf), section 4.2: near-bottom orbital amplitude is derived from linear wave theory as `U = 0.5 H ω / sinh(k h)`. Local wave number satisfies `ω² = g k tanh(k h)`; the code solves this relation iteratively. This makes period matter: longer swell reaches the bottom more strongly than short waves at the same depth and height.
- [NOAA-hosted coastal technical report, appendix C](https://repository.library.noaa.gov/view/noaa/13283/noaa_13283_DS1.pdf): `H_b ≈ 0.78 h_b` is a common approximate breaking criterion. It is used here as a depth limit, not a universally exact breaker height. Bars dissipate energy before waves enter the inner trough; channel cuts allow more energy through.
- [NWS rip-current science](https://www.weather.gov/safety/ripcurrent-science): alongshore differences in wave breaking create setup differences; feeder currents converge into deeper gaps and flow offshore. Mean surf circulation here scales with wave energy and approximate adjacent-bar breaking. The original channel positions determine its direction. Turning waves off also turns this surf-driven circulation off.

All coefficients converting wave energy into current, sediment visibility, runup, or normalized tackle load are explicit **game calibration**, not local measurements. This is a small deterministic coastal model, not a full spectral wave, sediment transport, or hydrodynamic solver.

## Public API

```js
shoreProfile(sceneId, x, elapsed = 0, seaState = {})
sampleShore(sceneId, x, y, elapsed = 0, seaState = {})
shoreWaveCrests(sceneId, x, elapsed = 0, seaState = {}, maxOffshore = 220)
```

Scene coordinates use 3.2 world pixels per metre. `elapsed` is seconds. Existing profile/sample fields are retained.

The optional scenario object accepts:

| Field | Meaning | Bounds |
| --- | --- | --- |
| `waveHeightM` | Incident significant wave height before the scene's alongshore exposure factor | 0–8 m |
| `wavePeriodS` | Representative swell period | 3–24 s |
| `waveDirectionDeg` | Incidence from shore normal; positive travels toward increasing world x | −75° to +75° |
| `tideM` | Fixed water-level offset relative to the authored seabed | −1 to +3 m |

Direction is a **game coordinate incidence angle**, not a compass buoy report. `null`, missing, and non-finite values use defaults; finite values outside the supported ranges are clamped. Zero wave height is respected. A fixed `tideM` displays “固定潮位”; it does not claim tidal slack. Defaults are 1.48 m / 12 s / +18° at Pacifica, and 1.12 m / 11 s / +12° at Half Moon Bay, with authored coastal exposure variation. Without an override, tide follows one 44,712-second cycle (about 12.42 hours), changing depth and bar submergence while the seabed stays fixed. This simple tide is not a local tide prediction.

Useful sample outputs:

| Field | Units / meaning |
| --- | --- |
| `waveHeight` | Scenario significant height after exposure; m |
| `wavePeriod`, `waveDirectionDeg` | Configured period and incidence |
| `localWaveHeight` | Set-modulated, shoaled, transmitted and depth-limited representative wave height; m |
| `waveNumber`, `waveLength` | Local linear-theory number (rad/m) and wavelength (m) |
| `wavePhase`, `setFactor` | Shared traveling carrier phase (radians) and deterministic envelope |
| `orbitalVelocity` | Near-bottom horizontal orbital **amplitude**; m/s |
| `waveVelocityX`, `waveVelocityY` | Instantaneous oscillatory orbital components; m/s |
| `currentX`, `currentY` | Mean surf-current components; m/s, negative y is offshore |
| `flowX`, `flowY`, `flowSpeed` | Current plus instantaneous orbital motion; m/s |
| `waveLoad` | Bounded 0–1 instantaneous quadratic-drag / whitewater proxy; not newtons |
| `breakStrength`, `whitewater` | Bounded 0–1 breaking and phase-dependent foam proxies |
| `turbidity` | Bounded 0–1 sediment/whitewater proxy; not NTU |
| `surfaceElevation`, `runupMeters` | Oscillatory elevation and bounded swash excursion; m |
| `seaStateSource` | Always `authored` for this model |

Use `orbitalVelocity` for average holding difficulty or habitat disturbance, `flowX/Y` for instantaneous tackle transport, and `waveLoad` for individual wave loading. Orbital movement changes direction and must not be treated as a persistent one-way current. Both mean and orbital forcing are exactly zero in a zero-height scenario; the visibility proxy retains a small baseline.

## One wave phase for both cameras and physics

Wave phase uses travel time across a smooth sloping section with correct shallow/deep limiting speeds. This monotonic approximation prevents local sandbar depth changes from accidentally making crests run backwards. Detailed bar/channel depth controls shoaling, breaking, transmission, and bottom velocity; it is not a ray-traced refraction solution.

`shoreWaveCrests` locates phase roots rather than advancing unrelated renderer bands. Both the overhead coast and first-person fight view project those roots and sample their breaking/foam/load field at the simulation's elapsed time and `state.seaState`. Swash uses that field as well. Reduced-motion mode intentionally freezes visible surf. Foam streaks use mean current for net advection.

## Verification

`tests/shore-waves.test.js` checks calm-water force closure, bar dissipation, dark channel gaps with offshore rip flow, the dispersion relation, period-dependent bottom motion, crest phase and shoreward propagation, tide/bar coupling, directional current response, set variability, and finite bounded results for malformed input. `tests/shore-fight-view.test.js` also checks that a scenario is forwarded to fish-position sampling and affects the rendered surf while preserving pause/reduced-motion behavior.
