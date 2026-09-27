# Simulator v2 playtest — 2026-09-27

Actual interactive browser session in Codex IAB, local static HTTP server. Browser tools operated the same buttons and gestures as a player; no clock acceleration, position injection or catch injection was used. This was a development playthrough followed by reload and focused checks of the final fixes.

## Full journey

- Began a fresh game next to the rental hut, about 8 m from the counter. Real local night was verified first (around 01:43 PDT). Then explicitly selected custom morning **lighting** for model inspection; the displayed local clock and motion continued at 1:1.
- Bought a slider rig for 25 and 12 anchovy baits for 16: 100 → 59 credits. Packed eight free starter items plus the purchased rig.
- Watched the empty-skiff lowering cycle and walked the actual pier/pontoon route. Boarded, unmoored, selected the near-wharf water waypoint, sailed at about 5.2 kn.
- Jumped overboard while the engine was running: the lanyard cut the engine while residual momentum carried the boat onward. PFD, gravity entry, water temperature, swimming and ladder reboarding were exercised. No recovery teleport was used for this trip.
- Returned to the boat, reached the geographic waypoint about 245 m away, stopped and anchored. Selected slider + anchovy; stock decreased by one on mounting bait.
- Cast, waited for the visible bite, struck, toggled continuous reel, and dragged the view independently. Caught a 59 cm / 3.26 kg California halibut after 127 seconds of fighting. Retained it in the 8 kg starter cooler.
- Raised anchor and navigated home at actual scale. Docked after more than 10 active minutes and approximately 489 m sailed. Walked back to the counter.
- Retained-fish exchange awarded 73 credits: 59 → 132. A second exchange did not pay again. Bought the 125-credit large cooler: 132 → 7, then used free base resupply.
- Refreshed and resumed with the same 7 credits, upgraded cooler ownership, slider rig, bait stocks, catch journal and completed-trip flag. The final code was loaded for this persistence check.

The captured full-trip DOM state (`full-trip-state.json`) reports 686 active seconds (11m 26s), 489 m sailed, 83 m walked, one cast, one catch, zero breaks, zero misses and no runtime errors. Wall time was longer because equipment and map panels intentionally pause physical simulation.

## Mobile and rendering checks

390×844 portrait, 844×390 landscape, 568×320 short landscape; 1280×800 for the model photograph. Earlier phone-control audit also covered 320×568. Joystick/view/reel pointer identities have independent automated tests. Rotation and modal opening clear held controls. Active continuous reeling survived a camera drag, and controls stayed reachable. Observed 60 fps in this desktop browser session; this is **not a physical iPhone/Android performance claim**, and simultaneous physical fingers were not available through the browser automation interface.

The screenshots are genuine rendered game frames, not concept art. `01` is real local night; daytime frames use the explicitly selected custom morning lighting. Some screenshots are from the running development checkpoint, before final wording/animation refinements; final reload checks are documented separately below.

## Automated verification and audit

31 tests passed: economic invariants, once-only settlement, free recovery from zero credits, soft species weights, carried-gear effects, Pacific time/DST, NOAA grid orientation, MHW/MLLW separation, pointer capture/cancellation/source isolation, real-scale swimming, stern-ladder transform, and eight complete coast-safe navigation legs. JavaScript syntax and whitespace checks passed. A read-only independent audit additionally ran the actual boat update function through all four destinations and returns, plus mid-route walking guide restarts.

Realism boundaries: OSM horizontal geometry, historical NOAA elevation and regional observations do not make this a surveyed digital twin. Current employees' names were not verified, so characters are explicitly simulated. Blender crashed before export; shipped meshes are authored Three.js geometry. See `dist/SOURCES.html`.

## Final reload checks

After loading the final fixes, verified 7 credits and both purchased upgrades survived refresh, automatic engine-off resume, keyboard toolbar access to the common trip-tools menu (including the sounder), and the complete davit recovery sequence (hook attachment → raising → stored). The stored skiff could be lowered again. The final source labels the real Pacific clock separately from optional morning lighting. Final renderer console: no errors or warnings.
