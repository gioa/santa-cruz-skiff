import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,buyGear,equipmentStats} from '../dist/equipment.js';
import {BASE_ROD_ASSEMBLY,ROD_ASSEMBLY_SLOTS,ensureRodLoadouts,getRodAssembly,setRodAssembly,syncActiveRodLoadout,rodAssemblyOptions} from '../dist/pixel-rod-loadouts.js';

const clone=value=>JSON.parse(JSON.stringify(value));
function prepared(ids=[]){
 const profile=createProfile();profile.credits=3000;
 for(const id of ids)assert.equal(buyGear(profile,id).ok,true,id);
 ensureRodLoadouts(profile);return profile;
}

test('starter has only its owned rod, with no paid equipment or stock invented',()=>{
 const profile=createProfile(),before=clone(profile),map=ensureRodLoadouts(profile);
 assert.deepEqual(Object.keys(map),['rod']);assert.deepEqual(map.rod,BASE_ROD_ASSEMBLY);
 assert.deepEqual(profile.owned,before.owned);assert.deepEqual(profile.stock,before.stock);assert.equal(profile.credits,100);
 assert.equal(getRodAssembly(profile,'rod_light'),null);
 assert.equal(getRodAssembly(profile,'constructor'),null);
 assert.equal(setRodAssembly(profile,'rod_light',{rig:'jig'}).ok,false);
 const copy=getRodAssembly(profile,'rod');copy.drag=.85;assert.equal(getRodAssembly(profile,'rod').drag,.48);
 assert.deepEqual(ROD_ASSEMBLY_SLOTS.map(s=>s.key),['reel','line','leader','rig','bait','weightGrams','fishingDepthMeters']);
});

test('legacy migration preserves the actual active setup and survives JSON/profile reload',()=>{
 const profile=prepared(['rod_light','reel_smooth','line_braid','rig_slider','bait_anchovy']);
 delete profile.rodLoadouts;delete profile.rodLoadoutsVersion;
 Object.assign(profile.loadout,{rod:'rod_light',reel:'reel_smooth',line:'line_braid'});
 const owned=[...profile.owned],credits=profile.credits,stock={...profile.stock};
 ensureRodLoadouts(profile,{rig:'slider',bait:'anchovy',weightGrams:57,drag:.63,fishingDepthMeters:4});
 assert.deepEqual(getRodAssembly(profile,'rod_light'),{...BASE_ROD_ASSEMBLY,reel:'reel_smooth',line:'line_braid',rig:'slider',bait:'anchovy',weightGrams:57,drag:.63,fishingDepthMeters:4});
 assert.deepEqual(getRodAssembly(profile,'rod'),BASE_ROD_ASSEMBLY);
 const restored=createProfile(clone(profile));ensureRodLoadouts(restored,{rig:'bottom',bait:'squid',drag:.2});
 assert.deepEqual(restored.rodLoadouts,profile.rodLoadouts,'new-format rod saves take precedence over old globals');
 assert.deepEqual(restored.owned,owned);assert.deepEqual(restored.stock,stock);assert.equal(restored.credits,credits);
});

test('three rods keep independent rigs, bait, depth, weight and drag without changing the active rod',()=>{
 const profile=prepared(['rod_light','rod_boat','rig_float','rig_jig','sinker_heavy','bait_anchovy']);
 const beforeStock=clone(profile.stock);
 assert.equal(setRodAssembly(profile,'rod_light',{rig:'float',bait:'anchovy',drag:.29,fishingDepthMeters:4}).ok,true);
 assert.equal(setRodAssembly(profile,'rod_boat',{rig:'jig',bait:'jig',weightGrams:170,drag:.72}).ok,true);
 assert.equal(profile.loadout.rod,'rod','editing a card does not take it in hand');
 assert.deepEqual(getRodAssembly(profile,'rod'),BASE_ROD_ASSEMBLY);
 assert.equal(getRodAssembly(profile,'rod_light').weightGrams,7);assert.equal(getRodAssembly(profile,'rod_light').fishingDepthMeters,4);
 assert.equal(getRodAssembly(profile,'rod_boat').weightGrams,170);assert.equal(getRodAssembly(profile,'rod_boat').drag,.72);
 syncActiveRodLoadout(profile,'rod_light');syncActiveRodLoadout(profile,'rod_boat');syncActiveRodLoadout(profile,'rod_light');
 assert.equal(profile.loadout.rod,'rod_light');assert.equal(getRodAssembly(profile).bait,'anchovy');
 assert.deepEqual(profile.stock,beforeStock,'assembly choices do not consume or clone bait');
});

test('single purchased components transfer atomically and active legacy stats follow their rod',()=>{
 const profile=prepared(['rod_light','reel_smooth','line_braid','leader_heavy','rig_dropper']);
 const parts={reel:'reel_smooth',line:'line_braid',leader:'leader_heavy',rig:'dropper'};
 assert.equal(setRodAssembly(profile,'rod',parts).ok,true);
 assert.equal(equipmentStats(profile,profile.owned).strength,1.14*1.1);
 const moved=setRodAssembly(profile,'rod_light',parts);
 assert.equal(moved.ok,true);assert.equal(moved.transferred.length,4);
 assert.ok(moved.transferred.every(t=>t.fromRodId==='rod'&&t.toRodId==='rod_light'));
 assert.deepEqual(getRodAssembly(profile,'rod'),BASE_ROD_ASSEMBLY);
 assert.equal(profile.loadout.rod,'rod');assert.equal(profile.loadout.line,null);
 assert.equal(equipmentStats(profile,profile.owned).strength,1,'unused mounted line does not buff the active base rod');
 syncActiveRodLoadout(profile,'rod_light');assert.equal(equipmentStats(profile,profile.owned).strength,.84*1.14*1.1);
 const reloaded=createProfile(clone(profile));ensureRodLoadouts(reloaded);
 assert.equal(getRodAssembly(reloaded,'rod').rig,'bottom');assert.equal(getRodAssembly(reloaded,'rod_light').rig,'dropper');
});

test('invalid edits cannot grant equipment, spend bait, transfer components, or partially change saves',()=>{
 const profile=prepared(['rod_light','reel_smooth','rig_float']);
 setRodAssembly(profile,'rod',{reel:'reel_smooth'});
 for(const patch of [{line:'line_braid'},{rig:'sabiki'},{bait:'anchovy'},{reel:'cooler'},
  {weightGrams:170},{rig:'float',weightGrams:85},{drag:Infinity},{drag:1},{fishingDepthMeters:NaN},
  {reel:'reel_smooth',bait:'anchovy'},{unknown:'rod'}]){
  const before=clone(profile);assert.equal(setRodAssembly(profile,'rod_light',patch).ok,false,JSON.stringify(patch));
  assert.deepEqual(profile,before,'a rejected patch is atomic');
 }
 const before=clone(profile);assert.equal(setRodAssembly(profile,'rod_light',{reel:'reel_smooth'},['rod_light']).ok,false);assert.deepEqual(profile,before);
 assert.equal(setRodAssembly(profile,'rod_light',{reel:'reel_smooth'}).ok,true,'omitting packed allows the simulation to auto-enable owned parts');
});

test('rig changes reset dependent defaults while custom weights and float depths obey real constraints',()=>{
 const profile=prepared(['rig_dropper','rig_float','rig_sabiki','sinker_heavy']);
 assert.equal(setRodAssembly(profile,'rod',{weightGrams:227,drag:.65}).ok,true);
 assert.equal(setRodAssembly(profile,'rod',{rig:'dropper'}).assembly.weightGrams,113);
 const float=setRodAssembly(profile,'rod',{rig:'float'}).assembly;assert.equal(float.weightGrams,7);assert.equal(float.fishingDepthMeters,2.5);assert.equal(float.drag,.65);
 assert.equal(setRodAssembly(profile,'rod',{weightGrams:28}).ok,false);assert.equal(setRodAssembly(profile,'rod',{fishingDepthMeters:60}).ok,false);
 const sabiki=setRodAssembly(profile,'rod',{rig:'sabiki'}).assembly;assert.equal(sabiki.weightGrams,28);assert.equal(sabiki.fishingDepthMeters,6);
 assert.equal(setRodAssembly(profile,'rod',{weightGrams:170},['rod','rig_sabiki']).ok,false);
 assert.equal(setRodAssembly(profile,'rod',{weightGrams:170},['rod','rig_sabiki','sinker_heavy']).ok,true);
 assert.equal(setRodAssembly(profile,'rod',{drag:.5},['rod']).ok,true,'disabled existing configuration is preserved during an unrelated adjustment');
 assert.equal(getRodAssembly(profile).weightGrams,170);
});

test('options expose typed patch values and ownership/stock availability without hiding disabled gear',()=>{
 const profile=prepared(['rod_light','reel_smooth','rig_float','sinker_heavy','bait_anchovy']);
 setRodAssembly(profile,'rod',{reel:'reel_smooth'});
 const wheel=rodAssemblyOptions(profile,'rod_light','reel',[]);
 assert.equal(wheel[0].id,null);assert.equal(wheel[0].available,true);
 const paid=wheel.find(o=>o.id==='reel_smooth');assert.equal(paid.available,true);assert.equal(paid.packed,false);assert.equal(paid.mountedOn,'rod');assert.match(paid.reason,/移来/);
 const lines=rodAssemblyOptions(profile,'rod_light','line',[]);assert.equal(lines.find(o=>o.id==='line_braid').available,false);
 const baits=rodAssemblyOptions(profile,'rod_light','bait',[]);assert.equal(baits.find(o=>o.id==='anchovy').available,true);assert.equal(baits.find(o=>o.id==='shrimp').available,false);
 assert.equal(setRodAssembly(profile,'rod_light',{rig:'float'}).ok,true);
 const weights=rodAssemblyOptions(profile,'rod_light','weightGrams',[]);assert.deepEqual(weights.map(o=>o.id),[7]);
 const depths=rodAssemblyOptions(profile,'rod_light','fishingDepthMeters');assert.equal(depths[0].id,null);assert.ok(depths.filter(o=>o.id!==null).every(o=>typeof o.id==='number'&&o.id<=40));
 assert.ok([...wheel,...baits,...weights,...depths].every(o=>typeof o.name==='string'&&typeof o.iconId==='string'&&typeof o.available==='boolean'));
});

test('empty bait and disabled inventory do not erase saved choices; corrupt duplicate mounts are repaired',()=>{
 const profile=prepared(['rod_light','reel_smooth','rig_dropper','bait_anchovy']);
 setRodAssembly(profile,'rod',{bait:'anchovy',reel:'reel_smooth',rig:'dropper'});profile.stock.anchovy=0;
 assert.equal(setRodAssembly(profile,'rod',{drag:.6,bait:'anchovy'}).ok,true);
 ensureRodLoadouts(profile);assert.equal(getRodAssembly(profile).bait,'anchovy');
 profile.rodLoadouts.rod_light={...profile.rodLoadouts.rod,drag:.32};
 profile.loadout.rod='rod_light';ensureRodLoadouts(profile);
 assert.equal(getRodAssembly(profile,'rod_light').reel,'reel_smooth');assert.equal(getRodAssembly(profile,'rod').reel,null);
 assert.equal(getRodAssembly(profile,'rod_light').rig,'dropper');assert.equal(getRodAssembly(profile,'rod').rig,'bottom');
 assert.equal(getRodAssembly(profile,'rod').bait,'anchovy','repairing a duplicate part does not reset unrelated preferences');
 assert.equal(getRodAssembly(profile,'rod').drag,.6);
});
