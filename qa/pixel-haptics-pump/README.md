# Haptics and pump-and-reel validation — v59

The rod now moves through a finite, load-limited stroke during a fight. Lifting
moves the fish through the taut line; lowering creates take-up that can be wound
with less load. Holding the rod high does not generate repeated lift, and
lowering without winding gives the fish room back. Small croaker, sanddab and
rockfish still wind directly to the boat. This is a gameplay physics model,
not a calibrated prediction of real fish forces.

Haptic cues follow a new bite, actual slipping-drag payout, light free-spool feed,
and changes in transmitted fish load. Short pulses have rate limits; pausing,
losing focus, hiding the page, or disabling feedback cancels vibration. The
setting is persistent. No vibration API means visual/audio feedback continues.

Validation:
- `npm run check` passed; `npm test`: 664/664 passed.
- Six pump tests cover finite lift, slack take-up, lowering without winding,
  line conservation, frame-rate stability, work/energy, and simulation controls.
- Six injected haptic tests cover bite preemption, drag cadence, feed thresholds,
  pause/visibility/focus, unsupported/rejected APIs, activation and preferences.
- At a 390 × 844 browser viewport, dragged the actual first-person rod control
  up, then down while winding. `browser-state.json` records the response, and
  `01-raised-phone.png` / `02-lowered-phone.png` show the production rendering.
- The labelled component fixture initializes a 32-inch halibut encounter and
  adds a test-only sustained-winding button to exercise simultaneous inputs.
  It uses production rod input, line physics, fight simulation and console code.
  It is outside the published `dist` entry point and does not modify saved trips.
- The normal game entry point was tested separately: toggle feedback off,
  refresh, verify it remains off, turn it on. No browser console errors.
  `03-settings-phone.png` records the visible preference.

This desktop browser advertises/accepts vibration calls but has no verified
phone motor. Accepted pulses are API evidence, not proof of physical vibration.
iPhone Safari does not implement Navigator.vibrate; no automated web haptics
are claimed for it. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
