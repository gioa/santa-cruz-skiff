import test from 'node:test';
import assert from 'node:assert/strict';
import {createBeniciaWorld} from '../dist/benicia-world.js';

function canvas(width,height){
 const rocks=[];let path=[];
 const ctx=new Proxy({
  beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},
  fill(){if(this.fillStyle==='#657672')rocks.push(path.map(p=>[...p]));},
 },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 return{width,height,rocks,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height})};
}

for(const [width,height] of [[390,844],[1440,900]]){
 test(`Benicia shoreline rock positions and shapes stay fixed while walking at ${width}x${height}`,()=>{
  const art=canvas(width,height),world=createBeniciaWorld(art);
  world.resize(width,height);world.setInsets({top:120,bottom:120});
  const state={phase:'walk',elapsed:0,player:{x:1600,y:680},crowd:[]};
  let baseline;
  // Cross alternating six-unit terrain sampling boundaries in both directions.
  // Compare world geometry in the common visible area, not screen coordinates.
  for(const dx of [0,3,6,9,12,24,12,6,0,-6]){
   art.rocks.length=0;world.focus(1600+dx,650);world.draw(state,0);
   const middle=art.rocks.filter(p=>{
    const xs=p.map(q=>q[0]),center=(Math.min(...xs)+Math.max(...xs))/2;
    return center>=1460&&center<=1720;
   });
   assert.ok(middle.length>=15,'fixture includes a continuous stretch of bank rocks');
   if(!baseline)baseline=middle;
   else assert.deepEqual(middle,baseline,`camera pan ${dx} must not regenerate or shift rocks`);
  }
 });
}
