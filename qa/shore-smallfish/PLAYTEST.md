# White croaker, jacksmelt and float rig verification

Local changes, 2026-09-28. Not published.

Completed:
- Full JavaScript suite: 852 tests passed; syntax checks and `git diff --check` passed.
- New model tests cover bottom-bait white croaker, upper-water jacksmelt, incidental crab/Carolina jacksmelt, season, waves, zero usable bait, and no guaranteed short wait.
- Both species in both scenes go through real cast flight, integrated encounter hazard, strike, tension-controlled retrieval, landing, keep, reload and sale. Tests choose valid random quantiles; no fish or bite phase is injected.
- Small fish can land when retrieved without waiting for the large-fish stamina threshold.
- Float physics/equipment tests cover real hook depth, drift, wave stability, casting payload, buying, swapping, losses and save/restore. Rendering tests cover floating line entry, bite dip and distinct fish portraits.
- The existing `qa/shore-ecology/playtest.mjs` browser regression passed both beaches and four viewports, including real cast controls, ordinary walking/casting/retrieval, pause, sea-state effects and an encounter followed by UI strike. Its report is in that folder.
- Version-3 calibration reconciles all five species over 28 actual simulated trajectories and stores matching source hashes.

Browser run (2026-09-28, rerun after the population model):
- `node qa/shore-smallfish/playtest.mjs` against the local no-cache server on port 4198 passed both beaches with no page errors:
  - shop purchase of the float rig and squid;
  - float/bait assembly;
  - walking to the surf and a half-power cast;
  - float waiting on a 320×568 screen;
  - a white croaker school and a jacksmelt school each finding and taking the bait, then the UI strike;
  - tension-controlled landing;
  - keeping both fish and distinct catch/journal portraits.
- Catch cards now show length (in) before weight (lb). The journal shows "in · lb" for each fish.

The script's test-only response route places a school beside the bait once it lands and keeps the rest of the beach empty. The fish still sense, inspect and choose to bite through the model; nothing forces a bite, species or landing.
