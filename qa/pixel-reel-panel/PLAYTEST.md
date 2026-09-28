# Reel-only console — v34

Removed the duplicate rod-pose canvas, pointer/keyboard handlers, rendering call
and layout space from the bottom console. First-person scene rod gestures and
tap-to-cast remain unchanged. The passive trolling monitor remains an indicator.
The instruments row disappears while idle and after landing. The reel appears
when line is in the water or flying; existing context rules still govern spool,
drag, mounting, pickup and electric recovery. The ordinary console is narrower
and no longer paints a blank panel beside the remaining controls.

Validation:
- `npm run check`: pass.
- `npm test`: 553/553 pass. Updated existing console tests for the removed DOM
  element and retained reel/drag cancellation. Removed the obsolete console rod
  gesture test; scene gesture and casting regressions remain.
- CUA browser: seeded local production-component fixture, 390×844 and 844×390.
- Idle: no rod canvas or empty instrument row; lower/mount remain.
- Waiting: reel/spool/mount remain; zero duplicate rod controls.
- Fight: first-person view, reel/spool/drag remain.
- Screenshots 01–04 show idle, waiting, fight and landscape waiting.
- No browser errors.
