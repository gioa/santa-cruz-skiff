# Fish mass and landing motion — 2026-09-27

## Mass: the reported lingcod was too heavy

The old generic calculation used 2.8 kg at the midpoint of the lingcod spawn
length range (52.5 cm), followed by a universal exponent of 2.7. This produced
2.87 kg / 6.33 lb for 53 cm / 20.9 in. Unit conversion was correct; the biological
reference was wrong. Changing a spawn size range must not change body condition.

The [PFMC 2021 southern lingcod assessment, section 2.3.4, printed page 31](https://www.pcouncil.org/documents/2021/12/status-of-lingcod-ophiodon-elongatus-along-the-southern-u-s-west-coast-in-2021-december-2021.pdf/)
fits whole kilograms to fork length in centimetres:

- Female: W = 0.000003450 × L^3.2364
- Male: W = 0.000002425 × L^3.3367

The game has no sex variable, so uses their arithmetic mean, giving **1.34 kg /
2.95 lb at 53 cm**. This is an expected mass, not an exact prediction for every
wild fish. The assessment says total and fork length are generally similar for
lingcod because of tail shape (printed page 26); using the displayed total
length is an explicit approximation. Legal measurement remains total length.
The original screenshot's displayed 20.9 in is rounded from 53 cm, so computing
from exactly 20.9 × 2.54 cm instead gives 1.35 kg / 2.98 lb.

Also replace California halibut's midpoint anchor with the sex-averaged
coefficients in [CDFW's 2024 assessment, Table 12, printed page 59](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=229693):
W = mean(0.00000621, 0.00000607) × L^3.14. These are California halibut, not
Pacific halibut. All other fish retain their existing reference specimens and
approximate 2.7 scaling; those are not newly claimed empirical population fits.
Mackerel's previous midpoint is made an explicit 31.5 cm reference.
New catches use the corrected model. Historical settled catch weights/credits
are not rewritten. Weight also feeds the existing force/energy model.

## Motion: observation-informed, parameters are game approximations

Every supported art identity has a profile. Small fish cycle faster; fatigue
reduces amplitude. Blue/copper/vermilion rockfish have differentiated short kicks;
lingcod broader tail strokes/head shakes; flatfish undulate and roll; mackerel
and bonito have fast tail beats; white seabass makes slower powerful strokes;
croaker and sanddab have small rapid movements. These animation frequencies,
forces and encounter probabilities are tuned, not measured species constants.

Sources informing the conservative distinctions:

- [ADFG Chinook account](https://www.adfg.alaska.gov/index.cfm?adfg=wildlifenews.view_article&articles_id=667) describes repeated boat-side struggles and flopping.
- [Sacramento State natural history account](https://www.csus.edu/faculty/c/rcoleman/natural%20history%20museums/sacramento_state_online_natural_history_museum/fishes/chinook%20salmon.html) confirms Chinook jumping ability, in a migration context. This does **not** establish an ocean hooked-fish jumping rate.
- [CDFW rockfish barotrauma](https://wildlife.ca.gov/Conservation/Marine/Groundfish/Rockfish-Barotrauma-and-Descending-Devices) supports subdued/decompressed deep-caught rockfish; it does not mean all rockfish are inactive.
- Additional morphology, swimming and species-size evidence: `fish-fight-research.md`.

Only a subset of vigorous Chinook can breach in this version. Requirements:
near the surface, >=2 kg, energy >45%, enough paid line and a cooldown. Most
individuals run/dive instead. Rockfish, lingcod, flatfish and white seabass are
not made aerial just because they are large; bonito retains fast surface runs.
The 22% personality selection and cooldowns are simulation choices, not field
probability estimates. In-flight movement integrates vertical velocity under
9.81 m/s² gravity and remains constrained by actual paid line. Landings cannot
occur mid-jump. Re-entry triggers a transient splash. The same head shake feeds
rod/hook retention; no arbitrary guaranteed escape or minimum fight timer.

Rendering bends the actual species sprite using one-pixel source strips.
The mouth remains attached to the line, the original body length sets camera
scale, and airborne line endpoints rise above the water. The live catch card
has intermittent tail/body flex; its nose and length marker remain registered
to the fixed ruler. Historical journal illustrations stay still. Reduced-motion
settings disable procedural fish articulation. Pausing freezes fight motion;
the catch-card animation has a separate clock and never unpauses fishing/time.
