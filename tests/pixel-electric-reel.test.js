import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GEAR_CATALOG,BASE_GEAR,createProfile,buyGear,equipmentStats,hasElectricReel} from '../dist/equipment.js';
import {ensureRodLoadouts,ROD_IDS,setRodAssembly} from '../dist/pixel-rod-loadouts.js';
import {damageSupplies,loseRig} from '../dist/pixel-consumables.js';
import {ITEM_ICON_IDS} from '../dist/pixel-item-icons.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,HARBOR,BOAT_RENTAL_PRICE}=await import('../dist/pixel-sim.js');
const copy=value=>JSON.parse(JSON.stringify(value));
function atShop(credits=1000){const sim=new PixelSimulation();sim.start();Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});sim.state.profile.credits=credits;return sim;}

test('electric boat set is paid, premade, and has ordinary fishing strength with its own icon',()=>{
 const item=GEAR_CATALOG.find(g=>g.id==='rod_electric'),profile=createProfile();
 assert.equal(item.slot,'rod');assert.equal(item.price,320);assert.equal(item.kg,1.25);assert.equal(item.electricRetrieve,true);assert.ok(item.desc.includes('一体电源'));
 assert.equal(BASE_GEAR.some(g=>g.id===item.id),false);assert.equal(profile.owned.includes(item.id),false);assert.ok(ITEM_ICON_IDS.includes(item.id));assert.ok(ROD_IDS.includes(item.id));
 profile.credits=320;assert.ok(buyGear(profile,item.id).ok);ensureRodLoadouts(profile);
 assert.equal(profile.credits,0);assert.equal(buyGear(profile,item.id).ok,false);assert.equal(profile.owned.filter(id=>id===item.id).length,1);
 profile.loadout.rod=item.id;const stats=equipmentStats(profile,profile.owned);
 assert.equal(stats.strength,1);assert.equal(stats.retrieve,1);assert.equal(stats.sensitivity,1);
 assert.equal(setRodAssembly(profile,item.id,{reel:'reel_smooth'}).ok,false,'hardware remains part of the premade set');
});

test('electric retrieval requires the owned, carried, selected electric set',()=>{
 const profile=createProfile();assert.equal(hasElectricReel(),false);assert.equal(hasElectricReel(null,null),false);assert.equal(hasElectricReel(profile),false);
 profile.loadout.rod='rod_electric';assert.equal(hasElectricReel(profile,['rod_electric']),false,'forged packing does not grant ownership');
 profile.credits=320;assert.ok(buyGear(profile,'rod_electric').ok);assert.equal(hasElectricReel(profile,[]),false,'owned but stowed');
 assert.equal(hasElectricReel(profile,['rod_electric']),true);profile.loadout.rod='rod';assert.equal(hasElectricReel(profile,profile.owned),false,'carrying an inactive electric rod does not motorize the ordinary reel');
 profile.loadout.rod='reel_smooth';profile.owned.push('reel_smooth');assert.equal(hasElectricReel(profile,profile.owned),false);
});

test('shop purchase preserves boat rental funds and selection controls the public capability',()=>{
 const sim=atShop(320+BOAT_RENTAL_PRICE-1),profile=sim.state.profile,before=copy(profile);
 assert.equal(sim.buyGear('rod_electric').ok,false);assert.deepEqual(profile,before);
 profile.credits++;assert.ok(sim.buyGear('rod_electric').ok);assert.equal(profile.credits,BOAT_RENTAL_PRICE);assert.equal(sim.hasElectricReel,false);
 assert.ok(sim.equip('rod_electric').ok);assert.equal(sim.hasElectricReel,false);assert.ok(sim.selectRod('rod_electric').ok);assert.equal(sim.hasElectricReel,true);assert.equal(sim.publicState().hasElectricReel,true);
 assert.ok(sim.selectRod('rod').ok);assert.equal(sim.hasElectricReel,false);assert.equal(sim.publicState().hasElectricReel,false);
 assert.ok(sim.selectRod('rod_electric').ok);assert.ok(sim.equip('rod_electric').ok);assert.equal(sim.hasElectricReel,false);assert.equal(profile.loadout.rod,'rod');
 assert.ok(sim.equip('rod').ok);assert.equal(profile.loadout.rod,null);assert.ok(sim.equip('rod_electric').ok);assert.equal(profile.loadout.rod,'rod_electric');assert.equal(sim.hasElectricReel,true,'catalogue-derived fallback finds the new rod');
 assert.ok(sim.launchBoat().ok);assert.equal(profile.credits,0);
 const away=atShop(1000);away.state.playerZ+=10;assert.equal(away.buyGear('rod_electric').ok,false);assert.equal(away.state.profile.credits,1000);
});

test('electric rod consumes physical bait and rigs, retaining wear and loss across saves',()=>{
 const sim=atShop();assert.ok(sim.buyGear('rod_electric').ok);assert.ok(sim.selectRod('rod_electric').ok);
 const profile=sim.state.profile;assert.equal(sim.rodConsumableStatus().bait,null,'purchased rods do not manufacture bait');
 assert.ok(sim.replaceBait(undefined,'squid').ok);assert.equal(profile.stock.squid,11);
 damageSupplies(profile,'rod_electric','catch');profile.rodSupplies.rod_electric.hookDamage=.2;
 assert.equal(sim.rodConsumableStatus().bait.condition,0);assert.equal(sim.rodConsumableStatus().rig.condition,.975);
 assert.ok(sim.replaceBait(undefined,'squid').ok);assert.equal(profile.stock.squid,10);
 const stock=copy(profile.stock);assert.ok(sim.selectRod('rod').ok);assert.ok(sim.selectRod('rod_electric').ok);assert.deepEqual(profile.stock,stock);
 const resumed=new PixelSimulation({saved:sim.snapshot()});assert.ok(resumed.start(true).ok);assert.equal(resumed.hasElectricReel,true);assert.equal(resumed.state.profile.stock.squid,10);assert.equal(resumed.rodConsumableStatus().rig.condition,.975);assert.equal(resumed.rodConsumableStatus().rig.hookDamage,.2);
 loseRig(resumed.state.profile,'rod_electric');const lost=new PixelSimulation({saved:resumed.snapshot()});lost.start(true);assert.equal(lost.rodConsumableStatus().rig.present,false);assert.equal(lost.state.profile.stock.squid,10);
 const spares=lost.rodConsumableStatus().rigStock.bottom;assert.ok(lost.replaceRig(undefined,'bottom').ok);assert.equal(lost.rodConsumableStatus().rigStock.bottom,spares-1);assert.equal(lost.rodConsumableStatus().bait,null);
 assert.ok(lost.replaceBait(undefined,'squid').ok);assert.equal(lost.state.profile.stock.squid,9);
 Object.assign(lost.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:-180,boatZ:880});assert.ok(lost.lowerRig().ok);assert.equal(lost.state.fishState,'sinking');assert.equal(lost.hasElectricReel,true);
});
