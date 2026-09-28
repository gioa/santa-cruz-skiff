# Connected angler arms — v33

The old first-person grip sat close to the lower control overlay, leaving most
of the long sleeve hidden. The small rod instrument had two isolated skin
rectangles. This change raises the hand-held grip above the controls and draws
connected upper sleeve, elbow, rolled cuff, bare forearm, wrist and palm in both
views. Elbow spacing is capped by character scale rather than viewport width,
so landscape does not stretch the forearm across the entire display.

The right palm shares the reel crank endpoint and follows its rotation. The left
hand stays attached to the grip, with fingers drawn over the rod. Mounted rods
keep their holder and do not display the angler's hands.

Validation:
- `npm run check`: pass.
- `npm test`: 554/554 pass, including existing all-limit rod geometry, mounts,
  focus, paused renderer and actual crank motion tests.
- Browser QA at 390×844 and 844×390 using production fight view and fishing
  console/CSS. Caught-fish state is seeded explicitly in this local fixture.
- 01: portrait, both forearms visible above the real lower controls.
- 02: another crank position with the connected right wrist and hand.
- 03: the compact rod panel has a connected forearm instead of floating hands.
- 04: landscape proportions, with forearm length bounded independently of width.
- Verified holder transition removes hands and leaves the rod holder.
