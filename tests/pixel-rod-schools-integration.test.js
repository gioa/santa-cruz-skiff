import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PixelSimulation,FISHING_SPOTS}=await import('../dist/pixel-sim.js');
const {createFishFight}=await import('../dist/pixel-fish-fight.js');
const {syncVessel}=await import('../dist/vessel-physics.js');
const {rodTipPosition}=await import('../dist/pixel-fishing-physics.js');
function simReady(){const sim=new PixelSimulation({rng:()=>.5,conditions:{currentX:0,currentZ:0,windKnots:0}});sim.start();const s=sim.state,p=FISHING_SPOTS[1];Object.assign(s,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,boatX:p.x,boatZ:p.z});syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});return sim;}
test('actual simulator publishes moving rod tip, freezes on pause and clears on retrieval',()=>{const sim=simReady(),s=sim.state;Object.assign(s,{fishState:'fight',fish:{fightKind:'salmon',kg:5,length:75},lureDepth:15,paidLineMeters:17.2,reelMode:'brake',rodLoadN:3});s.fishFight=createFishFight(s.fish);s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-15};const poses=[];for(let i=0;i<15;i++){sim.step(1/60);poses.push(sim.publicState().rodTipMotion.y);}assert.ok(Math.max(...poses)-Math.min(...poses)>.1);sim.pause(true);const before=sim.publicState().rodTipMotion;sim.step(.1);assert.deepEqual(sim.publicState().rodTipMotion,before);sim.pause(false);sim.retrieve();sim.step(.1);assert.equal(sim.publicState().rodTipMotion.y,0);});
test('school copy connects to simulator environment and is cleared on resume',()=>{const sim=simReady(),s=sim.state;s.bobber={x:s.boatX,z:s.boatZ,height:-4};s.lureDepth=4;const e={type:'bait',x:s.boatX,z:s.boatZ,age:10,duration:90,depth:4,density:.8,radius:10,followers:[{kind:'bonito'}]};sim.setBaitSchools([e]);e.followers[0].kind='salmon';assert.ok(sim.rigEnvironment().schoolInfluence.bonito>6);assert.equal(sim.rigEnvironment().schoolInfluence.salmon,1);const resumed=new PixelSimulation({saved:sim.snapshot()});resumed.start({resume:true});assert.deepEqual(resumed.state.baitSchools,[]);});
