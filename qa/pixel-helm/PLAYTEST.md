# Pixel helm update — 2026-09-27

Build: `20260927-pixel-v7`. This is a targeted regression pass, not another claim of a fresh ten-minute playthrough.

## Actual browser play

A separate localhost:4174 profile was used, preserving the user's localhost:4173 progress. Normal actions only: new 06:00 start, walk to the counter, purchase the 65-credit anchor (100 → 35), request the 24-active-second davit lowering, walk to the left landing, board and unmoor. While the bought anchor remained disabled, its boat button was absent. It appeared only after enabling the personal inventory item. Actual lower/raise actions succeeded.

Phone 390×844: started engine, selected F, dragged the ribbed throttle up 50–55px and moved the tiller right. DOM state showed held 50–55% power and positive tiller after pointer release, and the real vessel moved away from the landing. N set power to zero without a positional reset. A viewport interruption returned the UI to N / 0% and the simulation throttle to zero. No floating boat actions or sailing joystick remained.

Phone 320×568: no horizontal overflow; visible boat buttons and gear buttons measured at least 44×44 CSS px. Tiller and throttle surfaces measured 142.5×148 and 83.5×148.

Landscape 568×320: helm, F/N/R and engine controls fit. Stopped engine, deployed anchor, and made a normal short cast; the lure reached waiting state. Cast/lift and reel controls sit along the bottom. Fish-status bottom was 192px, console top 216px, leaving a 24px gap. The fight layout uses the same row with 44px drag buttons.

Screenshots: `01-tiller-390.png`, `02-purchased-anchor-390.png`, `03-tiller-320.png`, `04-tiller-landscape.png`, `05-fishing-landscape.png`.

## Camera and model checks

The former eased integer-overflow correction produced roughly 120 reverse one-pixel steps in a 15-second northbound sample. Shared integer correction produces zero reverse steps. Four actual renderer southbound 40-second runs also showed zero reversals in the final 15 seconds and at least ~9px of hull clearance above the console. Recorded model/render observations are in `northbound-camera.json` and `southbound-camera.json`; these are deterministic offline renderer checks, distinct from browser play.

`npm run check` passed. All 217 automated tests passed; the final camera padding calibration separately reran its 14 tests successfully. Tests cover ownership/carry gating, old anchor save recovery, deployed-anchor equipment protection, physical tiller direction, relative throttle motion, persistent settings, neutral momentum, F/N/R interlocks, interruption idling, and chart/manual handoff through real PixelSimulation launch/navigation.

Manual reference: Honda BF5A owner's manual, printed pages 15 and 33–34, https://cdn.powerequipment.honda.com/marine/pdf/manuals/00X31ZV16630.pdf . Real facts: opposite-direction tiller movement, twist throttle/friction and slow-throttle gear changes. ±35° UI travel, drag distance and the low-speed gear threshold are game tuning.
