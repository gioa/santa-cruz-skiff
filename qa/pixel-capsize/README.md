# Capsize / shipped water — v64

- Open-skiff nonlinear roll righting: positive stability near upright, reduced reserve with load/water, negative righting beyond the vanishing-stability angle. Roll inertia/damping, sampled wave slope, wind heel, turn heel, and flood slosh interact. No wave-height probability roll.
- Gunwale overtopping admits water continuously. Flood mass feeds displacement and vessel inertia/drag; free-surface effect reduces righting. No automatic drainage offshore. A contextual bucket toggles manual bailing (estimated 1.4 L/s); it stows the rod and disables propulsion/reeling until stopped. Landing drains the boat.
- Heave, pitch, roll and flooding advance in active real seconds, independent of 1:2 navigation compression and the 5× calendar. Pausing freezes them. Save/reload retains water/roll/roll rate and recovery state.
- Beyond-beam sustained immersion or overwhelmed reserve starts a six-second capsize/PFD rescue sequence, then existing ten-second harbor hoist/night/next-day sequence. No free-swimming controls. Loose current cargo and deployed terminal rig are lost; major owned gear and already settled catch history remain. Fee 50 virtual credits once, shortfall recorded as tow debt. No extra overdue fee, including interrupted/reloaded rescue.
- Visible heel, water in the hull, bailing, overturned hull, splashes and rate-limited optional vibration. No numerical danger bar. Audio/haptics availability still depends on browser/device support.

Hull/freeboard/GZ coefficients, bail throughput and penalties are authored game approximations, not measured specifications or real operating limits. This version models transverse instability and flooding, not CFD, shallow-water breaking surf, broaching, or a survival simulator. Existing daily wind/swell generation remains intact.

Qualitative sources from design research:
- USCG stability/free surface: https://www.dco.uscg.mil/Portals/9/DCO%20Documents/5p/CG-5PC/CG-CVC/CVC3/references/Stability_Reference_Guide.pdf
- NWS steep seas: https://www.weather.gov/media/wrh/online_publications/TAs/ta0311.pdf

Validation: npm run check; npm test — 686 passing. Seven dedicated regression cases cover calm/long swell, steep beam-sea flooding and overturn, load/free surface, bailing, numerical step consistency, real-time versus compressed travel, pause/reload, consumable/cargo loss, motor exposure, fee idempotence and next-day reset. Extreme synthetic sea fixtures are stress cases, not forecast or safety thresholds.

Browser QA at 390×844 and 844×390: clicked actual bailing control, observed decreasing water and unavailable reel/helm, ran recovery → return/hoist → next morning and confirmed 100→50 credits with no extra fee; recorded water-level view and mobile/landscape layout. Screenshots use a clearly labeled local synthetic voyage, separate save key, and freeze-frame control for rescue illustration. An initial QA-only missing import and a rescue-layer visibility problem were found and corrected. No QA HTML/scripts shipped under dist. fixture.js is the setup recipe, appended to a local copy of pixel-game.js only.
