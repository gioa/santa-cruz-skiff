/** Shared by boat and shore scenes. Ownership and activation never depend on grid position. */
export function personalInventorySlots(profile,ownedIds){
 const owned=[...new Set(ownedIds)],allowed=new Set(owned),seen=new Set();
 const previous=profile.inventorySlots||{},size=Math.max(30,Math.ceil(owned.length/6)*6);
 const slots=Array.from({length:size},(_,i)=>{const id=previous.pack?.[i];if(!allowed.has(id)||seen.has(id))return null;seen.add(id);return id;});
 for(const id of [...(Array.isArray(previous.locker)?previous.locker:[]),...owned])if(allowed.has(id)&&!seen.has(id)){slots[slots.indexOf(null)]=id;seen.add(id);}
 profile.inventorySlots={pack:slots};return profile.inventorySlots;
}
export function swapInventorySlots(slots,from,to){
 if(!Array.isArray(slots)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=slots.length||to>=slots.length||!slots[from])return false;
 [slots[from],slots[to]]=[slots[to],slots[from]];return true;
}
