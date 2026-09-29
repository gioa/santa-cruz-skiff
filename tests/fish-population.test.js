import test from 'node:test';
import assert from 'node:assert/strict';
import {createPopulation,stepPopulation,resolveBite,disturb,scentAt,placeSchool,serializePopulation,restorePopulation} from '../dist/fish-population.js';

// A flat 6 m sand plain with a 20 m-wide band of good habitat along y = 30.
const species = [{id: 'perch', school: [6, 6], density: 60, cruise: .3, burst: 1.5, smell: .9, sight: 2, sightDrive: .5, wariness: .6,
  patience: 25, biteRate: .8, lengthCm: [20, 30], cohortSd: .05, probeMeters: 5,
  preferredDepth: b => b - .3, verticalReach: () => 1}];
const world = (extra = {}) => ({species, center: {x: 0, y: 30}, radius: 90, cellSize: 4,
  env: (x, y) => y > 0 ? {water: true, depth: 6, currentX: .15, currentY: 0} : {water: false, depth: 0},
  suitability: (def, x, y) => y > 0 ? Math.exp(-.5 * ((y - 30) / 10) ** 2) : 0,
  feeding: () => .9, light: 1, ...extra});
const bait = (extra = {}) => ({id: 1, x: 0, y: 30, depth: 5.8, scent: .8, flash: .1, motion: 0, soakSeconds: 120, currentX: .15, currentY: 0, appeal: () => 1, ...extra});
const run = (pop, w, seconds) => { const events = []; for (let t = 0; t < seconds; t += .5) events.push(...stepPopulation(pop, .5, w)); return events; };

test('schools spawn in proportion to habitat and gather in the good band, not uniformly', () => {
  const pop = createPopulation(7); run(pop, world(), 120);
  assert.ok(pop.groups.length >= 3, `expected several schools, got ${pop.groups.length}`);
  const inBand = pop.groups.filter(g => Math.abs(g.y - 30) < 15).length;
  assert.ok(inBand / pop.groups.length > .6, 'most schools hold in the preferred band');
  assert.ok(pop.groups.every(g => g.y > 0), 'no fish on land');
});

test('scent travels downstream with the current and grows with soak time', () => {
  const s = bait({soakSeconds: 200});
  assert.ok(scentAt(s, 15, 30) > scentAt(s, -15, 30) * 4, 'downstream smells far more than upstream');
  assert.ok(scentAt(bait({soakSeconds: 200}), 20, 30) > scentAt(bait({soakSeconds: 10}), 20, 30), 'a longer soak carries scent further');
  assert.equal(scentAt(bait({scent: 0}), 1, 30), 0, 'no scent without natural bait');
});

test('a hungry school beside a good bait bites; the same school ignores an unappealing one', () => {
  const good = createPopulation(3), w = world({stimulus: bait()});
  good.center = {x: 0, y: 30}; placeSchool(good, w, 'perch', .5, 30, {hunger: 1});
  good.groups = good.groups.slice(-1);
  const events = run(good, {...w, suitability: () => 0}, 60);
  const bite = events.find(e => e.type === 'bite');
  assert.ok(bite, 'a good presentation is taken');
  assert.ok(bite.lengthCm >= 18 && bite.lengthCm <= 31.5, 'the biter comes from the school cohort');
  const poor = createPopulation(3), wp = world({stimulus: bait({appeal: () => .05})});
  poor.center = {x: 0, y: 30}; placeSchool(poor, wp, 'perch', .5, 30, {hunger: 1}); poor.groups = poor.groups.slice(-1);
  assert.equal(run(poor, {...wp, suitability: () => 0}, 60).filter(e => e.type === 'bite').length, 0, 'fish inspect and leave a bad bait');
});

test('fish out of reach of the bait depth never bite it', () => {
  const pop = createPopulation(5), w = world({stimulus: bait({depth: 1})});
  pop.center = {x: 0, y: 30}; placeSchool(pop, w, 'perch', .5, 30, {hunger: 1}); pop.groups = pop.groups.slice(-1);
  assert.equal(run(pop, {...w, suitability: () => 0}, 90).filter(e => e.type === 'bite').length, 0);
});

test('only one bite is pending at a time; hooking removes the fish and alarms a wary school', () => {
  const pop = createPopulation(11), w = world({stimulus: bait()});
  pop.center = {x: 0, y: 30}; const g = placeSchool(pop, w, 'perch', .5, 30, {hunger: 1}); pop.groups = [g];
  const events = run(pop, {...w, suitability: () => 0}, 60);
  assert.equal(events.filter(e => e.type === 'bite').length, 1);
  assert.ok(pop.pendingBite);
  resolveBite(pop, 'hooked', species);
  assert.equal(g.count, 5);
  assert.ok(g.alarm > .4);
  assert.equal(pop.pendingBite, null);
});

test('a splash spooks nearby wary fish into fleeing', () => {
  const pop = createPopulation(2), w = world();
  pop.center = {x: 0, y: 30}; const g = placeSchool(pop, w, 'perch', 1, 30); pop.groups = [g];
  disturb(pop, {x: 0, y: 30, radius: 4, strength: .9}, species);
  assert.equal(g.mode, 'flee');
  const before = Math.hypot(g.x, g.y - 30);
  run(pop, {...w, suitability: () => 0}, 2);
  assert.ok(Math.hypot(g.x, g.y - 30) > before + 1);
});

test('populations are deterministic and survive serialisation exactly', () => {
  const a = createPopulation(99), b = createPopulation(99);
  run(a, world({stimulus: bait()}), 90); run(b, world({stimulus: bait()}), 90);
  assert.deepEqual(serializePopulation(a), serializePopulation(b));
  const restored = restorePopulation(JSON.parse(JSON.stringify(serializePopulation(a))), 1, ['perch']);
  assert.deepEqual(serializePopulation(restored).groups, serializePopulation(a).groups);
  assert.equal(restorePopulation({version: 1, groups: [{species: 'shark', x: 0, y: 0, depth: 1, heading: 0, count: 3, lengthCm: 30, hunger: 1}]}, 1, ['perch']).groups.length, 0);
});
