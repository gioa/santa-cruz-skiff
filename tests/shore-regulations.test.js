import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation,SPECIES,fishWeightKg,WARDEN_RULES} from '../dist/pacifica-sim.js';
import {assessShoreCatch,SHORE_RULES,FINE_PER_FISH} from '../dist/shore-regulations.js';
import {BOOK_SPECIES,bookArea} from '../dist/regulations-book.js';
import {castToOffshore,finishShoreFlight} from './helpers/shore-cast.js';
import {schoolAtBait,awaitBite} from './helpers/shore-fish.js';
import {shoreProfile} from '../dist/shore-data.js';

const fish = (id, lengthCm, catchId, extra = {}) => {
  const sp = SPECIES.find(s => s.id === id);
  return {id, speciesId: sp.speciesId, name: sp.name, nameEn: sp.nameEn, catchId, length: lengthCm, weightKg: fishWeightKg(sp, lengthCm), caughtDate: '2026-09-28', ...extra};
};
const log = catches => catches.map(f => ({catchId: f.catchId, species: f.id, date: f.caughtDate}));

test('every shore fish has a length; weight follows a length–weight relation', () => {
  for (const sp of SPECIES) {
    assert.ok(sp.lengthCm[0] > 0 && sp.lengthCm[1] > sp.lengthCm[0]);
    assert.ok(fishWeightKg(sp, sp.lengthCm[1]) > fishWeightKg(sp, sp.lengthCm[0]) * 8, 'weight grows ~ L³');
  }
  // Old saves stored weight only: their length stays unrecorded (never invented),
  // so the warden cannot fault it on size.
  const sim = new PacificaSimulation({saved: {scene: 'pacifica', version: 3, catches: [{id: 'halibut', catchId: 4, weightKg: 2.4}]}});
  assert.equal(sim.state.catches[0].length, undefined);
  assert.equal(assessShoreCatch(sim.state.catches, []).findings.length, 0);
});

test('shore rules match the handbook: halibut 22 in, striped bass 18 in and 2/day, jacksmelt unlimited', () => {
  const sc = bookArea('pacifica'), page = id => BOOK_SPECIES.find(s => s.id === id);
  assert.ok(Math.abs(SHORE_RULES.halibut.minimumCm - 55.88) < .01); assert.match(page('california_halibut').size(sc), /22 in/);
  assert.ok(Math.abs(SHORE_RULES.striped_bass.minimumCm - 45.72) < .01); assert.match(page('striped_bass').size(sc), /18 in/);
  assert.equal(SHORE_RULES.striped_bass.speciesBag, 2); assert.equal(SHORE_RULES.jacksmelt.unlimited, true);
  const legal = [fish('halibut', 60, 1), fish('striped_bass', 50, 2), fish('surfperch', 20, 3), fish('jacksmelt', 25, 4)];
  assert.equal(assessShoreCatch(legal, log(legal)).findings.length, 0);
  const shortHalibut = [fish('halibut', 50, 1)], r = assessShoreCatch(shortHalibut, log(shortHalibut));
  assert.equal(r.findings[0].code, 'undersize'); assert.equal(r.fine, FINE_PER_FISH);
  const bass = [fish('striped_bass', 50, 1), fish('striped_bass', 52, 2), fish('striped_bass', 55, 3)];
  assert.deepEqual(assessShoreCatch(bass, log(bass)).findings.map(f => f.catchId), [3], 'only the third bass is over the bag');
  const smelt = Array.from({length: 30}, (_, i) => fish('jacksmelt', 25, i + 1));
  assert.equal(assessShoreCatch(smelt, log(smelt)).findings.length, 0, 'jacksmelt have no limit and do not count toward the 20');
});

test('the daily bag counts fish already sold today; a new day starts fresh', () => {
  const sold = [fish('halibut', 60, 1), fish('halibut', 61, 2)], carried = [fish('halibut', 62, 3)];
  assert.equal(assessShoreCatch(carried, log([...sold, ...carried])).findings[0].code, 'daily_species_bag');
  const tomorrow = [fish('halibut', 62, 3, {caughtDate: '2026-09-29'})];
  assert.equal(assessShoreCatch(tomorrow, log([...sold, ...tomorrow])).findings.length, 0);
});

test('a real shore catch records length, shows it, and a warden check fines an undersize keeper', () => {
  const sim = new PacificaSimulation({rng: () => .5, date: '2026-09-28'});
  const x = 1100; Object.assign(sim.state.player, {x, y: sim.world.shoreY(x) + 25});
  castToOffshore(sim, shoreProfile(sim.scene, x, 0).troughDistance); finishShoreFlight(sim);
  schoolAtBait(sim, 'surfperch', {lengthCm: 26}); awaitBite(sim);
  assert.ok(sim.strike().ok);
  for (let t = 0; t < 60 && sim.state.phase === 'fighting'; t += .05) sim.update(.05, {reel: sim.state.tension < .7});
  assert.equal(sim.state.phase, 'landed');
  assert.ok(sim.state.fish.length > 15 && sim.state.fish.length < 40);
  assert.match(sim.state.message, / in · .* lb/);
  assert.ok(sim.resolveCatch(true).ok);
  assert.equal(sim.state.keptLog.length, 1);
  // Add an undersize halibut that was kept earlier today, then let the warden walk up.
  sim.state.catches.push(fish('halibut', 45, 99)); sim.state.keptLog.push({catchId: 99, species: 'halibut', date: '2026-09-28'});
  sim.state.wardenNextAt = sim.state.elapsed;
  for (let t = 0; t < 60 && !sim.state.inspection; t += .1) sim.update(.1);
  assert.ok(sim.state.inspection, 'the warden reaches the angler');
  assert.equal(sim.state.inspection.kind, 'beach');
  assert.equal(sim.state.inspection.fine, FINE_PER_FISH);
  assert.equal(sim.state.catches.length, 0, 'the whole carried catch is confiscated');
  assert.equal(sim.state.credits, 120 - FINE_PER_FISH);
  assert.match(sim.state.inspection.findings[0].detail, /17\.7 in；最低允许 22 in/);
  const restored = new PacificaSimulation({sceneId: 'pacifica', saved: sim.snapshot()});
  assert.equal(restored.state.inspection.kind, 'beach');
  assert.equal(restored.state.credits, 120 - FINE_PER_FISH, 'reload does not charge twice');
});

test('a legal bag passes the warden with a friendly word and no dialog', () => {
  const sim = new PacificaSimulation({rng: () => .5, sceneId: 'half-moon-bay'});
  sim.state.catches = [fish('surfperch', 24, 1)]; sim.state.keptLog = log(sim.state.catches);
  sim.state.wardenNextAt = 0;
  for (let t = 0; t < 60 && !/鱼警/.test(sim.state.message); t += .1) sim.update(.1);
  assert.match(sim.state.message, /合规/);
  assert.equal(sim.state.inspection, null);
  assert.equal(sim.state.catches.length, 1);
  assert.ok(WARDEN_RULES.between[0] >= 300, 'wardens are occasional');
});
