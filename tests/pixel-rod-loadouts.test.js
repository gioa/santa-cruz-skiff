import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,buyGear,equipmentStats} from '../dist/equipment.js';
import {BASE_ROD_ASSEMBLY,ROD_ASSEMBLY_SLOTS,ensureRodLoadouts,getRodAssembly,setRodAssembly,syncActiveRodLoadout,rodAssemblyOptions} from '../dist/pixel-rod-loadouts.js';
const clone=value=>JSON.parse(JSON.stringify(value));
function prepared(ids=[]){const profile=createProfile();profile.credits=3000;for(const id of ids)assert.ok(buyGear(profile,id).ok);ensureRodLoadouts(profile);return profile;}

test('starter premade rod has two editable consumable slots and detached readable settings',()=>{
 const p=createProfile(),before=clone(p),map=ensureRodLoadouts(p);assert.deepEqual(map.rod,BASE_ROD_ASSEMBLY);assert.deepEqual(p.owned,before.owned);assert.deepEqual(p.stock,before.stock);
 assert.deepEqual(ROD_ASSEMBLY_SLOTS.map(s=>s.key),['rig','bait']);assert.equal(getRodAssembly(p,'rod_light'),null);assert.equal(getRodAssembly(p,'constructor'),null);const copy=getRodAssembly(p);copy.drag=.8;assert.equal(getRodAssembly(p).drag,.48);
});

test('legacy hardware is preserved readonly while obsolete custom sinkers normalize to the premade rig',()=>{
 const p=prepared(['rod_light','reel_smooth','line_braid','rig_slider','bait_anchovy']);delete p.rodLoadouts;delete p.rodLoadoutsVersion;delete p.consumablesVersion;delete p.rodSupplies;delete p.rigStock;Object.assign(p.loadout,{rod:'rod_light',reel:'reel_smooth',line:'line_braid'});
 ensureRodLoadouts(p,{rig:'slider',bait:'anchovy',weightGrams:170,drag:.63,fishingDepthMeters:4,baitOnHook:{kind:'anchovy',condition:.4}});
 assert.deepEqual(getRodAssembly(p,'rod_light'),{...BASE_ROD_ASSEMBLY,reel:'reel_smooth',line:'line_braid',rig:'slider',bait:'anchovy',weightGrams:57,drag:.63,fishingDepthMeters:4});
 assert.equal(setRodAssembly(p,'rod_light',{line:null}).ok,false);const restored=createProfile(clone(p));ensureRodLoadouts(restored,{rig:'bottom'});assert.deepEqual(restored.rodLoadouts,p.rodLoadouts);assert.deepEqual(restored.stock,p.stock);
});

test('rods keep independent premade rigs and explicit bait installs consume stock without switching active rod',()=>{
 const p=prepared(['rod_light','rod_boat','rig_float','rig_jig','bait_anchovy']);assert.ok(setRodAssembly(p,'rod_light',{rig:'float',bait:'anchovy',drag:.29,fishingDepthMeters:4}).ok);assert.ok(setRodAssembly(p,'rod_boat',{rig:'jig',bait:'jig',drag:.72}).ok);
 assert.equal(p.loadout.rod,'rod');assert.equal(p.stock.anchovy,11);assert.equal(p.stock.jig,2);assert.equal(getRodAssembly(p,'rod_light').weightGrams,7);assert.equal(getRodAssembly(p,'rod_boat').weightGrams,42);const stock=clone(p.stock);
 for(const id of ['rod_light','rod_boat','rod'])syncActiveRodLoadout(p,id);assert.deepEqual(p.stock,stock);
});

test('one purchased terminal cannot be duplicated across rods; repeat purchases supply separate rigs',()=>{
 const p=prepared(['rod_light','rig_dropper']);assert.ok(setRodAssembly(p,'rod',{rig:'dropper'}).ok);const before=clone(p);assert.equal(setRodAssembly(p,'rod_light',{rig:'dropper'}).ok,false);assert.deepEqual(p,before);
 assert.ok(buyGear(p,'rig_dropper').ok);assert.ok(setRodAssembly(p,'rod_light',{rig:'dropper'}).ok);assert.equal(getRodAssembly(p,'rod').rig,'dropper');assert.equal(getRodAssembly(p,'rod_light').rig,'dropper');assert.equal(p.rigStock.dropper.length,0);
});

test('hardware/weight edits and invalid mixed patches cannot spend stock or partially change a rig',()=>{
 const p=prepared(['rod_light','rig_float']);for(const patch of [{reel:null},{line:'line_braid'},{leader:'leader_heavy'},{weightGrams:85},{rig:'sabiki'},{rig:'float',bait:'anchovy'},{drag:Infinity},{drag:1},{fishingDepthMeters:NaN},{unknown:'rod'}]){const before=clone(p);assert.equal(setRodAssembly(p,'rod_light',patch).ok,false,JSON.stringify(patch));assert.deepEqual(p,before);}
});

test('whole rig sets its paired sinker; float depth remains bounded and drag remains independent',()=>{
 const p=prepared(['rig_float','rig_dropper','rig_sabiki']);assert.ok(setRodAssembly(p,'rod',{rig:'dropper',drag:.65}).ok);assert.equal(getRodAssembly(p).weightGrams,113);assert.ok(setRodAssembly(p,'rod',{rig:'float',fishingDepthMeters:4}).ok);assert.equal(getRodAssembly(p).weightGrams,7);assert.equal(getRodAssembly(p).drag,.65);assert.equal(setRodAssembly(p,'rod',{fishingDepthMeters:60}).ok,false);assert.ok(setRodAssembly(p,'rod',{rig:'sabiki'}).ok);assert.equal(getRodAssembly(p).weightGrams,28);
});

test('options expose finite spare counts and bait availability; individual hardware has no editing options',()=>{
 const p=prepared(['rod_light','rig_float','bait_anchovy']);assert.deepEqual(rodAssemblyOptions(p,'rod','reel'),[]);assert.deepEqual(rodAssemblyOptions(p,'rod','weightGrams'),[]);
 const rigs=rodAssemblyOptions(p,'rod_light','rig');assert.equal(rigs.find(r=>r.id==='float').stock,1);assert.equal(rigs.find(r=>r.id==='jig').available,false);const bait=rodAssemblyOptions(p,'rod_light','bait');assert.equal(bait.find(b=>b.id==='anchovy').stock,12);assert.equal(bait.find(b=>b.id==='shrimp').available,false);
});

test('normalization preserves exhausted stock and missing rigs; packed legacy components only affect their mounted rod',()=>{
 const p=prepared(['rod_light','reel_smooth','line_braid']);p.rodLoadouts.rod_light.reel='reel_smooth';p.rodLoadouts.rod_light.line='line_braid';p.rodSupplies.rod=null;p.stock.squid=0;ensureRodLoadouts(p);assert.equal(p.rodSupplies.rod,null);assert.equal(p.stock.squid,0);assert.equal(equipmentStats(p,p.owned).strength,1);syncActiveRodLoadout(p,'rod_light');assert.equal(equipmentStats(p,p.owned).strength,.84*1.14);
});
