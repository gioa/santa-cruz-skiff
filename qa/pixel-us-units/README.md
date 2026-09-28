# US customary display units — 2026-09-27

Corrects the requested display system to US customary units: fish length in inches; fish and inventory weight in pounds; sinker weights in ounces; depths, line and nearby waypoint ranges in feet; map ranges in miles; boat and wind speed in mph; temperature in Fahrenheit. Exact source measurements, legal thresholds, physics and consumable inventories remain unchanged. Existing rendered catch notes are converted at display time.

Validation:
- JavaScript syntax checks pass; all 403 automated tests pass, including exact conversions, invalid readings, legacy catch notes, consumable persistence and fishing state guards.
- The later legacy tiller-message correction also passes its 8 dedicated tests.
- In-app browser at 390×844: resumed existing save, 9 previous catches convert to inches/pounds; historical journal catches convert consistently. The previous 27 cm / 0.43 kg rockfish appears as 10.6 in / 0.95 lb.
- Backpack shows 25.0 lb total and item weights in lb.
- At 320×568 the premade rod/supply panel remains usable with its scrollable content; bottom rig sinker displays 3.00 oz, supplies and wear are preserved.
- Sea settings show wind 13.4 mph, waves 4.3 ft and water 59.0 °F for the local snapshot. Observational timestamps and stale-data disclosure remain present.
- Browser console has no errors.

Screenshot: `01-phone-journal.png`.
