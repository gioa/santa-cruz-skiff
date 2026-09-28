# Santa Cruz ecology and fishing presentations

Reviewed 2026-09-27. This model changes encounters, not retention law. Numerical
weights, depth-envelope widths, speed optima and seconds between encounters are
authored gameplay parameters; no cited source measures these probabilities.

## Evidence

- [USGS Santa Cruz seafloor catalog](https://cmgds.marine.usgs.gov/data/csmp/OffshoreSantaCruz/data_catalog_OffshoreSantaCruz.html)
  provides 2 m seafloor-character GeoTIFF and interpreted habitat polygons.
  [Metadata](https://cmgds.marine.usgs.gov/data/csmp/OffshoreSantaCruz/metadata/SeafloorCharacter_OffshoreSantaCruz_metadata.html)
  describes sonar classification supported by video. NoData is unknown, not sand
  or reef. Character includes mixed and coarse-sediment classes: acoustic
  hardness alone must not turn coarse sand into bedrock. Neither this historical
  mapping nor the game's NOAA elevation grid is a live sounder or a fish census.
- [NOAA Monterey Bay halibut study, 2014](https://sanctuaries.noaa.gov/science/conservation/pdfs/halibut14.pdf),
  pp. 8–12, reports local fishers using live bait while drifting, often over sandy
  draws adjacent to structure at 40–90 ft. Dead squid also works, particularly in
  fall; this is not evidence that squid universally fails. Interviews place local
  halibut effort mainly April–November, with July/August favored, and white
  seabass mainly August–October. Only three commercial fishers and fourteen
  logged trips were studied; their experience is not a controlled tackle trial.
- [Local charter's own methods](https://montereybaycharters.com/halibut)
  confirm drifting with live bait, artificial bait or frozen squid. Its methods
  support a motion/presentation distinction, not a measured success ratio.
- [NOAA lingcod](https://www.fisheries.noaa.gov/species/lingcod)
  distinguishes sandy juvenile habitat from the rocky/vegetated habitat used by
  larger fish. Lingcod should be incidental over unstructured sand, not
  impossible there. [CDFW rockfish ecology](https://wildlife.ca.gov/Conservation/Marine/Life-History-Fish)
  supports species-specific substrate/depth preferences.
- [NOAA Pacific mackerel](https://www.fisheries.noaa.gov/species/pacific-mackerel)
  describes schooling, summer northward movement, greater inshore abundance
  July–November and greater offshore abundance March–May.
- [CDFW white seabass report](https://opc.ca.gov/webmaster/_media_library/2019/08/Draft_Marine-Species-Report_WhiteSeaBass-1.pdf)
  documents seasonal movement north with warmer water. [CDFW bonito report](https://opc.ca.gov/webmaster/_media_library/2019/08/Draft_Marine-Species-Report_Bonito.pdf)
  associates nearshore availability with warm water. These support soft seasonal
  changes, not a guarantee that a migrant is in Santa Cruz in a given month.
- [Local charter's dated 2021 log](https://montereybaycharters.com/fish-report-for-2021)
  records spring salmon and both nearshore and deeper rockfish trips. This is
  evidence of historical method/availability, not the current legal season.
- [Ken Jones's first-hand Santa Cruz Wharf account](https://www.pierfishing.com/santa-cruz-wharf/)
  describes sandy mid-wharf bottom and artificial structure beneath the outer
  pier, including lingcod in fishing wells. This supports a bounded contextual
  near-wharf approximation where GIS coverage is absent, not exact coordinates
  for every debris patch. The historical copy indexed in the CDFW CRFS training
  archive currently returned HTTP 404, so the author's live page is the fallback.
- White croaker and Pacific sanddab sources and identification limits are in
  [the small-fish evidence note](pixel-nearshore-small-fish.md). Pacific sanddab
  has a deeper preferred envelope; it is not substituted for every shallow
  speckled sanddab mentioned in local reports.

## Monthly model, inferred from the evidence

This is the game's seasonal plan. It is not a real-world fishing forecast or
calendar of legal open seasons. Availability arrays explicitly contain twelve
months; resident bottomfish remain available throughout the year. Each row
inherits appropriate substrate, actual water depth and bait-depth requirements.

| Month | Relative opportunities implemented |
|---|---|
| January | Resident bottomfish; reduced nearshore migrants. |
| February | Resident bottomfish; halibut remains less available. |
| March | Gradual spring increase; no abrupt opening-date ecology switch. |
| April | Halibut drift and moving salmon presentations gain availability. |
| May | Spring halibut and salmon opportunities increase. |
| June | Halibut remains strong; summer pelagics increase. |
| July | Halibut high; mackerel more available inshore. |
| August | Halibut high; warm-water visitors receive increased weight. |
| September | Inshore mackerel and white seabass favored seasonally. |
| October | Autumn opportunities remain; halibut gradually decreases. |
| November | Mackerel remains plausible; other migrants taper. |
| December | Lower migrant availability; resident bottomfish persist. |

## Implementation

`pixel-fish-ecology.js` computes each species' unnormalised encounter intensity
from substrate, absolute depth, bait layer, rig, bait form, actual boat drift,
rod/lure action, month, water temperature and remaining bait condition. Their
sum determines bite timing; the identical weights select the fish only after a
bite occurs. A poor method therefore cannot become productive simply because
one eligible species receives all of the conditional probability.

Stationary squid strips are substantially less effective for halibut than a
slowly moving baitfish presentation. Actual drift differs from current flowing
past an anchored boat; vertically reeling dead bait does not imitate searching
across sand. Soft plastics and feather rigs benefit from rod action.
Jig action uses measured bait movement; holding a key or rod angle after its
finite stroke supplies no continuing action bonus. Mobile rod-angle gestures
therefore count when they actually move the bait. Frozen
anchovy/sardine inventory is not silently treated as live bait. An explicitly
attached natural-bait feather tip gives a modest species-dependent attraction
boost while usable; a default bait preference in the assembly grants no tip
bonus. Plain feathers keep working after the optional tip wears out. The model
has an explicit live-bait input for future supply systems.

Wrong rigs, habitats and seasons retain small positive incidental weights.
Unavailable attractant and a hook outside the water produce no encounter.
Hook size, seating, consumption and retention are handled by their existing
systems after this encounter model. The small local soft-bottom fish occupy the
near-wharf niche instead of artificially increasing lingcod or halibut rates.

Focused tests cover method comparisons, depth, layers, months, warm-water
effects, feather sizes, actual drift, rare incidental catches, and shared timing
and selection weights. Ratios asserted in tests protect design differences;
they are not claims about measured wild catch rates.

## Reproducible calibration

Run `node scripts/calibrate-pixel-ecology.mjs` to regenerate
[`qa/pixel-ecology/calibration.json`](../qa/pixel-ecology/calibration.json).
It evaluates eleven species, twelve months, three geographic points and nine
presentations (324 records). Each result stores the total bite hazard, each
species' absolute hazard and its conditional share; those quantities cannot be
used interchangeably. SHA-256 hashes identify the source modules and map data.

The controlled comparison holds water temperature at 14°C, bait condition at
full and bait at a defined layer. Lifted scenarios sample a bait moving at
0.52 m/s during a stroke, not a permanently held rod. It isolates ecology; it does not run an entire
trip, simulate gear blowback or treat that temperature as a monthly forecast.
All following wait times are synthetic game means, not real fishing estimates.

| Sample | NOAA reference depth | Substrate evidence | September stationary squid: mean any-fish wait | September lifted 4/0 feather: mean any-fish wait |
|---|---:|---|---:|---:|
| Middle Wharf west | 19 ft | USGS unknown; bounded written-account sand approximation | 55 s | 214 s |
| Lighthouse Point reference | 19 ft | USGS mapped reef | 35 s | 23 s |
| Main Beach reference | 31 ft | USGS mapped sand | 60 s | 428 s |

Stationary sand-bottom squid most often encounters white croaker. Lingcod
remains incidental there; reef feather presentations favor rock-oriented fish.
Across these controlled locations, slow-drift anchovy on the slider yields
about 41 times the stationary-strip halibut hazard. Faster 1.2 m/s trolling is
less productive for halibut than the 0.3 m/s drift. That ratio is an authored
model result, not a ratio obtained from a field trial.

Mapped artificial structure is treated as mixed habitat for encounters only;
unmapped cells remain unknown. A regression test also evaluates a single fish
with a 100% conditional share in unsuitable unknown habitat: its absolute bite
rate remains more than 1,000 times lower than a suitable reef presentation.


## Soft-plastic bait identity correction (v48)

[ODFW's marine shore fishing guidance](https://myodfw.com/articles/oregon-marine-shore-fishing)
identifies rubber-worm/minnow jigs as rockfish/lingcod presentations and describes
working bottomfish tackle near the bottom and slowly retrieving a leadhead lure.
This supports lure motion and habitat, not a measured Santa Cruz bite rate or a
universal hook-number recommendation. A 2/0 designation alone does not specify
plastic length, hook pattern, gap or rigging quality.

Previously only the *rig* IDs jig/sabiki/feather40 were classified as artificial.
The installed soft-plastic bait (`jig`) on a bottom, dropper, slider or float rig
fell through to unknown-bait coefficients and missed lure-action responses.
Soft-plastic bait now selects artificial presentation independently of the rig.
Halibut and other predator bait affinities likewise recognize the plastic rather
than applying a feather-only fallback. Each rig keeps its own presentation
multiplier; hook size/pattern still apply when a bite is seated. A plain hook's
plastic is its primary attractant and cannot earn an extra tipping bonus for
itself. Built-in feather rigs preserve their existing optional-tip behavior.

A controlled 20 m reef, bait 0.8 m off bottom, September, fresh 2/0 bottom-rig
plastic moving vertically at 0.52 m/s gives copper rockfish hazard 0.0110904156/s,
versus 0.0018569998/s before correction (5.97 times). These are synthetic game
parameters, not field measurements or a promised wait for a catch. Still plastics
are weaker, incorrect substrate/depth remain poor, and exhausted bait contributes
no encounters. Regression tests cover those distinctions and installation through
PixelSimulation's real consumable/environment interface.
