# Bottom slack and snag regression — 2026-09-27

Build `20260927-pixel-v24`.

## Automated checks

`npm run check` and all 480 tests passed. Coverage includes actual mapped reef versus sand, four-second contact grace, wind/wave/current risk comparisons, frame-rate-independent hazard accumulation, physical fixed-hook snag loading, drag release, eventual abrasion break, real consumable loss/replacement, pause/resume cleanup, and mobile drag-gesture cancellation. Descent and drifting-bottom behavior were checked at 1/60, 0.1 and 0.25 second timesteps.

A pre-existing view test assumed every small fish must fight longer than one second. The new taut descent yielded a natural 0.29 kg blue rockfish at about 2 m depth, physically landed after 1.4 seconds of winding (one second in the fight phase). Its assertion now requires actual line shortening and positive fight progression rather than an arbitrary minimum duration.

## Browser checks

Used the actual game at 390 × 844, resuming a saved ordinary rod with a 4/0 feather rig and lowering beside the wharf. No injected funds, fish, position, clock or snag events. The browser trip checked normal descent, drift, bottom contact and manual recovery; rare snag and break branches were validated by deterministic simulation tests rather than claiming a random browser encounter.

- During descent: approximately 0.78 m/s payout, 0.71 N load, bend 0.137, and 0.03 m working slack. `01-phone-lowering.jpg` records the lightly loaded rod.
- After 5.1 seconds at bottom in real-condition wind: 0.27 m slack, bend 0.013, and load 0.02 N. Slow residual payout now adds to actual drift demand, allowing the slack loop to grow.
- After 14.77 seconds at bottom: 0.75 m slack, bend 0.005, and load 0.01 N. Payout was 0.29 m/s including line required by the drifting boat. `02-phone-bottom-slack.jpg` records the relaxed rod and slack cue.
- Manual winding cleared the slack and lifted off bottom: bottom contact false, unattended timer reset to zero, slack zero, bend 0.187, load 1.11 N. Releasing the reel stopped winding.
- No browser errors or warnings. Ordinary automatic recovery remains unavailable.

This focused regression is not represented as a new ten-minute endurance run. Probabilities and numerical resistance/abrasion rates are authored simulation values, not field measurements.
