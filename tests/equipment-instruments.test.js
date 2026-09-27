import test from 'node:test';
import assert from 'node:assert/strict';
import {GEAR_CATALOG,BASE_GEAR,createProfile,buyGear,equipmentStats,settleFish} from '../dist/equipment.js';
import {RIG_PROFILES} from '../dist/fishing-rigs.js';

const instruments={nautical_chart:'hasChart',compass:'hasCompass',gps:'hasGPS',sounder:'hasSounder'};

test('free starter includes landing and release tools, never navigation instruments',()=>{
  const profile=createProfile(),packed=BASE_GEAR.map(item=>item.id),stats=equipmentStats(profile,packed);
  assert.ok(packed.includes('descending_device'));
  assert.equal(GEAR_CATALOG.find(g=>g.id==='descending_device').kg,.35);
  assert.equal(GEAR_CATALOG.find(g=>g.id==='net').openingInches,20);
  assert.equal(profile.credits,100);
  for(const[id,flag]of Object.entries(instruments)){
    assert.equal(packed.includes(id),false);
    assert.equal(profile.owned.includes(id),false);
    assert.equal(stats[flag],false);
    assert.equal(equipmentStats(profile,[id])[flag],false,'unowned packed IDs cannot conjure electronics');
  }
});

test('purchased instruments reveal only their own capability and only while carried',()=>{
  const profile=createProfile();profile.credits=1000;
  const expected={nautical_chart:120,compass:45,gps:180,sounder:210};
  let spent=0;
  for(const[id,flag]of Object.entries(instruments)){
    const item=GEAR_CATALOG.find(g=>g.id===id);assert.equal(item.price,expected[id]);
    assert.equal(buyGear(profile,id).ok,true);spent+=item.price;
    assert.equal(profile.credits,1000-spent);
    assert.equal(equipmentStats(profile,[])[flag],false,'locker ownership is not equipped');
    const stats=equipmentStats(profile,[id]);assert.equal(stats[flag],true);
    for(const other of Object.values(instruments))if(other!==flag)assert.equal(stats[other],false);
    assert.equal(buyGear(profile,id).ok,false);
    assert.equal(profile.credits,1000-spent,'duplicate purchase cannot debit credits');
    assert.equal(equipmentStats(profile,[])[flag],false,'unpacking hides the instrument');
  }
});

test('the first settled starter catch can fund the paper chart without free instruments',()=>{
  const profile=createProfile();assert.equal(buyGear(profile,'nautical_chart').ok,false);assert.equal(profile.credits,100);
  const reward=settleFish(profile,{catchId:'starter-chart',name:'蓝岩鱼',kg:.45,length:25,kept:true});
  assert.ok(reward>=20);
  assert.equal(buyGear(profile,'nautical_chart').ok,true);
  assert.equal(profile.credits,100+reward-120);
  assert.equal(equipmentStats(profile,BASE_GEAR.map(g=>g.id)).hasChart,false);
});

test('version-two saved lockers gain the free descending device while keeping earned gear and credits',()=>{
  const previous={version:2,credits:387,owned:['rod','cooler','sounder','rig_slider','compass'],stock:{squid:5,anchovy:7},loadout:{rod:'rod',cooler:'cooler'},settled:['old:1'],seen:['铜岩鱼'],transactions:[{kind:'purchase',id:'sounder',delta:-210}],nextCatch:9};
  const original=JSON.stringify(previous),migrated=createProfile(previous);
  assert.equal(migrated.credits,387);assert.equal(migrated.nextCatch,9);
  for(const id of [...previous.owned,'descending_device'])assert.ok(migrated.owned.includes(id));
  assert.equal(migrated.owned.filter(id=>id==='descending_device').length,1);
  assert.deepEqual(migrated.transactions,previous.transactions);
  assert.deepEqual(migrated.settled,['old:1']);assert.equal(migrated.stock.anchovy,7);assert.equal(migrated.stock.squid,5);
  assert.equal(equipmentStats(migrated,['sounder']).hasSounder,true);
  assert.equal(equipmentStats(migrated,['compass']).hasCompass,true);
  assert.equal(JSON.stringify(previous),original,'migration does not mutate the old save');
  assert.deepEqual(createProfile(migrated).owned,migrated.owned,'repeated load does not duplicate starter gear');
});

test('each of the six rig profiles corresponds to a purchasable carried rig with matching hook count',()=>{
  const profile=createProfile();profile.credits=200;
  for(const rig of Object.values(RIG_PROFILES)){
    const item=GEAR_CATALOG.find(g=>g.id===rig.item);
    assert.ok(item);assert.equal(item.rig,rig.id);assert.equal(item.hooks,rig.hooks);
    if(item.price)assert.equal(buyGear(profile,item.id).ok,true);
    assert.equal(equipmentStats(profile,[item.id]).hasRig,true);
  }
  assert.equal(equipmentStats(profile,[]).hasRig,false);
});

test('the actual counter equip action toggles purchased instruments without leaking another capability',async()=>{
  const {readFile}=await import('node:fs/promises');
  globalThis.fetch=async url=>new Response(await readFile(url));
  const {PixelSimulation}=await import('../dist/pixel-sim.js');
  const sim=new PixelSimulation();sim.start();
  assert.equal(sim.buyGear('compass').ok,false,'purchases require the actual counter');
  sim.walkTo('counter');for(let i=0;i<300&&sim.state.walkRoute.length;i++)sim.step(.1);
  assert.equal(sim.atCounter,true);assert.equal(sim.packStarter().ok,true);
  assert.equal(sim.stats.hasCompass,false);assert.equal(sim.equip('compass').ok,false);
  assert.equal(sim.buyGear('compass').ok,true);assert.equal(sim.state.profile.credits,55);
  assert.equal(sim.stats.hasCompass,false);assert.equal(sim.equip('compass').ok,true);
  assert.equal(sim.stats.hasCompass,true);assert.equal(sim.stats.hasGPS,false);assert.equal(sim.stats.hasChart,false);assert.equal(sim.stats.hasSounder,false);
  assert.equal(sim.equip('compass').ok,true);assert.equal(sim.stats.hasCompass,false);
});
