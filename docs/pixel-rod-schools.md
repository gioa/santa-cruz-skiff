# Rod feedback and forage schools (v30)

References reviewed 2026-09-27:
- [Shimano: rod action and power](https://fish.shimano.com/en-GB/content/c/rod-action-and-power-explained.html): action describes the bending distribution and is distinct from power. Fast-action tip flex and a broader moderate-action bend inform the game's separate beam-shape and compliance parameters.
- [NOAA: northern anchovy](https://www.fisheries.noaa.gov/species/northern-anchovy) and [anchovy fishery management plan](https://repository.library.noaa.gov/view/noaa/60669/noaa_60669_DS1.pdf): forage schooling and predator/prey relationships support variable aggregations, with seasonal predatory fish attendance.
- Existing species swimming/body-size evidence: `fish-fight-research.md`.

This is an illustrative simulation, not a calibrated species force-frequency dataset. Fish shake frequencies, damping, school radii, density, attendance chance and encounter multipliers are game tuning. Fish size and species affect a signal driving a damped elastic tip; slack, free spool and fatigue attenuate it. Rod action changes where flex occurs; rod power changes compliance. First-person, overhead and console use the same tip state and anchored grip. No artificial camera shake or numeric tension meter was added.

Bait schools independently draw a 3–18 m radius and 0.18–1 density. These affect actual footprint, rendered fish marks and bird numbers. Up to two seasonal salmon/bonito/white seabass may follow, or none. Brief silhouettes appear on the edge, sized in world metres. Lure proximity horizontally and vertically gates a bounded multiplier for the corresponding species; existing monthly, habitat, presentation, bait and hook rules remain. Followers are a local encounter signal, not guaranteed catches or a new legality rule. Birds and cetaceans themselves do not affect fishing RNG.

Validation: automated behaviour, conservation/regression and geometry tests; localhost-only phone fixture in `qa/pixel-rod-schools/` uses the actual simulation and renderers, deliberately seeds fish fights/groups to inspect both rare and common conditions without touching the production save.
