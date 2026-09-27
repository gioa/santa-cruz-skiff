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
