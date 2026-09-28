import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';globalThis.fetch=async u=>new Response(await readFile(u));
const {PixelSimulation,HARBOR}=await import('../dist/pixel-sim.js');
const {createProfile,buyGear,carriedWeight}=await import('../dist/equipment.js');
const {ensureConsumables,installRig,loseRig}=await import('../dist/pixel-consumables.js');
const {installSinker,SINKER_SIZES,rigWeight}=await import('../dist/pixel-sinkers.js');
const {ensureRodLoadouts,getRodAssembly}=await import('../dist/pixel-rod-loadouts.js');
const {stepFishingLine,rodTipPosition}=await import('../dist/pixel-fishing-physics.js');
const copy=structuredClone;
function ready(){const sim=new PixelSimulation({profile:{version:2,credits:3000},rng:()=>.9});sim.start();Object.assign(sim.state,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});return sim;}
const count=p=>Object.values(p.sinkerStock||{}).reduce((a,n)=>a+n,0)+Object.values(p.rodSupplies||{}).filter(s=>s?.sinkerOz).length+Object.values(p.rigStock||{}).flat().filter(s=>s.sinkerOz).length;

test('sinker swaps conserve finite inventory, return old weights and cannot spend unavailable sizes',()=>{
 const p=createProfile();ensureRodLoadouts(p);const n=count(p),stock=p.sinkerStock[1];
 assert.ok(installSinker(p,'rod',1).ok);assert.equal(p.sinkerStock[1],stock-1);assert.equal(count(p),n);assert.equal(getRodAssembly(p).weightGrams,28);
 const unchanged=copy(p);assert.ok(installSinker(p,'rod',1).ok);assert.deepEqual(p,unchanged);
 assert.equal(installSinker(p,'rod',12).ok,false);assert.equal(installSinker(p,'rod',NaN).ok,false);assert.deepEqual(p,unchanged);
 assert.ok(installSinker(p,'rod',null).ok);assert.equal(count(p),n);assert.equal(getRodAssembly(p).weightGrams,6);
});
test('new rigs need separate weights; fixed jig heads cannot accept arbitrary sinkers; swapping preserves weights per rig',()=>{
 const p=createProfile();p.credits=1000;ensureRodLoadouts(p);assert.ok(buyGear(p,'rig_feather40').ok);assert.ok(installRig(p,'rod','feather40').ok);assert.equal(p.rodSupplies.rod.sinkerOz,null);
 assert.ok(installSinker(p,'rod',4).ok);assert.ok(buyGear(p,'rig_jig').ok);assert.ok(installRig(p,'rod','jig').ok);assert.equal(rigWeight('jig',p.rodSupplies.rod),42);const n=count(p);assert.equal(installSinker(p,'rod',1).ok,false);assert.equal(count(p),n);
 assert.ok(installRig(p,'rod','feather40').ok);assert.equal(p.rodSupplies.rod.sinkerOz,4);const before=count(p);loseRig(p,'rod');assert.equal(count(p),before-1);
});
test('weights survive switching rods, save/resume, and normalization without grants; deployment locks replacement',()=>{
 const sim=ready();assert.ok(sim.buyGear('rod_light').ok);assert.ok(sim.buyGear('sinker_1oz').ok);assert.ok(sim.buyGear('sinker_4oz').ok);assert.ok(sim.replaceSinker('rod',1).ok);assert.ok(sim.replaceSinker('rod_light',4).ok);sim.selectRod('rod');assert.equal(sim.state.rigWeightGrams,28);sim.selectRod('rod_light');assert.equal(sim.state.rigWeightGrams,113);
 const before=copy(sim.state.profile.sinkerStock);sim.state.fishState='sinking';assert.equal(sim.replaceSinker('rod',2).ok,false);assert.deepEqual(sim.state.profile.sinkerStock,before);sim.state.fishState='idle';
 const next=new PixelSimulation({saved:sim.snapshot()});next.start(true);assert.deepEqual(next.state.profile.sinkerStock,before);assert.equal(next.rodConsumableStatus('rod').sinkerOz,1);assert.equal(next.rodConsumableStatus('rod_light').sinkerOz,4);
});
test('legacy pre-weight saves preserve already included sinkers once, while new stock stays empty',()=>{
 const p=createProfile();delete p.sinkerVersion;delete p.sinkerStock;for(const s of Object.values(p.rodSupplies))delete s.sinkerOz;for(const s of Object.values(p.rigStock).flat())delete s.sinkerOz;
 const restored=createProfile(copy(p));ensureRodLoadouts(restored);assert.equal(restored.rodSupplies.rod.sinkerOz,3);assert.ok(restored.rigStock.bottom.every(s=>s.sinkerOz===3));assert.ok(Object.values(restored.sinkerStock).every(n=>n===0));
 installSinker(restored,'rod',null);restored.sinkerStock[3]=0;const again=createProfile(copy(restored));ensureRodLoadouts(again);assert.equal(again.rodSupplies.rod.sinkerOz,null);assert.equal(again.sinkerStock[3],0);
});
test('shop sinker purchases are repeatable and contribute to carried mass; capsize loses all weights',()=>{
 const sim=ready(),p=sim.state.profile,credits=p.credits,stock=p.sinkerStock[8],mass=carriedWeight(sim.state.packed,p);
 for(let i=0;i<2;i++)assert.ok(sim.buyGear('sinker_8oz').ok);assert.equal(p.sinkerStock[8],stock+2);assert.equal(p.credits,credits-24);assert.ok(carriedWeight(sim.state.packed,p)>mass+.45);
 Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat'});sim.beginCapsize();assert.ok(Object.values(p.sinkerStock).every(n=>n===0));assert.equal(count(p),0);
});
function drop(grams,{flow=.45,dt=.05,reel=0,seconds=12}={}){
 const s={boatX:0,boatZ:0,heading:0,rig:'feather40',rigWeightGrams:grams,rodMount:'hand',rodElevation:45,rodAzimuth:70,fishState:'sinking',reelMode:reel?'brake':'free',paidLineMeters:reel?16:2.55,lureDepth:reel?13.5:0,drag:.48,rigVelocity:{vx:0,vz:0},crankRate:reel};
 const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-s.lureDepth};
 for(let t=0;t<seconds-dt/2;t+=dt){s.crankRate=reel;const before=s.paidLineMeters;Object.assign(s,stepFishingLine(s,{dt,current:{x:flow,z:0},velocity:{vx:0,vz:0},environment:{bottomDepth:50}}));assert.ok(Math.abs(s.paidLineMeters-before-(s.payoutRate-s.retrieveRate)*dt)<1e-8);}
 return s;
}
test('heavier sinkers sink faster with less current deflection, bend the rod more and wind more slowly',()=>{
 const light=drop(28),heavy=drop(227);assert.ok(heavy.lureDepth>light.lureDepth*1.7);const angle=s=>Math.hypot(s.bobber.x-s.rodTip.x,s.bobber.z-s.rodTip.z)/(s.rodTip.height+s.lureDepth);assert.ok(angle(heavy)<angle(light));assert.ok(heavy.rodBend>light.rodBend);
 const a=drop(28,{flow:0,reel:1.2,seconds:4}),b=drop(227,{flow:0,reel:1.2,seconds:4});assert.ok(b.retrieveRate<a.retrieveRate);assert.ok(b.rodLoadN>a.rodLoadN);assert.ok(b.lureDepth>a.lureDepth);
 for(const dt of [1/60,.1]){const s=drop(227,{dt});assert.ok(Math.abs(s.lureDepth-heavy.lureDepth)<.2);}
});

test('a worn-out leader does not destroy its recoverable sinker during replacement',()=>{
 const p=createProfile();ensureRodLoadouts(p);const n=count(p),stock=p.sinkerStock[3];p.rodSupplies.rod.condition=.04;
 assert.ok(installRig(p,'rod','bottom').ok);assert.equal(count(p),n);assert.equal(p.sinkerStock[3],stock+1);
 p.rodSupplies.rod.condition=.04;assert.ok(installSinker(p,'rod',null).ok);assert.equal(count(p),n);
});
