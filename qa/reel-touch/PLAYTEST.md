# Integrated first-person reel controls

Implemented the approved side-conversation design in production modules:

- Left hand wraps the rear grip below the reel; close forearms enter from the
  sides in portrait and from the bottom in landscape.
- Compact conventional reel, independent spool/crank animation, and a low
  gunwale. Rod load and line entry continue to use the existing simulation.
- The visible reel is the touch surface. Holding winds at the existing manual
  rate; a deliberate circular gesture consumes measured clockwise travel and
  stops when travel stops. Pointer cancellation, phase changes and pause reset
  held input. A second finger can adjust the left drag control independently.
- Fighting removes free spool from the available actions, and the simulation
  rejects direct free-spool requests during a fight. Normal lowering and
  waiting-state spool controls remain available.

Validation:

- `npm run check`: passed.
- `npm test`: 581 passed, 0 failed.
- Added simultaneous reel/drag pointer, cancellation, rear grip geometry and
  model-level free-spool guard regressions.
- CUA checked production renderer, controls and physical line/fish components
  at 390×844, 320×568 and 844×390 using the explicitly labelled local fixture.
  The fixture creates a fish for UI testing and is not part of `dist`.
- Actual clockwise browser gesture reduced paid line from 24 m to
  23.860341 m, advanced crank angle to 1.377131 radians, and returned crank
  rate to zero after release. Drag input changed 0.48 to 0.53 independently.
- Normal `/dist/` entry loads and starts at the wharf without console errors.
- Screenshots: `01-phone.png`, `02-narrow.png`, `03-landscape.png`.

No live deployment, game-save migration, commit or changes to unrelated pending
work were performed. Existing uncommitted Sabiki changes were retained.
