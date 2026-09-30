import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation, WORLD, SHOP, SAVE_KEY, SHOP_ITEMS} from '../dist/pacifica-sim.js';
import {SHORE_MOVEMENT as M,shoreStandPosition,shoreWalkBoundaryY,shoreArrivalPosition} from '../dist/shore-movement.js';
import {shoreProfile} from '../dist/shore-data.js';
import {castToOffshore, finishShoreFlight, finishShoreRetrieve} from './helpers/shore-cast.js';
import {schoolAtBait, awaitBite} from './helpers/shore-fish.js';

const advance = (sim, seconds, input = {}) => {
  for (let t = 0; t < seconds - 1e-7; t += .05) sim.update(Math.min(.05, seconds - t), typeof input === 'function' ? input(sim.state) : input);
};
const until = (sim, predicate, seconds = 180, input = {}) => {
  for (let t = 0; t < seconds && !predicate(); t += .05) sim.update(.05, typeof input === 'function' ? input(sim.state) : input);
  assert.ok(predicate(), `timed out: ${sim.state.phase} / ${sim.state.message}`);
};
const toSurf = sim => {
  sim.state.wardenNextAt=1e9;
  const p=shoreStandPosition(sim.scene,730);assert.ok(sim.walkTo(p.x,p.y).ok);
  until(sim, () => sim.state.walkTarget === null, 180);
  assert.ok(sim.canCast);
};
const hook = sim => {
  // A hungry surfperch school beside the bait still has to sense, inspect and
  // take it through the population model. Economy tests must not depend on
  // multi-minute fishing luck.
  const profile=shoreProfile(sim.scene,sim.state.player.x,sim.state.elapsed,sim.state.seaState);
  castToOffshore(sim,profile.troughDistance);
  finishShoreFlight(sim);
  schoolAtBait(sim,'surfperch');
  awaitBite(sim);
  assert.ok(sim.strike().ok);
};
const land = sim => {
  let reel = true;
  until(sim, () => sim.state.phase === 'landed', 140, s => {
    if (s.tension > .72) reel = false;
    if (s.tension < .38) reel = true;
    return {reel};
  });
};
const shop = sim => {
  assert.ok(sim.walkTo(SHOP.door.x, SHOP.door.y + 4.8).ok);
  until(sim, () => sim.state.walkTarget === null, 180);
  assert.ok(sim.nearShop);
};

test('Pacifica has a separate save and starts equipped at its actual bait shop', () => {
  const sim = new PacificaSimulation();
  assert.match(SAVE_KEY, /pacifica/);
  assert.equal(sim.state.credits, 120);
  assert.equal(sim.state.inventory.sandcrab, 12);
  assert.ok(sim.nearShop);
  assert.equal(sim.canCast, false);
  assert.equal(sim.cast({power: 1}).ok, false);
  assert.equal(sim.state.inventory.sandcrab, 12);
  assert.equal(sim.buy('surf_rod').ok, true);
  assert.equal(sim.state.credits, 35);
  assert.equal(sim.buy('surf_rod').ok, false);
  assert.equal(sim.state.credits, 35);
  assert.equal(sim.buy('sealed_reel').ok, false);
});

test('walking paths go around shop walls and cannot enter water or leave the beach', () => {
  const sim = new PacificaSimulation();
  const b=sim.building;assert.ok(sim.walkTo(SHOP.door.x, WORLD.shoreY(SHOP.door.x) + M.stand).ok);
  let observedDetour = false;
  until(sim, () => !sim.state.walkTarget, 120, s => {
    const {x, y} = s.player;
    assert.equal(x > b.left && x < b.right && y > b.top && y < b.bottom, false);
    if (x < b.left || x > b.right) observedDetour = true;
    return {};
  });
  assert.ok(observedDetour, 'path must detour around the building');
  advance(sim, 20, {x: -1, y: -1});
  assert.ok(sim.state.player.x >= M.bodyRadius);
  assert.ok(sim.state.player.y >= shoreWalkBoundaryY(sim.scene,sim.state.player.x)-1e-6);
  advance(sim, 20, {x: 1, y: 1});
  assert.ok(sim.state.player.x <= WORLD.width - M.bodyRadius);
  assert.ok(sim.state.player.y <= WORLD.height - M.bodyRadius);
  assert.equal(sim.walkTo((b.left+b.right)/2, (b.top+b.bottom)/2).ok, false);
  assert.equal(sim.walkTo(NaN, Infinity).ok, false);
});

test('a full earned catch, walk back, trade and upgrade cannot reward the same fish twice', () => {
  const sim = new PacificaSimulation({rng: () => .15});
  toSurf(sim);
  assert.equal(sim.buy('squid').ok, false);
  hook(sim);
  assert.equal(sim.state.inventory.sandcrab, 12);
  assert.equal(sim.walkTo(800, 800).ok, false);
  land(sim);
  assert.equal(sim.state.rodSupplies[sim.state.activeRod].bait.condition,0);
  const fishValue = sim.state.fish.value;
  assert.ok(fishValue > 0);
  assert.equal(sim.state.credits, 120);
  assert.ok(sim.resolveCatch(true).ok);
  assert.equal(sim.state.catches.length, 1);
  assert.equal(sim.resolveCatch(true).ok, false);
  assert.equal(sim.sellCatch().ok, false, 'trade requires returning to the shop');
  shop(sim);
  assert.deepEqual(sim.sellCatch().count, 1);
  assert.equal(sim.state.credits, 120 + fishValue);
  assert.equal(sim.sellCatch().total, 0);
  assert.equal(sim.state.credits, 120 + fishValue);
  assert.ok(sim.buy('sealed_reel').ok);
  assert.equal(sim.state.credits, 10 + fishValue);
  assert.equal(sim.state.stats.caught, 1);
  assert.equal(sim.state.stats.sold, 1);
});

test('release earns no money and spends bait once, with no duplicate catch decision', () => {
  const sim = new PacificaSimulation({rng: () => .95});
  toSurf(sim); hook(sim); land(sim);
  assert.ok(sim.resolveCatch(false).ok);
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.state.credits, 120);
  assert.equal(sim.state.stats.released, 1);
  assert.equal(sim.resolveCatch(false).ok, false);
  assert.equal(sim.state.stats.released, 1);
  assert.equal(sim.state.lastCatch.kept, false);
});

test('casting is charged and aimed, while a fitted surf rod extends physical reach', () => {
  const sim = new PacificaSimulation({rng: () => 0});
  toSurf(sim);
  assert.ok(sim.cast({power: .1, aim: -.25}).ok);
  const short = {...sim.state.cast.target};
  const shortDistance=sim.state.cast.distance;
  assert.ok(shortDistance>0 && shortDistance<10,'a light cast clears the restored shore setback');
  assert.ok(short.x < sim.state.player.x);
  assert.ok(short.y < WORLD.shoreY(short.x));
  assert.ok(sim.retrieve().ok);finishShoreRetrieve(sim);
  assert.ok(sim.cast({power: 1, aim: 1}).ok);
  const starterDistance=sim.state.cast.distance;
  assert.ok(starterDistance>shortDistance*3);
  assert.ok(starterDistance<50,'the starter outfit cannot throw old 72 m casts');
  assert.ok(sim.state.cast.target.x > sim.state.player.x);
  sim.retrieve();finishShoreRetrieve(sim); shop(sim); sim.buy('surf_rod');
  assert.equal(sim.state.activeRod,'starter_rod');
  sim.configureEquipment('carolina_rig','surf_rod');sim.configureEquipment('sandcrab','surf_rod');sim.configureEquipment('surf_rod');toSurf(sim);
  assert.ok(sim.cast({power: 1, aim: 1}).ok);
  assert.ok(sim.state.cast.distance>starterDistance*1.2,'equipped surf rod improves the same cast');
  assert.ok(sim.state.cast.distance<80,'surf rod remains below the former 94 m baseline');
});

test('bite window, early strike and retrieval are real-time and recover safely', () => {
  const sim = new PacificaSimulation({rng: () => .0001});
  toSurf(sim); sim.cast({power: .5});
  finishShoreFlight(sim);
  assert.equal(sim.state.phase, 'waiting');
  assert.equal(sim.strike().ok, false);
  advance(sim, .5);
  assert.equal(sim.state.phase, 'waiting');
  schoolAtBait(sim, 'surfperch');
  awaitBite(sim);
  assert.ok(sim.state.biteRemaining > 3);
  advance(sim, 3.3);
  assert.equal(sim.state.phase, 'waiting');
  assert.equal(sim.state.stats.missed, 1);
  finishShoreRetrieve(sim);
  assert.equal(sim.strike().ok, false);
  sim.cast({power: .2});
  assert.ok(sim.retrieve().ok);
  assert.equal(sim.state.phase, 'casting');
  finishShoreRetrieve(sim);
  assert.equal(sim.state.phase, 'walk');
  assert.equal(sim.state.inventory.sandcrab, 12);
  assert.equal(sim.retrieve().ok, false);
});

test('locked drag and hard reeling can break the line, while prolonged slack loses the fish', () => {
  for (const reel of [true, false]) {
    const sim = new PacificaSimulation({rng: () => .1});
    toSurf(sim); hook(sim);
    until(sim, () => sim.state.phase === 'walk', 30, {reel,drag:1,reelSpeed:1,rodLift:1});
    assert.equal(sim.state.rodSupplies[sim.state.activeRod]===null,reel,'only a snapped line loses the whole rig');
    assert.equal(sim.state.stats.caught, 0);
    assert.equal(sim.state.catches.length, 0);
    assert.equal(sim.state.credits, 120);
  }
});

test('shop purchases remain in the bag, bait changes consume stock and no free fallback exists', () => {
  const sim=new PacificaSimulation();
  assert.ok(sim.buy('squid').ok);assert.ok(sim.equipBait('squid').ok);
  assert.equal(sim.state.inventory.squid,7);
  assert.ok(sim.buy('fishfinder_rig').ok);assert.equal(sim.state.rig,'carolina');
  assert.ok(sim.configureEquipment('fishfinder_rig').ok);assert.equal(sim.state.rig,'fishfinder');
  assert.equal(sim.state.rigStock.carolina_rig.at(-1).bait.kind,'squid');
  sim.state.inventory={sandcrab:0,squid:0,anchovy:0};
  assert.equal(sim.buy('beach_bait').ok,false);
  assert.equal(SHOP_ITEMS.some(i=>i.kind==='free'||i.price===0),false);
});

test('save restores settled catch and upgrades, with independent copies and validated data', () => {
  const sim = new PacificaSimulation({rng: () => .15});
  sim.buy('surf_rod'); toSurf(sim); hook(sim); land(sim); sim.resolveCatch(true);
  const saved = sim.snapshot(), restored = new PacificaSimulation({saved});
  assert.equal(saved.scene, 'pacifica');
  assert.equal(restored.state.credits, sim.state.credits);
  assert.deepEqual(restored.state.catches, sim.state.catches);
  assert.deepEqual(restored.state.upgrades, ['surf_rod']);
  saved.catches[0].value = 999999;
  assert.notEqual(restored.state.catches[0].value, 999999);
  saved.catches.push({...saved.catches[0]});
  saved.catches.push({id: 'unknown', value: 9000, weightKg: 4});
  saved.upgrades.push('money_printer');
  saved.inventory = {sandcrab: -99, squid: Infinity, anchovy: '999'};
  saved.credits = NaN; saved.player = {x: -400, y: 100};
  const validated = new PacificaSimulation({saved});
  assert.equal(validated.state.catches.length, 1);
  assert.notEqual(validated.state.catches[0].value, 999999);
  assert.deepEqual(validated.state.upgrades, ['surf_rod']);
  assert.deepEqual(validated.state.inventory, {sandcrab: 0, squid: 0, anchovy: 0, sandworm: 0, mussel: 0});
  assert.equal(validated.state.credits, 120);
  assert.deepEqual([validated.state.player.x, validated.state.player.y], Object.values(shoreArrivalPosition(validated.scene)));
  const otherScene = new PacificaSimulation({saved: {...saved, scene: 'santa-cruz'}});
  assert.equal(otherScene.state.catches.length, 0);
  assert.equal(otherScene.state.inventory.sandcrab, 12);
});

test('pending landed catch survives reload once; deployed lines resume safely on sand', () => {
  const sim = new PacificaSimulation({rng: () => .15});
  toSurf(sim); hook(sim);
  const fighting = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(fighting.state.phase, 'walk');
  assert.equal(fighting.state.inventory.sandcrab, 12);
  land(sim);
  const restored = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(restored.state.phase, 'landed');
  assert.ok(restored.resolveCatch(true).ok);
  assert.equal(restored.resolveCatch(true).ok, false);
  const again = new PacificaSimulation({saved: restored.snapshot()});
  assert.equal(again.state.phase, 'walk');
  assert.equal(again.state.catches.length, 1);
  assert.equal(again.state.stats.caught, 1);
});
