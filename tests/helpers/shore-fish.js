import assert from 'node:assert/strict';
import {placeSchool} from '../../dist/fish-population.js';

// Put a hungry school of `species` right beside the bait that is already in the
// water. The fish still sense, inspect and decide to bite through the model;
// nothing forces a bite phase or chooses the fish's size directly.
export function schoolAtBait(sim, species, overrides = {}) {
  assert.ok(['waiting', 'casting'].includes(sim.state.phase), 'cast before placing fish');
  const world = sim.fishWorld(), target = sim.toPlane(sim.state.cast.target.x, sim.state.cast.target.y);
  // Remove other fish so the test is about this school only.
  sim.population.groups = [];
  sim.population.center = {...world.center};
  return placeSchool(sim.population, world, species, target.x + .5, target.y, {hunger: 1, count: 12, ...overrides});
}
export function awaitBite(sim, seconds = 60, step = .05) {
  for (let t = 0; t < seconds && sim.state.phase !== 'bite'; t += step) sim.update(step);
  assert.equal(sim.state.phase, 'bite', `no bite: ${sim.state.message}`);
}
