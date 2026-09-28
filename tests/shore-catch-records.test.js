import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation, PIER_RULES, SPECIES} from '../dist/pacifica-sim.js';
import {fishSpecies} from '../dist/fish-species.js';
import {fishMassKg} from '../dist/pixel-fish-mass.js';
import {fishSpriteKind} from '../dist/pixel-fish-art.js';

const legacyFish = (id, catchId, weightKg, extra = {}) => ({id, catchId, weightKg, ...extra});
const restore = (sceneId, saved = {}) => new PacificaSimulation({sceneId, saved: {scene: sceneId, version: 3, credits: 120, ...saved}});
const roundTrip = sim => new PacificaSimulation({sceneId: sim.scene.id, saved: sim.snapshot()});
const historyIds = sim => sim.state.catchHistory.map(fish => fish.catchId);

test('shore encounter IDs keep their tuning while names, scientific identities and art match the shared catalog', () => {
  assert.deepEqual(SPECIES.map(f => f.id), ['surfperch', 'striped_bass', 'halibut']);
  for (const fish of SPECIES) {
    const canonical = fishSpecies(fish);
    assert.equal(fish.speciesId, canonical.id);
    assert.equal(fish.name, canonical.name);
    assert.equal(fish.commonName, canonical.commonName);
    assert.equal(fish.nameEn, canonical.commonName);
    assert.equal(fish.latin, canonical.latin);
    assert.equal(fishSpriteKind(fish), canonical.artKind);
    assert.notEqual(fishSpriteKind(fish), 'unknown');
  }
  assert.equal(SPECIES[2].name, '加州大比目鱼');
  assert.equal(SPECIES[0].latin, 'Amphistichus rhodoterus');
});

for (const sceneId of ['pacifica', 'half-moon-bay']) {
  for (const version of [1, 2, 3]) {
    test(`${sceneId}: version ${version} migrates current catches once without creating lengths or rewards`, () => {
      const halibut = legacyFish('halibut', 4, 2, {name: '加州比目鱼'});
      let sim = restore(sceneId, {version, credits: 73, catches: [halibut, {...halibut}, legacyFish('surfperch', 8, .8)], stats: {caught: 4, kept: 3, sold: 1, released: 1}, nextCatchId: 1});
      assert.equal(sim.snapshot().version, 4);
      assert.deepEqual(historyIds(sim), [4, 8]);
      assert.equal(sim.state.catches.length, 2);
      assert.equal(sim.state.catches[0].name, '加州大比目鱼');
      for (const fish of [...sim.state.catches, ...sim.state.catchHistory]) {
        assert.equal(fish.kg, fish.weightKg);
        assert.equal(Object.hasOwn(fish, 'length'), false);
      }
      const stats = {...sim.state.stats};
      for (let i = 0; i < 3; i++) sim = roundTrip(sim);
      assert.deepEqual(historyIds(sim), [4, 8]);
      assert.equal(sim.state.catches.length, 2);
      assert.equal(sim.state.credits, 73);
      assert.deepEqual(sim.state.stats, stats);
      assert.equal(sim.state.nextCatchId, 9);
      assert.equal(sim.state.lastCatch.catchId, 8);
    });
  }

  test(`${sceneId}: valid saved lengths and canonical-only identities survive migration`, () => {
    const sim = restore(sceneId, {catches: [
      {speciesId: 'california_halibut', catchId: 1, kg: 2, length: 65.4, lengthType: 'total'},
      legacyFish('striped_bass', 2, 2.5, {length: 58, lengthType: 'fork'}),
      legacyFish('surfperch', 3, .9, {kg: 50}),
    ]});
    assert.equal(sim.state.catches[0].id, 'halibut');
    assert.equal(sim.state.catches[0].length, 65.4);
    assert.equal(sim.state.catches[0].kg, 2);
    assert.equal(sim.state.catches[1].lengthType, 'fork');
    assert.equal(sim.state.catches[2].kg, .9, 'legacy weightKg remains authoritative when old fields disagree');
    assert.deepEqual(roundTrip(sim).state.catches, sim.state.catches);
  });

  test(`${sceneId}: released catches remain in history, never occupy the bag or award sale points`, () => {
    let sim = restore(sceneId, {pendingCatch: legacyFish('surfperch', 6, .9), stats: {caught: 1}});
    assert.equal(sim.state.phase, 'landed');
    assert.equal(sim.state.catchHistory.length, 0, 'awaiting a decision is not a resolved catch');
    assert.ok(sim.resolveCatch(false).ok);
    assert.equal(sim.state.catches.length, 0);
    assert.equal(sim.state.credits, 120);
    assert.equal(sim.state.stats.released, 1);
    assert.equal(sim.state.catchHistory[0].status, 'released');
    assert.equal(sim.state.catchHistory[0].kept, false);
    assert.equal(sim.resolveCatch(false).ok, false);
    for (let i = 0; i < 3; i++) sim = roundTrip(sim);
    assert.deepEqual(historyIds(sim), [6]);
    assert.equal(sim.state.lastCatch.status, 'released');
    assert.equal(sim.state.stats.released, 1);
    assert.equal(sim.state.stats.caught, 1);
    Object.assign(sim.state.player, sim.shop.door);
    assert.equal(sim.sellCatch().total, 0);
    assert.equal(sim.state.credits, 120);
  });

  test(`${sceneId}: selling retained fish changes history status, clears only cargo and settles debt once`, () => {
    let sim = restore(sceneId, {pendingCatch: legacyFish('halibut', 5, 2), fineDebt: 20, stats: {caught: 1}});
    assert.ok(sim.resolveCatch(true).ok);
    const fish = {...sim.state.catches[0]}, value = fish.value;
    assert.equal(sim.state.catchHistory[0].status, 'kept');
    assert.equal(sim.state.credits, 120);
    Object.assign(sim.state.player, sim.shop.door);
    const sale = sim.sellCatch();
    assert.equal(sale.count, 1);
    assert.equal(sale.total, value);
    assert.equal(sale.debtPaid, 20);
    assert.equal(sim.state.credits, 120 + value - 20);
    assert.equal(sim.state.catchHistory[0].status, 'sold');
    assert.equal(sim.state.lastCatch.status, 'sold');
    assert.equal(sim.state.catches.length, 0);
    const saved = sim.snapshot();
    saved.catches = [fish]; saved.pendingCatch = fish; saved.nextCatchId = 1;
    sim = new PacificaSimulation({sceneId, saved});
    assert.equal(sim.state.phase, 'walk');
    assert.equal(sim.state.catches.length, 0, 'stale cargo cannot resurrect a sold catch');
    assert.equal(sim.state.nextCatchId, 6);
    assert.equal(sim.sellCatch().total, 0);
    assert.equal(sim.state.credits, 120 + value - 20);
    assert.equal(sim.state.stats.sold, 1);
    assert.deepEqual(historyIds(roundTrip(sim)), [5]);
  });
}

test('new halibut gets length from the shared mass model; other shore species do not invent a length', () => {
  for (const [choice, id, measured] of [[.999, 'halibut', true], [0, 'surfperch', false], [.9, 'striped_bass', false]]) {
    const sim = new PacificaSimulation({rng: () => choice});
    sim.state.phase = 'bite';
    assert.ok(sim.strike().ok);
    const fish = sim.state.fish;
    assert.equal(fish.id, id);
    assert.equal(fish.weightKg, fish.kg);
    if (measured) {
      assert.ok(fish.length > 0);
      assert.equal(fish.lengthType, 'total');
      assert.equal(fish.lengthSource, 'mass-model');
      assert.ok(Math.abs(fishMassKg(fish, fish.length) - fish.kg) <= .02);
      sim.state.phase = 'landed';
      assert.equal(roundTrip(sim).state.fish.length, fish.length);
    } else assert.equal(Object.hasOwn(fish, 'length'), false);
  }
});

test('invalid saved lengths stay unknown rather than becoming a fake ruler measurement', () => {
  const catches = [undefined, null, 0, -1, Infinity, NaN, '50'].map((length, index) => legacyFish('halibut', index + 1, 2, {length}));
  const sim = restore('pacifica', {catches});
  assert.equal(sim.state.catches.length, catches.length);
  for (const fish of sim.state.catches) assert.equal(Object.hasOwn(fish, 'length'), false);
});

test('terminal history deduplicates older entries and prevents retained or pending catch resurrection', () => {
  const fish = legacyFish('halibut', 42, 2);
  const sim = restore('pacifica', {version: 4, nextCatchId: 1, credits: 177, catches: [fish], pendingCatch: fish,
    catchHistory: [{...fish, status: 'kept'}, {...fish, status: 'released'}, {...fish, status: 'kept'}]});
  assert.deepEqual(historyIds(sim), [42]);
  assert.equal(sim.state.catchHistory[0].status, 'released');
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.state.phase, 'walk');
  assert.equal(sim.state.nextCatchId, 43);
  assert.equal(sim.state.credits, 177);
  assert.equal(sim.resolveCatch(true).ok, false);
});

test('a full bag still permits a release and records it without changing capacity', () => {
  const catches = Array.from({length: 20}, (_, i) => legacyFish('surfperch', i + 1, .8));
  const sim = restore('half-moon-bay', {catches, pendingCatch: legacyFish('striped_bass', 21, 2)});
  assert.equal(sim.resolveCatch(true).ok, false);
  assert.equal(sim.state.catchHistory.length, 20);
  assert.ok(sim.resolveCatch(false).ok);
  assert.equal(sim.state.catches.length, 20);
  assert.equal(sim.state.catchHistory.length, 21);
  assert.equal(sim.state.catchHistory.at(-1).status, 'released');
});

test('pier confiscation records every carried fish once and the record survives acknowledging the fine', () => {
  const kept = legacyFish('halibut', 9, 2), released = legacyFish('surfperch', 5, .8);
  let sim = restore('pacifica', {version: 4, catches: [kept], catchHistory: [{...released, status: 'released'}]});
  sim.rng = () => 0;
  sim.state.onPier = true;
  Object.assign(sim.state.player, sim.scene.pier.entry);
  assert.ok(sim.checkPier(PIER_RULES.interval));
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.state.credits, 120 - PIER_RULES.fine);
  assert.deepEqual(sim.state.catchHistory.map(f => f.status), ['released', 'confiscated']);
  const saved = sim.snapshot();
  saved.inspection.confiscated.push({...saved.inspection.confiscated[0]});
  saved.catches = [kept]; saved.pendingCatch = kept;
  sim = new PacificaSimulation({saved});
  assert.equal(sim.state.inspection.confiscated.length, 1);
  assert.deepEqual(historyIds(sim), [5, 9]);
  assert.equal(sim.state.phase, 'walk');
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.state.credits, 40);
  assert.ok(sim.acknowledgeInspection().ok);
  sim = roundTrip(sim);
  assert.equal(sim.state.inspection, null);
  assert.equal(sim.state.lastCatch.status, 'confiscated');
  assert.equal(sim.state.credits, 40);
  assert.deepEqual(historyIds(sim), [5, 9]);
  Object.assign(sim.state.player, sim.shop.door);
  assert.equal(sim.sellCatch().total, 0);
});

test('legacy inspection notices migrate to history without duplicating itemized catches or charging another fine', () => {
  const fish = legacyFish('surfperch', 18, .7);
  const sim = restore('pacifica', {version: 2, credits: 40, catches: [fish], inspection: {id: 1, paid: 80, confiscated: [fish, {...fish}]}});
  assert.equal(sim.state.credits, 40);
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.state.inspection.confiscated.length, 1);
  assert.deepEqual(historyIds(sim), [18]);
  assert.equal(sim.state.catchHistory[0].status, 'confiscated');
  assert.equal(roundTrip(sim).state.catchHistory.length, 1);
});
