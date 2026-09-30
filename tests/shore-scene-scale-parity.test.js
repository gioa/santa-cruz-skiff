import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacificaWorld} from '../dist/pacifica-world.js';
import {createBeniciaWorld} from '../dist/benicia-world.js';
import {getShoreScene} from '../dist/shore-data.js';

function canvas(width=900,height=600){
 const bounds={left:0,top:0,width,height};
 const ctx=new Proxy({}, {get:(obj,key)=>key in obj?obj[key]:()=>{}});
 return{width,height,getContext:()=>ctx,getBoundingClientRect:()=>bounds};
}
globalThis.document={createElement:()=>canvas()};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

for(const [width,height] of [[390,844],[844,390],[900,700],[1440,900]]){
 test(`all shore scenes share original CSS artwork and camera scale at ${width}x${height}`,()=>{
  for(const phase of ['walk','charging','casting','waiting','fighting']){
   const player={x:1800,y:720},state={phase:phase==='charging'?'walk':phase,elapsed:5,player,
    castCharge:phase==='charging'?.65:0,rig:'carolina',tension:.3,lineDistance:24,
    seaState:{waveHeightM:0,tideM:1.2},
    ...(['casting','waiting','fighting'].includes(phase)?{cast:{origin:player,target:{x:1848,y:602},distance:40,fightDistance:40,flight:.3}}:{}),
    ...(phase==='fighting'?{fish:{id:'jacksmelt',length:32,weightKg:.3},fishMotion:{depth:.6,airHeight:0,lateral:0,energy:.6,run:1,phase:'run'}}:{})};
   const frames=['pacifica','half-moon-bay','benicia'].map(id=>{
    // Use the same geometry relative to each coast, so a different shoreline
    // does not correctly clamp one fish farther offshore than another.
    const dy=getShoreScene(id).shoreY(player.x)+20-player.y;
    const positioned={...state,player:{...player,y:player.y+dy},
     ...(state.cast?{cast:{...state.cast,origin:{...player,y:player.y+dy},target:{...state.cast.target,y:state.cast.target.y+dy}}}:{})};
    const art=canvas(width,height),world=id==='benicia'?createBeniciaWorld(art):createPacificaWorld(art,{sceneId:id});
    world.resize(width,height);world.setInsets({top:130,bottom:180,left:0,right:0});
    const shot=world.draw(positioned,5),cssScale=shot.camera.scale*width/art.width;
    const projected=world.worldToScreen(positioned.player),roundTrip=world.screenToWorld(projected.clientX,projected.clientY);
    assert.ok(Math.abs(roundTrip.x-player.x)<=1/shot.camera.scale);
    assert.ok(Math.abs(roundTrip.y-positioned.player.y)<=1/shot.camera.scale);
    return{shot,cssScale,width:art.width,height:art.height};
   });
   for(const actual of frames.slice(1)){
    near(actual.cssScale,frames[0].cssScale);
    assert.equal(actual.width,frames[0].width);assert.equal(actual.height,frames[0].height);
    near(actual.shot.actionCamera.desiredScale,frames[0].shot.actionCamera.desiredScale);
    assert.deepEqual(actual.shot.actionCamera.safeBounds,frames[0].shot.actionCamera.safeBounds);
   }
  }
 });
}
