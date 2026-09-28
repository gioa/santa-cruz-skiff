// A 15-foot rental hull, measured bow to transom, excluding the outboard.
// The authored sprite runs from y=1 at the bow to y=78 at the transom.
export const SKIFF_LENGTH_METERS=15*.3048;
export const SKIFF_HULL_PIXELS=77;
export const SKIFF_METERS_PER_PIXEL=SKIFF_LENGTH_METERS/SKIFF_HULL_PIXELS;
// Established map artwork size: preserve the dock/boat composition.
// Tackle stays in geographic metres; readable boat artwork is exaggerated.
export const SKIFF_DISPLAY_METERS_PER_PIXEL=.18;
export const FISHING_SCENE_SCALE=1;
