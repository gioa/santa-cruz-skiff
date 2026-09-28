# Visible baitfish validation

Release: v43. `npm run check` passes; `npm test`: **588 passed**.

- Automated lifecycle uses the production `PixelSimulation`: buy/equip the existing #6 rig, pay rental, launch, board, lower, brake, receive an actual weighted bite, reel to seat, retrieve and keep/release. Runs all three species and verifies one corresponding school slot is removed in both simulation and renderer.
- Browser: 390×844 local deterministic scene (`playtest.html`) imports production physics, wildlife, tackle and fish-art modules. Cast into the rendered school, wait for a bite, use the reel control, land and keep a Pacific sardine. **48 fish → 47 fish**. No console errors.
- `01-visible-school.png`: independent school next to the boat before the cast.
- `02-caught-sardine.png`: the landed individual (school 9001, slot 4) and matching remaining count.
- The scenario is visibly labelled QA, runs only on localhost:4193, and never writes game save storage. Species, hooking and landing are not mocked.
- Full game page also loads normally with the new versioned module graph.

See `docs/visible-baitfish.md` for sources and approximation limits.
