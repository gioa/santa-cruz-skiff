# Quiet dock and one-tap walking — pixel v6.1

Date: 2026-09-27. Browser verification used the independent `127.0.0.1:4173` test origin, preserving the user’s localhost save.

- Opening scene has exactly one functional dock attendant and the player. Three decorative dock people are removed. The attendant has an independently drawn work uniform, cap, face and clipboard; the player keeps the coral lifejacket and cream sunhat.
- On a 390×844 mobile viewport, clicked the visible attendant sprite (not the guide button). The player automatically reached the counter at (-7.8, -54), and its contextual interaction appeared.
- Clicked ordinary boardwalk ground once; the player walked there without any held input. A compact four-corner destination marker appeared during the route and cleared at arrival.
- From that ground position, clicked the skiff artwork once. The player automatically followed the left stair route and reached (-31.8, -55.2), with the waiting-for-davit interaction. There was no teleport or water shortcut.
- Separate read-only renderer checks at 390×844, 320×568 and 568×320 verified attendant head/body/feet and hut hit areas resolve to the counter; landing and stored/lowering/afloat skiff hit areas resolve to boarding. Five ordinary walkway points retained free-ground routing. Boat mode did not return land-side destination strings.
- Pointer-down captures the original world target. Pointer cancel clears it; a drag over 12px, menu or mode change prevents navigation. This avoids a moving camera changing the release-time destination.

Screenshots: `01-quiet-dock.png`, `02-tap-destination.png`, `03-tap-boat.png`, `04-player-and-staff.png`.

Final model verification: the local planner uses indexed building footprints and a bounded detour search; direct paths and the authored stair corridor remain preferred. Full `npm run check` and `npm test` passed: 188 tests, zero failures. Six new route tests cover real mapped building detours, destination replacement/manual takeover, water/building/oversized-target rejection and both directions on the narrow stair.

Final browser check at 1280×900: clicked visible ground beyond the rental building, automatically walked 35 metres to (12, -69.8), reported `arrival: ground`, cleared the destination and stopped. Console had no warnings or errors. Screenshot: `05-building-detour.png`.

The initial synchronous 45ms route deadline failed on a cold GitHub runner. It was replaced with incremental search: about 3ms and at most 64 batches per frame, with the same 1,600-node total cap. Both search and precise smoothing yield, preserving input/render responsiveness. A slow-clock test forces one batch per frame and verifies eventual success after far more than 45ms, with no movement while pending and no catch-up walking. Pause, replacement, manual cancellation, exhausted searches and save recovery clear or preserve the pending target as appropriate.

Final incremental browser run: clicked beyond the building again, received the target (12, -72.17), and walked normally; no rejection toast or console errors.
