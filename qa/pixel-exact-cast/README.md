# Exact tap casting

Root cause: planCast used min(requestedDistance, castRange), silently replacing the selected location with a closer endpoint. No input conversion failure or vertical-lowering fallback was needed to reproduce it.

The planner now either accepts the exact world point or rejects it with the rig range in feet. Rejection occurs before baitRig, so no cast, line payout, or consumable is created. Existing physically bounded underhand ranges and flight rates are retained. This does not increase casting reach; the enlarged readable boat artwork still differs from geographic scale.

Browser: 390×844, local isolated QA origin/save, real production canvas pointer handlers. Tap (70,425) requested (1282.4786324786326,-320.0793838862559), rejected with 23 ft range, state idle, casts 0. Tap (152,425) requested (1293.9726495726495,-320.0793838862559); actual splash exactly the same, error 0, casts 1. No console errors. Fixtures pause on the first splash frame for capture. Diagnostic text/dot exist only in QA.

Regression coverage: all rig ranges reject oversized clicks, preserve inventory and idle state; all supported phone/landscape sizes, zooms and headings retain exact reachable pixel destinations. Existing spool conservation, low flight arc, bottom descent and retrieval checks retained.
