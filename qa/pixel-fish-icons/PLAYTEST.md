# Fish icon regression check — v31

- `npm run check` passed; `npm test`: 548 passed, zero failed.
- Current 11-species encounter catalogue has 11 unique mapped sprite kinds and 11 distinct raster hashes.
- Scientific identity, species IDs, English names, Chinese old-save names and combined labels are tested. Unknown fish has neutral artwork.
- Raster regression checks ensure blue rockfish has no red-dominant pixels, vermilion is red, copper has the pale lateral band, and lingcod/halibut do not have a deep tuna-like tail fork.
- Real browser inspected at 390×844 and 960×1100. All 11 preview canvases paint; no console errors/warnings.
- Actual shared measurement-board renderer exercised with Chinese-only blue/copper records: blue -> 12.0 in, copper -> 14.8 in. Existing fish-size scaling tests pass.
- `01-phone-rockfish.jpg`: phone contrast check; `02-copper-board.jpg` and `03-blue-board.jpg`: shared board; `04-all-species.png`: complete atlas. Enlarged atlas shows appearance, not relative catch sizes.
- Production entry module loaded on localhost without errors; no production save was modified.
- Biological references and visual limitations: `docs/pixel-fish-icon-audit.md`.
