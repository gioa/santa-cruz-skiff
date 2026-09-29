import {personalInventorySlots,swapInventorySlots} from './personal-inventory.js';
import {GEAR_CATALOG} from './equipment.js';
import {pixelGearAvailable} from './pixel-gear-availability.js';
/** Persistent personal bag positions. Activating gear never removes ownership. */
export const INVENTORY_SLOTS=30;
export function inventorySlots(profile,packed=[]){
 return personalInventorySlots(profile,(profile.owned||[]).filter(id=>pixelGearAvailable(GEAR_CATALOG.find(g=>g.id===id))));
}

export function moveInventorySlot(profile,packed,kind,from,to){
 const slots=inventorySlots(profile,packed)[kind];
 return swapInventorySlots(slots,from,to);
}
