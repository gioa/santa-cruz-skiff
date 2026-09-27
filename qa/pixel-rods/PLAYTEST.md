# Personal backpack and per-rod assembly — pixel v6

Date: 2026-09-27. Local UI tested in the Codex in-app browser at `http://127.0.0.1:4173/?edition=pixel`, an isolated origin so the user's localhost progress remains intact. No browser state injection, teleporting, artificial fish or time acceleration beyond the game's normal 2× clock.

## Verified behavior

- New game starts with nine free items enabled and directly accessible in the personal backpack. At the spawn, outside counter range, put the PFD away and re-enabled it; it remained in the same grid slot. The old shore locker is merged into the personal grid.
- Walked normally to the counter, bought the light rod for 85 of the starting 100 credits, then edited its seven-slot assembly. Basic rod: squid, 35% drag. Light rod: soft bait, 60% drag. Editing light rod left basic rod active. Picking up each rod restored its own configuration. Reload/resume preserved both assemblies and the selected rod. A later small-screen slider check changed the basic rod to 36%.
- Completed the normal davit wait, walked the left-side route, boarded, unmoored and opened the rod workbench aboard. Cast with the light rod using its saved soft bait; the active rod stayed light, the basic rod retained its squid setup, and the normal flight/waiting states worked. Browser console reported no warnings or errors.
- Mobile layouts checked at 390×844, 320×568 and 568×320. No horizontal document overflow. At 320px, assembly targets are 54×82.5 CSS px; at 568px landscape, minimum slot width is 55.46px. The modal scrolls to lower controls on shorter screens; changing drag and switching rods remain usable.
- Computed mobile `user-select` is `none`. The world and joystick have `transform: none`. The map jump was caused by `.held` applying a 2px button transform to the canvas itself. The selector now targets `button.held`; touch surfaces also explicitly retain no transform.
- A separate renderer/input audit checked walk and boat modes at all three mobile sizes through pointer-down/move/up/cancel: camera position and zoom remained stable during a stationary press. Existing edge-triggered camera behavior remains intact.
- Swept walking collision and deck limits are covered by model tests. Old `jump`/water-entry/reboard actions cannot enter swimming. Old saves in swimming mode recover at the dock with equipment and catches intact.
- Unique paid parts transfer between rods. Active line diameter and reel smoothness follow the held rod's assembly, not merely all enabled gear. Bait on the hook is remembered per rod. Assembly edits cannot run during an active cast/fight.

## Checks

`npm run check`: passed. `npm test`: 182 tests passed, zero failures. Includes seven new player/equipment integration tests, eight rod-loadout tests, inventory migration and prior voyage/fishing/navigation/pointer regressions.

Screenshots: `01-rod-mobile.png`, `02-personal-bag.png`, `03-320-portrait.png`, `04-568-landscape.png`.

This revision received focused browser verification. The prior pixel-usability revision's 670 active-second voyage remains documented separately in `qa/pixel-usability/PLAYTEST.md`; it is not presented as a new ten-minute run of v6.
