# Visible baitfish (v43)

The five unconditional, boat-following decorative fish marks are removed. Small fish are rendered exclusively from real forage-school events. The same `schoolFish` function produces individual positions, water depths, persistent slot identities, lengths, and species for drawing and bite selection. Schools are independently moving world objects, not attached to the boat/camera. This does not guarantee that fish are always present next to the boat.

Northern anchovy, Pacific sardine, and small Pacific mackerel are catchable using the existing hook/reel/catch flow. Exact length and identity survive the bite transition. Every newly hooked individual is removed from its source school; escaped/released fish disperse instead of immediately respawning in that slot. Removals live for the event lifetime and are bounded; old saves reset transient wildlife with the rest of the trip encounter state.

Candidates must be within 3 m horizontally and 1.5 m vertically of the hook, with Gaussian preference for closer passage. Rates use hook gape, actual lure movement and bait condition; #6 two-hook feather tackle works much better than large bottom/4/0 hooks. Hook fit still determines whether a bite seats. Correct presentation improves probability; it never forces a bite. These distances, rates, mouth dimensions, weight reference specimens and school density are simulation tuning, not measured Monterey Bay fishing probabilities. This patch catches one fish at a time with the existing standard tackle flow; it does not introduce a multi-hook catch UI or automatic live-bait inventory conversion.

Small fish get a light, rapid struggle rather than a mandatory timed fight. Mass is preserved to one gram internally. They use the existing species-correct sprites and shared ruler in inches/feet. Tiny world silhouettes have a two-logical-pixel visibility minimum. Deep silhouettes fade. Low baitfish rewards avoid treating a 0.5 oz anchovy like a 2 lb rockfish.

Sources consulted 2026-09-27:
- NOAA Northern Anchovy: large mouth, coastal near-surface schooling and size up to approximately 7 in. https://www.fisheries.noaa.gov/species/northern-anchovy
- NOAA Pacific Sardine: dense schools near the surface, central/northern California juvenile presence, species appearance. https://www.fisheries.noaa.gov/species/pacific-sardine
- NOAA's 2017 survey reports jigging a near-surface anchovy school. https://www.fisheries.noaa.gov/science-blog/2017-west-coast-pelagic-fish-survey
- CDFW ocean recreational regulations 27.56 / 27.60: anchovy and Pacific sardine registered in the existing snapshot, excluded from the general bag. Existing area and gear rules still apply. Commercial sardine closures are not substituted for recreational rules. https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs

Validation: production-module tests cover exact draw/encounter coordinate identity, all three species, wrong-depth/absent/expired/depleted schools, hook-size effects, bait condition, tiny-fish fight behavior, and full lower/bite/hook/retrieve/keep/release removal cycles. Browser QA uses a clearly marked, local-only deterministic scene with the production simulation and renderer. It does not write production saves.
