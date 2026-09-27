# Pixel v14 — physical fishing feedback

## Browser play

Tested at localhost:4177 in an isolated local save using actual UI/WebMCP player actions and natural game time. No fish spawning, state injection or time advancement was used in the browser. Engineering fish comparisons are separate in `calibration.json`.

- Lowered the bottom rig beside the boat. Open-spool feed created two low-level audio voices from actual line payout; no ratchet played. When the rig stopped feeding, voices returned to zero.
- Closed the spool through its button. Payout stopped; the one-time latch effect incremented; no ongoing false reel sound remained.
- First natural bite was missed while inspecting code, exercising the normal expiry/cleanup. A second naturally occurring bite was hooked using the game's ordinary validated action.
- Caught a 40 cm, 1.34 kg lingcod. From roughly 34.3 m of paid line, steady winding brought it to the boat in 49 active fight seconds (including initial non-reeling observation); no stamina gate was required. Successfully released it, returned to the overhead view and received the usual release reward.
- During winding, the audio context was running, actual crank was 1.2 rev/s, retrieve about 0.70–0.76 m/s, crank/gearing/guide voices were active, and background music ducked to 0.23. No drag ratchet played when the small fish was not paying line.
- Opening Settings during retrieval stopped all reel voices immediately. Closing Settings did not resume a stale winding command. On landing, payout/retrieve and reel voices were zero.
- Inspected 390×844 portrait and 568×320 landscape first-person scenes, plus the 320×568 catch dialog. No document overflow; no tension/stamina gauges remained in the DOM. Rod/reel controls stayed usable.
- No browser warning/error entries were reported.

Screenshots: `01-reeling-phone.png`, `02-landscape.png`, `03-small-fish-landed.png`. The captured natural-catch JSON precedes the final small metadata fix from bait string to boolean; the final regression suite covers that fixed representation.

## Automated checks

`npm run check` passed; full `npm test`: **370 / 370** passed. Focused tests cover species and size differences, physical landing without an energy gate, same-tackle calibration, frame-rate stability, slack before payout, spool-end load, actual line conservation, independent crank/spool animation, real-rate audio, cancellation/pausing/muting, and dated regulation evidence. Existing boat, inventory, navigation and first-person flows remain passing.

`calibrate.mjs` records six deterministic engineering scenarios on identical tackle. They are simulation results, not empirical pulling-force data and not real-time browser play. Primary evidence and limits are documented in `docs/fish-fight-research.md`.
