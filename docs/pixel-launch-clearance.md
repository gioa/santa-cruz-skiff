# Hoist clearance correction — v58

The enlarged boat sprite followed a straight cross-deck path through the old
crane upright. The crane was also painted after the boat, and its boom height
was below the highest lifted bow. Actual 15 ft hull collision dimensions did
not detect these presentation overlaps.

The pixel davit mount now sits on the seaward side of the launch corridor.
Its fixed overhead tip clears the full enlarged bow at maximum lift. Cable
length changes with the existing hoist; its two straps attach to opposite
sides of the boat. The structure renders before hulls, with only cable and
straps in front. One shared geometry helper supplies rendering and the full
animation exclusion bounds for nearby interaction labels.

Boat sprite size, pier proportions, 24-second timing, launch trajectory, rental
payment, physics positions, boarding and save compatibility remain unchanged.
No gameplay teleport or new payment is introduced.

Validation: 1,441 poses across four camera scales test upright/boom clearance,
positive cable lengths and sling attachments inside hull bounds. Existing tests
cover all animation transitions, rack/berth endpoints, mobile interaction
labels, launch payment and boarding. A phone-size browser run exercised the
continuous paid launch through afloat and boarding; screenshots are in
`qa/pixel-launch-clearance/`.
