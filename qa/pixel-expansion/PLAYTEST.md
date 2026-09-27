# Pixel expansion validation — 2026-09-27

Code build `20260927-pixel-v3`, state schema 4, CSS v4, commit `4030b43`.

## Automated verification

`npm run check`, `git diff --check`, and all **137 tests** passed. The 61 additional tests cover purchased/packed instruments, geographic travel compression, rig presentation and overlap, species/season/size/bag/MPA evidence, wildlife, patrol selection and end-to-end confiscation. The existing 76 regressions remain included.

The navigation regression drives the actual vessel solver and collision-aware route to a fishing destination and back at 60 Hz and 0.1 s steps. Offshore passage takes approximately 52–53% of the original time, while dock manoeuvring, walking, swimming and the clock remain at normal pacing. These are synthetic model tests, not browser play time.

Regulation fixtures verify sub-22-inch halibut/lingcod, copper/combined rockfish limits, date boundaries, protected areas, tackle evidence, historic catches and absent evidence. Patrol fixtures verify independent selection, eight-second checks, confiscation only from current violating cargo, no lost credits, no double settlement, and dock checks continuing during docking. They do not represent naturally encountered patrols in the browser run.

## Browser run

Normal visible controls and equivalent page-scoped validated player tools only. No time skipping, teleports, forced wildlife/inspections/bites or injected catches. Desktop browser viewport emulation, not physical iOS/Android hardware.

Preparation used the prior validated trip's legitimately earned 174 credits. Verified that no chart, depth, heading or GPS information was available. Purchased a paper chart (120) and two-hook dropper rig (35), then explicitly packed them; owning an item alone did not activate it. Free descending device migrated into the old locker and was packed at the counter. The rig form changed to two hooks / 113 g, with other uncarried rigs disabled.

After the final integration reload, resumed at 06:00 with gear/purchases intact. Walked the left stair, boarded, unmoored, opened a paper chart without a YOU marker or distances, and selected a normal destination. In-flight diagnostics show the offshore multiplier reaching 2 while the no-instrument fields remain null.

Completed run (see `browser-run.json` for state and wall timestamps):

- Reached the selected nearshore destination and anchored at about 06:04:17. A baitfish school and feeding seabirds appeared naturally at 250 active seconds; another appeared at 428 seconds. Dolphins/whales did not happen to appear in this run; their conditions are covered by model tests.
- Worked the dropper rig with lift and reel actions. Retrieval lifted it off bottom; releasing let it settle again. Without a sounder, the UI showed natural line/ground-contact feedback, not numeric water/lure depth.
- Naturally hooked a **45 cm / 2.13 kg copper rockfish**. Recorded tackle: two hooks, 113 g, one line, descending device and 20-inch net. Landed after **127 seconds** of fight, then retained it with no legal pre-warning.
- Returned around the wharf, docked, walked to the counter and exchanged the fish for **61 credits**, bringing the balance from 19 to 80. Purchased and packed a compass for 45, leaving 35. The completed real-time run exceeded **13 active minutes**.
- A natural water patrol spawned during the return. It appeared on the opposite side of the broad wharf and could not reach the boat before its bounded timeout. This real-run finding prompted the follow-up obstruction fix described below. No inspection completion or confiscation is claimed for this browser run; those outcomes were exercised by deterministic integration tests.
- 390×844, 320×568, 844×390 and 568×320 viewport checks passed. Actual visible gameplay buttons measured at least 44×44 CSS pixels with no clipped targets. The short-landscape fight screenshot is actual gameplay, replacing the earlier layout-only fixture as evidence. Frame readouts stayed around 60 fps on this host; no browser error/warning entries were recorded.

Screenshots are actual UI captures, not fixtures. `09-natural-patrol-approach.png` captures the scene while the out-of-view patrol was approaching, not an unobstructed visible inspection.

## Deployment

GitHub Pages run **36336920256** succeeded for commit `4030b43aec98a226cc53e141dc9996d4ccd62b2d`. Public `index.html`, `pixel-game.js`, `pixel-sim.js`, `fishing-regulations.js` and `pixel-wildlife.js` were downloaded and their SHA-256 hashes matched the local deployed files.


## Follow-up obstruction fix

Build `20260927-pixel-v4` keeps the gameplay and UI from the completed run, and fixes the patrol finding. Patrol generation now verifies a continuous water corridor from its spawn to a reachable 11 m inspection side, as well as the short segment between that side and the player. Motion checks the whole segment at ≤0.75 m intervals; a stalled pursuit exits naturally without teleporting or re-spawning alongside the player.

Three additional patrol tests cover a long separating barrier, a thin barrier, and the **two actual browser positions** (-48.8, -112.2) / (-38, -52.6) with both vessel orientations, using the real OSM and boarding-platform water exclusions. All four geographic cases reach and finish inspection. The completed 13:13 browser run predates this localized fix; the fix was validated by these regressions. The final complete suite passes **140/140 tests**, with syntax and whitespace checks also passing.
