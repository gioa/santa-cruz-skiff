import test from 'node:test';
import assert from 'node:assert/strict';
import {shoreWorldTime,shoreDayHash,shoreDayUnit} from '../dist/shore-day.js';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {BeniciaSimulation} from '../dist/benicia-sim.js';
import {sampleShore} from '../dist/shore-data.js';

test('the shared shore date follows California midnight, including DST',()=>{
 assert.equal(shoreWorldTime(new Date('2026-10-01T06:59:59Z')).date,'2026-09-30');
 assert.equal(shoreWorldTime(new Date('2026-10-01T07:00:00Z')).date,'2026-10-01');
 const before=shoreWorldTime(new Date('2026-11-01T08:59:59Z')),after=shoreWorldTime(new Date('2026-11-01T09:00:00Z'));
 assert.equal(before.clock,'01:59');assert.equal(after.clock,'01:00');
 assert.equal(after.environmentSeconds-before.environmentSeconds,1,'tide/waves do not jump backward at DST');
 assert.equal(shoreWorldTime(new Date('2026-09-30T13:00:00.125Z')).timeSeconds,21600.125);
});

test('daily random values are pure named functions and separate dates/scenes/channels',()=>{
 const a=['pacifica','2026-09-30',21600,'fish',5];
 assert.equal(shoreDayHash(...a),shoreDayHash(...a));
 assert.notEqual(shoreDayHash(...a),shoreDayHash('benicia',...a.slice(1)));
 assert.notEqual(shoreDayHash(...a),shoreDayHash('pacifica','2026-10-01',21600,'fish',5));
 assert.notEqual(shoreDayHash(...a),shoreDayHash('pacifica','2026-09-30',21600,'patrol',5));
 assert.ok(shoreDayUnit(...a)>0&&shoreDayUnit(...a)<1);
});

for(const sceneId of ['pacifica','half-moon-bay','benicia'])test(`${sceneId}: different saved trip clocks share today's sea, public school key and civil clock`,()=>{
 let ms=Date.parse('2026-09-30T19:34:17Z');
 const make=extra=>sceneId==='benicia'?new BeniciaSimulation({clockMode:'shared',now:()=>new Date(ms),...extra}):new PacificaSimulation({sceneId,clockMode:'shared',now:()=>new Date(ms),...extra});
 const fresh=make(),saved=fresh.snapshot();saved.fishingDate='2026-01-01';saved.elapsed=12000;saved.credits=321;
 const returning=make({saved});
 assert.equal(returning.calendarDate(),'2026-09-30');assert.equal(returning.clock(),'12:34');assert.equal(returning.state.credits,321);
 assert.equal(returning.state.elapsed,12000,'active physics/save progress is not a wall clock');
 assert.deepEqual(fresh.fishWorld().sharedField,returning.fishWorld().sharedField);
 assert.deepEqual(fresh.state.seaState,returning.state.seaState);
 const x=sceneId==='benicia'?1888:2440,y=fresh.world.shoreY(x)-80;
 assert.deepEqual(sampleShore(sceneId,x,y,fresh.state.elapsed,fresh.state.seaState),sampleShore(sceneId,x,y,returning.state.elapsed,returning.state.seaState));
 if(sceneId==='benicia')assert.deepEqual(fresh.state.crowd,returning.state.crowd);
 const event=fresh.random('fish-test');fresh.random('unrelated');assert.equal(fresh.random('fish-test'),event);
 assert.equal(returning.random('fish-test'),event);
 ms+=60000;fresh.update(0);returning.update(0);fresh.updateSea();returning.updateSea();
 assert.equal(fresh.clock(),'12:35');assert.deepEqual(fresh.state.seaState,returning.state.seaState);
});

test('midnight and resume refresh the public day without fast-forwarding a pending bite',()=>{
 let ms=Date.parse('2026-10-01T06:59:59Z');
 const sim=new PacificaSimulation({clockMode:'shared',now:()=>new Date(ms)});
 sim.state.phase='bite';sim.state.biteRemaining=3;const active=sim.state.elapsed;
 ms+=12*3600000;sim.update(0);
 assert.equal(sim.calendarDate(),'2026-10-01');assert.equal(sim.state.biteRemaining,3);assert.equal(sim.state.elapsed,active);
});

test('explicit trip fixtures preserve their accelerated game clock and injected RNG',()=>{
 const sim=new PacificaSimulation({date:'2026-09-30',rng:()=>.4});sim.state.elapsed=360;
 assert.equal(sim.clock(),'07:00');assert.equal(sim.sharedWorld,null);assert.equal(sim.random('anything'),.4);
});
