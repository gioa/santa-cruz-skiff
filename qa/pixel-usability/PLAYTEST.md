# Pixel usability playtest — 2026-09-27

Build: `20260927-pixel-v5`. Local test URL: `http://localhost:4173/?edition=pixel`.

## Automated checks

`npm run check` passed. `npm test`: **167 passed, 0 failed**. New coverage includes persistent inventory position/ownership reconciliation; deadzone camera and orthogonal presentation outlines; 2× calendar/DST/capture timestamps; audio scheduling, pause/resume and repeated slider initialization; object-button collision avoidance across phone sizes, rotations and screen edges. Existing full-voyage, fishing, inventory/economy, navigation, swimming, collision, patrol and depth tests remain passing.

## Actual browser checks

All actions used normal UI controls or the page's validated player-action tools. No time skips, teleports, forced catches or browser state injection. Menus pause active simulation seconds.

- 390×844 portrait: 30-slot backpack, separate locker, grid shop, item icons/details and rig tab rendered. Moved a rod from slot 2 to slot 15, then swapped it with the life jacket in slot 1. Reload retained the life jacket in slot 15.
- At the hut counter, moved the rod into the locker and packed it again. Purchased 12 anchovy baits for 16 credits (35→19). The bait-box stock and packed weight updated.
- 320×568: no horizontal document overflow; selected-item action remains at least 44 px tall and visible. Grid scroll is independent of item details.
- 568×320 landscape: grid and details are side by side; the 44 px move button fits within the viewport (bottom294px).
- Walked from (-10,-45) to the hut counter (-7.8,-54): camera stayed exactly (-17,-51), proving movement inside the deadzone does not pan the scene.
- Active time26 seconds corresponded to game time52 seconds. New/resumed day starts06:00. The later sustained-run samples record both counters.
- NPC/boarding/engine controls were clicked in their scene positions. Found and fixed overlapping mooring/boat-menu buttons; added general placement avoidance. Runtime sailing button rectangles were then nonoverlapping.
- AudioContext is running after clicking Resume; scheduled music notes and effects increment. Music toggle off clears musical voices, on restarts music. Set volume to0.25 and verified it in read-only runtime output. Music continues through the bag/settings while simulation stays paused.

Screenshots and the final runtime samples are stored alongside this report.

## Natural fishing result

On the final code build, navigated to Wharf west-side fishing spot, stopped, lowered the anchor and cast the two-hook dropper rig. A natural bite was hooked and reeled through a 130-second fight. Landed a 36 cm, 1.16 kg copper rockfish, retained it through the normal catch dialog, raised the anchor and began the return route. Screenshots04–07 document the actual fishing UI and catch; they are not rendered fixtures. At 364 active seconds the game counter was 727 seconds (independent rounding within 1 second). Music had scheduled 4,449 notes with bounded live voices; the console showed no warnings/errors.

## Publishing

Code commit `917c1a6d5fad6e18874ae4d8ae1eb0a61559e38c` deployed successfully through [GitHub Pages run 36338755042](https://github.com/gioa/santa-cruz-skiff/actions/runs/36338755042). All 10 checked public entry/module/CSS files exactly matched local SHA-256 hashes; see `deployment.json`.

## Completed active-time run

The final sustained session reached **602 active seconds (10:02)** at dock arrival, with the game clock at 06:20 (2× calendar rate). It included real sailing in both directions, a natural bite, a 130-second fight, retention and a naturally occurring patrol. The patrol confiscated the new copper rockfish because the persisted same-day catch ledger already contained one retained copper rockfish from the preceding session (maximum 1); this confirms that sale/earlier settlement does not reset the species daily ledger. No fish was inserted and no inspection was forced.

A final `v5.1` presentation refinement also reserves the actual HUD/tool/information rectangles during button placement, including their device safe-area offsets. It does not change simulation, timing, inventory or audio. The sustained session above used `v5`; final `v5.1` receives a separate local/public UI smoke check.

Completed at the hut counter after **670 active seconds (11:10)**; calendar 06:22:19 (1,339 game seconds; independent rounding). Camera x stayed fixed until the return walk reached the right deadzone boundary, then moved from -45.27 to -25.41 while camera z stayed -76.63. Final balance remained 19 because the confiscated fish was correctly unavailable for exchange. Browser logs were empty. The local v5.1 smoke check resumed successfully with saved gear and audio preferences.
