# Tap casting — v29

Phone testing: 390 × 844, actual game UI in the in-app browser. Local-only fixture on localhost:4182 starts a paid boat at the Lighthouse reference fishing area with normal starter tackle. Production save was not changed.

## Behavior

- While holding a ready rod with engine stopped and speed below the existing fishing threshold, tap water to cast to that world point. No extra cast button or charge gesture.
- Vertical lowering remains available from the existing button.
- Dragging, long presses, menus, controls, mounted rods and deployed rigs cannot trigger a new cast. In the helm panel, water taps retain chart navigation behavior.
- Cast range is bounded by rig weight/type and rod. Current short-boat-cast calibration ranges are about 37–104 ft across the supported premade sets. These are simulation values, not manufacturer casting ratings.
- Too-distant targets are clamped along the chosen bearing. Land, pier crossings and inside-boat targets are rejected.
- The rig follows an airborne arc. The reel releases only line needed to reach the moving rig, measured diagonally from the real rod tip with a small slack allowance. Landing does not grant the entire seabed depth as free line.
- After splashdown, the existing free-spool, braked-spool, sinking, current, reeling, snagging and fish physics take over. Casting uses the already-installed bait rather than consuming another portion.
- The airborne reel shows actual payout with spool/feed audio. Normal submerged rigs do not acquire an imaginary float.
- Menus and blur pause a valid flight instead of erasing it. Obsolete malformed charged-cast states still recover safely.

## Verification

- JavaScript syntax check passed.
- Full suite: 528 tests passed, 0 failed.
- New coverage: gradual flight payout, exact water endpoint, diagonal depth budget, limited ranges, obstruction checks, all action gates, pause/release behavior, frame-rate consistency, surface presentation continuity, manual retrieve followed by vertical lowering, flight spool audio.
- Actual UI: drag water + open/close backpack left cast count unchanged at 1.
- Actual UI: a tap started flight with 3.2 m paid line partway through the arc; landing maintained the selected x/z coordinate while depth increased to 5.61 m and paid line reached 20.3 m (66.7 ft).
- Actual UI: manual winding reduced paid line from 20.3 m to 3.6 m (11.9 ft) at 0.78 m/s, then fully retrieved to idle/0 m.
- Actual UI: far tap displayed the range-limit feedback and produced a finite endpoint at the starter rig's approximately 22 m limit.
- Browser console: no application errors.

Screenshots 01–04 and browser-checks.json are actual interaction evidence. No time acceleration or injected fish was used in the browser test; deterministic unit tests use controlled simulated environments.
