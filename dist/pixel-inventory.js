import {personalInventorySlots,swapInventorySlots} from './personal-inventory.js?v=coast-6';
import {GEAR_CATALOG} from './equipment.js?v=20260928-pixel-v80';
import {pixelGearAvailable} from './pixel-gear-availability.js?v=20260928-pixel-v80';
/** Persistent personal bag positions. Activating gear never removes ownership. */
export const INVENTORY_SLOTS=30;
export function inventorySlots(profile,packed=[]){
 return personalInventorySlots(profile,(profile.owned||[]).filter(id=>pixelGearAvailable(GEAR_CATALOG.find(g=>g.id===id))));
}

export function moveInventorySlot(profile,packed,kind,from,to){
 const slots=inventorySlots(profile,packed)[kind];
 return swapInventorySlots(slots,from,to);
}
