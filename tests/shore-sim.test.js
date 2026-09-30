import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation, PIER_RULES, SHOP, WORLD} from '../dist/pacifica-sim.js';
import {getShoreScene, sampleShore, shoreProfile, onPier} from '../dist/shore-data.js';
import {castToOffshore, finishShoreFlight} from './helpers/shore-cast.js';
import {schoolAtBait, awaitBite} from './helpers/shore-fish.js';

function advance(sim, seconds, input = {}, frame = .05) {
  for (let t = 0; t < seconds - 1e-8; t += frame) sim.update(Math.min(frame, seconds - t), typeof input === 'function' ? input(sim.state) : input);
}
function until(sim, predicate, limit = 90) {
  for (let t = 0; t < limit && !predicate(); t += .05) sim.update(.05);
  assert.ok(predicate(), sim.state.message);
}
function surfAt(sim, x) {
  Object.assign(sim.state.player, {x, y: sim.world.shoreY(x) + 25});
  sim.refreshSample();
}
function gate(sim) {
  const p = sim.scene.pier;
  assert.ok(sim.walkTo(p.gate.x, p.gate.y).ok);
  until(sim, () => !sim.state.walkTarget);
  assert.ok(sim.nearPier);
}
function enter(sim) {gate(sim); assert.ok(sim.enterPier().ok);}
function fitSurfRod(sim) {
  assert.ok(sim.buy('surf_rod').ok);
  assert.ok(sim.configureEquipment('carolina_rig','surf_rod').ok);
  assert.ok(sim.configureEquipment('sandcrab','surf_rod').ok);
  assert.ok(sim.configureEquipment('surf_rod').ok);
}

test('both long beaches use the shared simulation but cannot load each other’s journey', () => {
  const pacifica = new PacificaSimulation({rng: () => .5});
  const hmb = new PacificaSimulation({sceneId: 'half-moon-bay', rng: () => .5});
  assert.equal(pacifica.world, WORLD);
  assert.equal(pacifica.shop, SHOP);
  assert.ok(pacifica.world.width > 6000 && hmb.world.width > pacifica.world.width);
  assert.notEqual(pacifica.scene.saveKey, hmb.scene.saveKey);
  assert.ok(pacifica.buy('surf_rod').ok);
  const wrongScene = new PacificaSimulation({sceneId: 'half-moon-bay', saved: pacifica.snapshot()});
  assert.equal(wrongScene.state.credits, 120);
  assert.deepEqual(wrongScene.state.upgrades, []);
  assert.equal(wrongScene.nearPier, false);
  assert.equal(wrongScene.enterPier().ok, false);
  assert.ok(hmb.buy('squid').ok);
  const restored = new PacificaSimulation({sceneId: 'half-moon-bay', saved: hmb.snapshot()});
  assert.equal(restored.state.credits, 100);
  assert.equal(restored.state.inventory.squid, 8);
  assert.equal(restored.snapshot().scene, 'half-moon-bay');
});

test('a long walk follows the varying coastline without entering the sea', () => {
  const sim = new PacificaSimulation({sceneId: 'half-moon-bay', rng: () => 0});
  assert.ok(sim.walkTo(7200, sim.world.shoreY(7200) + 20).ok);
  until(sim, () => {
    assert.ok(sim.state.player.y >= sim.world.shoreY(sim.state.player.x) + 19.999);
    assert.equal(sim.state.inspection, null);
    return !sim.state.walkTarget;
  });
  assert.ok(Math.abs(sim.state.player.x - 7200) < 2);
  assert.equal(sim.state.pierVisit, null);
});

test('bars, troughs and channel gaps affect depth, breaking water and species weights', () => {
  const sim = new PacificaSimulation(), scene = sim.scene, x = 2440, sea = {waveHeightM: 2.1, wavePeriodS: 14, tideM: .6};
  const profile = shoreProfile(scene, x, 0, sea);
  const trough = sampleShore(scene, x, scene.shoreY(x) - profile.troughDistance * 3.2, 0, sea);
  const bar = sampleShore(scene, x, scene.shoreY(x) - profile.barDistance * 3.2, 0, sea);
  const channelX = scene.channels[2].x, channelProfile = shoreProfile(scene, channelX, 0, sea);
  const channel = sampleShore(scene, channelX, scene.shoreY(channelX) - channelProfile.barDistance * 3.2, 0, sea);
  assert.equal(trough.habitat, 'trough');
  assert.equal(bar.habitat, 'bar');
  assert.equal(channel.habitat, 'channel');
  assert.ok(trough.depth > bar.depth + .4);
  assert.ok(bar.breakStrength > channel.breakStrength + .25);
  assert.ok(channel.currentY < bar.currentY && channel.currentY < -.1);
  sim.state.presentation={bottomContact:1,stability:1};
  const inside = sim.speciesWeights(trough), gap = sim.speciesWeights(channel);
  assert.ok(inside[0] / inside[1] > gap[0] / gap[1]);
  assert.notEqual(sampleShore(getShoreScene('half-moon-bay'), x, 300).depth, sampleShore(scene, x, 300).depth);
});

test('inside trough and breaking bar change absolute encounter rates and actual drift', () => {
  const seaState = {waveHeightM: 2.1, wavePeriodS: 14, tideM: .6};
  const x = 1100, near = new PacificaSimulation({rng: () => .5, seaState}), far = new PacificaSimulation({rng: () => .5, seaState});
  const profile = shoreProfile(near.scene, x, 0, seaState);
  for (const sim of [near, far]) fitSurfRod(sim);
  surfAt(near, x); surfAt(far, x);
  castToOffshore(near, profile.troughDistance);
  // Sharp Park's bar sits at the edge of a surf rod's reach: cast as close as it allows.
  castToOffshore(far, Math.min(profile.barDistance, far.previewCast({power: 1}).offshoreDistance - .5));
  assert.equal(near.state.shoreSample.habitat, 'trough');
  assert.ok(far.state.shoreSample.barStrength > .5);
  const target = {...near.state.cast.target};
  advance(near, 15);advance(far,15);
  // The preference index (habitat × presentation) is higher in the trough.
  assert.ok(near.encounterRates().totalRatePerSecond>far.encounterRates().totalRatePerSecond);
  assert.ok(Math.hypot(near.state.cast.target.x-target.x,near.state.cast.target.y-target.y)>.1);
  assert.deepEqual(near.state.shoreSample, sampleShore(near.scene, near.state.cast.target.x, near.state.cast.target.y, near.state.elapsed, seaState));
});

test('channel current produces stronger drift and surf loads change actual fight tension', () => {
  // A winter swell (NDBC 46237 January median) drives a real rip through the gap.
  const seaState = {waveHeightM: 2.1, wavePeriodS: 14, tideM: .6};
  const channel = new PacificaSimulation({rng: () => .5, seaState}), open = new PacificaSimulation({rng: () => .5, seaState});
  for (const sim of [channel, open]) fitSurfRod(sim);
  surfAt(channel, 3240); surfAt(open, 2440);
  // Compare the same actual offshore water, not a shared charge whose reach
  // could move when rod loading or the throw model changes.
  for (const sim of [channel, open]) castToOffshore(sim, 40);
  const starts = [channel, open].map(sim => ({...sim.state.cast.target}));
  for (const sim of [channel, open]) advance(sim, 5);
  assert.ok(starts[0].y - channel.state.cast.target.y > (starts[1].y - open.state.cast.target.y) * 3);
  for (const sim of [channel, open]) {
    sim.state.phase = 'bite'; sim.state.biteSpeciesId='surfperch'; assert.ok(sim.strike().ok);
    sim.state.fish = {...channel.state.fish};
    sim.state.tension = .4; sim.state.fightElapsed = 0; sim.state.elapsed = 5;
    sim.refreshSample();
  }
  channel.update(.1, {reel: true}); open.update(.1, {reel: true});
  assert.ok(Math.abs(channel.state.tension - open.state.tension) > .0001);
});

test('closed pier requires an explicit gate entry and L-deck paths never cut over water', () => {
  const sim = new PacificaSimulation({rng: () => .99}), pier = sim.scene.pier;
  assert.equal(sim.enterPier().ok, false);
  assert.equal(sim.walkTo(pier.tip.x, pier.tip.y).ok, false);
  enter(sim);
  assert.ok(sim.onPier && sim.canCast);
  assert.ok(sim.walkTo(pier.tip.x, pier.tip.y).ok);
  until(sim, () => {
    assert.ok(onPier(sim.scene, sim.state.player.x, sim.state.player.y, 4.999));
    return !sim.state.walkTarget;
  });
  advance(sim, 1, {x: 1, y: 1});
  assert.ok(onPier(sim.scene, sim.state.player.x, sim.state.player.y, 4.999));
  assert.equal(sim.walkTo(pier.tip.x + 300, pier.tip.y).ok, false);
  assert.ok(sim.cast({power: 1}).ok);
  assert.ok(sim.state.cast.target.y < sim.state.cast.origin.y);
  assert.ok(sim.retrieve().ok);
  assert.ok(sim.leavePier().ok);
  until(sim, () => !sim.onPier);
  assert.deepEqual({x: sim.state.player.x, y: sim.state.player.y}, pier.gate);
  assert.equal(sim.state.pierVisit, null, 'a visit ends when the angler steps off');
});

test('there is no notice or prompt: leaning on the gate is the undocumented way in', () => {
  const sim = new PacificaSimulation({rng: () => .99});
  gate(sim);
  assert.equal(sim.onPier, false, 'walking up to the gate opens nothing');
  advance(sim, 1, {y: -1});
  assert.equal(sim.onPier, false, 'a brief push is just a closed gate');
  advance(sim, .5, {y: 1}); advance(sim, .3, {});
  gate(sim);
  advance(sim, 1.4, {y: -1});
  assert.equal(sim.onPier, true);
  assert.doesNotMatch(sim.state.message, /巡查|罚款|风险/);
  const hmb = new PacificaSimulation({sceneId: 'half-moon-bay', rng: () => .99});
  assert.equal(hmb.enterPier().ok, false);
});

test('one patrol roll per pier visit: 10% are caught at a set moment, independent of frame rate', () => {
  const runs = [];
  for (const frame of [.025, .1, .25]) {
    // rng 0: the visit is one of the unlucky 10%; patrol arrives 20 s after climbing on.
    const sim = new PacificaSimulation({rng: () => 0});
    sim.state.catches = [{id: 'surfperch', speciesId: 'barred_surfperch', catchId: 3, weightKg: .5, length: 26}];
    enter(sim);
    advance(sim, PIER_RULES.earliestSeconds - .2, {}, frame);
    assert.equal(sim.state.inspection, null);
    advance(sim, .4, {}, frame);
    assert.ok(sim.state.inspection);
    assert.equal(sim.state.inspection.fine, 0, 'the pier costs your fish, not points');
    assert.equal(sim.state.credits, 120);
    assert.equal(sim.state.catches.length, 0);
    assert.equal(sim.state.inspection.confiscated.length, 1);
    assert.equal(sim.onPier, false);
    assert.ok(sim.acknowledgeInspection().ok);
    runs.push([sim.state.credits, sim.state.inspectionCount]);
  }
  assert.deepEqual(runs, [[120, 1], [120, 1], [120, 1]]);
  const lucky = new PacificaSimulation({rng: () => .5}); enter(lucky);
  advance(lucky, 600);
  assert.equal(lucky.state.inspection, null, 'the other 90% of visits are never checked');
  assert.equal(PIER_RULES.catchChance, .1);
});

test('the visit roll survives reloads, and leaving before the patrol escapes it', () => {
  const sim = new PacificaSimulation({rng: () => 0}); enter(sim);
  advance(sim, 10);
  const restored = new PacificaSimulation({saved: sim.snapshot(), rng: () => .99});
  assert.ok(restored.onPier);
  advance(restored, 10.5);
  assert.ok(restored.state.inspection, 'reloading cannot reroll an unlucky visit');
  const notice = new PacificaSimulation({saved: restored.snapshot(), rng: () => .99});
  assert.ok(notice.state.inspection);
  assert.equal(notice.walkTo(1000, 800).ok, false);
  assert.ok(notice.acknowledgeInspection().ok);
  assert.equal(notice.acknowledgeInspection().ok, false);
  assert.equal(new PacificaSimulation({saved: notice.snapshot()}).state.inspection, null);
  const quick = new PacificaSimulation({rng: () => 0}); enter(quick);
  advance(quick, 15);
  assert.ok(quick.leavePier().ok); until(quick, () => !quick.onPier);
  advance(quick, 60);
  assert.equal(quick.state.inspection, null);
});

test('old unpaid fines survive a save and catch sales settle them once', () => {
  const sim = new PacificaSimulation({rng: () => .5});
  Object.assign(sim.state.player, sim.shop.door);
  const saved = sim.snapshot(); saved.fineDebt = 45;
  saved.catches = [{id: 'surfperch', catchId: 9, weightKg: 1}];
  const trader = new PacificaSimulation({saved});
  assert.equal(trader.state.fineDebt, 45);
  const sale = trader.sellCatch();
  assert.equal(sale.total, 28);
  assert.equal(sale.debtPaid, 28);
  assert.equal(trader.state.fineDebt, 17);
  assert.equal(trader.state.credits, 120);
  assert.equal(trader.sellCatch().total, 0);
  trader.state.inventory = {sandcrab: 0, squid: 0, anchovy: 0};
  assert.equal(trader.buy('beach_bait').ok,false);
  assert.equal(trader.state.fineDebt, 17);
});

test('a pier patrol retrieves an active line and cannot turn its fish into a paid catch', () => {
  const sim = new PacificaSimulation({rng: () => .5, seaState: {waveHeightM: .5, wavePeriodS: 10}}); gate(sim);
  // This visit is caught (0) with the patrol at 20 + .6 × 130 = 98 s.
  const rolls = [0, .6]; sim.rng = () => rolls.length ? rolls.shift() : .5;
  assert.ok(sim.enterPier().ok);
  assert.equal(Math.round(sim.state.pierVisit.patrolAt), 98);
  // Past the shorebreak, where a Carolina rig can settle.
  assert.ok(sim.cast({power: 1, aim: 1}).ok);
  finishShoreFlight(sim);
  until(sim, () => sim.state.presentation.bottomContact > .6, 60);
  schoolAtBait(sim, 'surfperch');
  awaitBite(sim, 30);
  assert.ok(sim.strike().ok);
  until(sim, () => sim.state.inspection, 100);
  assert.equal(sim.state.cast, null);
  assert.equal(sim.state.fish, null);
  assert.equal(sim.state.stats.caught, 0);
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.resolveCatch(true).ok, false);
  assert.equal(sim.strike().ok, false);
  const restored = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(restored.state.credits, 120);
  assert.equal(restored.state.catches.length, 0);
});

test('version-one saves migrate catch and equipment; inspection and pending catches never duplicate rewards', () => {
  const old = {scene: 'pacifica', version: 1, credits: 70, player: {x: 1100, y: 865},
    inventory: {sandcrab: 4}, upgrades: ['surf_rod'], catches: [{id: 'surfperch', catchId: 1, weightKg: .8}],
    pendingCatch: {id: 'halibut', catchId: 2, weightKg: 2}};
  const sim = new PacificaSimulation({saved: old});
  assert.equal(sim.snapshot().version, 4);
  assert.equal(sim.state.catches.length, 1);
  assert.deepEqual(sim.state.upgrades, ['surf_rod']);
  assert.equal(sim.state.phase, 'landed');
  assert.ok(sim.resolveCatch(true).ok);
  assert.equal(sim.resolveCatch(true).ok, false);
  const inspected = sim.snapshot();
  inspected.pendingCatch = old.pendingCatch;
  inspected.inspection = {id: 1, paid: 80};
  inspected.inspectionCount = 1;
  const restored = new PacificaSimulation({saved: inspected});
  assert.equal(restored.state.phase, 'walk');
  assert.equal(restored.state.catches.length, 0);
  assert.equal(restored.state.inspection.confiscated.length, 2);
  assert.equal(restored.state.credits, 70);
  assert.equal(restored.resolveCatch(true).ok, false);
  assert.equal(restored.cast().ok, false);
});


test('pier violations confiscate the entire carried catch and preserve the itemized notice across reload',()=>{
 const sim=new PacificaSimulation({rng:()=>0});
 sim.state.catches=[{id:'surfperch',name:'红尾海鲫',catchId:7,weightKg:.8},{id:'halibut',name:'加州比目鱼',catchId:8,weightKg:2}];
 enter(sim);advance(sim,30);
 assert.equal(sim.state.catches.length,0);assert.equal(sim.state.inspection.confiscated.length,2);
 assert.match(sim.state.inspection.findings[0].detail,/封闭.*禁止进入/);
 const before=sim.state.credits,resumed=new PacificaSimulation({saved:sim.snapshot(),rng:()=>0});
 assert.equal(resumed.state.catches.length,0);assert.equal(resumed.state.inspection.confiscated.length,2);assert.equal(resumed.state.credits,before);
 resumed.acknowledgeInspection();Object.assign(resumed.state.player,resumed.shop.door);assert.equal(resumed.sellCatch().total,0);
});
