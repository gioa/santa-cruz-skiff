# Straight pixel wharf — September 27, 2026

Build: `20260927-pixel-v9`. Save schema remains 5.

## Change

The pixel wharf now has a single rectangular footprint: x = -30…24 m, z = -483…263 m. Both long sides are parallel, and the seaward end is square. The same footprint supplies rendered planks/rails, the paper chart, walking, wildlife water checks and vessel collision/navigation. Coastline, GPS projection, buildings, fishing spots and the legacy 3D wharf remain unchanged.

All wharf buildings fit within the new deck. The three equal-size shore boats and their pre-hoist transfer fit on it. The left stair corridor, rental counter and water berth remain in their existing positions. The inland edge overlaps the real land polygon. This change does not add a town/beach ramp; the existing inland deck-height transition remains.

## Actual browser checks

Tested a separate localhost:4176 origin, preserving localhost:4173 progress, using normal UI actions. No state injection, teleporting or clock advancement.

- Resumed at 06:00 in a 390×844 mobile viewport. Build v9 loaded; balance and equipment were retained. `01-mobile-straight-390.png` shows the straight side and three equally sized shore boats.
- Tapped the counter button and the character walked there. Paid 15 game credits using the visible rental button; balance changed from 100 to 85.
- The normal launch animation ran while the character followed the left staircase to (-31.8, -55.2). The landing had an “等候吊艇” action while lowering, with no premature boarding.
- After lowering completed, boarded, unmoored and started the engine. Selected F and dragged the touch throttle from 0% to 64%; the boat sailed 27 m along the left edge, from the berth to about (-34, -82.2). Selected N to idle again. `02-mobile-departure-390.png` records this check.
- The 390×844 page had no horizontal overflow, disabled text selection, and no browser warnings or errors.

## Automated and independent checks

`npm run check` and all **243 tests** passed after the geometry integration. Updated pixel tests use the pixel wharf and collision modules; legacy geography/harbor/navigation tests continue to use their original defaults.

Seven new regressions cover both full-length deck margins, 160 m of actual model walking, removed western bulges/new eastern deck, all four fishing destinations and returns, rejected hull turns at the new edge, five overlapping legacy vessel poses (including a hull whose center is still in water), unaffected offshore saves, and independent factory instances.

Independent geometry review found no building or dry-hull overhangs, verified 1,001 pre-hoist poses, and checked eight routes covering all four fishing spots and their return trips. Old boats intersecting the new deck are moved to nearby safe water on resume; unaffected offshore voyages retain their coordinates.
