# Metric units and consumables — v18

Validated 2026-09-27 using the actual game UI and page-defined player actions at localhost:4177. Mobile viewports: 390 × 844 and 320 × 568. No fish injection or time advancement was used for the browser fishing run.

Observed lifecycle:

1. An existing save migrated with its worn attached squid bait, two spare bottom rigs and eight squid portions. The simplified panel showed complete rigs and bait, without individual reel/line/leader/sinker editing.
2. Explicitly replacing bait reduced squid stock 8 → 7. The old bait became fresh. Replacing the whole intact rig then stowed it, including its attached bait, and installed an unbaited spare.
3. With no bait attached, cast/lower actions were absent and the console identified the need to rebait. Reloading and continuing preserved both that unbaited state and the seven portions. Explicit baiting reduced 7 → 6 and restored deployment.
4. Lowered the rig and waited for a natural bite. Normal reel input hooked and landed a 27 cm, 0.43 kg vermilion rockfish. The catch used 67 active seconds of retrieval; the fish was not forced to exhaust itself. Spare bait stock stayed at six throughout deployment and retrieval.
5. Releasing the fish left the natural bait spent and blocked the next deployment. Reloading the final v18 build preserved that state. At 320 × 568 the panel scrolled normally; an actual rebait click reduced stock 6 → 5 and restored fresh bait.
6. Used the normal in-game rescue and walked to the dock counter. Explicit basic restock restored squid 5 → 12 without replacing the attached bait. Purchased the same sliding rig twice: credits 169 → 144 → 119 and spare count 0 → 1 → 2. Durable ownership was not duplicated.
7. HUD/GPS boat speed uses km/h. Settings showed wind in m/s, wave height in m and sea temperature in °C. Equipment text uses m/cm/g/kg.

All 403 automated tests passed. Focused consumables, metric conversion and fishing-control tests also passed after the cache version bump. Coverage includes finite stocks, no per-cast double charge, real rig loss on break/snag, natural/soft-bait wear, feather rigs without bait, exhausted soaking bait, stock preservation across rods and saves, repeat purchases, dock-only restocking, and fixed preassembled hardware.

The browser save/screenshots are test-profile evidence. Simulation design is documented in `docs/pixel-consumables.md`.
