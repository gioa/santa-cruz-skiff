# Benicia — First Street waterfront

Added September 29, 2026. Play via `benicia.html` or the location picker.

## Scene and experiences

This scene represents **First Street Peninsula and its public fishing pier**, rather than all of Benicia or San Francisco Bay. The camera faces south toward Carquinez Strait; east is screen-left. The bank, public pier, shallow eastern pocket, old piles, western riprap and inland First Street turnaround are distinct spaces. The public pier is open in this scene: Pacifica's fictional closed-pier trespass mechanic does not apply.

A rotating peak-season crowd leaves gaps in the casting line and a clear walkway behind it. Anglers have different names and six separate clothing styles, their own cast/retrieve/rest cycles, and walk in or out as occupancy changes. Crossing an active neighbour's casting corridor asks the player to move. Close conversation records a local tip in the same shore notebook used by the beach scenes. Characters, conversations and the mobile tackle exchange are fictional; no actual resident or business identity is asserted.

Chinook availability peaks in August–October and fluctuates in migration pulses. Fish inhabit the simulated water and must detect, follow and take a presentation; neither casting into a zone nor buying a lure guarantees a catch. Silver spoons and rotating spinners work when moving through water, sink during pauses, and can snag on rocky margins. Tidal current changes direction and acts on the underwater presentation. The side bay has shallower muddy water; the tip is deeper. Striped bass, white croaker, jacksmelt, pile perch and shiner perch also inhabit appropriate parts of the scene. The displayed catch retains the shared species name, art, units, inventory, consumable and inspection systems.

## Evidence and limits

- [City of Benicia — First Street Pier](https://www.ci.benicia.ca.us/index.asp?SEC=27DC2988-2E7B-4619-8AB3-D96837DAB03A): municipal waterfront facility reference.
- [Visit Benicia — Waterfront](https://www.visitbenicia.org/waterfront): local waterfront and shore-fishing context.
- [City Urban Waterfront Master Plan](https://www.ci.benicia.ca.us/vertical/sites/%7BF991A639-AAED-4E1A-9735-86EA195E2C8D%7D/uploads/UrbanWaterfrontMasterPlan.pdf): First Street peninsula, promenade, piles, shore access and landscape context. Proposed improvements are not treated as proof that every structure was built.
- [City waterfront permit records](https://www.ci.benicia.ca.us/index.asp?DE=1A88042A-26BB-432C-B11A-09879F8F691F&SEC=58A38BAE-C373-4F48-ABEF-FF737A588CE0): seawall, access steps and rock-armour context.
- [Pier Fishing in California — Benicia First Street Pier](https://www.pierfishing.com/city-of-benicia-fishing-pier-aka-benicia-1st-st-pier/): first-hand/historical angling observations, shallow side bay, salmon spinning methods and seasonality. This is fishing context, not a legal source or quantitative catch-rate survey.
- [CDFW regulations](https://wildlife.ca.gov/Regulations): 2026–2027 Freshwater Sport Fishing Regulations, updated July 10, 2026, Sacramento River table on PDF page 64. Locally archived in `reports/california-fishing-research-2026-09-28/raw/cdfw-freshwater-2026.pdf` under this repository.

The playable shoreline is compressed and manually interpreted. Water depth, bottom transitions, current magnitude, wave conditions, fish density and encounter timing are **authored approximations**, not NOAA chart soundings, measured migration counts, live tides or a navigational product. Opposite-shore hills, ships and waterfront furniture are original pixel interpretations rather than exact architectural surveys. Do not market this as an exact bathymetric reconstruction.

## Regulations snapshot

Benicia is east of Carquinez Bridge. The 2026 Sacramento River reach from Highway 113 near Knights Landing to Carquinez Bridge (including the specified Suisun/Grizzly tributary waters) opens Chinook July 16–December 16, with two daily and four in possession. This table gives no minimum size for that reach: do not inherit Santa Cruz's ocean salmon size rule. Freshwater §5.45 carries ocean/San Francisco Bay bag and possession limits into tidal waters for marine finfish; inland striped bass limits are §5.75 (18 in, two fish). Seasons are year-specific; the in-game reference identifies its 2026 snapshot. Fines and confiscation are game mechanics, not a claim about real citation amounts.

Salmon length/mass uses the existing researched Chinook model in `pixel-fish-mass.js`, including total-to-fork length conversion; see `fish-mass-audit.md`.

## Validation

`tests/benicia.test.js` covers open-pier access, scene saves, tides, habitat differences, lure depth/retrieval, bait-free readiness, spare-rig depletion, seasonal presentation preferences, crowd spacing/conversations, a controlled school encounter through the ordinary bite/fight/landing path, and inland salmon inspection. The controlled school is a test fixture and does not imply guaranteed catches in normal play.
