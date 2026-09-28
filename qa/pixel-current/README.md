# Uniform-current correction (v42)

- Water has one east/south vector at all depths; no deep-water shear.
- Boat drag uses hull velocity relative to water (existing vessel model).
- Tackle now retains horizontal momentum, accelerates under quadratic relative-water drag and line drag, and encounters weight/substrate-dependent static and sliding friction at bottom contact. Rope length and spool travel remain independent conserved quantities. Coefficients are a bounded simulation approximation, not measured tackle coefficients.
- Suspended co-drift, weak-flow grounded sinkers, heavy/light sliding, mobile timestep stability, fixed snag coordinates, advected wakes, and observation freshness have regression tests.
- Geographic lure/snags now use the same projection as seabed and cast targets. Removed the boat-centred 3.0315× stretch, which moved a fixed hook by −2.0315 m when the boat advanced 1 m. Boat/wharf art remains the same size. **Map boat artwork remains deliberately enlarged for readability; it is no longer used as a physical casting ruler.** A full consistent real-scale art/map conversion is outside this correction.
- NOAA HF Radar US West Coast 2 km: newest valid hour in a 12-hour window, nearest valid cell to 36.94 N / 122.02 W within 15 km. East/north becomes east/south for this world. One regional vector is applied throughout the play area. Six-hour freshness limit; missing/future/invalid/old data uses an explicitly labelled no-current fallback. No current is inferred from tides or wind. The live query on this run returned no valid regional vectors.

Sources:
- https://coastwatch.pfeg.noaa.gov/erddap/griddap/ucsdHfrW2.graph
- https://oceanservice.noaa.gov/facts/current.html
- https://www.orcina.com/webhelp/OrcaFlex/Content/html/Seabedtheory.htm
- https://www.orcina.com/webhelp/OrcaFlex/Content/html/Frictiontheory.htm

Validation: `npm run check`; `npm test`; browser mobile view at 390×844. Screenshots and final checks are saved alongside this report.
