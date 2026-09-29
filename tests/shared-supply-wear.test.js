import test from 'node:test';
import assert from 'node:assert/strict';
import {damageSupplies} from '../dist/pixel-consumables.js';
import {wearShoreSupplies,shoreReady} from '../dist/shore-equipment.js';

test('boat and shore natural bait wear identically while empty retrieval keeps bait and stock',()=>{
 const supply=()=>({condition:1,bait:{kind:'squid',condition:1}}),boat={stock:{squid:4},rodSupplies:{rod:supply()}},shore={inventory:{squid:4},activeRod:'starter_rod',rodSupplies:{starter_rod:supply()}};
 for(const event of ['retrieve','bite','escape','catch']){
  damageSupplies(boat,'rod',event);wearShoreSupplies(shore,event);
  assert.deepEqual(boat.rodSupplies.rod,shore.rodSupplies.starter_rod);assert.equal(boat.stock.squid,4);assert.equal(shore.inventory.squid,4);
  if(event==='retrieve')assert.equal(boat.rodSupplies.rod.bait.condition,1);
 }
 assert.equal(shoreReady(shore),false);assert.equal(shore.rodSupplies.starter_rod.condition,.975);
 wearShoreSupplies(shore,'break');assert.equal(shore.rodSupplies.starter_rod,null);
});
