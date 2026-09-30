import test from 'node:test';
import assert from 'node:assert/strict';
import {shorePersonScale,shoreRodGeometry,shoreCastRelease,shoreProjectPoint,shoreWorldMetres} from '../dist/shore-scale.js';
import {createShoreCast,shoreCastPosition} from '../dist/shore-casting.js';
import {shoreFishVisual,shoreActionCameraTarget} from '../dist/shore-action-view.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const state={player:{x:2440,y:724},activeRod:'starter_rod',phase:'walk',fishingControls:{rodLift:.35,rodSweep:0},rodSupplies:{starter_rod:{id:'carolina_rig',bait:{kind:'sandcrab',condition:1}}}};
test('people and fish share the metre scale; camera never enlarges the fish body independently',()=>{
 near(shorePersonScale('player')*41,shoreWorldMetres(1.75));near(shorePersonScale('benicia_violet')*44,shoreWorldMetres(1.75));
 const s={...state,phase:'fighting',fish:{id:'jacksmelt',length:32},fishMotion:{depth:0,airHeight:0},cast:{origin:state.player,target:{x:2440,y:620},distance:32},lineDistance:32};
 for(const cameraScale of[.1,1,16,40])near(shoreFishVisual('pacifica',s,{cameraScale}).length,shoreWorldMetres(.32));
 const camera=shoreActionCameraTarget('pacifica',state,{width:390,height:844,top:130,bottom:280});
 assert.ok(shoreWorldMetres(1.75)*camera.scale>=25,'close walking camera keeps the real sized angler readable');
});
test('all bent and loaded rods retain their real three-dimensional blank length',()=>{
 for(const activeRod of ['starter_rod','surf_rod'])for(const rodLift of[0,.5,1])for(const rodSweep of[-1,0,1])for(const tension of[0,.5,1]){
  const rod=shoreRodGeometry({...state,activeRod,tension,fishingControls:{rodLift,rodSweep}});
  const length=rod.nodes.slice(1).reduce((sum,p,i)=>{const a=rod.nodes[i];return sum+Math.hypot((p.x-a.x)/3.2,(p.y-a.y)/3.2,p.height-a.height);},0);
  near(length,activeRod==='starter_rod'?2.13:3.05);near(rod.butt.x,state.player.x-12*shorePersonScale());near(rod.butt.y,state.player.y-28*shorePersonScale());
 }
});
test('every physical cast begins exactly on the visible rod tip for both rods, deck heights and aim directions',()=>{
 for(const activeRod of['starter_rod','surf_rod'])for(const onPier of[false,true])for(const aim of[-1,-.5,0,.5,1]){
  const s={...state,activeRod,onPier},cast=createShoreCast('pacifica',s,{power:.6,aim});
  const release=shoreCastRelease(s,{aim}),rod=shoreRodGeometry({...s,phase:'casting',cast}),start=shoreCastPosition(cast,0),screen=shoreProjectPoint(start);
  near(screen.x,rod.tip.x);near(screen.y,rod.tip.y);near(start.x,release.x);near(start.y,release.y);near(start.height,release.height);
 }
 const beach=shoreCastRelease(state),pier=shoreCastRelease({...state,onPier:true});near(beach.x,pier.x);near(beach.y,pier.y);near(pier.height-beach.height,3.5);
});
