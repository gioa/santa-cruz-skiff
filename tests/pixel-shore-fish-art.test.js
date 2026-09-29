import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFishSprite,createPixelSprites} from '../dist/pixel-sprites.js';

// The sprite painter only uses integer fillRect calls. Record native RGBA pixels
// without a browser so silhouette, colour and pattern checks use the actual art.
class RasterCanvas {
 constructor(width,height){
  this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);
  this.ctx={fillStyle:'#000000',imageSmoothingEnabled:false,fillRect:(x,y,w,h)=>{
   const rgba=this.ctx.fillStyle.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16));
   if(rgba.length===3)rgba.push(255);
   for(let row=Math.max(0,y);row<Math.min(this.height,y+h);row++)
    for(let col=Math.max(0,x);col<Math.min(this.width,x+w);col++)this.data.set(rgba,(row*this.width+col)*4);
  },getImageData:()=>({data:this.data})};
 }
 getContext(){return this.ctx;}
}
function render(paint){const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=RasterCanvas;try{return paint();}finally{globalThis.OffscreenCanvas=previous;}}
const sprite=kind=>render(()=>createFishSprite(kind));
const rgba=(art,x,y)=>Array.from(art.data.slice((y*art.width+x)*4,(y*art.width+x)*4+4));
const digest=art=>createHash('sha256').update(art.data).digest('hex');
function count(art,predicate,{left=0,right=art.width,top=0,bottom=art.height}={}){let n=0;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(predicate(rgba(art,x,y)))n++;return n;}
const warm=([r,g,b,a])=>a>0&&r>g*1.25&&r>b*1.4;
const silver=([r,g,b,a])=>a>0&&r>175&&g>175&&b>175;

test('both shore species have independent nonempty 48 by 24 sprites in the shared sprite map',()=>{
 const mapped=render(createPixelSprites),perch=sprite('surfperch'),bass=sprite('striped_bass');
 for(const[kind,art]of[['surfperch',perch],['striped_bass',bass]]){
  assert.deepEqual([art.width,art.height],[48,24]);
  assert.ok(count(art,pixel=>pixel[3]>0)>200,`${kind} has a visible native silhouette`);
  assert.equal(digest(mapped.fish[kind]),digest(art));
  for(const fallback of['unknown','rockfish'])assert.notEqual(digest(art),digest(sprite(fallback)));
 }
 assert.notEqual(digest(perch),digest(bass));
});

test('redtail surfperch has a deep silver body with warm tail, anal and pelvic fins',()=>{
 const perch=sprite('surfperch'),bass=sprite('striped_bass');
 assert.ok(count(perch,silver,{left:17,right:35,top:10,bottom:19})>65,'large pale silver flank');
 assert.ok(count(perch,warm,{left:3,right:11,top:7,bottom:18})>8,'red-orange caudal fin');
 assert.ok(count(perch,warm,{left:16,right:27,top:18,bottom:23})>7,'red-orange anal fin');
 assert.ok(count(perch,warm,{left:31,right:38,top:18,bottom:24})>4,'red-orange pelvic fin');
 const middleDepth=art=>count(art,pixel=>pixel[3]>0,{left:24,right:25,top:8,bottom:22});
 assert.ok(middleDepth(perch)>middleDepth(bass)+2,'perch body is deeper than the bass at mid-flank');
});

test('striped bass has multiple longitudinal dark bands separated by silver and a forked tail',()=>{
 const bass=sprite('striped_bass');
 const dark=([r,g,b,a])=>a>0&&r<90&&g<100&&b<110;
 for(const row of[9,11,13,15])assert.ok(count(bass,dark,{left:20,right:31,top:row,bottom:row+1})>=9,`continuous flank stripe at row ${row}`);
 for(const row of[10,12,14])assert.ok(count(bass,silver,{left:20,right:31,top:row,bottom:row+1})>=8,`silver between stripes at row ${row}`);
 assert.equal(rgba(bass,2,12)[3],0,'transparent notch between tail lobes');
 assert.ok(rgba(bass,2,6)[3]>0&&rgba(bass,2,18)[3]>0,'both tail lobes remain visible');
 assert.equal(count(bass,warm),0,'no redtail fin colours reused on the bass');
});

test('adding shore species leaves every pre-existing fish sprite pixel-identical',()=>{
 const original={
  unknown:'954fb799cc1b3d3364cc4d67bd4cd44cc49fe8765174c667b1986325681b0eb9',
  anchovy:'28501d8636ed04124f4c4f9201d7d32e790f503e67acdb2f19bb2f3e922830b3',
  sardine:'5e12e06b4b87d28c3814a5883b59cb95a54615d84df4cfecdd3dffe81cf1c816',
  blue:'31d564fcfc22ccc641dcf26838a533b56850a99efb4eb5608b4afa45a0851027',
  copper:'de3fd26c48783125fd911e9be94b1a93bde94ca5044c01083db8bd53e90a9329',
  rockfish:'8f2efb0b4caa37d5f3b01c5660290719d7e3e8c8ddcaba65c7aa036488e3c4ce',
  vermilion:'620ee393f516b17c900200af37559003cfa7caf53a91b2eec198f776bf050adf',
  halibut:'1780b8896285ca35e13598ec836e9dc88031aa4572fd2f67deac1e2dd4976ba7',
  mackerel:'6fc219df8025d657d136ac78c231aa3e143b0410aeaf3a46a5198f0e031b7d5a',
  lingcod:'e2653b633c2b1a4697bac0f7d6ecbae3ba9450ddd833c78d3356a4f64ed5f2f4',
  salmon:'afcbc26f21fcc9191e376689aff0603f2480c4f4ce28920ea70c2a7427c91436',
  seabass:'62f213c8e86e42fab29f5ec43a05024ac1f36b7b587fde1ec89685c97516d7e0',
  bonito:'b01f2832c0497c7dc2ef838fd30da48e36501682f70b302aecad85ca5737ef04',
  croaker:'4fa750310cff56ab91de332d9894eb48c04be6686bc832d6662d0c7798cd83f1',
  sanddab:'117a00edcfe8ed7575270abcf15fa2087de57862fde71250fd7c0631dc1b36cb',
 };
 for(const[kind,hash]of Object.entries(original))assert.equal(digest(sprite(kind)),hash,kind);
});
