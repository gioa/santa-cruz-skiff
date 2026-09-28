import {GEAR_CATALOG} from './equipment.js?v=20260928-pixel-v73';
import {pixelGearAvailable} from './pixel-gear-availability.js?v=20260928-pixel-v73';
/** Persistent personal bag positions. Activating gear never removes ownership. */
export const INVENTORY_SLOTS=30;
export function inventorySlots(profile,packed=[]){
 const owned=[...new Set((profile.owned||[]).filter(id=>pixelGearAvailable(GEAR_CATALOG.find(g=>g.id===id))))],allowed=new Set(owned),seen=new Set();
 const previous=profile.inventorySlots||{},size=Math.max(INVENTORY_SLOTS,Math.ceil(owned.length/6)*6);
 const slots=Array.from({length:size},(_,i)=>{const id=previous.pack?.[i];if(!allowed.has(id)||seen.has(id))return null;seen.add(id);return id;});
 // Former shore-locker items migrate into the same personal backpack.
 for(const id of [...(previous.locker||[]),...owned])if(allowed.has(id)&&!seen.has(id)){slots[slots.indexOf(null)]=id;seen.add(id);}
 profile.inventorySlots={pack:slots};return profile.inventorySlots;
}
export function moveInventorySlot(profile,packed,kind,from,to){
 const slots=inventorySlots(profile,packed)[kind];
 if(!slots||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=slots.length||to>=slots.length||!slots[from])return false;
 [slots[from],slots[to]]=[slots[to],slots[from]];return true;
}
