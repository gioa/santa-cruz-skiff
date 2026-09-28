# v39 — Restore original dock/boat proportions

Verified 2026-09-27 on local production modules at localhost:4189.

- Restored the v35 boat drawing scale (0.18 scene units per sprite pixel), original rod drawing and boat camera maximum (6). Stored, lowering and afloat boats use the same geometry scale. Dock geometry is unchanged.
- Kept the physical vessel length at 15 ft. Separate boat-centred tackle projection keeps casting/spool distances proportional to the readable boat artwork, without changing walking or helm map coordinates.
- Mobile 390×844: started a fresh trip, walked to the counter, paid 15 credits, watched the full lowering sequence, walked to the boarding platform, then boarded using the visible button. Boarding/waiting labels stayed outside the boat animation.
- Mobile production-renderer casting fixture: 30 ft target appeared two visible hull lengths from boat centre; spool paid 26.4 ft at splash (line starts at rod tip). Fixture pauses at splash for measurement, and is explicitly labelled local QA.
- No browser console errors in the game or casting fixture.
- `npm run check`: passed. `npm test`: 567/567 passed, including scale, projection roundtrip, visible wharf collision, wake alignment, camera framing and all-phase label avoidance.

Screenshots:
- `01-dock-phone.png`: restored stored boats / wharf proportions.
- `02-launch-phone.png`: boat during lowering with clear platform label.
- `03-afloat-phone.png`: launch complete and boarding available.
- `04-cast-30ft-phone.png`: 30 ft cast / 15 ft hull comparison.
