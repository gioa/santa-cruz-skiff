import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RIG_PROFILES,stepRigLure,lureAttraction,rigFishWeights} from '../dist/fishing-rigs.js';
import {hookSizeFit} from '../dist/pixel-hook-size.js';
import {createProfile,buyGear,equipmentStats,carriedWeight} from '../dist/equipment.js';
import {ensureConsumables,damageSupplies} from '../dist/pixel-consumables.js';
import {rodAssemblyOptions} from '../dist/pixel-rod-loadouts.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const copy=value=>JSON.parse(JSON.stringify(value));
function prepared(){
 const sim=new PixelSimulation({rng:()=>.9,patrolRng:()=>.9});sim.start();
 Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
 assert.ok(sim.buyGear('rig_feather40').ok);assert.ok(sim.replaceRig(undefined,'feather40').ok);assert.ok(sim.replaceSinker(undefined,4).ok);
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,loaded:true,boatX:-180,boatZ:880});
 return sim;
}

test('4/0 two-dropper feathers are a separate weighted bottom rig with larger hook fit',()=>{
 const rig=RIG_PROFILES.feather40;
 assert.equal(rig.hooks,2);assert.equal(rig.hookSize,'4/0');assert.equal(rig.hookStyle,'j');assert.equal(rig.defaultWeightGrams,113);
 assert.equal(RIG_PROFILES.sabiki.hookSize,'#6');assert.equal(RIG_PROFILES.sabiki.defaultWeightGrams,28);
 const small={latin:'Scomber japonicus',length:25,kg:.35},large={latin:'Ophiodon elongatus',length:95,kg:9};
 assert.ok(hookSizeFit(small,rig).mouthFit<hookSizeFit(small,RIG_PROFILES.sabiki).mouthFit);
 assert.ok(hookSizeFit(large,rig).seatChance>hookSizeFit(large,RIG_PROFILES.sabiki).seatChance);
 assert.ok(hookSizeFit(large,rig).wireStrengthN>hookSizeFit(large,RIG_PROFILES.sabiki).wireStrengthN);
 let state={depth:0,pumpHeight:0};for(let t=0;t<80;t+=.1)state=stepRigLure({...state,rig:'feather40',bottomDepth:18,lineOutMeters:24,dt:.1});
 assert.ok(state.nearBottom);assert.ok(state.depth>17);assert.ok(state.depth<18);
 assert.ok(lureAttraction({rig:'feather40',pumping:true})>lureAttraction({rig:'feather40'}));
 const fish=[{latin:'Sebastes caurinus'},{latin:'Ophiodon elongatus'},{latin:'Scomber japonicus'}];
 const weights=rigFishWeights(fish,{rig:'feather40',habitat:'reef',bottomDepth:22,lureDepth:21.3,bait:'feather'});
 assert.ok(weights.every(w=>Number.isFinite(w)&&w>0));assert.ok(weights[0]>weights[2]);assert.ok(weights[1]>weights[2]);
});

test('4/0 feather purchases create finite spare rigs and older saves gain no free stock',()=>{
 const profile=createProfile();delete profile.rigStock.feather40;const oldStock=copy(profile.stock),oldBottom=copy(profile.rigStock.bottom),mass=carriedWeight(profile.owned,profile);
 ensureConsumables(profile);assert.deepEqual(profile.rigStock.feather40,[]);assert.deepEqual(profile.rigStock.bottom,oldBottom);
 assert.ok(buyGear(profile,'rig_feather40').ok);assert.ok(buyGear(profile,'rig_feather40').ok);
 assert.equal(profile.credits,20);assert.equal(profile.rigStock.feather40.length,2);assert.equal(profile.owned.filter(id=>id==='rig_feather40').length,1);
 assert.deepEqual(profile.stock,oldStock);assert.ok(carriedWeight(profile.owned,profile)>mass);
 assert.equal(equipmentStats(profile,['rod','rig_feather40']).hasRig,true);
 assert.equal(buyGear(profile,'rig_feather40').ok,false);assert.equal(profile.rigStock.feather40.length,2);
});

test('4/0 feather assembly lowers vertically from either rod holder without consuming natural bait',()=>{
 const sim=prepared(),stock=copy(sim.state.profile.stock);
 assert.equal(sim.state.rig,'feather40');assert.equal(sim.state.rigWeightGrams,113);assert.equal(sim.rodConsumableStatus().requiresBait,false);assert.equal(sim.rodConsumableStatus().bait,null);
 const option=rodAssemblyOptions(sim.state.profile,'rod','rig').find(option=>option.id==='feather40');
 assert.equal(option.selected,true);assert.equal(option.available,true);assert.equal(option.iconId,'rig_feather40');
 for(const mount of ['hand','port','starboard']){
  assert.ok(sim.setRodMount(mount).ok);assert.ok(sim.lowerRig().ok);
  assert.equal(sim.state.fishState,'sinking');assert.equal(sim.state.floatPosition,null);assert.equal(sim.state.castFlight,null);
  assert.equal(sim.state.bobber.x,sim.state.rodTip.x);assert.equal(sim.state.bobber.z,sim.state.rodTip.z);
  assert.equal(sim.publicState().hookCount,2);assert.equal(sim.publicState().hookSize,'4/0');
  assert.deepEqual(sim.state.profile.stock,stock);assert.equal(sim.rigEnvironment().freshness,1);assert.ok(sim.retrieve().ok);
 }
});

test('4/0 feather wear, swaps and reloads preserve one physical rig; loss cannot auto-replace it',()=>{
 const sim=prepared();damageSupplies(sim.state.profile,'rod','catch');sim.state.profile.rodSupplies.rod.hookDamage=.2;
 const condition=sim.rodConsumableStatus().rig.condition;assert.ok(condition<1);
 assert.ok(sim.replaceRig(undefined,'bottom').ok);assert.equal(sim.state.profile.rigStock.feather40.length,1);
 assert.ok(sim.replaceRig(undefined,'feather40').ok);assert.equal(sim.rodConsumableStatus().rig.condition,condition);assert.equal(sim.rodConsumableStatus().rig.hookDamage,.2);
 const saved=sim.snapshot(),resumed=new PixelSimulation({saved});resumed.start(true);
 assert.equal(resumed.state.rig,'feather40');assert.equal(resumed.rodConsumableStatus().rig.condition,condition);assert.equal(resumed.rodConsumableStatus().rig.hookDamage,.2);assert.equal(resumed.rodConsumableStatus().rigStock.feather40,0);
 assert.ok(resumed.lowerRig().ok);resumed.escape('snag');assert.equal(resumed.rodConsumableStatus().rig.present,false);assert.equal(resumed.lowerRig().ok,false);assert.equal(resumed.replaceRig(undefined,'feather40').ok,false);
 const lost=new PixelSimulation({saved:resumed.snapshot()});lost.start(true);assert.equal(lost.rodConsumableStatus().rig.present,false);assert.equal(lost.state.profile.rigStock.feather40.length,0);
});

test('bare 4/0 feathers need no bait box or phantom squid; only an installed tip supplies natural bait',()=>{
 const sim=prepared(),stock=copy(sim.state.profile.stock);assert.equal(sim.state.bait,'squid','legacy selection is not an installed portion');
 assert.ok(sim.equip('bait').ok);assert.equal(sim.hasGear('bait'),false);assert.equal(sim.assemblyItems('rod').includes('bait'),false);
 let env=sim.rigEnvironment();assert.equal(env.bait,'feather');assert.equal(env.baitTipped,false);assert.equal(env.tipFreshness,0);assert.notEqual(env.baitForm,'live');
 assert.ok(sim.fishingReadiness().ok);assert.ok(sim.lowerRig().ok);assert.deepEqual(sim.state.profile.stock,stock);assert.ok(sim.retrieve().ok);
 assert.ok(sim.replaceBait(undefined,'squid').ok);env=sim.rigEnvironment();assert.equal(env.bait,'squid');assert.equal(env.baitTipped,true);assert.equal(env.tipFreshness,1);assert.equal(env.baitForm,'strip');assert.equal(sim.state.profile.stock.squid,stock.squid-1);
});
