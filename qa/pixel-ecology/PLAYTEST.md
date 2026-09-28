# Santa Cruz seasonal ecology, 4/0 feather and landing checks

Verified 2026-09-27 through the real browser, ordinary UI and the page's normal
WebMCP actions. No injected catches, forced bites, teleports or time skipping.

## Actual phone journey

- Fresh origin `localhost:4178`, 390 × 844. Started with 100 credits.
- Walked to the counter, purchased the distinct two-dropper 4/0 feather rig for
  40 credits and installed it. Hook label, two hooks and spare stock were visible.
- Paid the 15-credit rental, waited for the davit, walked down the left route,
  boarded and unmoored. Chart/GPS/sounder remained unavailable.
- Lowered the bare feather rig vertically and retrieved it normally. No squid
  was consumed; stock remained 12. The used rig returned to spare stock on swap.
- Switched to a starter 2/0 circle-hook bottom rig and manually added one squid
  strip. Stock visibly changed 12 → 11. Lowered it, drifted and locked the spool.
- A natural bite entered first-person mode. Steady reeling seated the circle
  hook and landed a 30 cm / 11.8 in white croaker, 0.31 kg / 0.68 lb, in 32 active
  seconds from hooking, after roughly 25 m of line had paid out. No forced strike
  or drag run was necessary. Kept it; the consumed bait then required replacement.
- Used the touch reverse/throttle lever to return, stopped the engine and used
  the normal low-speed dock action. A completed landing inspection cleared the
  legal fish without a penalty. A second short embark/disembark created a new
  inspection, verifying checks are per landing.
- Walked back to the counter and exchanged the cleared croaker for 36 credits:
  45 → 81. Recorded **612 active seconds (10 min 12 s)**, excluding paused
  menus, in `browser-state.json`. Browser warning/error log was empty.
- Reloaded final cache version `20260927-pixel-v22`, resumed the saved profile
  with its 81 credits and settled catch, then reinstalled the preserved feather
  rig. At 320 × 740 the rod grid scrolls vertically and has no horizontal page
  overflow (`clientWidth === scrollWidth === 320`). New-version console remained
  free of warnings/errors. Screenshot: `06-v22-small-phone.jpg`.

Snapshots: `01-feather40-phone.jpg`, `02-feather40-water-phone.jpg`,
`03-natural-croaker-phone.jpg`, `04-landing-check-phone.jpg`,
`05-landing-cleared-phone.jpg`. The last two show the completed shore check,
not an artificially held inspection animation.

## Deterministic checks

`npm run check` passed. `npm test` passed **461 / 461** tests, including:

- Actual hook-position USGS substrate, independent NOAA depth, unknown cells
  and clearly marked near-wharf context; no nearest-waypoint habitat borrowing.
- Twelve-month availability, Pacific-local month boundary, bait form, actual
  ground drift, bait layer, artificial-lure movement and species selection using
  the same intensities as encounter timing. Static wrong methods retain low
  incidental rates rather than receiving a normalized guaranteed encounter.
- Finite physical lifting versus holding a pump input; depleted optional bait
  tips; feather stock and loss; distinct small-fish mouth/fight behavior.
- Deterministic illegal halibut fixtures: confiscation, no sale credit, one fine,
  insufficient-balance debt, future repayment, legal mixed cargo, old saves,
  rescue returns, paused checks and idempotent reload. Browser catches were not
  fabricated to demonstrate an illegal fish.

`node scripts/calibrate-pixel-ecology.mjs` produces `calibration.json`: 324
controlled month/location/presentation comparisons and source hashes. These are
synthetic game rates, not measured fishing success percentages. The controls
isolate encounter ecology and are not a full-trip Monte Carlo study.
