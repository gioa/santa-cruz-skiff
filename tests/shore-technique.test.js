import test from 'node:test';
import assert from 'node:assert/strict';
import {playStrategy,STRATEGIES} from '../scripts/calibrate-shore-population.mjs';

// No fixed bite chance: outcomes emerge from where and how the angler fishes.
// These compare strategies over the same 16 seeds (same fish, same sea).
const SEEDS = Array.from({length: 16}, (_, i) => 1000 + i * 7919);
const strategy = id => STRATEGIES.find(s => s.id === id);
const within = (results, seconds) => results.filter(r => r.time !== null && r.time <= seconds).length;
const play = (scene, id) => SEEDS.map(seed => playStrategy(scene, strategy(id), seed));

test('soaking a well-placed bait beats recasting it every 20 seconds', () => {
  const soak = play('pacifica', 'trough · crab · Carolina · soak'), recast = play('pacifica', 'trough · crab · Carolina · recast 20 s');
  assert.ok(within(soak, 180) > within(recast, 180), `${within(soak, 180)} vs ${within(recast, 180)}`);
  assert.ok(within(soak, 600) >= 12, 'good technique usually finds fish within ten minutes');
});

test('the right hook and a trough beat an oversized hook or a maximum-range cast', () => {
  const right = play('pacifica', 'trough · crab · Carolina · soak');
  const bigHook = play('pacifica', 'trough · crab · fish-finder (big hook)');
  const far = play('pacifica', 'max range · crab · Carolina');
  assert.ok(within(right, 180) > within(bigHook, 180));
  assert.ok(within(right, 600) > within(far, 600) + 4);
});

test('bait and rig decide which fish bite: floats find upper-water fish, bar-gap anchovy finds bigger fish', () => {
  const float = play('pacifica', 'trough · squid · float').filter(r => r.species);
  assert.ok(float.length >= 10 && float.every(r => ['jacksmelt', 'walleye_surfperch', 'silver_surfperch'].includes(r.species)), 'upper-water fish only');
  assert.ok(float.filter(r => r.species === 'jacksmelt').length >= float.length / 2);
  const gap = play('half-moon-bay', 'bar gap · anchovy · fish-finder').filter(r => r.species);
  assert.ok(gap.some(r => r.species === 'striped_bass' || r.species === 'halibut'));
  assert.ok(!gap.some(r => /surfperch|perch|jacksmelt/.test(r.species)));
});

test('heavy surf shuts down trough fishing at Sharp Park', () => {
  const calm = play('pacifica', 'trough · crab · Carolina · soak'), rough = play('pacifica', 'trough · crab · Carolina · rough sea');
  assert.ok(within(rough, 600) <= 4 && within(calm, 600) >= 12, `${within(rough, 600)} vs ${within(calm, 600)}`);
});
