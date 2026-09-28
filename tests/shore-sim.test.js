import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation, PIER_RULES, SHOP, WORLD} from '../dist/pacifica-sim.js';
import {getShoreScene, sampleShore, shoreProfile, onPier} from '../dist/shore-data.js';

function advance(sim, seconds, input = {}, frame = .05) {
  for (let t = 0; t < seconds - 1e-8; t += frame) sim.update(Math.min(frame, seconds - t), typeof input === 'function' ? input(sim.state) : input);
}
function until(sim, predicate, limit = 90) {
  for (let t = 0; t < limit && !predicate(); t += .05) sim.update(.05);
  assert.ok(predicate(), sim.state.message);
}
function surfAt(sim, x) {
  Object.assign(sim.state.player, {x, y: sim.world.shoreY(x) + 55});
  sim.refreshSample();
}
function gate(sim) {
  const p = sim.scene.pier;
  assert.ok(sim.walkTo(p.gate.x, p.gate.y).ok);
  until(sim, () => !sim.state.walkTarget);
  assert.ok(sim.nearPier);
}
function enter(sim) {gate(sim); assert.ok(sim.enterPier().ok);}

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
  assert.equal(sim.state.pierExposure, 0);
});

test('bars, troughs and channel gaps affect depth, breaking water and species weights', () => {
  const sim = new PacificaSimulation(), scene = sim.scene, x = 2440;
  const profile = shoreProfile(scene, x);
  const trough = sampleShore(scene, x, scene.shoreY(x) - profile.troughDistance * 3.2);
  const bar = sampleShore(scene, x, scene.shoreY(x) - profile.barDistance * 3.2);
  const channelX = scene.channels[2].x, channelProfile = shoreProfile(scene, channelX);
  const channel = sampleShore(scene, channelX, scene.shoreY(channelX) - channelProfile.barDistance * 3.2);
  assert.equal(trough.habitat, 'trough');
  assert.equal(bar.habitat, 'bar');
  assert.equal(channel.habitat, 'channel');
  assert.ok(trough.depth > bar.depth + 1);
  assert.ok(bar.breakStrength > channel.breakStrength + .5);
  assert.ok(Math.abs(channel.currentY) > Math.abs(bar.currentY) * 5);
  const inside = sim.speciesWeights(trough), gap = sim.speciesWeights(channel);
  assert.ok(inside[0] / inside[1] > gap[0] / gap[1]);
  assert.notEqual(sampleShore(getShoreScene('half-moon-bay'), x, 300).depth, sampleShore(scene, x, 300).depth);
});

test('casting at the inside trough yields a different wait and actual water drift than a breaking bar', () => {
  const x = 1100, near = new PacificaSimulation({rng: () => .5}), far = new PacificaSimulation({rng: () => .5});
  const profile = shoreProfile(near.scene, x);
  surfAt(near, x); surfAt(far, x);
  assert.ok(near.cast({power: (profile.troughDistance - 18) / 54}).ok);
  assert.ok(far.cast({power: (profile.barDistance - 18) / 54}).ok);
  assert.equal(near.state.shoreSample.habitat, 'trough');
  assert.equal(far.state.shoreSample.habitat, 'bar');
  assert.ok(near.state.waitRemaining < far.state.waitRemaining);
  const target = {...near.state.cast.target};
  advance(near, 5);
  assert.ok(near.state.cast.target.x > target.x + .5);
  assert.ok(near.state.cast.target.y < target.y);
  assert.ok(near.state.cast.drift.x > 0);
  assert.deepEqual(near.state.shoreSample, sampleShore(near.scene, near.state.cast.target.x, near.state.cast.target.y, near.state.elapsed));
});

test('channel current produces stronger drift and surf loads change actual fight tension', () => {
  const channel = new PacificaSimulation({rng: () => .5}), open = new PacificaSimulation({rng: () => .5});
  surfAt(channel, 3240); surfAt(open, 2440);
  for (const sim of [channel, open]) assert.ok(sim.cast({power: .4}).ok);
  const starts = [channel, open].map(sim => ({...sim.state.cast.target}));
  for (const sim of [channel, open]) advance(sim, 5);
  assert.ok(starts[0].y - channel.state.cast.target.y > (starts[1].y - open.state.cast.target.y) * 3);
  for (const sim of [channel, open]) {
    sim.state.phase = 'bite'; assert.ok(sim.strike().ok);
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
  assert.ok(sim.state.pierExposure > 0, 'leaving cannot erase accumulated patrol exposure');
});

test('patrol checks depend on elapsed pier exposure, never on rendering frames or shore time', () => {
  const runs = [];
  for (const frame of [.025, .1, .25]) {
    const rolls = [.8, .2]; let checks = 0;
    const sim = new PacificaSimulation({rng: () => rolls[checks++]});
    enter(sim);
    advance(sim, 29.5, {}, frame);
    assert.equal(checks, 0);
    advance(sim, .5, {}, frame);
    assert.equal(checks, 1);
    assert.equal(sim.state.inspection, null);
    advance(sim, 30, {}, frame);
    assert.equal(checks, 2);
    assert.equal(sim.state.inspection.fine, PIER_RULES.fine);
    assert.equal(sim.state.credits, 120 - PIER_RULES.fine);
    assert.equal(sim.onPier, false);
    assert.equal(sim.state.phase, 'walk');
    assert.ok(sim.acknowledgeInspection().ok);
    advance(sim, 300, {}, frame);
    assert.equal(checks, 2, 'the beach does not trigger pier inspections');
    runs.push([sim.state.credits, sim.state.inspectionCount]);
  }
  assert.deepEqual(runs, [[40, 1], [40, 1], [40, 1]]);
});

test('leaving and reloading preserve risk exposure; an inspection is charged only once', () => {
  const sim = new PacificaSimulation({rng: () => 0}); enter(sim);
  advance(sim, 23);
  assert.ok(sim.leavePier().ok); advance(sim, .1);
  const exposed = sim.state.pierExposure;
  assert.ok(exposed >= 23);
  advance(sim, 60);
  assert.equal(sim.state.pierExposure, exposed);
  const restored = new PacificaSimulation({saved: sim.snapshot(), rng: () => 0});
  assert.equal(restored.state.pierExposure, exposed);
  assert.ok(restored.enterPier().ok);
  advance(restored, PIER_RULES.interval - exposed);
  assert.ok(restored.state.inspection);
  const notice = new PacificaSimulation({saved: restored.snapshot(), rng: () => 0});
  assert.ok(notice.state.inspection);
  assert.equal(notice.state.credits, 40);
  assert.equal(notice.walkTo(1000, 800).ok, false);
  advance(notice, 120);
  assert.equal(notice.state.credits, 40);
  assert.equal(notice.state.inspectionCount, 1);
  assert.ok(notice.acknowledgeInspection().ok);
  assert.equal(notice.acknowledgeInspection().ok, false);
  assert.equal(new PacificaSimulation({saved: notice.snapshot()}).state.inspection, null);
});

test('unpaid fines survive a save, catch sales settle debt once without free replenishment', () => {
  const sim = new PacificaSimulation({rng: () => 0});
  assert.ok(sim.buy('surf_rod').ok); // 35 points remain.
  enter(sim); advance(sim, 30);
  assert.equal(sim.state.credits, 0);
  assert.equal(sim.state.fineDebt, 45);
  const restored = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(restored.state.fineDebt, 45);
  assert.ok(restored.acknowledgeInspection().ok);
  Object.assign(restored.state.player, restored.shop.door);
  const catchSave = restored.snapshot();
  catchSave.catches = [{id: 'surfperch', catchId: 9, weightKg: 1}];
  const trader = new PacificaSimulation({saved: catchSave});
  const sale = trader.sellCatch();
  assert.equal(sale.total, 28);
  assert.equal(sale.debtPaid, 28);
  assert.equal(trader.state.fineDebt, 17);
  assert.equal(trader.state.credits, 0);
  assert.equal(trader.sellCatch().total, 0);
  assert.equal(trader.state.fineDebt, 17);
  trader.state.inventory = {sandcrab: 0, squid: 0, anchovy: 0};
  assert.equal(trader.buy('beach_bait').ok,false);
  assert.equal(trader.state.inventory.sandcrab, 0);
  assert.equal(trader.state.fineDebt, 17);
});

test('an inspection retrieves an active line and cannot turn its fish into a paid catch', () => {
  const sim = new PacificaSimulation({rng: () => 0}); enter(sim);
  advance(sim, 12);
  assert.ok(sim.cast({power: 0}).ok);
  until(sim, () => sim.state.phase === 'bite');
  assert.ok(sim.strike().ok);
  advance(sim, 8, s => ({reel: s.tension < .6}));
  assert.ok(sim.state.inspection);
  assert.equal(sim.state.cast, null);
  assert.equal(sim.state.fish, null);
  assert.equal(sim.state.inventory.sandcrab, 12);
  assert.equal(sim.state.stats.caught, 0);
  assert.equal(sim.state.catches.length, 0);
  assert.equal(sim.resolveCatch(true).ok, false);
  assert.equal(sim.strike().ok, false);
  const restored = new PacificaSimulation({saved: sim.snapshot()});
  assert.equal(restored.state.credits, 40);
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
 assert.match(sim.state.inspection.findings[0].detail,/翻越.*禁止进入/);
 const before=sim.state.credits,resumed=new PacificaSimulation({saved:sim.snapshot(),rng:()=>0});
 assert.equal(resumed.state.catches.length,0);assert.equal(resumed.state.inspection.confiscated.length,2);assert.equal(resumed.state.credits,before);
 resumed.acknowledgeInspection();Object.assign(resumed.state.player,resumed.shop.door);assert.equal(resumed.sellCatch().total,0);
});
