import test from 'node:test';
import assert from 'node:assert/strict';
import {FISH_SPECIES,fishSpecies,fishSpeciesKey,normalizeFishIdentity} from '../dist/fish-species.js';
import {fishCommonName,fishDisplayName} from '../dist/pixel-fish-names.js';
import {fishSpriteKind,drawFishArt} from '../dist/pixel-fish-art.js';
import {fishMassKg,fishLengthCmFromMass} from '../dist/pixel-fish-mass.js';
import {REGULATED_SPECIES,identifyRegulatedSpecies} from '../dist/fishing-regulations.js';
import {rigSpeciesKey} from '../dist/fishing-rigs.js';

test('catalogue provides one immutable identity for every translated/scientific spelling',()=>{
 assert.equal(new Set(FISH_SPECIES.map(s=>s.id)).size,FISH_SPECIES.length);
 assert.equal(new Set(FISH_SPECIES.map(s=>s.latin)).size,FISH_SPECIES.length);
 for(const s of FISH_SPECIES){
  assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.aliases));
  for(const alias of[s.name,s.commonName,s.latin,s.id,...s.aliases]){
   assert.equal(fishSpecies(alias)?.id,s.id,alias);
   assert.equal(fishCommonName(alias),s.commonName);
   assert.equal(fishSpriteKind(alias),s.artKind||'unknown');
  }
 }
});
test('explicit species evidence wins and group labels cannot merge unrelated fish',()=>{
 assert.equal(fishSpecies({latin:'Amphistichus argenteus',id:'surfperch',name:'红尾海鲫'}).id,'barred_surfperch');
 for(const f of[{latin:'Hippoglossus stenolepis',name:'加州大比目鱼'},{speciesId:'coho_salmon',name:'帝王鲑'},{latin:'Morone chrysops',name:'白鲈'}]){
  assert.equal(fishSpecies(f),null);assert.equal(identifyRegulatedSpecies(f),null);assert.equal(fishSpriteKind(f),'unknown');assert.equal(rigSpeciesKey(f),'other');
 }
 for(const name of['surfperch','rockfish','halibut','salmon'])assert.equal(fishSpecies(name),null);
 assert.equal(fishSpecies({id:'surfperch'}).id,'redtail_surfperch','known old shore ID migrates in ID context');
 assert.equal(fishSpecies({id:'halibut'}).id,'california_halibut');
});
test('old and current halibut records display the same information without changing a specimen',()=>{
 const old=Object.freeze({id:'halibut',name:'加州比目鱼',weightKg:1.87,catchId:51,settled:true});
 const f=normalizeFishIdentity(old);
 assert.equal(f.name,'加州大比目鱼');assert.equal(f.commonName,'California Halibut');assert.equal(f.nameEn,f.commonName);assert.equal(f.latin,'Paralichthys californicus');
 assert.equal(f.catchId,51);assert.equal(f.weightKg,1.87);assert.equal(f.settled,true);assert.equal(f.length,undefined);
 assert.equal(fishDisplayName(old),fishDisplayName(f));assert.equal(fishSpeciesKey(old),fishSpeciesKey('加州牙鲆'));assert.equal(old.name,'加州比目鱼');
});
test('rules and artwork resolve the same exact species without inventing shore rules',()=>{
 for(const rule of REGULATED_SPECIES){const s=fishSpecies({speciesId:rule.id});assert.equal(rule.latin,s.latin);assert.equal(rule.names[0],s.name);assert.equal(identifyRegulatedSpecies({id:s.id})?.id,s.id);}
 assert.equal(identifyRegulatedSpecies({id:'surfperch'}),null);
 assert.equal(identifyRegulatedSpecies({id:'striped_bass'}),null);
 assert.equal(identifyRegulatedSpecies({latin:'Paralichthys californicus',name:'铜岩鱼'}).id,'california_halibut');
});
test('same halibut uses one mass curve and inverse preserves authored mass precision',()=>{
 for(const weight of [1,1.7,2.6,4.2]){
  const length=fishLengthCmFromMass({id:'halibut'},weight);
  assert.ok(length>0);assert.ok(Math.abs(fishMassKg({speciesId:'california_halibut'},length)-weight)<=.02);
  assert.equal(fishMassKg({name:'加州比目鱼'},length),fishMassKg({latin:'Paralichthys californicus'},length));
 }
 assert.equal(fishLengthCmFromMass({id:'surfperch'},.8),null);
 assert.equal(fishLengthCmFromMass({id:'halibut'},NaN),null);
});
test('unmeasured historic catches use a portrait without a fabricated measuring scale',()=>{
 const operations=[],ctx={fillRect:(...a)=>operations.push(['rect',...a]),drawImage:(...a)=>operations.push(['image',...a]),fillText:(...a)=>operations.push(['text',...a])};
 const canvas={getContext:()=>ctx},sprite={width:48,height:24};
 const layout=drawFishArt(canvas,sprite,{weightKg:2},{width:300});
 assert.equal(layout.lengthCm,null);assert.ok(operations.some(o=>o[0]==='image'));assert.ok(!operations.some(o=>o[0]==='text'));
});

test('unknown scientific identities retain separate keys and cannot access prototype mass models',()=>{
 const pacific={scientificName:'Hippoglossus stenolepis',name:'加州大比目鱼'},summer={scientificName:'Paralichthys dentatus',name:'加州大比目鱼'};
 assert.notEqual(fishSpeciesKey(pacific),fishSpeciesKey(summer));assert.equal(fishSpeciesKey(pacific),fishSpeciesKey('HIPPOGLOSSUS STENOLEPIS'));
 for(const latin of ['constructor','__proto__','toString'])assert.equal(fishLengthCmFromMass({latin},1),null);
});
