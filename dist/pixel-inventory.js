/** Persistent slot positions; actual ownership and packing remain model-owned. */
export const INVENTORY_SLOTS=30;
export function inventorySlots(profile,packed=[]){
 const owned=[...new Set(profile.owned||[])],carried=owned.filter(id=>packed.includes(id));
 const wanted={pack:carried,locker:owned.filter(id=>!carried.includes(id))};
 const previous=profile.inventorySlots||{},result={};
 for(const kind of ['pack','locker']){
  const allowed=new Set(wanted[kind]),seen=new Set(),size=Math.max(INVENTORY_SLOTS,Math.ceil(wanted[kind].length/6)*6);
  const slots=Array.from({length:size},(_,i)=>{const id=previous[kind]?.[i];if(!allowed.has(id)||seen.has(id))return null;seen.add(id);return id;});
  for(const id of wanted[kind])if(!seen.has(id)){slots[slots.indexOf(null)]=id;seen.add(id);}result[kind]=slots;
 }
 profile.inventorySlots=result;return result;
}
export function moveInventorySlot(profile,packed,kind,from,to){
 const layout=inventorySlots(profile,packed),slots=layout[kind];
 if(!slots||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=slots.length||to>=slots.length||!slots[from])return false;
 [slots[from],slots[to]]=[slots[to],slots[from]];return true;
}
