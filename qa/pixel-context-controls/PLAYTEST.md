# Contextual boat and tackle controls — 2026-09-27

Build: `20260927-pixel-v11`.

The bottom console now derives all visible actions from one read-only state selector. Hand-held deployed tackle must be wound back physically or placed in a side holder before boat controls return. A holder bite offers pickup, then strike; fighting and catch handling have their own minimal controls. Empty rows and columns collapse. Invalid gear shifts are hidden, and reverse is unavailable with deployed tackle.

Validation:
- `npm run check`: passed.
- `npm test`: 299 tests passed. New coverage includes reachable hand/holder phases, physical retrieve, anchor and docking guards, side-effect-free readiness, retained helm interlocks, and captured multi-touch gestures losing availability.
- Actual browser play, no time skips or injected fish: lowered a bottom rig, wound it back, verified engine returned only after retrieval, mounted a deployed rod in the left holder, started and drove at 15% throttle, confirmed pickup hidden under propulsion, stopped, then picked up and struck a natural holder bite.
- 320×568 and 390×844 portrait and 480×320 / 568×320 landscape: no horizontal overflow; visible console buttons enabled; hidden action rows removed. Desktop-to-phone resize cancels held inputs as before.
- Completed a natural copper rockfish catch (39 cm, 1.45 kg, 96 seconds fighting) and released it. Dismissing the catch modal exposed only the catch button; resolving it restored idle actions. Saved DOM state records the completed trip segment.
- Reloaded the final gesture/gear fixes, verified charging exposes only cast release, flight has no action buttons, and deployed tackle has F/N without reverse. Browser warning/error log empty.
- Screenshot 04 is the mounted bite; screenshot 05 is the resulting fight, with boat/cast/holder actions absent.

Prior v10's separate 613-active-second fishing playtest remains in `qa/pixel-tackle/`. This change does not alter its line, fish, geography or clock physics.
