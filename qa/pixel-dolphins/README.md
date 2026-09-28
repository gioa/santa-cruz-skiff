# Dolphin silhouette correction (v70)

The screenshot's rigid wing-like figures correspond to the dolphin encounter renderer, not a catchable fish species. The previous artwork used an oval plus straight strokes for both pectoral fins, dorsal fin and tail, with members in a transverse line.

Replaced with raster-filled contours: rounded head and beak, tapered tail stock, subtle curved flukes, one swept dorsal fin, species-specific flank shading. Submerged appendages fade beneath the water. Animals have staggered longitudinal spacing and individual breathing-cycle timing; heading now comes from projected forward motion. Length follows world scale (illustrative 2.35–2.5m individuals), rather than a clamped minimum sprite size. This is artwork/formation only; encounters, fish probabilities and interaction remain unchanged.

Anatomical reference: NOAA Fisheries, Pacific White-Sided Dolphin (short rostrum, large curved dorsal fin, dark back and light side stripes): https://www.fisheries.noaa.gov/species/pacific-white-sided-dolphin/science?page=1

Validation: npm run check and 702 tests; Canvas browser comparison of old/new, actual world scale and enlarged shape; played then paused animation to inspect different surfacing phases. No console errors. comparison.png and swimming.png show the real drawWildlife renderer on a plain QA canvas. preview.html is the local QA fixture source (before module from commit 3b674274248c3310da223766cb5df553a8f34a1f); temporary dist fixtures removed before publishing.
