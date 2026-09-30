import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {placeSchool,resolveBite} from '../dist/fish-population.js';
import {REGULAR,REGULAR_SPOTS,REGULAR_TIPS} from '../dist/shore-regular.js';
import {SHORE_POPULATION_SPECIES} from '../dist/shore-fish-ecology.js';
import {nearbyShoreInteraction} from '../dist/shore-interactions.js';

const dates = Array.from({length: 40}, (_, i) => new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10));
const sim = (date, extra = {}) => new PacificaSimulation({date, loreSeed: 5, seaState: {waveHeightM: .9, wavePeriodS: 11}, ...extra});
const run = (s, seconds, until = () => false) => {for (let t = 0; t < seconds && !until(); t += .1) s.update(.1);};
// First date he turns up, with the player standing next to his spot.
function atHisSpot() {
  for (const date of dates) {
    const s = sim(date);run(s, .1);const r = s.state.regular;
    if (!r.present) continue;
    const spot = REGULAR_SPOTS[r.spot];Object.assign(s.state.player, {x: spot.x - 40, y: s.world.shoreY(spot.x - 40) + 30});
    run(s, 200, () => r.mode === 'soaking');
    return s;
  }
  throw new Error('no present day');
}

test('空军大队长 is a Sharp Park regular: most days, never at Half Moon Bay', () => {
  const present = dates.filter(date => {const s = sim(date);run(s, .1);return s.state.regular.present;}).length;
  assert.ok(present >= 28 && present < 40, `${present} of 40 days`);
  assert.equal(new PacificaSimulation({sceneId: 'half-moon-bay', date: dates[0]}).state.regular, null);
  const s = atHisSpot(), r = s.state.regular;
  assert.equal(r.mode, 'soaking');assert.ok(r.bait && r.bait.y < s.world.shoreY(r.bait.x), 'his bait is in the water');
  assert.equal(s.state.phase, 'walk', 'the player is not fishing');
});

test('the population can serve several baits: his bites are his, the player keeps theirs', () => {
  const s = atHisSpot(), r = s.state.regular, w = s.fishWorld();
  assert.equal(w.stimuli.length, 1);assert.equal(w.stimuli[0].side, true);
  const bait = s.toPlane(r.bait.x, r.bait.y);
  placeSchool(s.population, w, 'surfperch', bait.x + .6, bait.y, {hunger: 1, count: 12});
  run(s, 300, () => r.mode === 'bite');
  assert.equal(r.mode, 'bite');assert.equal(r.bite.population, true, 'the bite came from a simulated school');
  const bite = s.population.sideBites[r.bite.id], group = s.population.groups.find(g => g.id === bite.group), before = group.count;
  assert.equal(s.population.pendingBite, null, 'no bite was routed to the player');
  run(s, 10, () => r.mode !== 'bite');
  assert.equal(s.population.sideBites[bite.id], undefined, 'resolved');
  if (r.mode === 'fighting') assert.equal(group.count, before - 1, 'the hooked fish left its school');
  assert.equal(s.state.phase, 'walk');
  // resolveBite by id leaves other baits alone.
  s.population.sideBites = {'regular:x': {group: -1, species: 'surfperch', lengthCm: 20}};s.population.pendingBite = {group: -2};
  resolveBite(s.population, 'refused', SHORE_POPULATION_SPECIES, 'regular:x');
  assert.deepEqual(s.population.sideBites, {});assert.deepEqual(s.population.pendingBite, {group: -2});
});

test('he keeps only legal striped bass (18 in, 2 a day) and releases the rest', () => {
  const s = atHisSpot(), r = s.state.regular;
  const land = (species, lengthCm) => {
    Object.assign(r, {mode: 'fighting', timer: 0, bait: null, fight: {species, lengthCm, elapsed: 0, duration: 1, from: {x: r.x, y: r.y - 100}, lost: false}});
    run(s, .2);return r.catches.at(-1);
  };
  assert.equal(land('striped_bass', 40).kept, false, 'under 18 in');
  assert.equal(land('surfperch', 30).kept, false, 'not what he is after');
  assert.equal(land('striped_bass', 60).kept, true);assert.equal(land('striped_bass', 70).kept, true);
  assert.equal(land('striped_bass', 75).kept, false, 'third bass is over the bag');
});

test('talking to him gives tips into the notebook, free bait when out, and a rig when none are left', () => {
  const s = atHisSpot(), r = s.state.regular;
  Object.assign(s.state.player, {x: r.x + 30, y: r.y + 10});
  assert.equal(nearbyShoreInteraction(s.scene, s.state)?.kind, 'regular');
  s.state.inventory = {sandcrab: 0, squid: 0, anchovy: 0, sandworm: 0, mussel: 0};
  for (const id of Object.keys(s.state.rodSupplies)) s.state.rodSupplies[id] = null;
  for (const id of Object.keys(s.state.rigStock)) s.state.rigStock[id] = [];
  const first = s.talkRegular();
  assert.equal(first.ok, true);assert.equal(first.name, REGULAR.name);
  assert.ok(first.tip && REGULAR_TIPS.some(t => t.text === first.tip.text));
  assert.deepEqual(first.gifts.map(g => g.kind).sort(), ['bait', 'gear']);
  assert.equal(s.state.inventory.sandcrab, 6);assert.equal(s.state.rigStock.carolina_rig.length, 2);
  const more = s.talkRegular({more: true});
  assert.notEqual(more.tip.text, first.tip.text, 'a different tip');
  assert.equal(more.gifts.length, 0, 'gifts once a day');
  assert.equal(s.talkRegular().gifts.length, 0);
  const notes = s.state.shoreLore.notes.filter(n => n.topic === 'regular');
  assert.ok(notes.length >= 2 && notes.every(n => n.angler === 3));
  // Tips, today's catches and gift days survive a reload; he is back at his spot.
  const restored = new PacificaSimulation({saved: s.snapshot(), date: s.state.fishingDate});
  assert.deepEqual(restored.state.regular.tips, r.tips);
  assert.equal(restored.state.shoreLore.notes.filter(n => n.topic === 'regular').length, notes.length);
  assert.equal(restored.state.regular.mode, 'rigging');
});
