import {placeSchool} from '../../dist/fish-population.js';
import {depthAt} from '../../dist/bathymetry.js';

// Put a hungry school at the lowered rig. The fish still have to sense, inspect
// and take the bait through the population model; nothing forces a bite state
// or chooses a size. The rig is first allowed to settle. Without a species, the
// one best suited to this spot, this presentation and this depth is used.
export function schoolAtLure(sim, species = null, overrides = {}) {
  let still = 0;
  for (let t = 0; t < 120 && still < 1.5; t += .1) {
    sim.step(.1);
    still = sim.state.fishState === 'waiting' && sim.fishWorld().stimulus && Math.abs(sim.state.lureVerticalSpeedMps || 0) < .02 ? still + .1 : 0;
  }
  const s = sim.state, world = sim.fishWorld(), stimulus = world.stimulus, p = s.bobber || {x: s.boatX, z: s.boatZ};
  if (!species) {
    const bottom = depthAt(p.x, p.z);
    const reach = def => !stimulus || Math.abs(def.preferredDepth(bottom) - stimulus.depth) <= def.verticalReach(bottom);
    const score = def => reach(def) ? world.suitability(def, p.x, p.z) * (stimulus ? stimulus.appeal(def) : 1) : 0;
    species = world.species.filter(d => d.density >= 1).reduce((best, def) => score(def) > score(best) ? def : best).id;
  }
  sim.population.groups = [];
  sim.population.center = {...world.center};
  return placeSchool(sim.population, world, species, p.x + .4, p.z, {hunger: 1, count: 20, ...overrides});
}
