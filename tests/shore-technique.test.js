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
  const soak = play('half-moon-bay', 'trough · crab · Carolina · soak'), recast = play('half-moon-bay', 'trough · crab · Carolina · recast 20 s');
  assert.ok(within(soak, 180) > within(recast, 180), `${within(soak, 180)} vs ${within(recast, 180)}`);
  assert.ok(within(soak, 600) >= 12, 'good technique usually finds fish within ten minutes');
});

test('the right hook and a trough beat an oversized hook or a maximum-range cast', () => {
  const right = play('half-moon-bay', 'trough · crab · Carolina · soak');
  const bigHook = play('half-moon-bay', 'trough · crab · fish-finder (big hook)');
  const far = play('half-moon-bay', 'max range · crab · Carolina');
  assert.ok(within(right, 180) > within(bigHook, 180));
  assert.ok(within(right, 600) > within(far, 600) + 4);
});

test('bait and rig decide which fish bite: floats find jacksmelt, bar-gap anchovy finds bigger fish', () => {
  const float = play('pacifica', 'trough · squid · float').filter(r => r.species);
  assert.ok(float.length >= 10 && float.every(r => r.species === 'jacksmelt'));
  const gap = play('half-moon-bay', 'bar gap · anchovy · fish-finder').filter(r => r.species);
  assert.ok(gap.some(r => r.species === 'striped_bass' || r.species === 'halibut'));
  assert.ok(!gap.some(r => r.species === 'surfperch' || r.species === 'jacksmelt'));
});
