import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutWorldAction} from '../dist/pixel-action-layout.js';

const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const bounds=(width=390,height=844)=>({width,height,top:height<500?116:124,bottom:18});
function checkPlacement(result,b,occupied=[]){
  const r=result.rect;assert.ok(r.left>=10&&r.right<=b.width-10,JSON.stringify({r,b}));assert.ok(r.top>=b.top&&r.bottom<=b.height-b.bottom,JSON.stringify({r,b}));assert.equal(result.x,(r.left+r.right)/2);assert.equal(result.y,r.bottom);assert.ok(Number.isInteger(result.x)&&Number.isInteger(result.y));
  for(const other of occupied)assert.equal(overlap(r,other),0,JSON.stringify({r,other}));
}
test('an unobstructed button stays at its object without moving input rectangles',()=>{
  const desired={x:165,y:300,width:92,height:44},b=bounds(),occupied=[{left:16,top:719,right:122,bottom:825}],copy=structuredClone({desired,b,occupied});
  const result=layoutWorldAction(desired,b,occupied);assert.equal(result.x,desired.x);assert.equal(result.y,desired.y);assert.deepEqual({desired,b,occupied},copy);checkPlacement(result,b,occupied);
});
test('buttons clamp inside each edge with a full 44 pixel hit area',()=>{
  for(const [width,height]of[[390,844],[320,568],[568,320]])for(const [x,y]of[[-40,5],[width+40,5],[-40,height+40],[width+40,height+40]]){
    const b=bounds(width,height),result=layoutWorldAction({x,y,width:116,height:44},b);checkPlacement(result,b);assert.equal(result.rect.height,44);
  }
});
test('the boarding or unmoor action keeps priority when a secondary button is nearby',()=>{
  for(const [width,height]of[[390,844],[320,568],[568,320]]){
    const b=bounds(width,height),primary=layoutWorldAction({x:width/2,y:height*.5-76,width:116,height:44},b),more=layoutWorldAction({x:width/2+38,y:height*.5-82,width:54,height:44},b,[primary.rect]);checkPlacement(primary,b);checkPlacement(more,b,[primary.rect]);
  }
});
test('rotated engine, anchor and boat buttons avoid one another on phones and landscape',()=>{
  for(const [width,height]of[[390,844],[320,568],[568,320]])for(const horizontal of[.3,.5,.7])for(const vertical of[.31,.47,.68])for(let step=0;step<16;step++){
    const b=bounds(width,height),heading=step*Math.PI/8,portrait=height>width*1.12,logicalWidth=portrait?Math.min(360,Math.max(300,Math.round(width*.84))):Math.min(800,Math.max(560,Math.round(width/2))),spriteScale=1.08*width/logicalWidth,boat={x:width*horizontal,y:height*vertical};
    const controls=[{x:boat.x+38,y:boat.y-82,width:54,height:44},{x:boat.x+Math.sin(heading)*38*spriteScale-55,y:boat.y+Math.cos(heading)*38*spriteScale-82,width:92,height:44},{x:boat.x+79,y:boat.y-8,width:70,height:44}];
    for(const order of[[0,1,2],[1,2,0]]){const occupied=[];for(const index of order){const placed=layoutWorldAction(controls[index],b,occupied);checkPlacement(placed,b,occupied);occupied.push(placed.rect);}}
  }
});
test('joystick and fish-status DOMRects can reserve thumb and display regions',()=>{
  const b=bounds(),joystick={x:16,y:719,width:106,height:106},fish={x:82,y:132,width:225,height:100};
  for(const desired of[{x:80,y:774,width:92,height:44},{x:195,y:204,width:70,height:44}]){
    const result=layoutWorldAction(desired,b,[joystick,fish]);checkPlacement(result,b,[{left:16,top:719,right:122,bottom:825},{left:82,top:132,right:307,bottom:232}]);
  }
});
test('fully occupied layouts return a deterministic visible fallback',()=>{
  const b=bounds(320,568),occupied=[{left:0,top:0,right:320,bottom:568}],desired={x:165,y:290,width:92,height:44};
  const first=layoutWorldAction(desired,b,occupied);checkPlacement(first,b);assert.deepEqual(layoutWorldAction(desired,b,occupied),first);
});
