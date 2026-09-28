/** Retired pixel mechanics have no inventory action or carried-weight penalty.
 * Keep legacy ownership intact for save compatibility with the 3D edition. */
export const RETIRED_PIXEL_GEAR=new Set(['anchor','sea_anchor','water','safety']);
export const PIXEL_LEGACY_SLOTS=new Set(['reel','line','leader','weight']);
export const pixelGearAvailable=item=>Boolean(item&&!RETIRED_PIXEL_GEAR.has(item.id)&&!PIXEL_LEGACY_SLOTS.has(item.slot));
