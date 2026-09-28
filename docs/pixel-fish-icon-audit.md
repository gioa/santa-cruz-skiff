# Species icon audit — v31

The defect was in identity resolution, not the fish catalogue: both blue and copper rockfish fell through to a red generic rockfish. They now have separate assets. Exact scientific names, species IDs, Chinese names and common names resolve through one shared map; unknown identity is a neutral silhouette. Existing catch records need no migration. All 11 currently catchable species resolve uniquely. Anchovy/sardine artwork is provided for existing local bait-fish work without enabling that unfinished gameplay in this release.

## Appearance checks

- Blue rockfish: blue-grey mottling, pale underside and relatively small mouth.
- Copper rockfish: brown/copper patches, pale posterior lateral band and light belly.
- Vermilion rockfish: red/orange body and fins; shallow, almost straight tail edge.
- California halibut: flattened mottled brown eyed side, two visible same-side eyes, broad tail.
- Pacific sanddab: mottled tan eyed side, small mouth and rounded tail.
- Lingcod: elongated olive/brown mottled body, broad toothed mouth and rounded tail.
- Pacific mackerel: wavy dark dorsal markings, silver underside, separated dorsal fins and forked tail.
- Chinook: ocean-phase silver body, adipose fin and black spots on both tail lobes.
- White seabass: elongated silver-grey body, long notched dorsal, oblique mouth.
- Bonito: dark sloping back stripes, narrow caudal peduncle, finlets and deep fork.
- White croaker: silver/brassy flank, dark pectoral-base mark and small low mouth.

These are original 48×24 pixel approximations. They preserve key visual distinctions, not every natural colour variation or diagnostic anatomical count. Gameplay length scaling remains unchanged.

## References reviewed

- [CDFW California Ocean Fish Identification](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=59206), pages 2–4. Pages 2 and 3 were rendered and visually inspected; guide used for appearance only, not its dated legal statements.
- [ODFW rockfish key](https://www.dfw.state.or.us/mrp/fishid/fishidrockfish.asp).
- [ODFW tuna/mackerel key](https://www.dfw.state.or.us/mrp/fishid/FishIDTunas.asp).
- [ODFW recreational flatfish guide](https://www.dfw.state.or.us/MRP/finfish/docs/recreational_flatfish.pdf).
- [NOAA Chinook salmon](https://www.fisheries.noaa.gov/species/chinook-salmon).
- [CDFW nearshore fishes](https://wildlife.ca.gov/Conservation/Marine/Nearshore).

## Validation

`npm run check`, `npm test`, regression coverage for all catalogue identities and aliases, scientific-name precedence, unique raster hashes, blue/red colour separation, copper lateral stripe, rounded tails and unsupported identities. Browser QA uses the actual sprite factory and measuring-board renderer, with 390×844 phone and 960×1100 desktop views. Catch/history/cooler/first-person views share the same `fishSpriteKind` resolver; physical board scaling tests remain intact.
