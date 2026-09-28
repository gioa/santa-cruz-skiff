import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation, WORLD, SHOP, SAVE_KEY, SHOP_ITEMS} from '../dist/pacifica-sim.js';

const advance = (sim, seconds, input = {}) => {
  for (let t = 0; t < seconds - 1e-7; t += .05) sim.update(Math.min(.05, seconds - t), typeof input === 'function' ? input(sim.state) : input);
};
const until = (sim, predicate, seconds = 180, input = {}) => {
  for (let t = 0; t < seconds && !predicate(); t += .05) sim.update(.05, typeof input === 'function' ? input(sim.state) : input);
  assert.ok(predicate(), `timed out: ${sim.state.phase} / ${sim.state.message}`);
};
const toSurf = sim => {
  assert.ok(sim.walkTo(730, WORLD.shoreY(730) + 55).ok);
  until(sim, () => sim.state.walkTarget === null, 20);
  assert.ok(sim.canCast);
};
const hook = sim => {
  assert.ok(sim.cast({power: .62, aim: -.2}).ok);
  until(sim, () => sim.state.phase === 'bite', 40);
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
  assert.ok(sim.walkTo(SHOP.door.x, SHOP.door.y + 15).ok);
  until(sim, () => sim.state.walkTarget === null, 20);
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
  assert.ok(sim.walkTo(1100, WORLD.shoreY(1100) + 30).ok);
  let observedDetour = false;
  until(sim, () => !sim.state.walkTarget, 20, s => {
    const {x, y} = s.player;
    assert.equal(x > SHOP.x - 18 && x < SHOP.x + SHOP.width + 18 && y > SHOP.y - 18 && y < SHOP.y + SHOP.height + 18, false);
    if (x < SHOP.x - 18) observedDetour = true;
    return {};
  });
  assert.ok(observedDetour, 'path must detour around the building');
  advance(sim, 20, {x: -1, y: -1});
  assert.ok(sim.state.player.x >= 20);
  assert.ok(sim.state.player.y >= WORLD.shoreY(sim.state.player.x) + 19.99);
  advance(sim, 20, {x: 1, y: 1});
  assert.ok(sim.state.player.x <= WORLD.width - 20);
  assert.ok(sim.state.player.y <= WORLD.height - 25);
  assert.equal(sim.walkTo(SHOP.x + 30, SHOP.y + 40).ok, false);
  assert.equal(sim.walkTo(NaN, Infinity).ok, false);
});

test('a full earned catch, walk back, trade and upgrade cannot reward the same fish twice', () => {
  const sim = new PacificaSimulation({rng: () => .15});
  toSurf(sim);
  assert.equal(sim.buy('squid').ok, false);
  hook(sim);
  assert.equal(sim.state.inventory.sandcrab, 11);
  assert.equal(sim.walkTo(800, 800).ok, false);
  land(sim);
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

test('casting is charged and aimed, while rod upgrades extend actual offshore reach', () => {
  const sim = new PacificaSimulation({rng: () => 0});
  toSurf(sim);
  sim.cast({power: 0, aim: -1});
  const short = {...sim.state.cast.target};
  assert.equal(sim.state.cast.distance, 18);
  assert.ok(short.x < sim.state.player.x);
  assert.ok(short.y < WORLD.shoreY(short.x));
  assert.ok(sim.retrieve().ok);
  sim.cast({power: 1, aim: 1});
  assert.equal(sim.state.cast.distance, 72);
  assert.ok(sim.state.cast.target.x > sim.state.player.x);
  sim.retrieve(); shop(sim); sim.buy('surf_rod'); toSurf(sim);
  sim.cast({power: 1, aim: 0});
  assert.equal(sim.state.cast.distance, 94);
});

test('bite window, early strike and retrieval are real-time and recover safely', () => {
  const sim = new PacificaSimulation({rng: () => 0});
  toSurf(sim); sim.cast({power: .5});
  advance(sim, 1.1);
  assert.equal(sim.state.phase, 'waiting');
  assert.equal(sim.strike().ok, false);
  advance(sim, 9);
  assert.equal(sim.state.phase, 'waiting');
  until(sim, () => sim.state.phase === 'bite', 10);
  assert.ok(sim.state.biteRemaining > 3);
  advance(sim, 3.3);
  assert.equal(sim.state.phase, 'walk');
  assert.equal(sim.state.stats.missed, 1);
  assert.equal(sim.strike().ok, false);
  sim.cast({power: .2});
  assert.ok(sim.retrieve().ok);
  assert.equal(sim.state.phase, 'walk');
  assert.equal(sim.state.inventory.sandcrab, 10);
  assert.equal(sim.retrieve().ok, false);
});

test('holding reel continuously breaks the line, while prolonged slack loses the fish', () => {
  for (const reel of [true, false]) {
    const sim = new PacificaSimulation({rng: () => .1});
    toSurf(sim); hook(sim);
    until(sim, () => sim.state.phase === 'walk', 30, {reel});
    assert.equal(sim.state.stats.caught, 0);
    assert.equal(sim.state.catches.length, 0);
    assert.equal(sim.state.credits, 120);
  }
});

test('shop bait selection, rig upgrade and free fallback prevent a bait softlock', () => {
  const sim = new PacificaSimulation({rng: () => 0});
  assert.ok(sim.buy('squid').ok);
  assert.ok(sim.equipBait('squid').ok);
  assert.equal(sim.state.inventory.squid, 8);
  assert.equal(sim.state.credits, 100);
  assert.ok(sim.buy('fishfinder_rig').ok);
  assert.equal(sim.state.rig, 'fishfinder');
  assert.equal(sim.buy('beach_bait').ok, false);
  toSurf(sim);
  for (const bait of ['squid', 'sandcrab']) {
    sim.equipBait(bait);
    while (sim.state.inventory[bait]) {assert.ok(sim.cast({power: 0}).ok); sim.retrieve();}
  }
  assert.equal(sim.canCast, false);
  shop(sim);
  const credits = sim.state.credits;
  assert.ok(sim.buy('beach_bait').ok);
  assert.equal(sim.state.inventory.sandcrab, 3);
  assert.equal(sim.state.bait, 'sandcrab');
  assert.equal(sim.state.credits, credits);
  assert.equal(sim.buy('beach_bait').ok, false);
  assert.equal(SHOP_ITEMS.find(item => item.id === 'beach_bait').price, 0);
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
  assert.deepEqual(validated.state.inventory, {sandcrab: 0, squid: 0, anchovy: 0});
  assert.equal(validated.state.credits, 120);
  assert.deepEqual([validated.state.player.x, validated.state.player.y], [1100, 865]);
  const otherScene = new PacificaSimulation({saved: {...saved, scene: 'santa-cruz'}});
  assert.equal(otherScene.state.catches.length, 0);
  assert.equal(otherScene.state.inventory.sandcrab, 12);
});

test('pending landed catch survives reload once; deployed lines resume safely on sand', () => {
  const sim = new PacificaSimulation({rng: () => .15});
  toSurf(sim); hook(sim);
  const fighting = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(fighting.state.phase, 'walk');
  assert.equal(fighting.state.inventory.sandcrab, 11);
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
