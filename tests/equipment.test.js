import test from 'node:test';import assert from 'node:assert/strict';
import {BASE_GEAR,GEAR_CATALOG,createProfile,buyGear,restock,settleFish,cargoWeight,equipmentStats,fishWeights,weightedFish} from '../dist/equipment.js';
test('legacy 3D restock helper remains compatible with its separate commerce flow',()=>{const p=createProfile();p.credits=0;p.stock.squid=0;p.condition=0;restock(p);assert.equal(p.credits,0);assert.equal(p.stock.squid,12);assert.equal(p.condition,100);assert.ok(p.owned.includes('rod')&&p.owned.includes('pfd'));});
test('cannot double buy permanent equipment or go into debt',()=>{const p=createProfile();assert.equal(buyGear(p,'rod_light').ok,true);assert.equal(p.credits,15);assert.equal(buyGear(p,'rod_light').ok,false);assert.equal(buyGear(p,'sounder').ok,false);assert.equal(p.credits,15);});
test('retained fish trades once across reload; journal survives and cargo empties',()=>{let p=createProfile();const f={catchId:'trip:1',name:'蓝岩鱼',kg:.8,length:32,kept:true};assert.equal(cargoWeight([f]),.8);const n=settleFish(p,f);assert.ok(n>0);assert.equal(cargoWeight([f]),0);p=createProfile(JSON.parse(JSON.stringify(p)));assert.equal(settleFish(p,{...f,settled:false}),0);assert.equal(p.credits,100+n);});
test('release and retain have equal rewards and all species remain possible',()=>{const f={catchId:'1',name:'岩鱼',kg:1,length:35};assert.equal(settleFish(createProfile(),{...f,kept:false}),settleFish(createProfile(),{...f,kept:true}));const fishes=[{name:'蓝岩鱼',spot:'kelp',bait:'squid'},{name:'鲭鱼',spot:'sand',bait:'jig'},{name:'长蛇齿单线鱼',spot:'reef',bait:'anchovy'}];for(const bait of ['squid','anchovy','shrimp','sardine','jig']){const weights=fishWeights(fishes,{bait,habitat:'sand',rig:'float'});assert.ok(weights.every(w=>w>0));assert.equal(weightedFish(fishes,{bait},()=>0),fishes[0]);assert.equal(weightedFish(fishes,{bait},()=>.99999),fishes[2]);}});
test('locker upgrades change no mass or stats until carried',()=>{const p=createProfile();p.credits=500;buyGear(p,'rod_boat');p.loadout.rod='rod_boat';assert.equal(equipmentStats(p,['rod']).strength,1);assert.equal(equipmentStats(p,['rod_boat']).strength,1.16);});
test('no carried rod, rig or cooler supplies no phantom equipment',()=>{const s=equipmentStats(createProfile(),[]);assert.equal(s.hasRod,false);assert.equal(s.hasRig,false);assert.equal(s.capacity,0);assert.equal(s.weight,0);});
test('a physical boat anchor is purchased independently of the drift sock and only works when carried',()=>{
 const p=createProfile();assert.equal(p.owned.includes('anchor'),false);assert.equal(equipmentStats(p,['anchor']).hasAnchor,false,'a packed id cannot grant an unowned anchor');p.credits=200;
 assert.equal(buyGear(p,'sea_anchor').ok,true);assert.equal(equipmentStats(p,['sea_anchor']).hasAnchor,false);const before=p.credits;assert.equal(buyGear(p,'anchor').ok,true);assert.equal(p.credits,before-65);assert.equal(equipmentStats(p,[]).hasAnchor,false);assert.equal(equipmentStats(p,['anchor']).hasAnchor,true);assert.equal(equipmentStats(p,['anchor']).weight,4.2);assert.equal(buyGear(p,'anchor').ok,false);
});


test('starter gifts are independent of replacement prices and do not regenerate on profile reload',()=>{
 const p=createProfile();assert.equal(p.credits,100);for(const id of ['tackle','bait']){assert.ok(BASE_GEAR.some(g=>g.id===id));assert.ok(p.owned.includes(id));const item=GEAR_CATALOG.find(g=>g.id===id);assert.equal(item.price,12);assert.equal(item.starter,true);assert.doesNotMatch(item.desc,/免费补给/);}
 assert.equal(p.stock.squid,12);assert.equal(p.rigStock.bottom.length,2);p.stock.squid=0;p.rigStock.bottom=[];p.rodSupplies.rod=null;
 const reloaded=createProfile(JSON.parse(JSON.stringify(p)));assert.equal(reloaded.stock.squid,0);assert.deepEqual(reloaded.rigStock.bottom,[]);assert.equal(reloaded.rodSupplies.rod,null);
});

test('squid and bottom rigs replenish only through repeatable paid purchases with finite quantities',()=>{
 const p=createProfile();p.stock.squid=0;p.rigStock.bottom=[];const owned=[...p.owned],installed=structuredClone(p.rodSupplies.rod);
 for(let i=1;i<=2;i++){assert.ok(buyGear(p,'bait').ok);assert.ok(buyGear(p,'tackle').ok);assert.equal(p.credits,100-24*i);assert.equal(p.stock.squid,12*i);assert.equal(p.rigStock.bottom.length,i);assert.deepEqual(p.owned,owned);assert.deepEqual(p.rodSupplies.rod,installed);}
 assert.deepEqual(p.transactions.slice(0,4).map(t=>t.delta),[-12,-12,-12,-12]);
 p.credits=11;const before=structuredClone(p);for(const id of ['bait','tackle']){const result=buyGear(p,id);assert.equal(result.ok,false);assert.doesNotMatch(result.message,/免费/);assert.deepEqual(p,before);}
});
