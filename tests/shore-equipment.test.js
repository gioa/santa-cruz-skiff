import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {shoreOwnedItems,shoreSupply,wearShoreSupplies} from '../dist/shore-equipment.js';
import {personalInventorySlots} from '../dist/personal-inventory.js';
const surf=sim=>Object.assign(sim.state.player,{x:730,y:sim.world.shoreY(730)+25});
for(const sceneId of ['pacifica','half-moon-bay']){
 test(`${sceneId}: persistent bag moves and swaps without changing ownership, stock or equipment`,()=>{
  const sim=new PacificaSimulation({sceneId}),s=sim.state,owned=shoreOwnedItems(s).map(i=>i.id),stock=JSON.stringify(s.inventory);
  assert.equal(sim.inventorySlots().length,30);assert.ok(sim.moveInventory(0,29));assert.ok(sim.moveInventory(29,1));
  assert.equal(s.inventorySlots.pack[1],'starter_rod');assert.equal(s.inventorySlots.pack[29],'starter_reel');
  assert.deepEqual(shoreOwnedItems(s).map(i=>i.id),owned);assert.equal(JSON.stringify(s.inventory),stock);
  const restored=new PacificaSimulation({sceneId,saved:sim.snapshot()});assert.deepEqual(restored.inventorySlots(),sim.inventorySlots());
  assert.equal(restored.state.activeRod,'starter_rod');assert.equal(sim.moveInventory(4,30),false);
 });
 test(`${sceneId}: independent rod supplies, explicit purchases, swaps preserve worn bait`,()=>{
  const sim=new PacificaSimulation({sceneId});sim.state.credits=600;
  assert.ok(sim.buy('surf_rod').ok);assert.equal(sim.state.activeRod,'starter_rod');
  assert.ok(sim.configureEquipment('surf_rod').ok);assert.equal(sim.tackleReady,false);
  assert.equal(sim.equipBait('sandcrab').ok,false);assert.equal(sim.state.inventory.sandcrab,12);
  assert.ok(sim.configureEquipment('carolina_rig').ok);assert.ok(sim.equipBait('sandcrab').ok);
  wearShoreSupplies(sim.state,'bite');const original=structuredClone(shoreSupply(sim.state));
  assert.ok(sim.buy('fishfinder_rig').ok);assert.equal(sim.state.rig,'carolina');
  assert.ok(sim.configureEquipment('fishfinder_rig').ok);
  assert.deepEqual(sim.state.rigStock.carolina_rig.at(-1),original);
  assert.ok(sim.configureEquipment('starter_rod').ok);assert.equal(shoreSupply(sim.state).bait.condition,1);
  assert.equal(sim.state.inventory.sandcrab,11);
  const restored=new PacificaSimulation({sceneId,saved:sim.snapshot()});assert.deepEqual(restored.state.rodSupplies,sim.state.rodSupplies);
  assert.deepEqual(restored.state.rigStock,sim.state.rigStock);assert.ok(shoreOwnedItems(restored.state).some(i=>i.id==='starter_rod'));
 });
 test(`${sceneId}: recasting costs no extra bait; catches require replacement; line break loses mounted rig`,()=>{
  const sim=new PacificaSimulation({sceneId});surf(sim);
  for(let n=0;n<5;n++){assert.ok(sim.cast().ok);assert.equal(sim.configureEquipment('sandcrab').ok,false);assert.ok(sim.retrieve().ok);}
  assert.equal(sim.state.inventory.sandcrab,12);
  wearShoreSupplies(sim.state,'catch');assert.equal(sim.cast().ok,false);
  assert.ok(sim.equipBait('sandcrab').ok);assert.equal(sim.state.inventory.sandcrab,11);
  wearShoreSupplies(sim.state,'break');assert.equal(shoreSupply(sim.state),null);assert.equal(sim.cast().ok,false);
  const restored=new PacificaSimulation({sceneId,saved:sim.snapshot()});assert.equal(shoreSupply(restored.state),null);
  assert.ok(restored.configureEquipment('carolina_rig').ok);assert.equal(restored.state.rigStock.carolina_rig.length,1);
 });
 test(`${sceneId}: single-hook float can be bought, baited, swapped, saved and lost without duplicating supplies`,()=>{
  const sim=new PacificaSimulation({sceneId}),s=sim.state;s.credits=200;
  assert.ok(sim.buy('float_rig').ok);assert.equal(s.rigStock.float_rig.length,1);assert.equal(s.rig,'carolina');
  assert.ok(sim.configureEquipment('float_rig').ok);assert.equal(s.rig,'float');assert.equal(sim.tackleReady,false);
  assert.ok(sim.buy('squid').ok);const squidStock=s.inventory.squid;assert.ok(sim.equipBait('squid').ok);assert.equal(s.inventory.squid,squidStock-1);
  wearShoreSupplies(s,'bite');const mounted=structuredClone(shoreSupply(s));
  const slot=sim.inventorySlots().indexOf('float_rig');assert.ok(slot>=0);assert.ok(sim.moveInventory(slot,27));
  assert.ok(sim.configureEquipment('carolina_rig').ok);assert.deepEqual(s.rigStock.float_rig,[mounted]);
  assert.ok(sim.configureEquipment('float_rig').ok);assert.deepEqual(shoreSupply(s),mounted);assert.equal(s.rigStock.float_rig.length,0);
  const restored=new PacificaSimulation({sceneId,saved:sim.snapshot()});
  assert.equal(restored.state.rig,'float');assert.deepEqual(shoreSupply(restored.state),mounted);assert.equal(restored.inventorySlots()[27],'float_rig');
  surf(restored);const preview=restored.previewCast({power:1});
  assert.equal(preview.payloadGrams,12+2+3+2.5*mounted.bait.condition);
  assert.ok(preview.distance>5&&preview.distance<40,'the light float has substantial air drag rather than a free long cast');
  wearShoreSupplies(restored.state,'break');assert.equal(shoreSupply(restored.state),null);
  assert.equal(restored.tackleReady,false);assert.equal(restored.inventorySlots().includes('float_rig'),false);
  const empty=new PacificaSimulation({sceneId,saved:restored.snapshot()});assert.equal(shoreSupply(empty.state),null);assert.deepEqual(empty.state.rigStock.float_rig,[]);
 });
}
test('legacy saves retain bought equipment and balances without generating bait; modern restores validate every item',()=>{
 const old={scene:'pacifica',version:2,credits:83,inventory:{sandcrab:2,squid:3},upgrades:['surf_rod','sealed_reel','fishfinder_rig']};
 const sim=new PacificaSimulation({saved:old});assert.equal(sim.state.credits,83);assert.equal(sim.state.inventory.squid,3);
 assert.equal(sim.state.activeRod,'surf_rod');assert.equal(sim.state.activeReel,'sealed_reel');assert.equal(shoreSupply(sim.state).id,'fishfinder_rig');assert.equal(shoreSupply(sim.state).bait,null);
 assert.ok(sim.equipBait('squid').ok);assert.equal(sim.state.inventory.squid,2);
 const saved=sim.snapshot();saved.activeRod='missing';saved.rodSupplies.starter_rod={id:'fake',condition:1};saved.rigStock.carolina_rig=[{id:'fishfinder_rig',condition:1},{id:'carolina_rig',condition:-1}];saved.inventorySlots={pack:['surf_rod','surf_rod','fake','squid'],locker:['fake']};
 const restored=new PacificaSimulation({saved});assert.equal(restored.state.activeRod,'starter_rod');assert.equal(shoreSupply(restored.state),null);assert.deepEqual(restored.state.rigStock.carolina_rig,[]);
 assert.equal(restored.inventorySlots().filter(i=>i==='surf_rod').length,1);assert.ok(!restored.inventorySlots().includes('fake'));
});
test('zero-stock supplies disappear, existing slots remain stable, and restocking cannot duplicate items',()=>{
 const sim=new PacificaSimulation(),s=sim.state;const index=sim.inventorySlots().indexOf('sandcrab');sim.moveInventory(index,25);
 s.inventory.sandcrab=1;assert.ok(sim.equipBait('sandcrab').ok);assert.ok(!sim.inventorySlots().includes('sandcrab'));assert.ok(sim.tackleReady);
 assert.ok(sim.buy('sandcrab').ok);assert.equal(sim.inventorySlots().filter(i=>i==='sandcrab').length,1);
 assert.equal(sim.state.inventory.sandcrab,8);assert.equal(sim.configureEquipment('sealed_reel').ok,false);
 const large={inventorySlots:{pack:['item40'],locker:'corrupt'}};assert.equal(personalInventorySlots(large,Array.from({length:41},(_,i)=>'item'+i)).pack.length,42);
});
test('rig wear and configured reel survive restores; owning unused upgrades gives no performance bonus',()=>{
 const sim=new PacificaSimulation(),baseline=new PacificaSimulation();sim.state.credits=500;sim.buy('surf_rod');sim.buy('sealed_reel');
 for(const outfit of [sim,baseline]){surf(outfit);assert.ok(outfit.cast({power:1}).ok);}
 assert.equal(sim.state.cast.distance,baseline.state.cast.distance,'stored rod and reel do not boost the fitted outfit');sim.retrieve();
 assert.equal(sim.state.activeReel,'starter_reel');assert.ok(sim.configureEquipment('sealed_reel').ok);
 const restored=new PacificaSimulation({saved:sim.snapshot()});assert.equal(restored.state.activeReel,'sealed_reel');
 restored.configureEquipment('starter_reel');assert.equal(new PacificaSimulation({saved:restored.snapshot()}).state.activeReel,'starter_reel');
});
