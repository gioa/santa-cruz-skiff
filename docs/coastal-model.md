# Coastal research and model

Research checked 2026-09-28. These are authored game coastlines, not current bathymetric surveys, forecasts or navigational charts.

## Observed setting

- **Sharp Park, Pacifica:** the official tourism organization describes charcoal-colored sand caused by magnetite, pebbles near the water, a rear levee beside Laguna Salada, and Mori Point at the southern end. [Visit Pacifica: Sharp Park Beach](https://www.visitpacifica.com/beaches/sharp-park-beach).
- **Pacifica Municipal Pier:** the city describes the L-shaped, approximately 1,140-foot/347-meter pier. The page reports closure from June 4, 2026 and an August 21 update about emergency investigation/stabilization. The game labels it closed for repair, not permanently abandoned. [City of Pacifica: pier status](https://www.cityofpacifica.org/departments/public-works/field-services/pacifica-pier).
- **Linda Mar is a different beach:** Pacifica State Beach lies farther south and is a crescent-shaped bay. It must not be combined with Sharp Park's pier and presented as one measured place. [California Coastal Commission, March 2020 report](https://documents.coastal.ca.gov/reports/2020/3/W17a/w17a-3-2020-report.pdf).
- **Half Moon Bay:** State Parks describes broad sandy beaches and fishing; its brochure describes fine white sand, dunes, Francis camping facilities, and northern shelter associated with Pillar Point. The game uses a compressed Dunes–Venice–Francis section, not a claim that Francis alone spans the whole park. Sources use different total-length scopes (two versus four miles), so the game does not present either as surveyed scene length. [State Parks page](https://www.parks.ca.gov/?page_id=531), [official park brochure](https://www.parks.ca.gov/pages/531/files/HMBBrochure0605.pdf).
- **Creeks:** Frenchmans Creek is north of Venice and Pilarcitos Creek is south of it. These define distinct wet channels and bar gaps in the authored scene. [Half Moon Bay: water quality](https://halfmoonbay.gov/920/Water-Quality).

## Process model

NOAA/NWS explains that shallow bars promote wave breaking; deeper troughs and bar gaps can appear darker with less whitewater. Alongshore differences in breaking drive feeder currents and offshore flows. Channels may persist for days to months, and piers/headlands can influence nearby circulation. Water level changes where waves break. [NWS: Rip Current Science](https://www.weather.gov/safety/ripcurrent-science).

`shoreProfile` varies bar distance, trough distance, slope, gap strength and exposure smoothly with alongshore position. `sampleShore` derives water depth, breaking strength and current from the same profile. Rendering and fishing consume these values rather than using unrelated random foam. Whitewater moves across shallow sections; channel gaps and dark troughs stay geographically coherent. The tackle drifts with the local current, and its habitat changes encounter weights and fight load. Tide is slow and repeatable; it does not regenerate the seabed every frame.

Wave period and height now drive linear dispersion, shoaling, depth-limited breaking, upstream bar dissipation, orbital motion, and wave-powered mean currents. Both cameras draw crests from the same traveling phase used by the simulation. Tackle sinking and holding use the mounted sinker and local forcing; drift changes the hook's actual water sample. Fight load follows the returning fish through that water. See [wave model and primary sources](shore-wave-model.md).

Bites come from simulated fish schools rather than a timer or fixed chance. Distance relative to local troughs and bars, depth, sand, season, light and waves decide where schools are. The scent plume in the surf current, soak time, splashes, and the bait, rig and presentation decide whether they find and take a bait. A no-bite cast is a normal result, and reloading cannot reroll the fish. See [population model](fish-population-model.md).

The depth, exact bars and channel locations, scenario wave heights, fish probabilities and compact distance scale are authored approximations. No local survey or live ocean feed is used. Walking time is compressed for play. This is a readable coastal model, not a numerical coastal-engineering solver.

## Fictional game content

Bait & Tackle buildings and staff are invented. In particular, the removed former Chit Chat Cafe is not represented as a current real business. [Visit Pacifica: fishing update](https://www.visitpacifica.com/things-to-do/fishing-crabbing).

The pier gate can be crossed only through an explicit game action. Its patrol probability, 80-point fine, debt repayment, and return to the gate are fictional gameplay rules. They are not real-world legal penalties or enforcement predictions. A closed repair site is used as the setting without claiming permanent abandonment.

## Validation

Automated simulation checks cover continuous position-dependent samples, distinct scene water response, genuine drift, safe L-deck routes, boundary collision, inspection timing, debt persistence and duplicate-charge prevention. Browser play checks cover the shared shell, map walking, coast travel, purchases, casting, catching, pier entry/exit, inspections and responsive controls. See `qa/coastal-scenes/` for the observed runs.
