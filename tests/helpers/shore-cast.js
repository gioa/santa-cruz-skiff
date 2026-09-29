import assert from 'node:assert/strict';

// Habitat tests choose a real charge through the public trajectory preview.
// They never write the terminal position or invert an obsolete distance formula.
export function powerForOffshore(sim, offshoreDistance, aim = 0) {
  let low = 0, high = 1;
  const shortest = sim.previewCast({power: low, aim});
  const longest = sim.previewCast({power: high, aim});
  assert.ok(offshoreDistance >= shortest.offshoreDistance - 1e-7 && offshoreDistance <= longest.offshoreDistance + 1e-7,
    `Requested ${offshoreDistance.toFixed(2)} m offshore is outside the fitted rod's ${shortest.offshoreDistance.toFixed(2)}–${longest.offshoreDistance.toFixed(2)} m range`);
  for (let i = 0; i < 48; i++) {
    const middle = (low + high) / 2;
    if (sim.previewCast({power: middle, aim}).offshoreDistance < offshoreDistance) low = middle;
    else high = middle;
  }
  const power = (low + high) / 2, plan = sim.previewCast({power, aim});
  assert.equal(plan.landing, 'water', 'habitat fixture must physically reach water');
  assert.ok(Math.abs(plan.offshoreDistance - offshoreDistance) < 1e-6);
  return power;
}

export function castToOffshore(sim, offshoreDistance, aim = 0) {
  const result = sim.cast({power: powerForOffshore(sim, offshoreDistance, aim), aim});
  assert.ok(result.ok, result.message);
  return result;
}

export function finishShoreFlight(sim) {
  const duration = sim.state.cast?.flightDuration;
  assert.ok(Number.isFinite(duration) && duration > 0, 'cast exposes its physical flight time');
  for (let time = 0; sim.state.phase === 'casting' && time < duration + .1; time += .025) sim.update(.025);
  assert.equal(sim.state.phase, 'waiting', 'fixture lands in water before exposure starts');
}
