# Left landing and dawn validation · 2026-09-27

## Checks

`npm run check`, all 48 `npm test` cases, and `git diff --check` pass. New tests cover continuous counter-to-stair walking, the connector/stair height seam, shoreward descent, preventing boarding through the upper deck, left-side water routes/obstacles, and migration of old dock-side saves while preserving offshore position and inventory.

An independent simulation of the actual integrated boat update completed eight outbound/return legs from the new berth to the four mapped fishing areas, including the longer routes around the wharf. Actual mapped coastline, depth and hull collision were used with 13.6 kn NW wind; no collisions occurred. Return approaches settled to approximately 0.71–0.76 kn. This is numerical validation, not a claim of eight browser sea trips.

## Actual browser actions

Using the normal player controls in Codex IAB, started at 06:00, walked to the new road-facing rental counter, packed the free starter gear, watched the empty boat lower, crossed to the left staircase and descended to the small fixed platform. The boarding action appeared on the lower landing and successfully boarded the boat.

Unmoored, used the normal return waypoint action for a short powered approach, reached the new berth at low speed, and docked. The result modal appeared; closing it returned the player to the left platform. Reloaded/resumed there and walked back up the staircase to the shop. The recorded short maneuver travelled 39 m; no fishing trip or 10-minute endurance run is claimed for this focused correction. `roundtrip-state.json` records completion and the return to the counter.

The corrected white paint, inclined green hoist and bright adapted dawn were then reloaded and visually checked. Screenshots use the actual default 06:00 clock and its normal progression, not the custom 08:00 lighting mode. Checked 844 × 390 landscape and 390 × 844 portrait; enabled touch controls and successfully dragged the view in portrait. Viewport and input preference were restored afterwards. Browser warning/error logs were empty throughout the final checks. This is browser device-size testing, not a physical iPhone/Android benchmark.

## Actual screenshots

- `01-fixed-landing-0600.png`: looking up the white-railed stair from the fixed platform.
- `02-storefront-0600.png`: road-facing turquoise rental storefront and counter.
- `03-left-boarding-0600.png`: left/east hoist and right-side shop in one seaward-facing view.
- `04-phone-0600.png`: portrait touch controls and the visible storefront at default dawn.

See `REFERENCES.md` for the inspected video, official storefront photo, City engineering report, and limits of the reconstruction.
