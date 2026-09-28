# Stock-only rod configuration and direction-preserving cast range

- Workbench replacement lists show only positive-stock bait, spare rigs and sinkers. Equipped items remain in their assembly slots, and taking a sinker off still returns inventory. Depleted mounted bait is shown as an empty bait slot. Empty boxes have corresponding messages.
- Out-of-range water taps now cast to the rig's maximum reach along the same boat-to-target direction. In-range endpoints remain exact. Land and flight-corridor checks remain. Flight time and paid line use the adjusted endpoint, not the distant tap.
- 728 tests passed, including multiple rigs/directions/ranges, range-adjusted obstruction checks, last-item use, empty stock and mounted equipment visibility.

Phone QA at 390×844 used the production workbench and pointer handlers on an isolated local origin. No user save modified. One remaining anchovy bait was fitted through its UI button: it disappeared from spare options and stayed visible on the hook. Only 2 oz loose sinkers appeared alongside the action to remove the fitted 3 oz sinker. Screenshots record these states.

A distant tap requested (1271.4786324786326, -297.0793838862559), from boat (1300, -320). The calculated endpoint and observed splash were both (1294.543592530463, -315.6150692677786), at 7 m range with matching direction. One cast and 6.269826176440481 m of actual diagonal paid line were recorded. Fixture paused on splash for evidence. Browser console had no errors. Temporary viewport reset and tab closed. Fixture.js is QA evidence only; it is not included in dist.
