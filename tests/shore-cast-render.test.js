import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacificaWorld} from '../dist/pacifica-world.js';
import {getShoreScene} from '../dist/shore-data.js';
import {shoreFishPosition} from '../dist/shore-line-geometry.js';

function canvas(){
  const ctx=new Proxy({},{get:(value,key)=>key in value?value[key]:()=>{}});
  return{width:900,height:600,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})};
}
globalThis.document={createElement:canvas};

test('shore casting renders metre-scale flight from the launch origin through the physical samples',()=>{
  const scene=getShoreScene('pacifica'),x=2440,y=scene.shoreY(x);
  const trajectory=[{t:0,x,y:y-2,height:1.5},{t:.4,x:x+9,y:y-13,height:2.2},{t:.8,x:x+12,y:y-34,height:0}];
  const cast={origin:{x,y:y-2},target:{x:x+12,y:y-34},distance:Math.hypot(12,32)/3.2,flightDuration:.8,trajectory};
  const state={phase:'casting',elapsed:0,player:{x,y:y+16},cast};
  const world=createPacificaWorld(canvas());world.resize(900,600);
  for(const point of trajectory){
    cast.flight=point.t;
    const rendered=world.draw(state,point.t);
    assert.deepEqual(rendered.castTarget,world.worldToScreen(point.x,point.y-point.height*3.2));
  }
  state.phase='waiting';
  assert.deepEqual(world.draw(state,1).castTarget,world.worldToScreen(cast.target));
});

test('overhead fighting uses actual deployed-line geometry, matching the first-person fish position',()=>{
  const scene=getShoreScene('pacifica'),x=2440,y=scene.shoreY(x),world=createPacificaWorld(canvas());
  world.resize(900,600);
  const state={phase:'fighting',elapsed:4,player:{x,y:y+16},lineDistance:40,tension:.5,
    cast:{origin:{x,y:y-2},target:{x:x+64,y:y-315},distance:30,fightDistance:100}};
  const position=shoreFishPosition(scene,state);
  assert.deepEqual(world.draw(state,4).castTarget,world.worldToScreen(position));
});
