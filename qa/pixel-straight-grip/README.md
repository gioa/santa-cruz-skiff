# v50 continuous rod axis

The v49 handle used dx/norm * 0.7 and a separately reconstructed vertical axis,
while the blank used dx,dy. That made the handle visibly kink at the blank.
Both now use the same normalized axis. The reel seat and rear hand share that
axis, and the rigid foregrip spans the first three blank segments. Load/tip
motion begins beyond it with zero displacement and zero slope at the join;
rod-action exponents and actual fish-load signals remain intact.

Validation: npm run check passed; 612 tests passed. Added a geometric regression
covering three viewport sizes, three mounts, three elevations, four azimuths,
three bend loads and nonzero tip vibration. An existing vertical-only rear-grip
assertion was replaced by axial ordering: a sideways rod's rear hand need not be
lower than the offset reel in screen coordinates. The new regression failed on
v49 and passes with the fix. Browser inspected at 390x844; screenshot uses the
labelled local fixture with production components, not a naturally caught fish.
