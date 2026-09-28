# Preassembled tackle and finite supplies

The pixel edition uses preassembled rod hardware and whole terminal rigs. Players select a rod, swap a complete rig, and replace its bait. Reel, main line, leader and sinker parts are not offered as individual customisation or shop items. Existing mounted hardware upgrades remain in old saves as read-only components.

## Inventory lifecycle

- A new starter rod includes one installed bottom rig and one bait portion. The starter bag carries 12 spare squid portions, three soft plastics and two spare bottom rigs.
- Bait portions live in `profile.stock`. Each installed rig lives in `profile.rodSupplies`; spare rigs live in `profile.rigStock`. A spare retains its own condition and any attached bait.
- Explicit bait replacement removes one portion from stock and discards the previously attached bait. Casting, lowering, retrieving, opening a menu and changing rods do not automatically use another portion.
- Explicit rig replacement moves a spare to the selected rod. A usable old rig returns to the bag with its existing wear and bait. An intact rig is not consumed merely by selecting another rig.
- A line break or lost snagged rig removes the installed terminal rig and its bait. The player must install a spare. There is no free automatic reconnection.
- Natural bait wears while soaking and taking bites, and is spent after landing a fish. Soft plastics wear over multiple encounters. The feather rig can work without added bait. These wear values are game tuning.
- Missing or exhausted required supplies block another deployment. Replacement is available from the player's rod panel after retrieving the line; shop purchases and basic replenishment are available only at the dock counter.
- Saving and reloading preserve stock, installed losses, bait condition and spare condition. Older saves receive a one-time migration; routine reads do not refill supplies.

## Units

Active pixel UI uses US customary units: ft for depth, deployed line and wave height; in for fish length and net openings; mi for distance; lb for fish, cargo and tackle ratings; oz for sinkers; mph for boat speed and wind; and °F for temperature. Conversion occurs only at display boundaries. Physics and saved numerical state retain SI values; NOAA source wind and legal threshold metadata retain their original precision and units internally. Consumable stock, wear and replacement behavior are unchanged by the display conversion.
