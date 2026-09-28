# Santa Cruz substrate extract

`dist/data/seafloor.json` is a categorical, historical extract of the USGS
[Offshore Santa Cruz data](https://doi.org/10.5066/F7TM785G), using both the
seafloor-character GeoTIFF and interpreted habitat polygons. Original archive
URLs and SHA-256 hashes are embedded in the extract.

Reproduce with Python and `rasterio`, `pyproj`, `pyshp`, `numpy` installed:

```
python3 scripts/build-seafloor.py /tmp/santa-cruz-seafloor
node --test tests/pixel-seafloor.test.js
```

The script respects the raster's declared EPSG:26910 CRS and the polygon `.prj`.
It samples nearest categorical cells into the same geographic bounds as the
NOAA depth grid, 512 × 384 cells (approximately 20 m). It does not interpolate
class numbers. Sediment attributes distinguish sand, mud, mixed sediment, rock
and artificial structure. Habitat polygons refine the acoustic classes;
directly mapped rock and artificial cells preserve narrow structures. Coarse
sediment is not automatically called bedrock. Rows run north to south.

NoData cells stay unknown. The source inputs date from 2006–2010; habitat
interpretation is from 2014 and the map publication from 2016. This is neither a
current kelp map nor a fish-abundance survey. The chart shows mapped substrate
only, and is available after buying and enabling it.

Encounter sampling uses the hook's actual position, independently of named
fishing waypoints. Where the near-wharf GIS is blank, `fishingHabitatAt` adds a
bounded, explicitly `contextual` sand approximation and narrow outer-pile
structure zones from [Ken Jones's first-hand wharf account](https://www.pierfishing.com/santa-cruz-wharf/).
Their boundaries are game approximations, not surveyed debris coordinates.
They do not fill the chart or claim to be USGS-mapped cells. Elsewhere absent
coverage remains unknown and uses conservative incidental encounter weights.
