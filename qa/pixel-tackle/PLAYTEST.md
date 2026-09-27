# Rod and reel console — 2026-09-27

Build: `20260927-pixel-v10`. Local preview: port 4177. Public target: https://joyx.design/santa-cruz-skiff/.

## Scope

The existing pixel game now uses adjustable rod elevation/azimuth, progressive load-dependent bending, an operable reel, free spool, fighting drag, and port/starboard rod holders. Default fishing lowers a rig vertically beside the boat; casting remains a separate press/release control. Only float rigs draw a float. The current build deploys one active rod at a time; other rods retain their own equipment assemblies.

Rod forces, reel rates, bite probabilities and slow-trolling limits are bounded game approximations, not measured performance or boating advice. Line depth and GPS remain unavailable without the purchased instruments; paid line on the reel is not claimed to be water depth.

## Automated checks

- `npm run check`: passed.
- `npm test`: 274 passed, zero failed.
- `git diff --check`: passed.
- Physics regressions cover finite free spool, conserved paid line during rod lift, realistic drag slip while cranking, rig weight/sinking differences, float-stop depth, seabed constraint, rod-mounted trolling, taking the rod after neutral, active assembly upgrades, save compatibility and actual winding back aboard.
- Long-drift regression: with 20 m locked line and 0.4 m/s transverse boat movement for four minutes, the rig settles near 15 m depth without manufacturing line. Tested at 60 Hz and 0.1-second steps. A previously surface-stuck rig recovers. A separate actual vessel-model check in 18 kn wind drifted 155 m while preserving 25.775 m of line and retaining a submerged rig/natural fish bite.
- Geometry/camera regressions cover hands attached to the reel/grip, holders attached to the boat rail, line starting at the rendered rod tip, no float on bottom/jig/sabiki rigs, stationary camera stability, and whole-boat framing between HUD and bottom controls.
- Touch regressions cover relative rod dragging, clockwise crank angle wrap, cancellation/release, and finite gesture-based winding. Independent offline UI checks verified pointer cancellation and second-pointer rejection.

## Browser procedure

Used the actual browser UI and the page's ordinary validated player-action tools. No clock skipping, teleportation, forced bites, injected fish, gear grants or local-storage edits were used. The QA profile paid the ordinary 15-credit rental, launched and boarded normally, then continued that saved rental through refreshes. Refresh resumes at 06:00 and resets active-session seconds; the earlier sessions are recorded separately rather than represented as one uninterrupted session.

Observed sessions before final fixes: 278 + 226 active seconds. These checks found and led to fixes for (1) top HUD occlusion on a 320 px phone and (2) a locked rig incorrectly remaining on the surface after prolonged boat drift. The corrected model/world/UI then ran for **613 active real-time seconds (10 minutes 13 seconds)** in one resumed voyage, excluding paused menus. No refresh occurred during that 613-second run. Evidence is in `browser-state.json`. The final landscape CSS column-order correction was checked immediately afterward on a fresh load; it did not change simulation code.

Verified via actual UI:

- Vertical lowering transitions directly to sinking with no cast flight and no float.
- Raising/turning the rod changes world and console posture. A clockwise reel gesture decreases line; stopping/releasing does not keep winding.
- Locking the spool holds paid line. Holding the reel winds the rig back aboard over real time, then stops automatically.
- Left holder + engine + F 15% permits slow trolling; the rod remains mounted. Switching from helm to tackle retains the selected throttle. Taking a rod too soon after power-off is safely rejected; taking it after slowing succeeds.
- A natural bite was hooked after the corrected drop: 45 cm / 1.57 kg California halibut, landed after a 121-second fight and released for 56 game credits. Rod bend and line tension rose under fish load; line increased under slipping drag despite winding, then decreased as the fish tired.
- A second natural bite arrived while right-holder trolling. The engine idled, pickup stopped it, and the player hooked a 60 cm / 4.02 kg lingcod. A real touch drag on the star knob changed fighting drag from 48% to 67%. The fish landed after 98 seconds and was kept; no unsolicited legality prompt appeared.
- Optional press/release casting showed an airborne sinker, then a submerged bottom rig with no float. A third natural bite produced a 46 cm / 2.26 kg copper rockfish, landed after 74 seconds and released. Opening the individual rod assembly paused the game and correctly prevented changing the active deployed rig.
- Resizing between portrait and landscape cancels the held/winding input. 320×568 and 390×844 portrait and 568×320 landscape were checked for overflow, touch targets and boat visibility.

## References

Mechanics were cross-checked against primary tackle references:

- [Abu Garcia conventional reel manual](https://s7d5.scene7.com/is/content/purefishing/Abu%20Garcia/Manuals/CONVENTIONAL%20ROUND%20REEL%20INSTRUCTION%20MANUAL.pdf), printed pages 3–5: free-spool clutch, spool braking and fighting star drag are distinct functions.
- [Shimano offshore jigging](https://fish.shimano.com/en-US/news/news-listing/jig-selection-benny-ortiz.html): vertical drops, retrieve/fall presentation and the effect of current and jig choice.
- [Daiwa bait-rig guide](https://daiwafishing.com.au/blogs/news/how-to-rig-a-rod-for-bait-fishing): bottom, unweighted and float rigs are different presentations.
- [Scotty rod holders](https://scotty.com/rod-holders/): fixed holders for supported rods/trolling.

The completed voyage recorded three natural catches, no new missed bites and no line breaks. The saved missed-bite count of one came from an earlier pre-fix session. Renderer observations were 60 FPS in the desktop browser at mobile viewport sizes; this is not a claim of testing physical phone hardware. Browser warning/error log was empty.

After the 613-second run, a fresh-load 568×320 check confirmed left-to-right rod/reel/tools order during the taller charging/fight strip, no horizontal overflow, at least 44px action targets and the complete boat/rod within the unobscured playfield.

Screenshots are actual browser captures, not generated mockups. `01` predates the final camera/status refinement; later screenshots document the corrected layouts.
