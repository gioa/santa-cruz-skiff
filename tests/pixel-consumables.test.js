import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {createProfile,buyGear,carriedWeight}=await import('../dist/equipment.js');
const {damageSupplies}=await import('../dist/pixel-consumables.js');
function ready(){const sim=new PixelSimulation({rng:()=>.9,patrolRng:()=>.9});sim.start();Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,loaded:true,boatX:-180,boatZ:880});return sim;}
function shop(sim){Object.assign(sim.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.state.profile.credits=2000;}
function finish(sim){sim.state.fish={name:'蓝岩鱼',kg:.3,length:20};sim.state.fishState='landed';assert.ok(sim.releaseCatch().ok);}
const copy=x=>JSON.parse(JSON.stringify(x));

test('starter casting uses its installed bait without consuming or granting spare stock',()=>{
 const sim=ready(),before=copy(sim.state.profile.stock);assert.equal(sim.rodConsumableStatus().rig.present,true);assert.equal(sim.state.baitOnHook.condition,1);
 for(let n=0;n<4;n++){assert.ok(sim.lowerRig().ok);sim.retrieve();assert.deepEqual(sim.state.profile.stock,before);}
 sim.state.baitOnHook.condition=0;assert.equal(sim.lowerRig().ok,false);assert.deepEqual(sim.state.profile.stock,before);
 assert.ok(sim.replaceBait().ok);assert.equal(sim.state.profile.stock.squid,11);assert.ok(sim.lowerRig().ok);assert.equal(sim.state.profile.stock.squid,11);
 assert.equal(sim.replaceBait().ok,false,'cannot replace the underwater rig');assert.equal(sim.state.profile.stock.squid,11);
});

test('landed fish consume natural bait; explicit replacement uses exactly one portion and cannot overdraw',()=>{
 const sim=ready();finish(sim);assert.equal(sim.state.baitOnHook.condition,0);assert.equal(sim.lowerRig().ok,false);
 sim.state.profile.stock.squid=1;assert.ok(sim.replaceBait().ok);assert.equal(sim.state.profile.stock.squid,0);assert.ok(sim.lowerRig().ok);sim.retrieve();finish(sim);
 const before=copy(sim.state.profile);assert.equal(sim.replaceBait().ok,false);assert.deepEqual(sim.state.profile,before);assert.equal(sim.lowerRig().ok,false);
});

test('soft plastic wears over multiple catches; missed bites damage bait without casting consumption',()=>{
 const sim=ready();shop(sim);assert.ok(sim.buyGear('rig_jig').ok);assert.ok(sim.replaceRig(undefined,'jig').ok);assert.ok(sim.replaceBait(undefined,'jig').ok);const stock=sim.state.profile.stock.jig;
 finish(sim);assert.equal(sim.state.baitOnHook.condition,.77);finish(sim);assert.equal(sim.state.baitOnHook.condition,.54);assert.equal(sim.state.profile.stock.jig,stock);
 damageSupplies(sim.state.profile,'rod','bite');const worn=sim.state.baitOnHook.condition;sim.escape('miss');assert.ok(sim.state.baitOnHook.condition<worn);assert.equal(sim.state.profile.stock.jig,stock);
});

test('breaks and snags lose the terminal rig and bait; installed rods survive and replacements are finite',()=>{
 for(const reason of ['break','snag']){const sim=ready();const stock=copy(sim.state.profile.stock);sim.lowerRig();sim.escape(reason);
 assert.equal(sim.rodConsumableStatus().rig.present,false);assert.equal(sim.state.baitOnHook,null);assert.equal(sim.lowerRig().ok,false);assert.equal(sim.stats.hasRod,true);assert.deepEqual(sim.state.profile.stock,stock);
 assert.ok(sim.replaceRig().ok);assert.equal(sim.rodConsumableStatus().rigStock.bottom,1);assert.equal(sim.lowerRig().ok,false,'new terminal rig is unbaited');assert.ok(sim.replaceBait().ok);assert.ok(sim.lowerRig().ok);
 sim.escape(reason);assert.ok(sim.replaceRig().ok);sim.escape(reason);const before=copy(sim.state.profile);assert.equal(sim.replaceRig().ok,false);assert.deepEqual(sim.state.profile,before);
 }
});

test('whole-rig swapping stows worn bait and transferring it to another rod cannot duplicate supplies',()=>{
 const sim=ready();shop(sim);for(const id of ['rod_light','rig_slider'])assert.ok(sim.buyGear(id).ok);
 sim.state.baitOnHook.condition=.37;const stock=copy(sim.state.profile.stock),beforeBottom=sim.rodConsumableStatus().rigStock.bottom;
 assert.ok(sim.replaceRig('rod','slider').ok);assert.equal(sim.rodConsumableStatus().rigStock.bottom,beforeBottom+1);assert.equal(sim.rodConsumableStatus().bait,null);
 // The stowed original remains one physical rig with its original bait.
 const stash=sim.state.profile.rigStock.bottom;assert.deepEqual(stash.at(-1).bait,{kind:'squid',condition:.37});
 // Consume the two pristine spare rigs, then move the previously stowed one.
 sim.state.profile.rodSupplies.rod_light=null;assert.ok(sim.replaceRig('rod_light','bottom').ok);sim.state.profile.rodSupplies.rod_light=null;assert.ok(sim.replaceRig('rod_light','bottom').ok);sim.state.profile.rodSupplies.rod_light=null;assert.ok(sim.replaceRig('rod_light','bottom').ok);
 assert.deepEqual(sim.rodConsumableStatus('rod_light').bait,{kind:'squid',condition:.37});assert.deepEqual(sim.state.profile.stock,stock);assert.equal(sim.state.profile.rigStock.bottom.length,0);
 assert.equal(sim.replaceRig('rod','bottom').ok,false);assert.equal(sim.rodConsumableStatus('rod').rig.id,'slider');
});

test('save/resume and a new voyage never restore exhausted stock, worn bait or broken rigs',()=>{
 const sim=ready();sim.state.profile.stock.squid=0;sim.state.profile.rigStock.bottom=[];sim.state.baitOnHook.condition=.12;const saved=sim.snapshot();
 const resumed=new PixelSimulation({saved});resumed.start(true);assert.equal(resumed.state.profile.stock.squid,0);assert.equal(resumed.state.baitOnHook.condition,.12);assert.equal(resumed.state.profile.rigStock.bottom.length,0);
 resumed.escape('break');const broken=resumed.snapshot();for(let n=0;n<3;n++){const again=new PixelSimulation({saved:copy(broken)});again.start(n%2===0);assert.equal(again.rodConsumableStatus().rig.present,false);assert.equal(again.state.profile.stock.squid,0);assert.equal(again.state.profile.rigStock.bottom.length,0);}
});

test('legacy migration occurs once, preserving installed bait and granting no recurring supplies',()=>{
 const p=createProfile();delete p.consumablesVersion;delete p.rodSupplies;delete p.rigStock;p.stock.squid=0;
 const sim=new PixelSimulation({saved:{edition:'pixel',version:5,mode:'walk',profile:p,baitOnHook:{kind:'squid',condition:.22},rig:'bottom',bait:'squid',packed:p.owned}});sim.start(true);
 assert.equal(sim.state.baitOnHook.condition,.22);assert.equal(sim.state.profile.stock.squid,0);assert.equal(sim.state.profile.rigStock.bottom.length,2);
 sim.state.profile.rigStock.bottom=[];const again=new PixelSimulation({saved:sim.snapshot()});again.start(true);assert.equal(again.state.profile.rigStock.bottom.length,0);assert.equal(again.state.baitOnHook.condition,.22);
});

test('shop rig purchases repeat, charge credits and remain separate from numeric bait stock and carried mass',()=>{
 const p=createProfile();p.credits=100;const mass=carriedWeight(p.owned,p),before={...p.stock};assert.ok(buyGear(p,'rig_slider').ok);assert.ok(buyGear(p,'rig_slider').ok);
 assert.equal(p.credits,50);assert.equal(p.rigStock.slider.length,2);assert.equal(p.owned.filter(id=>id==='rig_slider').length,1);assert.deepEqual(p.stock,before);assert.ok(Object.values(p.stock).every(Number.isFinite));assert.ok(carriedWeight(p.owned,p)>mass);
 p.credits=0;assert.equal(buyGear(p,'rig_slider').ok,false);assert.equal(p.rigStock.slider.length,2);
});

test('retired free restock cannot replenish depleted stock at sea or in the shop; purchases preserve rent',()=>{
 const sim=ready();sim.escape('break');sim.state.profile.stock.squid=0;sim.state.profile.rigStock.bottom=[];assert.equal(sim.restock().ok,false);
 shop(sim);const before=copy(sim.state.profile);assert.equal(sim.restock().ok,false);assert.deepEqual(sim.state.profile,before);assert.equal(sim.state.profile.stock.squid,0);assert.equal(sim.state.profile.rigStock.bottom.length,0);assert.equal(sim.rodConsumableStatus().rig.present,false);
 assert.ok(sim.buyGear('rig_slider').ok);sim.state.rentalPaid=false;sim.state.profile.credits=30;assert.equal(sim.buyGear('rig_slider').ok,false);assert.equal(sim.state.profile.credits,30);
});


test('fully soaked natural bait stops attracting bites until explicitly replaced; feather rigs need no separate bait',()=>{
 const sim=ready();assert.ok(sim.lowerRig().ok);sim.state.baitOnHook.condition=.08001;sim.state.biteAt=-1;sim.state.snagThreshold=Infinity;for(let t=0;t<20;t+=.1)sim.step(.1);
 assert.ok(['sinking','waiting'].includes(sim.state.fishState));assert.equal(sim.state.biteTimer,0);assert.ok(sim.rigEnvironment().freshness<.08);sim.state.baitOnHook.condition=0;assert.equal(sim.rigEnvironment().freshness,0);sim.retrieve();assert.ok(sim.replaceBait().ok);assert.ok(sim.lowerRig().ok);
 sim.retrieve();shop(sim);assert.ok(sim.buyGear('rig_sabiki').ok);assert.ok(sim.replaceRig(undefined,'sabiki').ok);assert.equal(sim.rodConsumableStatus().requiresBait,false);assert.equal(sim.rodConsumableStatus().bait,null);Object.assign(sim.state,{mode:'boat',moored:false});assert.ok(sim.lowerRig().ok);assert.equal(sim.rigEnvironment().freshness,1);
});

test('pre-hook-size saves default to intact wire without repairing recorded partial damage',()=>{
 const sim=ready();delete sim.state.profile.rodSupplies.rod.hookDamage;for(const rig of sim.state.profile.rigStock.bottom)delete rig.hookDamage;
 assert.equal(sim.rodConsumableStatus().rig.hookDamage,0);assert.ok(sim.state.profile.rigStock.bottom.every(r=>r.hookDamage===0));
 sim.state.profile.rodSupplies.rod.hookDamage=.45;const before=copy(sim.state.profile.stock);assert.ok(sim.replaceBait().ok);assert.equal(sim.rodConsumableStatus().rig.hookDamage,.45);assert.equal(sim.state.profile.stock.squid,before.squid-1,'fresh bait cannot repair hook wire');
 shop(sim);assert.equal(sim.restock().ok,false);assert.equal(sim.rodConsumableStatus().rig.hookDamage,.45,'retired restock cannot repair the mounted rig');
});
