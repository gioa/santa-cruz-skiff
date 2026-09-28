# Compact rod console and holder winding — v60

The overhead console has one rod/rig heading, a reel on the left, and two full
rows on the right: three position icons followed by payout and winding. The
repeated hand/holder labels and passive cue row are gone. Position is indicated
by the selected icon; the reel still shows actual paid line. Inventory remains
in the backpack. First-person rod, reel and drag controls remain in place.

Reeling now works from either holder in the tackle panel, including slow
trolling, a bite and a hooked fish. It does not automatically take the rod into
the player's hands. A mounted rod cannot perform the handheld pump gesture.
Purchased electric reels can also wind in a holder. Pause, casting, landing,
inspection and other unavailable states still cancel winding.

Validation:
- `npm run check` and all 667 tests passed.
- State/capability tests cover both holders through fishing states, real line
  retrieval while trolling, automatic hook seating while winding a mounted bite,
  purchased electric equipment, input release and unavailable controls.
- Production UI and physics were exercised in an explicitly initialized local
  boat fixture. `setup.js` contains that setup; it was appended to a temporary
  copy of the game module, using the production HTML/CSS. Temporary entries were
  removed from dist after testing. No saved user trip was used.
- Browser viewport checks: 320×740, 390×844, 844×390. No horizontal overflow.
  At 320px, position targets are 44×46px and line buttons 68×46px. The panel is
  228px wide and approximately 128px high. Landscape panel is 300×128px.
- `reel-state.json`: the port rig wound from 8.3m to fully retrieved while
  retaining its mount. Starboard sample registered 0.78m/s retrieval, 1.2 crank
  turns/s, and shortened line while still mounted to starboard.
- Screenshots cover hand, both holders, narrow portrait, landscape and a hooked
  fish in first person. No browser console errors were observed.

These are desktop-browser viewport tests, not a claim of physical device testing.
