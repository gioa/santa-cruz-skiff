# Benicia physics regression audit — 2026-09-29

Reproduced before the fix: an unreeled spoon cast 21.40 m from its release point reached 22.11 m after 30 seconds at the east mud bank and 24.36 m at the old pilings. A twitch then increased the range again. The solver had no finite closed-bail line length, and twitching only lifted the rig vertically.

## Corrections

- Splashdown establishes finite paid line. Sinking and sideways current obey this length; deliberate reel strokes shorten it. Empty-rig drift never reports spool payout.
- A short twitch pulls toward the held rod tip and lifts the rig. Its displacement is spread over a bounded stroke, independent of render frequency; it does not wind line for free.
- Retrieval checks horizontal range and actual depth. A rig several metres below a pier is not considered retrieved merely because it is horizontally close.
- Losing contact with rock clears the old snag exposure. Drift onto mud or lifting off the bottom cannot trigger a break from a previous patch of rock.
- The Benicia deck uses the same elevation as the angler. Picking the projected deck resolves to its walkable surface. It occludes the lower line and tackle underneath.
- Empty-rig reel clicks and twitches no longer briefly zoom the camera in, which visually enlarged the line during an inward stroke. The camera still fits actual travel and fish fights.

## Automated coverage

`tests/benicia-physics-audit.test.js` contains 113 cases: 5 positions × 6 rigs × 2 tidal directions; 5 positions × 3 cast powers × 3 aim directions; and 8 specific constraint, vertical-pickup, stale-snag, long-soak, frame-rate, camera and occlusion cases. Each retrieval exercises the normal simulation and checks completion, finite state and supply conservation. Physics fixtures disable random encounters so a fish cannot interrupt the invariant being tested.

Existing encounter/fight/landing, inventory, keep/release, inspections, purchases, navigation and save tests remain part of the full suite. The complete suite passed 1,150 cases locally. A final rod-tip-direction refinement also passed the focused 154-case set; deployment runs the complete suite again.

`scripts/qa-benicia-session.mjs` separately runs three accelerated 600-second sessions using the same bounded click-stroke input as the UI, natural population spawning and no injected catches. These are simulation stability checks, not a claim of human play or guaranteed salmon catches. Consult `../benicia/simulation-sessions.json` for actual outcomes.

## Browser checks

Uninstrumented CUA browser interaction at 390 × 844: enter/walk along the public pier, aim, short-cast on land versus in water, let a spoon sink/drift, twitch, repeatedly click the reel until retrieval, verify configuration unlocks only once retrieved, swap to Carolina tackle, attach anchovy (stock 6 → 5), and cast the bottom rig without a bobber. Reload/resume retained the clock and inventory. Screenshot evidence is stored here; rendering alone does not prove the physics invariants above.

All magnitudes remain authored game approximations. This change is not a calibrated fishing-line elasticity or commercial reel model.
