# Pacifica Beach validation — 2026-09-28

- Clean release base: Santa Cruz v77 (`f0266261e88e275537135c8e5c68a3772e18eca8`).
- `node scripts/check.mjs`: all shipped JavaScript parses.
- `node --test tests/*.test.js`: **735 passed, 0 failed** (including ten new Pacifica simulation tests).
- Chrome normal-control playtest: **602.7 seconds**, **8 fish naturally landed**, zero page exceptions. Real elapsed time; no forced bites, time skips, teleports, injected fish, or credited rewards in this run.
- Played charged pointer casts, waited for random bites, struck within the window, controlled reel tension with held/released pointer input, kept and released fish, walked to the shop, sold catches, replenished bait, and reloaded the save.
- Separate explicit save-fixture tests covered a full twenty-fish bag, pending catch retention, release at capacity, depleted selected bait, switching to stocked bait, window-blur pause/resume, and Santa Cruz save isolation. See `edge-checks.json`; these fixtures were not part of the natural run.
- Final release integration: Santa Cruz picker → Pacifica → bait purchase → Santa Cruz → Pacifica, with credits and bought bait retained; then actual walking/casting. See `release-travel.json`.
- Visual checks: 1440×1000, 390×844, 320×568, 844×390. No horizontal document overflow. Checked entry picker, shop, surf controls, long cast framing, bag, journal, and help. Native dialogs support Escape and return focus.
- Renderer refinements following the initial long run were separately checked on all four viewport sizes: cottage roof lines, actor orientation, surf fish position, wide-screen terrain edges, and player/cast framing.

## Selected screenshots

- `final-desktop-welcome.png`: new destination and Bait & Tackle exterior.
- `final-desktop-shop.png`: supplies and equipment.
- `final-phone-surf.png`: portrait controls.
- `final-landscape-long-cast.png`: landscape fishing view.
- `entry-phone-picker.png`: travel choices in the original game.

The natural run and later final-renderer checks are reported separately so the evidence does not imply an additional ten-minute run after visual-only changes.
