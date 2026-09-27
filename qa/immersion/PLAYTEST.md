# Immersive update validation - 2026-09-27

This is an actual browser development playthrough in Codex IAB, followed by focused reload checks. Controls are the same player buttons, gestures and validated waypoint tools; no position, time, catch or credit injection was used. Existing local test progress was resumed. This is not physical-device testing.

## Implemented presentation

Default immersive view hides persistent mission instructions, mini-map, telemetry panels, fish stamina/strain bars and explanatory thumb labels. Essential interaction/actions remain usable; full guidance can be restored in settings. First-person hands, a detailed conventional reel, a boat-mounted compass and digital clock provide tangible objects in the scene. Menus retain operational labels and data/source notes.

Models use authored geometry, photographic CC0 wood normal/albedo/roughness, cloth and skin maps, weathering, physical plank/rib joints, fenders, oars, net, hardware, window frames and close wharf details. This is an improvement to the existing lightweight simulator, not 4A production art, photogrammetry of the actual rental operation or a verified digital twin.

## Physics verification

42 automated tests pass: the previous 31 invariants and 11 vessel tests. The new cases cover plausible 8 hp top speed, coasting momentum, cargo mass/displacement, 30/120 fps equivalence, yaw inertia, wind/anchor hold, wave-slope alignment, crew-induced heel, long rough-water stability, collision reset and force-driven autopilot arrival.

An independent audit extracted the actual integrated `updateBoat` and ran eight mapped outbound/return legs against OSM coast/pier and NOAA depth with 13.6 kn NW wind. All arrived without collision, including 15 seconds of post-arrival drift. Final approach was tuned to 0.6-1.5 kn without snapping speed to zero.

## Observed player actions

- Resumed stored equipment and credits at default 06:00. Verified minimal UI and settings opt-in for guidance.
- Boarded/unmoored and sailed using normal waypoint controls. Observed approximately 5.6 kn under power. Cut the engine; momentum and drag gradually reduced speed.
- Deployed anchor after slowing. Boat settled under a steady wind with a fixed anchor point, approximately 43 N reported rode tension, wave heave/roll/pitch and near-zero final ground motion; no constant artificial forward drift.
- Cast with the normal action button. Read-only DOM recorded the projectile 0.38 s into a 1.26 s flight at 2.82 m elevation, followed by water entry and bait sinking.
- Waited for a bite, struck on the phone control, toggled reeling and dragged the view. Continuous reeling remained active after the independent camera drag. Landed a 63 cm / 3.89 kg California halibut after 138 seconds, released it and received 61 credits.
- Initial review caught an incorrect hand/reel overlap, too-dark predawn visibility, square star reflections and early texture-clone warnings. These were corrected; the final reload checks below refer to the corrected version.

All screenshots are actual rendered game frames. Daylight inspection uses the explicit custom morning lighting option; the default remains 06:00 trip time. Observed 60 fps on this desktop browser during the tested scenes is not an iPhone/Android performance claim. Simultaneous physical fingers are covered by pointer isolation unit tests, not a physical multitouch device run.

## Final reload and publication

The corrected build was reloaded and resumed with 68 credits, two journal catches and the packed equipment intact. The trip clock restarted at 06:00 and advanced at 1:1. Minimal presentation remained selected. The final reload produced no new console warnings/errors or render errors; four earlier texture-clone warnings in the retained tab log predate the fix.

Responsive checks covered 390 × 844 portrait, 844 × 390 landscape and 568 × 320 short landscape. Anchored/seated mode hides the unused movement stick, engine-off mode hides throttle, the rod/reel remain in portrait frame, and the short landscape settings dialog scrolls. Assisted UI was toggled on successfully and then restored to immersive. Input mode was restored to automatic and the viewport override was removed.

Screenshots: `01-phone-portrait.png` and `02-phone-landscape.png` show the corrected first-person view; `03-desktop-boat.png` shows the actual boat model with custom morning lighting; `04-six-am.png` shows the actual default predawn scene. `catch-result.png` records the successful 138-second fight during development, before the catch-dialog wording was reduced. `final-reload-state.json` and `physics-trip-state.json` preserve read-only browser state observations.

The historical end-to-end 11m26s playthrough is documented separately in `qa/v2/PLAYTEST.md` and is not represented as a new 11-minute run of this commit. This update additionally exercised sailing, momentum, anchoring, casting, a complete fish fight, release, save/resume and mobile layout as described above.
