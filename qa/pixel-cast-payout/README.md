# v47 controlled cast timing

Replace the old low flight arc (roughly 1.4–1.5 seconds for 15–22 m casts) with a controlled 60-degree lob solved from rod release height and actual horizontal tip-to-target distance. Typical 15 m casts take 2.32 seconds; 22 m takes 2.80 seconds. Position remains ballistic with 9.81 m/s² gravity, and payout follows the actual 3D rod-to-rig distance each frame. The chosen angle is a gameplay calibration, not a measured rating of rental tackle. Cast range, bait consumption, sink rates and underwater spool limits remain unchanged.

Validation: 600 automated tests, including progressive line payout across 4/15/22/32 m, gravity-consistent flight timing, a bounded release speed, frame-rate-independent landing points and the transition from airborne payout to the underwater 1.65 m/s cap. Existing retrieval, conservation of line and boat-control guards remain covered. No physical phone test this turn.
