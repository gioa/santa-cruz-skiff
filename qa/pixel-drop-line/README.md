# Boat-side line entry

The screenshot alone cannot establish the physical drift at capture. Inspection found two independent presentation errors: the artificial gunwale clamp displaced the water entry from a steep rod tip even for a plumb line; subtracting rounded projections amplified pixel steps.

v73 anchors the zero-displacement entry directly below the displayed tip and derives displacement from unrounded model coordinates. Actual relative drift, seabed anchoring and trolling still create line angles. Physics and boat sprite size are unchanged.

`comparison.png` is a browser-rendered isolated production-geometry comparison (not a screenshot of a live fishing session). Rows: stationary steep rod; stationary ordinary rod; actual relative displacement. The local fixture imports the previous module as `qa-before-line.js` and the new module; these QA pages are not shipped in dist.

Validation: geometry sweep over hand/port/starboard, multiple headings/elevations/azimuths/bends; subpixel drift continuity; existing co-drift, towing, turning and stopping tests.
