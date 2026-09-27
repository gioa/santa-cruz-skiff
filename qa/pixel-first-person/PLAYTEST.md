# Fish-signal first-person mode — 2026-09-27

Build `20260927-pixel-v12` switches from the overhead map to an interactive first-person pixel scene when the model enters `bite`. It remains focused through `fight` and an unresolved `landed` catch, including paused menus. Keeping/releasing a fish, missing a bite, breaking a line or rescue restores the overhead view.

The scene uses actual rod elevation, azimuth, bend, line entry, slack and crank rate. Dragging the water changes the existing rod pose; the normal reel, spool and drag controls stay available. Holder bites retain the pickup/strike sequence. Navigation UI and shortcuts are suppressed while focused. Rendering does not change the underlying catch/line/boat simulation.

Automated verification: `npm run check` and all 320 tests pass. New tests cover real model bite/fight/catch transitions, pause/resume and rescue, relative first-person touch input and capture cancellation, 324 extreme geometry combinations, no invented floats or underwater fish markers, and frozen paused/reduced-motion artwork.

Browser play uses ordinary controls and page-defined actions only, with real elapsed simulation time and natural bites. No injected fish, state mutation, teleportation or time skipping.

- Resumed the existing isolated QA boat, lowered a bottom rig, placed it in a left holder, waited for a natural bite; the screen entered first person automatically before pickup.
- Picked up, struck, dragged the water from [170,430] to [280,360]: elevation changed 35 → 54.83 degrees and azimuth −100 → −36.54, with no initial jump.
- Opened settings during the fight: first-person background remained, elapsed seconds, line and crank stayed frozen. Closed settings and continued.
- Inspected 390×844, 320×568 and 568×320 layouts: no horizontal overflow, only settings/reel/spool/drag controls during the fight, approximately 60 FPS.
- Landed a naturally selected blue rockfish (28 cm, 0.56 kg) after 91 fighting seconds. Closing its modal kept first person with only the catch button; releasing it restored the overhead map and boat controls.
- Reloaded after final geometry correction (extreme left/right rods remain inside the viewport) for final screenshots and a hand-held bite retest.

- Final artwork retest: a second natural hand-held bite entered the focused view, actual drag reached −110° azimuth with the rod tip still at x=26px inside a 390px viewport. Final portrait and landscape screenshots saved.
