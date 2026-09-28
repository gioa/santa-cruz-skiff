# Compact rod controls / fixed inch board

Local component fixture uses production index markup, simulation, fishing console and fish renderer; it does not load or mutate a saved trip. Not published (Pages uploads dist only).

Verified at 390×844, 320×740 and 844×390. Direct hand → port → starboard → hand selection updates the actual simulation and aria-pressed state. Free-spool toggles to stop-payout and back. Narrow-phone controls are within the viewport and all five touch targets are at least 44 px high/wide. Production game entry loads without console errors.

24 in example occupies half the 0–48 in board; 60 in example clips at 48 in without shrinking or changing its recorded length. Compact cards label 0, 24, 48 in to avoid crowding.

Validation: npm run check; npm test (614 passing).
