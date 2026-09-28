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

## Interactive chart — 2026-09-27, v56

The old 540×240 thumbnail displayed categorical substrate alone and stretched
its game-axis bounds independently on X/Y. It never drew the existing depth
field. The replacement chart uses a local east/north geographic projection,
with equal metres per screen pixel and true north up. It does not alter the
requested straight playable wharf or game travel compression.

- Bottom view preserves all six class identities, with distinct colors, a
  visible legend and hatching for absent substrate evidence. Nearest-neighbor
  raster rendering prevents artificial blends of categorical classes.
- Depth view uses the existing NOAA Monterey 2012 MHW DEM (catalog 3545), at
  approximately 20.7 m game sampling. Twenty-foot color bands, restrained relief
  shading and 20 ft overview / 10 ft close-up contours reveal shoals, depressions
  and slopes. Contour vertices are linearly interpolated on native grid edges;
  cells touching NoData are skipped. This is a visualization of the DEM, not
  newly surveyed depth, nor live sea-level-corrected depth.
- Point inspection calls the same `elevationAtGPS` and `seafloorAtGPS` used by
  the simulation. It never calls `depthAt`'s internal 12 m fallback. Land/pier
  clicks say shore/pier, not zero-depth fishing water. A bottom-data gap can
  legitimately have a known reference depth and vice versa.
- Zoom (+/−, wheel, pinch), drag pan, keyboard arrows and home reset; waypoint
  inspection zooms without setting a sailing route. Separate 'go' controls keep
  existing validated navigation. Navigation remains unavailable ashore.
- Paper-chart purchase/equip gating is unchanged. Only an equipped GPS adds
  the player marker and distance readout; buying a chart does not grant sonar.
- Map scale is geographic feet; the 1:2 travel compression does not halve depth.
  All values display in US customary units, with MHW labelled explicitly.
- Layers/contours are built once and reused. ResizeObserver and pointer/event
  handlers are disconnected on modal close or replacement.

Reference confirmations:
[USGS seafloor classification metadata](https://cmgds.marine.usgs.gov/data/csmp/OffshoreSantaCruz/metadata/SeafloorCharacter_OffshoreSantaCruz_metadata.html)
and [NOAA DEM 3545 metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3A3545).
The two sources have different coverage and dates. There is no claim of
unobserved kelp, wrecks, individual boulders, or high-resolution survey accuracy
below the shipped grid spacing. Near-wharf contextual fishing habitat remains
separate from measured chart substrate.

Validation: synthetic east/north planar contour tests, feet/metres conversion,
NoData and saddle-cell tests; sampled real contour vertices reproduce the NOAA
interpolator within 0.001 ft (numerical consistency, not survey accuracy);
reef/sand/unknown reference locations agree with gameplay/sounder sampling;
mobile canvas inspection, layer toggle, zoom, pan, waypoint preview and modal
reopening checked in the browser. See `tests/pixel-chart.test.js`.

## GPS chart device and map destinations — v57

The shop now sells one `nautical_chart` device, labelled GPS 海图仪 (120 game
credits). Both chart and GPS readings require this device to be enabled. The
sounder remains separate. Old `gps` ownership, activation and backpack slots
migrate to the chart ID before inventory filtering; existing chart owners gain
GPS too. Duplicate IDs collapse without changing credits or purchase history.

A blue heading arrow shows the current simulated location on land or at sea.
The locate control centers it; an edge indicator keeps it discoverable after
panning away. The modal pauses simulation, so its opening position remains
current until it closes. Reopening refreshes it and restores the active target.

Tapping the chart places a pin and previews an obstacle-cleared route. The
separate “前往标点” control closes the chart, selects helm and runs the existing
boat autopilot, without teleportation or time changes. `planWaypoint` is a pure
preview shared by all departure paths; it rejects invalid coordinates, land,
pier, map boundaries and unavailable boat/fishing states. Pan/pinch gestures
never create destinations. Manual helm input retains its route-cancel behavior.
The pixel pathfinder's search bounds include the whole wharf, allowing short
cross-wharf trips to detour around its seaward end.

Validation: six legacy ownership/activation cases; single-item capabilities;
preview immutability; actual physics travel to an arbitrary GPS point and
neutral on arrival; invalid pins preserve an existing route; obstacle-free
wharf detours; hand-held deployed tackle blocks departure, a holder allows it.
Phone UI checks cover tap, route execution, updated boat position, land
rejection, drag without pin changes, locate and the combined backpack item.
