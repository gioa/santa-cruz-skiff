import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {GEAR_CATALOG}=await import('../dist/equipment.js');
const {pixelGearAvailable,RETIRED_PIXEL_GEAR}=await import('../dist/pixel-gear-availability.js');
const {inventorySlots}=await import('../dist/pixel-inventory.js');
const {depthInfoAt}=await import('../dist/bathymetry.js');
const {toGPS,bearingDegrees}=await import('../dist/pixel-geography.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {stepFishingLine}=await import('../dist/pixel-fishing-physics.js');
const {damageSupplies}=await import('../dist/pixel-consumables.js');
const shop=()=>{const sim=new PixelSimulation({rng:()=>.99,patrolRng:()=>.99});sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.state.profile.credits=3000;return sim;};
function afloat(sim,x=FISHING_SPOTS[1].x,z=FISHING_SPOTS[1].z){Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:x,boatZ:z,heading:.7});syncVessel(sim.vessel,{x,z,heading:.7,clearMotion:true});}
for(const item of GEAR_CATALOG.filter(g=>g.price>0&&pixelGearAvailable(g))){
 test(`audit purchase, use and save: ${item.id}`,()=>{
  const sim=shop(),p=sim.state.profile,stockBefore=item.bait?p.stock[item.bait]:item.rig?p.rigStock[item.rig].length:null;
  assert.ok(sim.buyGear(item.id).ok);assert.equal(p.credits,3000-item.price);
  if(item.bait){assert.equal(p.stock[item.bait],stockBefore+item.quantity);assert.ok(sim.replaceBait(undefined,item.bait).ok);assert.equal(p.stock[item.bait],stockBefore+item.quantity-1);damageSupplies(p,p.loadout.rod,'catch');assert.ok(sim.rodConsumableStatus().bait.condition<1);}
  else if(item.rig){assert.equal(p.rigStock[item.rig].length,stockBefore+1);assert.ok(sim.replaceRig(undefined,item.rig).ok);assert.equal(sim.state.rig,item.rig);assert.equal(p.rigStock[item.rig].length,stockBefore+(item.rig==='bottom'?1:0));afloat(sim);if(sim.rodConsumableStatus().requiresBait)assert.ok(sim.replaceBait(undefined,item.rig==='jig'?'jig':'squid').ok);assert.ok(sim.lowerRig().ok);sim.setReelMode('free');for(let i=0;i<30;i++)sim.step(.1);assert.ok(sim.state.lureDepth>0);assert.equal(Boolean(sim.state.floatPosition),item.rig==='float');}
  else {assert.equal(sim.buyGear(item.id).ok,false);assert.equal(p.credits,3000-item.price);assert.ok(sim.equip(item.id).ok);if(item.slot==='rod'){assert.ok(sim.selectRod(item.id).ok);assert.equal(sim.stats.strength,item.strength);assert.equal(sim.stats.retrieve,item.retrieve);assert.equal(sim.hasElectricReel,Boolean(item.electricRetrieve));}else if(item.capacity)assert.equal(sim.stats.capacity,item.capacity);else assert.equal(sim.navigationInstruments()[item.instrument],true);}
  const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start(true);assert.equal(resumed.state.profile.credits,p.credits);assert.deepEqual(resumed.state.profile.stock,p.stock);assert.deepEqual(resumed.state.profile.rigStock,p.rigStock);
 });
}
test('chart selection genuinely sails, updates GPS/depth/heading, and stowing instruments removes readings',()=>{
 const sim=shop();for(const id of ['nautical_chart','compass','gps','sounder']){assert.ok(sim.buyGear(id).ok);assert.ok(sim.equip(id).ok);}afloat(sim);
 const before=sim.navigationInstruments();assert.deepEqual(before.gpsPosition,toGPS(FISHING_SPOTS[1].x,FISHING_SPOTS[1].z));assert.equal(before.heading,bearingDegrees(.7));assert.deepEqual(before.depth,depthInfoAt(FISHING_SPOTS[1].x,FISHING_SPOTS[1].z));
 assert.ok(sim.selectWaypoint(FISHING_SPOTS[2]).ok);for(let i=0;i<200;i++)sim.step(.1);assert.ok(sim.state.sailed>10);assert.notDeepEqual(sim.navigationInstruments().gpsPosition,before.gpsPosition);assert.deepEqual(sim.navigationInstruments().depth,depthInfoAt(sim.state.boatX,sim.state.boatZ));
 for(const id of ['nautical_chart','compass','gps','sounder'])sim.equip(id);const after=sim.navigationInstruments();assert.equal(after.heading,null);assert.equal(after.gpsPosition,null);assert.equal(after.depth,null);assert.equal(after.speedKnots,null);assert.equal(sim.selectWaypoint(FISHING_SPOTS[2]).ok,false);
});
test('large cooler admits a catch rejected by the base cooler; stowing it restores the limit',()=>{
 const sim=shop();sim.buyGear('cooler_large');afloat(sim);const fish={name:'白海鲈',latin:'Atractoscion nobilis',length:110,kg:10};Object.assign(sim.state,{fishState:'landed',fish});assert.equal(sim.keepCatch().ok,false);sim.state.fishState='idle';sim.equip('cooler_large');Object.assign(sim.state,{fishState:'landed',fish});assert.ok(sim.keepCatch().ok);assert.equal(sim.state.catches[0].kg,10);sim.equip('cooler_large');assert.equal(sim.stats.capacity,8);
});
test('sensitive tip changes visible bend under the same force without inventing extra line load',()=>{
 const state={fishState:'fight',rodElevation:45,paidLineMeters:6,lureDepth:8,lineDistance:0,bobber:{x:0,z:0,height:-8},boatX:0,boatZ:0,drag:.48,reelMode:'brake'};
 const options={dt:.1,environment:{rig:'bottom',bottomDepth:20},fishPullN:2};const base=stepFishingLine(state,options),light=stepFishingLine(state,{...options,sensitivity:1.3});assert.ok(light.rodBend>base.rodBend);assert.equal(light.rodLoadN,base.rodLoadN);
});
test('placeholder gear disappears from old bags and contributes no weight or activation',()=>{
 const sim=shop();const weight=sim.stats.weight;sim.state.packed.push(...RETIRED_PIXEL_GEAR);sim.state.profile.owned.push(...RETIRED_PIXEL_GEAR);assert.equal(sim.stats.weight,weight);for(const id of RETIRED_PIXEL_GEAR){assert.equal(sim.equip(id).ok,false);assert.equal(sim.buyGear(id).ok,false);}const slots=inventorySlots(sim.state.profile).pack;assert.ok(slots.every(id=>!RETIRED_PIXEL_GEAR.has(id)));const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start(true);assert.ok(resumed.state.packed.every(id=>!RETIRED_PIXEL_GEAR.has(id)));
});
test('net and descending device are captured on the fish record and used by inspections',async()=>{
 const {assessCatch}=await import('../dist/fishing-regulations.js');
 for(const equipped of [true,false]){
  const sim=shop();afloat(sim);if(!equipped){sim.equip('net');sim.equip('descending_device');}
  sim.lowerRig();Object.assign(sim.state,{fishState:'bite',biteFish:{name:'蓝岩鱼',latin:'Sebastes mystinus',length:30,kg:.6},lineSlackMeters:0,rodLoadN:2,biteEngagement:10,reelMode:'brake'});sim.ensureBitingFish();sim.state.biteHold.canSeat=true;assert.ok(sim.hook({automatic:true}).ok);
  assert.equal(sim.state.fish.hasDescendingDevice,equipped);assert.equal(sim.state.fish.landingNetDiameterInches,equipped?20:false);
  const codes=assessCatch({...sim.state.fish,kept:true}).violations.map(v=>v.code);assert.equal(codes.includes('descending_device_required'),!equipped);assert.equal(codes.includes('landing_net_required'),!equipped);
 }
});
