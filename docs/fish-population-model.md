# Fish population model

Every destination decides bites with the same agent-based model, `dist/fish-population.js`. There is no bite probability, timer or hazard budget. Fish exist as **schools** (or single fish for solitary species). Whether and what bites emerges from where they are, what they notice and how the bait is presented.

## What happens each half-second

1. **Spawning and leaving.** The engine keeps an active disc around the angler: 110 m at the beaches, 180 m at Santa Cruz. Every 4 s it samples the disc's habitat suitability for each species and compares the expected number of schools with the number present.
   - Expected schools = density × area × mean suitability ÷ mean school size.
   - Missing schools arrive at suitable points away from the bait. They never appear on top of it.
   - A surplus drifts away when conditions deteriorate (tide, light, season, sea state).
   - A new area, such as after a fast boat run, is filled immediately.
2. **Movement.** Schools steer toward better habitat with probe points ahead, plus correlated random turning.
   - They swim slowly where habitat is good and travel faster where it is poor. This kinesis makes them gather in troughs, over reef and along channel edges.
   - They hold station against most of the current.
   - Each school keeps to its preferred layer: near the bottom for surfperch, croaker, halibut and sanddab; above structure for copper, vermilion and lingcod; midwater for blue rockfish; upper water for jacksmelt, mackerel and bonito; deeper midwater for salmon.
3. **Sensing a bait.** A roaming school notices the bait at a rate built from three channels:
   - **Scent:** natural bait releases a plume carried downstream at the current speed. It widens and decays with distance, and it grows longer the longer the bait soaks. Wave mixing in the surf spreads it around the bait; a steady current carries it away instead. Oily cut fish carries furthest and sand crab least. Recasting starts a fresh, short plume.
   - **Sight:** within the species' sight range, scaled by daylight and turbidity, weighted by how visible the presentation is (float, flash, trolled lure).
   - **Motion:** jigged or trolled lures and live bait are felt through the lateral line within a few metres, day or night.

   Hunger and alarm scale the rate. Fish only respond if the bait is within the vertical range they will leave their layer for.
4. **Approach and inspection.** The school swims over and inspects the bait. Each fish may take it at a rate of
   `biteRate × appeal² × hunger^1.2 × (1 − alarm) × competition`.
   - **Appeal** comes from the species' existing preference functions: bait, hook and rig fit, bait freshness, how naturally the rig sits (stability, bottom contact), and for Santa Cruz the lure action and bait tipping.
   - A poor bait is also given up on sooner. Rejected baits are ignored for 1.5–4 minutes.
   - Bigger schools compete and are bolder.
   - While a fish inspects, the beach HUD shows **竿尖轻点** (a rod-tip tap).
5. **Outcomes.**
   - A bite locks the fish's species and length. Fish in a school share a size cohort.
   - Striking removes that fish from its school; wary species then back off for a while.
   - A missed strike alarms the school.
   - A landing splash or a running outboard spooks nearby wary fish.
   - Only one bite is pending at a time.

## Inputs by destination

| | Beaches (`shore-fish-ecology.js`) | Santa Cruz (`pixel-fish-ecology.js`) |
|---|---|---|
| Habitat suitability | distance to trough/bar, depth, sand, season, waves | substrate (USGS), depth band, season, water temperature, nearby bait schools |
| Appetite | dawn/dusk and daytime feeding by species | dawn/dusk feeding |
| Appeal | bait × rig/hook × freshness × stability × bottom contact | presentation affinity × bait tipping × freshness |
| Scent / sight / motion | bait scent table; float visibility | bait scent, flash from action and trolling, lure motion |

The visible bait schools at Santa Cruz (anchovy, sardine, mackerel) remain explicit schools on the map. A lure inside one meets those baitfish at the school's density, and sabiki rigs use them as before.

The population is saved with each trip (`population` in the save) and uses its own random stream. Reloading therefore cannot reroll the fish around a bait. The random seed is fixed for tests and fixtures, and random for real Santa Cruz trips (daily weather) and new beach games.

## Calibration

`node scripts/calibrate-shore-population.mjs [runs] [--json file]` and `node scripts/calibrate-pixel-population.mjs [runs] [--json file]` replay fixed strategies through the real simulations over many seeds. They report how often a bite comes within 2 and 10 minutes, the median wait and which fish took the bait. The latest reports are in `reports/shore-population-calibration.json` and `reports/pixel-population-calibration.json`. `tests/shore-technique.test.js` and `tests/pixel-population.test.js` keep the key comparisons from regressing.

Shore (40 seeds per strategy, 10-minute limit, 2026-09-28):

| Strategy | Pacifica ≤2 min | ≤10 min | median | Half Moon Bay ≤2 min | ≤10 min | median | Fish (Half Moon Bay) |
|---|---|---|---|---|---|---|---|
| trough · crab · Carolina · soak | 42% | 80% | 142 s | 80% | 92% | 57 s | surfperch 97%, white croaker 3% |
| trough · crab · Carolina · recast 20 s | 30% | 65% | 315 s | 45% | 82% | 170 s | surfperch 97%, white croaker 3% |
| trough · squid · Carolina | 32% | 75% | 220 s | 52% | 85% | 117 s | white croaker 62%, surfperch 38% |
| bar gap · anchovy · fish-finder | 22% | 48% | >600 s | 45% | 100% | 136 s | striped bass 55%, white croaker 35%, halibut 10% |
| trough · squid · float | 65% | 90% | 79 s | 52% | 98% | 109 s | jacksmelt 100% |
| trough · crab · fish-finder (big hook) | 22% | 72% | 281 s | 32% | 80% | 183 s | surfperch 100% |
| max range · crab · Carolina | 2% | 12% | >600 s | 18% | 48% | >600 s | surfperch 68%, white croaker 32% |
| swash · crab · Carolina | 40% | 68% | 142 s | 50% | 88% | 118 s | surfperch 97%, jacksmelt 3% |
| trough · crab · Carolina · rough sea | 18% | 40% | >600 s | 2% | 2% | >600 s | white croaker 100% |
| trough · crab · Carolina · midday | 35% | 92% | 165 s | 72% | 92% | 73 s | surfperch 84%, white croaker 14%, jacksmelt 3% |

Santa Cruz (20 seeds, boat held over a mapped reef or sand cell, no wind):

| Strategy | ≤2 min | ≤10 min | median | Fish |
|---|---|---|---|---|
| reef · squid · single-hook bottom | 70% | 100% | 78 s | blue rockfish 85%, copper rockfish 15% |
| reef · squid · recast every 30 s | 40% | 70% | 157 s | blue rockfish 64%, copper rockfish 29%, Pacific mackerel 7% |
| reef · feather jig held at depth | 25% | 60% | 280 s | blue rockfish 67%, copper rockfish 17%, Pacific mackerel 17% |
| sand · squid · single-hook bottom | 50% | 90% | 111 s | white croaker 78%, Pacific mackerel 22% |
| sand · feather jig held at depth | 5% | 5% | >600 s | Pacific mackerel 100% |

The takeaways:
- Good technique usually finds fish within a couple of minutes.
- Recasting, oversized hooks, maximum-range casts, heavy surf and baits that don't suit the local fish are clearly slower.
- The bait and rig decide the species.
- A jig simply held at depth is slower than bait; jig action comes from rod lift strokes, which these fixed strategies do not perform.

All densities, school sizes, speeds, sensory ranges and bite rates are authored game parameters informed by general fish behaviour and the preference evidence in [shore ecology evidence](shore-ecology-evidence.md) and [Santa Cruz ecology evidence](pixel-fishing-ecology-evidence.md). They are not survey densities or measured catch rates.
