# Electric-only automatic recovery — 2026-09-27

Build: `20260927-pixel-v23`.

- `npm run check` passed; `npm test` passed all 467 tests.
- New regression coverage checks purchase cost, starter exclusion, ownership / active selection / carrying requirements, saved assemblies, consumable wear, and conditional controls.
- Browser play followed normal actions: walk to counter, pay 15 credits, wait for launch, board, unmoor, enable owned feather rig, and lower beside the boat. No forced funds, time skipping, or fish injection.
- Ordinary reel: automatic recovery control absent; the page action `retrieve` is rejected. Manual winding reduced paid line from 7.9 m to 5.4 m, with crank rate 1.2 and retrieval rate 0.78 m/s. Releasing winding returned both rates to zero and left paid line at 5.4 m.
- Shop displays the electric rod/reel set at 320 game credits. Actual purchase and active-equipment gating are verified in automated simulation tests; browser save had insufficient credits to buy it.
- Screenshot verified at 390 × 844: hand reel control and spool switch remain visible; automatic recovery control is hidden. No browser errors or warnings were recorded.

This was a focused regression playtest, not a new ten-minute endurance run.
