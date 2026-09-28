import test from 'node:test';import assert from 'node:assert/strict';
import {stepFishingLine,rodTipPosition} from '../dist/pixel-fishing-physics.js';
import {createFishFight,stepFishFight} from '../dist/pixel-fish-fight.js';
const options={environment:{bottomDepth:30},fishPullN:8,fishMotion:{bodyDragArea:.045}};
function start(){const s={fishState:'fight',fish:{kg:4},rig:'bottom',boatX:0,boatZ:0,heading:0,rodElevation:20,rodAzimuth:70,rodMount:'hand',reelMode:'brake',drag:.7,crankRate:0,pumpHeight:0,rodLoadN:0,rodBend:0,paidLineMeters:15};const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:tip.height-15};s.lureDepth=-s.bobber.height;return s;}
function move(s,seconds,{target=65,crank=0,dt=.05}={}){s.rodTargetElevation=target;const stats={load:0,retrieve:0,out:0,slack:0,peakStroke:0};for(let t=0;t<seconds-dt/2;t+=dt){s.crankRate=crank;const paid=s.paidLineMeters;Object.assign(s,stepFishingLine(s,{...options,dt}));assert.ok(Math.abs(s.paidLineMeters-paid-(s.payoutRate-s.retrieveRate)*dt)<1e-8);stats.load+=s.rodLoadN*dt/seconds;stats.retrieve+=s.retrieveRate*dt;stats.out+=s.payoutRate*dt;stats.slack=Math.max(stats.slack,s.lineSlackMeters);stats.peakStroke=Math.max(stats.peakStroke,s.rodStrokeMps);}return stats;}
test('smooth lift moves the fish through a finite stroke without winding line; holding adds no further gain',()=>{const s=start(),before=s.lureDepth,paid=s.paidLineMeters;move(s,4);assert.ok(before-s.lureDepth>.7);assert.equal(s.paidLineMeters,paid);const lifted=s.lureDepth;move(s,3);assert.ok(Math.abs(s.lureDepth-lifted)<.02);assert.equal(s.rodStrokeMps,0);});
test('lowering and winding preserves the lifted gain; lowering alone gives line back to the fish',()=>{const good=start(),loose=start();move(good,4);move(loose,4);const high=good.lureDepth,paid=good.paidLineMeters;const recovery=move(good,2,{target:20,crank:1.2});move(loose,2,{target:20});assert.ok(good.paidLineMeters<paid-.9);assert.ok(good.lureDepth<loose.lureDepth-.8);assert.ok(good.lureDepth<high+.25);assert.ok(recovery.retrieve>.9);});
test('slack take-up during lowering winds more easily than hauling a taut flatfish directly',()=>{const s=start();move(s,4);const recovery=move(s,.8,{target:20,crank:1.2});const taut=start(),steady=move(taut,.8,{target:20,crank:1.2});assert.ok(recovery.retrieve>steady.retrieve*1.2);assert.ok(recovery.load<steady.load);});
test('pump cycles conserve line and are stable across phone frame rates',()=>{const results=[];for(const dt of[1/60,.05,.1]){const s=start(),initial=s.lureDepth;for(let cycle=0;cycle<3;cycle++){move(s,4,{dt});move(s,2,{target:20,crank:1.2,dt});}assert.ok(initial-s.lureDepth>2);results.push(s.lureDepth);}assert.ok(Math.max(...results)-Math.min(...results)<.3);});
test('upstroke work tires a loaded fish while holding the same high rod does not add fictitious work',()=>{const fish={fightKind:'halibut',kg:4},f=createFishFight(fish),base={dt:.1,time:6,rodLoadN:10,lineSlackMeters:0,retrieveRate:0,payoutRate:0};const lifted=stepFishFight(fish,f,{...base,rodStrokeMps:.5}),held=stepFishFight(fish,f,base);assert.ok(lifted.fight.workJ>held.fight.workJ);assert.ok(lifted.fight.energy<held.fight.energy);});

test('simulation rejects free fight pose changes and clears stroke on pause or mounting',async()=>{
 const {readFile}=await import('node:fs/promises'),previousFetch=globalThis.fetch;
 globalThis.fetch=async url=>new Response(await readFile(url));
 try{
  const {PixelSimulation}=await import('../dist/pixel-sim.js');
  const sim=new PixelSimulation();sim.start();Object.assign(sim.state,start(),{mode:'boat',paused:false});
  assert.equal(sim.setRodPose({elevation:65,azimuth:-90}).ok,false);assert.equal(sim.state.rodElevation,20);assert.equal(sim.state.rodAzimuth,70);sim.state.rodTargetElevation=65;
  Object.assign(sim.state,stepFishingLine(sim.state,{...options,dt:.05}));assert.ok(sim.state.rodElevation>20&&sim.state.rodElevation<25);
  sim.pause(true);assert.equal(sim.state.rodTargetElevation,null);assert.equal(sim.state.rodStrokeMps,0);
  const stopped=sim.state.rodElevation;assert.equal(sim.setRodPose({elevation:80}).ok,false);assert.equal(sim.state.rodElevation,stopped);
  sim.pause(false);sim.setRodPose({elevation:65});assert.equal(sim.setRodMount('port').ok,false,'a fighting fish still prevents parking the rod');
  sim.retrieve();assert.equal(sim.state.rodTargetElevation,null);assert.equal(sim.setRodMount('port').ok,true);sim.setRodMount('hand');sim.setRodPose({elevation:42});assert.equal(sim.state.rodElevation,42,'non-fight jigging keeps its responsive pose');
 }finally{globalThis.fetch=previousFetch;}
});
