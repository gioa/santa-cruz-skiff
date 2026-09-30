import test from 'node:test';
import assert from 'node:assert/strict';
import {BeniciaSimulation,BENICIA_SPECIES,beniciaLureAppeal,beniciaSalmonSuitability} from '../dist/benicia-sim.js';
import {BENICIA_SCENE,beniciaSample,beniciaTide} from '../dist/benicia-data.js';
import {beniciaCrowd,crowdCastConflict,BENICIA_ANGLERS} from '../dist/benicia-crowd.js';
import {shoreSupply,shoreReady,wearShoreSupplies} from '../dist/shore-equipment.js';
import {shoreRigUsesFloat} from '../dist/shore-tackle-visual.js';
import {assessShoreCatch,shoreFindingDetail} from '../dist/shore-regulations.js';
import {fishWeightKg,SPECIES} from '../dist/pacifica-sim.js';
import {fishMassKg} from '../dist/pixel-fish-mass.js';
import {finishShoreFlight} from './helpers/shore-cast.js';
import {schoolAtBait} from './helpers/shore-fish.js';
const advance=(sim,t,input={})=>{for(let n=0;n<t/.05;n++)sim.update(.05,input);};
const create=()=>new BeniciaSimulation({date:'2026-09-29',rng:()=>.5});
function pier(sim){assert.ok(sim.enterPier().ok);assert.ok(sim.walkTo(1090,165).ok);for(let t=0;t<60&&sim.state.walkTarget;t+=.05)sim.update(.05);assert.equal(sim.state.walkTarget,null);}
function cast(sim){assert.ok(sim.cast({power:.65,aim:.5}).ok);finishShoreFlight(sim);}

test('Benicia has an open public pier, shore-specific save and usable bait-free starting spoon',()=>{
 const sim=create();assert.equal(sim.scene.id,'benicia');assert.ok(shoreReady(sim.state));assert.equal(shoreSupply(sim.state).id,'salmon_spoon');assert.equal(shoreRigUsesFloat(sim.state),false);
 pier(sim);advance(sim,160);assert.ok(sim.state.onPier);assert.equal(sim.state.inspection,null);assert.notEqual(sim.state.pierVisit?.caught,true);
 const restored=new BeniciaSimulation({saved:sim.snapshot()});assert.equal(restored.state.elapsed,sim.state.elapsed);assert.equal(restored.state.onPier,true);assert.equal(restored.state.crowdSeed,sim.state.crowdSeed);assert.ok(restored.tackleReady);
});
test('tidal direction reverses; shallow side bay and rocky margins differ from the tip',()=>{
 assert.ok(beniciaTide(0).speed>0);assert.ok(beniciaTide(2250).speed<0);
 const sample=(x)=>beniciaSample(x,BENICIA_SCENE.shoreY(x)-32);
 assert.equal(sample(450).substrate,'mud');assert.equal(sample(1430).substrate,'rock');assert.ok(sample(1090).depth>sample(450).depth+1);
 assert.equal(sample(1090).activeBreaking,0);assert.ok(sample(1090).currentX<0);assert.ok(Math.abs(sample(1090).currentX)>Math.abs(sample(450).currentX));
});
test('spoon sinks on a pause, swims submerged while retrieving, and current moves its target',()=>{
 const sim=create();pier(sim);cast(sim);const x=sim.state.cast.target.x;advance(sim,5);
 assert.ok(sim.state.presentation.depth>2);assert.ok(sim.state.cast.target.x<x);const d=sim.state.lineDistance;
 advance(sim,12,{reel:true});assert.equal(sim.state.phase,'waiting');assert.ok(sim.state.presentation.depth>.3);assert.ok(sim.state.lineDistance<d);
 assert.equal(shoreSupply(sim.state).bait,null);assert.equal(shoreRigUsesFloat(sim.state),false);
 advance(sim,90,{reel:true});assert.equal(sim.state.phase,'walk');assert.ok(sim.tackleReady);
});
test('lure availability and appeal depend on season, corridor, depth and retrieve motion',()=>{
 const e=beniciaSample(1090,320-27*3.2);assert.ok(beniciaSalmonSuitability(e,9)>beniciaSalmonSuitability(e,1));
 const moving=beniciaLureAppeal('chinook_salmon','salmon_spoon',.65,2,5);
 assert.ok(moving>beniciaLureAppeal('chinook_salmon','salmon_spoon',0,2,5)*20);
 assert.ok(moving>beniciaLureAppeal('chinook_salmon','salmon_spoon',.65,12,15)*20);
 assert.equal(beniciaLureAppeal('chinook_salmon','salmon_spoon',.65,0,5),0);
 assert.deepEqual(BENICIA_SPECIES.map(s=>s.id),['chinook_salmon','striped_bass','white_croaker','jacksmelt','shiner_perch','pile_perch']);
});
test('peak-season crowds have distinctive outfits, clear gaps, local clues and crossing-line checks',()=>{
 const crowd=beniciaCrowd(0,51,9),winter=beniciaCrowd(0,51,1);assert.ok(crowd.length>winter.length);assert.ok(crowd.length>=12);assert.equal(new Set(BENICIA_ANGLERS.map(a=>a.style)).size,6);
 assert.ok(crowd.every(n=>Math.abs(n.x-1090)>=70));const n=crowd[0];assert.ok(crowdCastConflict({player:{x:n.x,y:n.y+3},crowd}, {x:n.x,y:n.y-80}));
 const sim=create(),local=sim.state.crowd.find(n=>n.id>6);Object.assign(sim.state.player,{x:local.x,y:local.y+4.8});assert.ok(sim.talkLocal(local.id).fresh);assert.equal(sim.talkLocal(local.id).fresh,false);
 const restored=new BeniciaSimulation({saved:sim.snapshot()});assert.equal(restored.state.shoreLore.notes[0].sourceName,local.name);
});
test('broken lures need a real replacement; repeatedly casting consumes no imaginary bait',()=>{
 const sim=create();wearShoreSupplies(sim.state,'break');assert.equal(sim.tackleReady,false);assert.ok(sim.configureEquipment('salmon_spoon').ok);assert.equal(sim.state.rigStock.salmon_spoon.length,0);assert.ok(sim.tackleReady);
 wearShoreSupplies(sim.state,'break');assert.equal(sim.configureEquipment('salmon_spoon').ok,false);
});
test('a salmon school can intercept a moving spoon, fight, land and survive save/load',()=>{
 const sim=create();pier(sim);cast(sim);advance(sim,3);schoolAtBait(sim,'chinook_salmon',{count:12,lengthCm:65});
 for(let i=0;i<500&&sim.state.phase==='waiting';i++)sim.update(.05,{reel:true,reelSpeed:.4});
 assert.equal(sim.state.phase,'bite');assert.ok(sim.strike().ok);assert.equal(sim.state.fish.id,'chinook_salmon');
 for(let i=0;i<4000&&sim.state.phase==='fighting';i++)sim.update(.05,{reel:sim.state.tension<.65,reelSpeed:.6});
 assert.equal(sim.state.phase,'landed');assert.ok(sim.state.fightElapsed>10);assert.ok(sim.state.fish.weightKg>1);
 const pending=new BeniciaSimulation({saved:sim.snapshot()});assert.equal(pending.state.phase,'landed');assert.ok(pending.resolveCatch(true).ok);
 const restored=new BeniciaSimulation({saved:pending.snapshot()});assert.equal(restored.state.catches[0].id,'chinook_salmon');assert.ok(restored.population.groups.every(g=>BENICIA_SPECIES.some(d=>d.id===g.species)));
 const spec=SPECIES.find(s=>s.id==='chinook_salmon');assert.equal(fishWeightKg(spec,65),fishMassKg(spec,65));
});
test('Benicia salmon uses inland dates, daily and possession limits, not an ocean minimum size',()=>{
 const fish=(i,date='2026-09-29')=>({id:'chinook_salmon',catchId:i,length:45,caughtDate:date});
 const log=f=>({catchId:f.catchId,species:f.id,date:f.caughtDate});
 assert.equal(assessShoreCatch([fish(1)],[log(fish(1))],'benicia').fine,0);
 const three=[fish(1),fish(2),fish(3)];assert.equal(assessShoreCatch(three,three.map(log),'benicia').violatingFish,1);
 const five=[fish(1,'2026-09-27'),fish(2,'2026-09-27'),fish(3,'2026-09-28'),fish(4,'2026-09-28'),fish(5)];assert.ok(assessShoreCatch(five,five.map(log),'benicia').findings.some(f=>f.code==='salmon_possession'));
 const closed=fish(1,'2026-06-01'),finding=assessShoreCatch([closed],[log(closed)],'benicia');assert.equal(finding.fine,100);assert.match(shoreFindingDetail(finding.findings[0]),/7\/16–12\/16/);
 const sim=create();sim.state.catches=[closed];sim.state.keptLog=[log(closed)];Object.assign(sim.state.player,sim.shop.door);const credits=sim.state.credits;assert.equal(sim.sellCatch().ok,false);assert.equal(sim.state.catches.length,0);assert.equal(sim.state.credits,credits-100);
});

test('possession limits still apply to mixed-day Benicia catches',()=>{
 const carried=[1,2,3].map(i=>({id:'striped_bass',catchId:i,length:55,caughtDate:`2026-09-${25+i}`}));
 const log=carried.map(f=>({catchId:f.catchId,species:f.id,date:f.caughtDate}));
 const result=assessShoreCatch(carried,log,'benicia');assert.equal(result.violatingFish,1);assert.match(shoreFindingDetail(result.findings[0]),/持有量/);
});
