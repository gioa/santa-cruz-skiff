# 2/0 soft-plastic encounter correction

- Baseline: 8960e31 (pixel v47); fixed edition: pixel v48.
- Reproduced missing artificial classification on the starter bottom rig. New
  movement, predator affinity and context regression assertions failed before
  the fix; all pass afterward.
- Five new tests cover active versus stationary plastic, ordinary versus lure
  rigs, no duplicate tipping bonus, habitat/layer/condition gates, and actual
  installed consumables flowing through the simulation environment.
- `npm run check`: passed. `npm test`: 605 passed, 0 failed.
- No rendering/control changes. Existing saved gear does not require migration.
- Probability coefficients are gameplay tuning; source/limits are recorded in
  docs/pixel-fishing-ecology-evidence.md.
