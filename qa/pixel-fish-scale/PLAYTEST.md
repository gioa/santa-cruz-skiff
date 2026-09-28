# Fish scale regression — 2026-09-27

Build `20260927-pixel-v25`. `npm run check` and all 488 tests passed.

The comparison page uses the production fish sprite, measuring-board renderer and first-person renderer, with explicit visual fixtures rather than injected gameplay catches. `preview.html` is a developer-only QA artifact outside the deployed dist directory. It can be served from the repository root.

- At 390 × 844, the 8 / 16 / 32 in fish use 39.7333 / 79.4667 / 158.9333 px silhouette lengths on the same 330 px board. Screenshot `01-phone-comparison.jpg`.
- At 320 × 568, fish lengths are 30.4 / 60.8 / 121.6 px. Document width equals the 320 px viewport, with no horizontal page overflow.
- At 844 × 390, fish lengths are 63.4667 / 126.9333 / 253.8667 px. Document width equals the viewport and the 1:2:4 ratio remains intact.
- The surface-view fixture at a shared 2.5773 m camera range renders 8 in as 21.9129 CSS px and 32 in as 87.6518 CSS px, exactly four times larger. Screenshot `02-surface-perspective.jpg` shows the larger surface fish at the actual line entry.
- Unit coverage checks near/far perspective, no deep fish visibility, no species sprite-padding distortion, preserved aspect, common ruler zero, oversize historical catches extending without normalization, no gameplay mutation, and paused rendering.
- Full local game loads, resumes the existing save, and opens the journal without errors. The save has no catches; catch art was checked using the explicit visual fixtures rather than claiming a natural capture in this regression.

The comparison screenshots are renderer fixtures, not a claim of a newly played fishing trip or an endurance run.
