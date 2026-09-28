import {GEAR_CATALOG} from './equipment.js?v=20260927-pixel-v54';
export function ownedRodChoices(profile){const owned=new Set(profile?.owned||[]);return GEAR_CATALOG.filter(g=>g.slot==='rod'&&owned.has(g.id)).map(g=>({id:g.id,name:g.name}));}
export function rodSelectionStatus(state){const rods=ownedRodChoices(state.profile),active=rods.find(r=>r.id===state.profile?.loadout?.rod);return{rods,active,switchable:state.fishState==='idle'&&rods.length>1&&!state.paused&&!state.docking,location:state.pendingRodPickup?'减速后拿竿':({hand:'手持',port:'左舷竿架',starboard:'右舷竿架'}[state.rodMount]||'手持')};}
