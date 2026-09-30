import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation,SPECIES as SHORE_SPECIES} from '../dist/pacifica-sim.js';
import {SHOP_ITEMS,shoreOwnedItems,configureShoreEquipment} from '../dist/shore-equipment.js';
import {GEAR_CATALOG,createProfile,buyGear} from '../dist/equipment.js';
import {REGULATED_SPECIES} from '../dist/fishing-regulations.js';
import {REGULATIONS_BOOK_ID,BOOK_AREAS,BOOK_SPECIES,GENERAL_RULES,regulationsBookMarkup,searchBookSpecies,bookArea} from '../dist/regulations-book.js';
import {readFileSync} from 'node:fs';

const page=(areaId,query)=>regulationsBookMarkup({areaId,query});
const entry=id=>BOOK_SPECIES.find(s=>s.id===id);

test('the handbook is sold in Santa Cruz and in both shore shops at the same price',()=>{
 const pixel=GEAR_CATALOG.find(g=>g.id===REGULATIONS_BOOK_ID),shore=SHOP_ITEMS.find(i=>i.id===REGULATIONS_BOOK_ID);
 assert.equal(pixel.slot,'book');assert.equal(shore.kind,'book');assert.equal(pixel.price,shore.price);assert.ok(pixel.price>0);
 assert.match(pixel.desc,/不提供自动识鱼/);assert.match(shore.description,/不提供自动识鱼/);
});

test('Santa Cruz: buying the handbook once adds it to the locker; a second purchase is refused',()=>{
 const profile=createProfile();profile.credits=40;
 assert.equal(profile.owned.includes(REGULATIONS_BOOK_ID),false);
 assert.ok(buyGear(profile,REGULATIONS_BOOK_ID).ok);assert.ok(profile.owned.includes(REGULATIONS_BOOK_ID));assert.equal(profile.credits,28);
 assert.equal(buyGear(profile,REGULATIONS_BOOK_ID).ok,false);assert.equal(profile.credits,28);
});

for(const sceneId of['pacifica','half-moon-bay']){
 test(`${sceneId}: the handbook is bought once, kept in the bag across saves and cannot be equipped onto a rod`,()=>{
  const sim=new PacificaSimulation({sceneId});sim.state.credits=40;
  assert.equal(shoreOwnedItems(sim.state).some(i=>i.id===REGULATIONS_BOOK_ID),false);
  assert.ok(sim.buy(REGULATIONS_BOOK_ID).ok);assert.equal(sim.state.credits,28);
  assert.equal(sim.buy(REGULATIONS_BOOK_ID).ok,false);assert.equal(sim.state.credits,28);
  assert.ok(sim.inventorySlots().includes(REGULATIONS_BOOK_ID));
  const rig=JSON.stringify(sim.state.rodSupplies);
  assert.equal(configureShoreEquipment(sim,REGULATIONS_BOOK_ID).ok,false);assert.equal(JSON.stringify(sim.state.rodSupplies),rig);
  const restored=new PacificaSimulation({sceneId,saved:JSON.parse(JSON.stringify(sim.snapshot()))});
  assert.ok(restored.state.upgrades.includes(REGULATIONS_BOOK_ID));assert.ok(restored.inventorySlots().includes(REGULATIONS_BOOK_ID));
 });
}

test('every fish that can be caught in any scene has a handbook page',()=>{
 const text=BOOK_SPECIES.map(s=>`${s.name} ${s.en} ${s.latin}`.toLowerCase()).join('\n');
 for(const fish of SHORE_SPECIES)assert.ok(text.includes(fish.nameEn.toLowerCase()),fish.nameEn);
 for(const fish of REGULATED_SPECIES){const latin=fish.latin.toLowerCase().split(' ').slice(0,2).join(' ');assert.ok(text.includes(latin)||text.includes(latin.split(' ')[1]),fish.latin);}
 for(const s of BOOK_SPECIES)for(const area of BOOK_AREAS)for(const field of['season','size','bag','gear'])assert.ok(s[field](area).length>0,`${s.id}.${field}`);
});

test('rules match the 2026 CDFW booklet for the shore species',()=>{
 const sc=bookArea('santa_cruz');
 assert.match(entry('california_halibut').size(sc),/22 in/);assert.match(entry('california_halibut').bag(sc),/2 条/);
 assert.match(entry('striped_bass').size(sc),/18 in/);assert.match(entry('striped_bass').bag(sc),/2 条/);
 assert.match(entry('redtail_surfperch').size(sc),/10\.5 in/);assert.match(entry('barred_surfperch').size(sc),/无最小/);
 assert.match(entry('barred_surfperch').bag(sc),/20 条.*10 条/);
 assert.match(entry('jacksmelt').bag(sc),/无限额/);assert.match(entry('white_croaker').bag(sc),/10 条/);
 assert.match(entry('lingcod').size(sc),/22 in/);assert.match(entry('copper_rockfish').bag(sc),/1 条/);
 assert.match(entry('prohibited_rockfish').bag(sc),/^0 条/);
 assert.ok(GENERAL_RULES.some(r=>/公共码头/.test(r.text)&&/执照/.test(r.title)));
});

test('area choice changes only area-dependent rules: Pigeon Point shore hook limit and salmon seasons',()=>{
 const halibut=entry('california_halibut'),salmon=entry('chinook_salmon');
 assert.match(halibut.gear(bookArea('santa_cruz')),/1\.5 in/);
 for(const id of['pacifica','half_moon_bay']){assert.doesNotMatch(halibut.gear(bookArea(id)),/1\.5 in/);assert.match(salmon.season(bookArea(id)),/Point Arena–Pigeon Point/);}
 assert.match(salmon.season(bookArea('santa_cruz')),/Pigeon Point 以南/);
 assert.match(page('pacifica'),/<option value="pacifica" selected>/);assert.match(page('half_moon_bay'),/<option value="half_moon_bay" selected>/);
 assert.equal(bookArea('unknown').id,'santa_cruz');
});

test('the book never identifies a catch: it only filters by text the reader types',()=>{
 assert.equal(searchBookSpecies('').length,BOOK_SPECIES.length);
 assert.deepEqual(searchBookSpecies('halibut').map(s=>s.id),['california_halibut']);
 assert.ok(searchBookSpecies('海鲫').every(s=>/海鲫|surfperch/i.test(s.name+s.en+s.look)));
 assert.match(page('santa_cruz','zzzz'),/没有找到匹配的鱼种/);
 assert.match(page('santa_cruz','<img>'),/value="&lt;img&gt;"/);
 const source=readFileSync(new URL('../dist/regulations-book.js',import.meta.url),'utf8');
 for(const hint of['identifyRegulatedSpecies','assessCatch','catches','pendingCatch','fishState'])assert.equal(source.includes(hint),false,hint);
});

test('each game page has a hidden lower-left handbook button that the controller reveals only after purchase',()=>{
 for(const file of['index.html','pacifica.html','half-moon-bay.html']){
  const html=readFileSync(new URL(`../dist/${file}`,import.meta.url),'utf8');
  assert.match(html,/<button id="rules-btn" class="rules-book-btn" type="button" hidden/,file);
 }
 const shore=readFileSync(new URL('../dist/pacifica-game.js',import.meta.url),'utf8'),pixel=readFileSync(new URL('../dist/pixel-game.js',import.meta.url),'utf8');
 assert.match(shore,/show\('rules-btn',started&&ownsRules\(\)\)/,'the continuous shore scene keeps the purchased handbook accessible');
 assert.match(pixel,/show\('rules-btn',!focusActive&&!s\.dayTransition&&!s\.capsize&&ownsRules\(\)\)/);
 const css=readFileSync(new URL('../dist/pixel.css',import.meta.url),'utf8');
 assert.match(css,/\.rules-book-btn\{position:absolute;left:/);assert.match(css,/bottom:calc\([^;]*var\(--rules-lift/);
});
