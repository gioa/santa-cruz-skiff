# Premade hook sizes and selectivity

Researched 2026-09-27. These are US hook-size labels, not Japanese size numbers. The presets are game tackle choices informed by real equipment and research; they are not manufacturer replicas or measured Santa Cruz catch-rate tables.

## Presets

| Rig | US size | Hooks | Intended role and evidence |
| --- | --- | --- | --- |
| `bottom` — single bottom rig | `2/0` | 1 | General squid/bait bottom fishing. A California charter operator gives a rockfish hook range of 2/0–4/0 [1]. |
| `dropper` — two-hook bottom rig | `1/0` | 2 | A lighter, smaller-bait alternative. NOAA's California rockfish selectivity trial included 1/0 shrimp flies [2]. This is intentionally lighter than the commercial 4/0 rockfish dropper example [3]. |
| `slider` — sliding-sinker rig | `3/0` | 1 | Larger bait and sandy-bottom predators. P-Line specifies 3/0 or 4/0 primary hooks for its California halibut trolling leaders [4]. The game rig is a simplified single-hook sliding-sinker arrangement, not that product. |
| `jig` — jighead/soft plastic | `4/0` | 1 | Medium soft-plastic presentation. Z-Man specifies a 4/0 hook for 4–5 in soft plastics [5]. Its product weights are not the game's sinker tuning. |
| `float` — suspended bait | `#2` | 1 | Smaller cut bait or shrimp in the water column. This is a game-selected small-bait preset, not a claim that float rigs always use #2 or a documented Santa Cruz optimum. |
| `sabiki` — two dressed hooks | `#6` | 2 | Small feather presentation for mackerel and baitfish. Hayabusa's mackerel rig includes JP #10, which its conversion chart places near US #4/#6 [6]. The game retains its existing two-hook configuration. |

The size order is `#6 < #2 < 1/0 < 2/0 < 3/0 < 4/0`. A larger ordinary number means a smaller hook, while a larger `/0` number means a larger hook. Hawaii DAR cautions that hook measurements are not uniform between patterns/manufacturers [7]. Sabiki products particularly need care: Hayabusa JP #6 corresponds approximately to US #10, not US #6 [6].

## What the evidence supports

Hook size should change the likelihood of a successful take and the ability to retain a fish. Fish length alone is insufficient: mouth opening, jaw thickness, bait bulk, hook pattern, wire strength, and applied load also matter. A bluegill circle-hook experiment found that fitting the hook inside the mouth while leaving enough gap to engage the jaw improved performance; it also observed smaller fish caught on larger hooks [8]. This supports a mouth-fit mechanism, not transferring freshwater percentages to marine species.

California rockfish need especially broad overlap. NOAA compared 1/0, 5/0, and 13/0 J-style hooks with squid-dressed shrimp flies. The three principal rockfish species had generally similar length distributions across sizes; the study's 5/0 hook captured a wide size range [2]. Consequently, a big nominal hook must not automatically exclude every small rockfish.

Small hooks can land large fish. Hawaii DAR describes how thin hooks can enlarge a hole in the mouth under load and then come free [7]. The simulator should therefore make small/light presets less forgiving under heavy load, while allowing a large fish to be landed with controlled pressure. Hook size alone is neither a guaranteed maximum fish weight nor a universal hook-strength rating.

All numerical hook-gap estimates, mouth-size multipliers, load limits, probability curves, and retention modifiers in the game are **simulation tuning**. The sources establish tendencies and plausible equipment, not calibrated Santa Cruz probabilities. A hook that cannot plausibly enter a tiny mouth may produce nibbles without a hookup; marginal fits should otherwise remain probabilistic. No changes to legal size, season, hook-count, or retention rules are implied by these presets.

## Sources

1. [Channel Islands Sportfishing — Rockfish](https://www.channelislandssportfishing.com/rock-fish/). Firsthand California operator guidance; southern California, not a Santa Cruz field study.
2. [NOAA NMFS-NWFSC-95, Appendix C, pp. 107–110](https://www.webapps.nwfsc.noaa.gov/assets/25/833_12022008_162813_RockfishSurveyTM95WebFinal.pdf). Primary Southern California Bight hook-selectivity study; research gear is not a recreational rig or authorization for its hook count.
3. [Pitbull Tackle — Rock Cod Bait Rig](https://pitbulltackle.com/rock-cod-bait-rig/). Manufacturer specification: two dropper loops and 4/0 octopus hooks.
4. [P-Line — California Halibut Trolling Leaders](https://p-line.com/product/trolling-halibut-rig-with-bkk-hooks/). Manufacturer specification of primary-hook sizes; not interchangeable with Pacific halibut deepwater tackle.
5. [Z-Man — Redfish Eye Jigheads](https://zmanfishing.com/products/redfish-eye-jigheads). Manufacturer specification, used only to establish plausible 4/0 soft-plastic hook sizing.
6. [Hayabusa — Sabiki hook-size conversion chart](https://hayabusafishing.com/wp-content/uploads/2020/10/Sabiki-Size-Chart-Converter-with-fish.pdf) and [SS113 mackerel fish-skin/feather rig](https://hayabusafishing.com/shop/saltwater-fishing/saltwater-sabiki-fishing/ss113-mackerel-fish-skin-and-feather-6-hook-sabiki/). Manufacturer's explicitly Japanese sizing and approximate US conversion.
7. [Hawaii Division of Aquatic Resources — Fishing in Hawaii, p. 19](https://dlnr.hawaii.gov/dar/files/2016/03/Fishing_in_Hawaii.pdf). Government educational explanation of numbering, nonstandard measurements, and thin-hook mouth damage under load.
8. [Cooke et al. (2005), Influence of circle hook size on hooking efficiency, injury, and size selectivity of bluegill](https://experts.illinois.edu/en/publications/influence-of-circle-hook-size-on-hooking-efficiency-injury-and-si/), DOI [10.1577/M04-056.1](https://doi.org/10.1577/M04-056.1). Primary research; useful mechanistic evidence, not marine-species calibration.
