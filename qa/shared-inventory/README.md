# Shared inventory and shore equipment — coast-6

Pacifica and Half Moon Bay now use the same persistent personal inventory grid
engine as Santa Cruz. Moving or swapping slots never changes ownership or usage.
Shore menus reuse the boat inventory/workbench styling and interaction pattern.

- Only owned gear and positive-stock bait are shown. Bought rods remain alongside
  starter rods; ownership alone grants no active performance bonus.
- Each rod saves its own mounted premade rig, condition and bait. Swapped usable
  rigs return intact to spare stock; installing bait consumes one portion.
- Casting and empty retrieval do not install new bait. Bites/escapes wear bait,
  landing uses natural bait, and breaking the line loses the mounted rig.
- Upgrades and spare supplies go into the bag and require explicit activation.
- Equipment changes are blocked with a deployed line or pending inspection.
- No free replenishment. Shop tabs/actions only appear at the shop.
- Save v1/v2 migrate to v3, retaining balances, catches, upgrades, fines and lore.
  Legacy saves had no persistent bait-on-hook state, so migration leaves that
  slot empty instead of silently spending or generating bait.

Scene-specific exceptions retained: shore rods/bait, walking to the surf and
casting, and random local-angler information collection. Boat navigation and
vessel equipment are not added to the beach. Scene progress remains independent.
The shore fishing physics, day cycle and species simulation have not been replaced
with Santa Cruz's boat simulation by this inventory change.

Validation: 774 release tests passing, including 9 new shore inventory tests.
Browser checks: 390×844 Pacifica, 375×667 / 844×390 Half Moon Bay, 390×844 Santa Cruz.
Checked moved slot persistence after reload, buying and independently assembling
another rod, exact bait deduction, hidden distant shop, deployed-line lockout and
absence of default shore chart. No browser errors observed. Screenshots and
browser-checks.json are in this directory. No QA fixtures shipped.
