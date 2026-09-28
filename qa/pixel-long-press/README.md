# v45 long-press suppression

Selection and iOS touch callouts are disabled across the game without relying on a small viewport or coarse primary pointer. Game selection/context-menu guards run in capture phase. Custom pointer surfaces cancel native touchstart with a non-passive listener to suppress Safari's loupe gesture. The listener does not cover native dropdowns, range inputs or menu scroll containers; their native interaction is retained.

Validation: all 595 tests passed, including held pointer movement/release/cancellation with a canceled native touchstart. Desktop browser smoke test found no visible selectable game elements; settings volume changed to 0.4 and the menu scrolled to scrollTop 602; no console errors. Actual iPhone long-press loupe behavior remains unverified on physical hardware.

References:
- https://bugs.webkit.org/show_bug.cgi?id=231161 (Safari loupe despite user-select:none; canceling touchstart workaround)
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-webkit-touch-callout
