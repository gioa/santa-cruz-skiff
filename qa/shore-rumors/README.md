# Shore encounters and collected information — coast-5

Pacifica and Half Moon Bay start without a chart, known destinations or automatic seabed labels. The former three fixed background anglers are replaced by one optional, temporary random encounter. The staff member remains.

Gameplay tuning: the first opportunity is scheduled 35–95 active seconds after a new trip; subsequent opportunities are 80–210 seconds apart, with a 70% appearance chance when the player is on the beach. An angler stays 100–200 active seconds and is placed near the player on valid sand. Their outfit, location, lifetime and single conversation outcome are random. A conversation has a 72% chance of one terrain, bait or drift clue about a nearby region; otherwise it is small talk. Duplicate information is possible. Each encounter has a fixed outcome and repeated conversation cannot produce additional clues.

The independent random stream, next opportunity, current visitor and collected fragments are saved per beach. Menus/background pause simulation time. Fishing/patrol RNG is unchanged. Legacy saves do not unlock the chart automatically. One known fragment opens the notebook with a rough local mark and the actual learned text, without unknown zone cards, live depths or GPS. Only known places provide travel buttons.

Validation: 765 release tests, including 30 seeds for time/position/willingness variation; empty initial and legacy notebooks; single-fragment learning; duplicates and small talk; distance/rod-state guards; expired encounters; save/restore, scene isolation and fishing-RNG independence.

Browser: 390 × 844 Pacifica encounter → auto-approach → conversation → partial notebook → known destination walking; reload retains the same clue and repeated physical clicks yield no new clue. 844 × 390 Half Moon Bay starts independently empty, including the M shortcut. No console errors. Fixed the generic pressed-button transform so the floating talk button does not jump out from under a finger. Fixture only accelerates waiting with a fixed test seed and is not included in dist.
