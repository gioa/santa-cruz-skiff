import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,GAME_TIME_SCALE,HARBOR}=await import('../dist/pixel-sim.js');
const {NAVIGATION_COMPRESSION}=await import('../dist/pixel-navigation-scale.js');
const {assessCatch}=await import('../dist/fishing-regulations.js');
const now=()=>new Date('2026-09-27T21:00:00Z');
const run=(sim,seconds,dt=.25)=>{for(let t=0;t<seconds-1e-7;t+=dt)sim.step(Math.min(dt,seconds-t));};
const begin=options=>{const sim=new PixelSimulation({now,patrolRng:()=>.9,...options});sim.start();return sim;};

test('half-scale map advances the clock and capture timestamp two minutes per actual minute',()=>{
 assert.equal(GAME_TIME_SCALE,1/NAVIGATION_COMPRESSION);const sim=begin(),start=Date.parse(sim.captureTimestamp());run(sim,60,.1);
 assert.equal(sim.state.clock,'06:02:00');assert.equal(sim.state.timeScale,2);assert.ok(Math.abs(sim.state.elapsed-60)<1e-7);assert.ok(Math.abs(sim.state.time-60)<1e-7,'animation clock remains real time');assert.ok(Math.abs(sim.state.gameElapsed-120)<1e-7);assert.equal(Date.parse(sim.captureTimestamp())-start,120000);
 assert.equal(sim.publicState().activeSeconds,60);assert.equal(sim.publicState().gameSeconds,120);assert.equal(sim.publicState().timeScale,2);
});

test('time compression applies while walking and moored independently of navigation assistance, and pause freezes both clocks',()=>{
 const sim=begin();run(sim,15);Object.assign(sim.state,{mode:'boat',boatX:HARBOR.boatX,boatZ:HARBOR.boatZ,moored:true,launchStage:'afloat'});run(sim,15);assert.equal(sim.state.navigationScale,1);assert.equal(sim.state.clock,'06:01:00');
 const before={active:sim.state.elapsed,game:sim.state.gameElapsed,animation:sim.state.time,stamp:sim.captureTimestamp()};sim.pause(true);run(sim,20);assert.deepEqual({active:sim.state.elapsed,game:sim.state.gameElapsed,animation:sim.state.time,stamp:sim.captureTimestamp()},before);sim.pause(false);run(sim,1);assert.equal(sim.state.clock,'06:01:02');
});

test('clock midnight and legal capture date advance together in Pacific local time',()=>{
 const sim=begin();sim.state.gameElapsed=18*3600-.5;sim.state.elapsed=sim.state.gameElapsed/GAME_TIME_SCALE;sim.state.time=sim.state.elapsed;sim.state.clock=sim.clock();assert.equal(sim.state.clock,'23:59:59');sim.step(.25);assert.equal(sim.state.clock,'00:00:00');assert.equal(sim.captureTimestamp(),'2026-09-28T07:00:00.000Z');
 const result=assessCatch({speciesId:'pacific_mackerel',caughtAt:sim.captureTimestamp(),caughtGPS:{lat:36.9505,lon:-122.0288},landingNetDiameterInches:20});assert.equal(result.date,'2026-09-28');
});

test('Pacific daylight-saving transition keeps clock and capture instant consistent',()=>{
 const sim=begin({now:()=>new Date('2026-10-31T20:00:00Z')});sim.state.gameElapsed=20*3600-1;sim.state.elapsed=sim.state.gameElapsed/GAME_TIME_SCALE;sim.state.time=sim.state.elapsed;assert.equal(sim.clock(),'01:59:59');run(sim,1);assert.equal(sim.state.clock,'01:00:01');assert.equal(sim.captureTimestamp(),'2026-11-01T09:00:01.000Z');
});

test('new and legacy saves restart both clocks at today six-am without rewriting historical catch timestamps',()=>{
 const sim=begin();run(sim,30);sim.state.catches.push({catchId:'historical',name:'蓝岩鱼',caughtAt:'2026-09-27T13:00:15.000Z',kept:true});const modern=sim.snapshot(),legacy=structuredClone(modern);delete legacy.gameElapsed;delete legacy.timeScale;legacy.version=3;
 for(const saved of[modern,legacy]){const restored=new PixelSimulation({saved,now:()=>new Date('2026-12-01T04:00:00Z')});restored.start(true);assert.equal(restored.state.clock,'06:00:00');assert.equal(restored.state.dayStartAt,'2026-11-30T14:00:00.000Z');assert.equal(restored.state.elapsed,0);assert.equal(restored.state.time,0);assert.equal(restored.state.gameElapsed,0);assert.equal(restored.state.timeScale,2);assert.equal(restored.state.catches[0].caughtAt,'2026-09-27T13:00:15.000Z');run(restored,1);assert.equal(restored.state.clock,'06:00:02');}
});
