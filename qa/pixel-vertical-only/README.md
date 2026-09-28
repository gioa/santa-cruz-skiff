# Vertical-only tackle deployment — 2026-09-27

Build: `20260927-pixel-v21`.

Casting is temporarily unavailable in the pixel edition. Touch controls, Space and the page-scoped action API lower directly beneath the rod tip. The cast button and charge strip have been removed, along with their input bindings, action-tool entries and help text. Obsolete simulation cast methods reject without consuming bait, terminal rigs or RNG and cannot act as a hook-setting shortcut. Legacy charged/airborne states recover safely without launching a rig.

Vertical lowering still allows free-spool descent, spool braking, crank retrieval, rod pose, port/starboard holders and slow trolling. Current naturally drifting tackle is not artificially fixed to a perfectly vertical line.

Validation:
- `npm run check` passed.
- `npm test`: 418/418 passed. Includes all six rigs × hand/port/starboard entering at the rod-tip x/z and surface height, supply preservation, legacy-state recovery, unavailable casting APIs and the real UI without a cast DOM node.
- Local browser: resumed the existing rental, tapped 船边下放, observed sinking and free-spool line payout, retrieved to idle, reloaded the final build, pressed Space to lower directly, braked the spool and mounted the rod on the port holder.
- Verified responsive controls at 390 × 844 and 320 × 568. No cast button/charge strip in the DOM; console remained within viewport. Browser reported no warnings/errors.
- Screenshots: `01-phone-lower.png` (idle deployment control), `02-small-phone-holder.png` (port holder after vertical drop).
