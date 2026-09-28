import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fishSpriteKind,FISH_ART_IDENTITIES} from '../dist/pixel-fish-art.js';
import {createFishSprite} from '../dist/pixel-sprites.js';
globalThis.fetch=async url=>new Response(await readFile(url));
const {PIXEL_FISH}=await import('../dist/pixel-sim.js');
class RasterCanvas {
 constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);this.ctx={fillStyle:'#000000',imageSmoothingEnabled:false,fillRect:(x,y,w,h)=>{const c=this.ctx.fillStyle.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));for(let row=Math.max(0,y);row<Math.min(this.height,y+h);row++)for(let col=Math.max(0,x);col<Math.min(this.width,x+w);col++)this.data.set([...c,255],(row*this.width+col)*4);},getImageData:()=>({data:this.data})};}
 getContext(){return this.ctx;}
}
function sprite(kind){const old=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=RasterCanvas;try{return createFishSprite(kind);}finally{globalThis.OffscreenCanvas=old;}}
const rgb=(s,x,y)=>[...s.data.slice((y*s.width+x)*4,(y*s.width+x)*4+3)];
const digest=s=>createHash('sha256').update(s.data).digest('hex');
test('every encounter species resolves to its own nonfallback asset',()=>{assert.equal(PIXEL_FISH.length,11);const kinds=PIXEL_FISH.map(f=>fishSpriteKind(f));assert.equal(new Set(kinds).size,11);assert.ok(kinds.every(k=>!['rockfish','unknown'].includes(k)));const hashes=kinds.map(k=>digest(sprite(k)));assert.equal(new Set(hashes).size,11);});
test('scientific names, species IDs, translated names and common names resolve consistently for saved fish',()=>{for(const f of FISH_ART_IDENTITIES){assert.equal(fishSpriteKind({latin:f.latin}),f.kind);assert.equal(fishSpriteKind({scientificName:f.latin.toUpperCase()}),f.kind);for(const alias of f.aliases)for(const key of['name','commonName','speciesId'])assert.equal(fishSpriteKind({[key]:alias}),f.kind);}assert.equal(fishSpriteKind({latin:'Sebastes mystinus',name:'朱红岩鱼'}),'blue');assert.equal(fishSpriteKind('蓝岩鱼 · Blue Rockfish'),'blue');assert.equal(fishSpriteKind({name:'铜岩鱼'}),'copper');});
test('unrecognised identities cannot be silently shown as a red rockfish',()=>{for(const f of[{},null,{latin:'Sebastes ruberrimus'},{name:'Salmon shark'},{commonName:'Red mystery fish'}])assert.equal(fishSpriteKind(f),'unknown');assert.notEqual(digest(sprite('unknown')),digest(sprite('vermilion')));});
test('blue rockfish is blue-grey, copper is distinct, only vermilion uses a red flank',()=>{const blue=sprite('blue'),copper=sprite('copper'),red=sprite('vermilion');let blueCool=0,blueRed=0,redWarm=0;for(let i=0;i<blue.data.length;i+=4){const[r,g,b,a]=blue.data.slice(i,i+4);if(a&&b>r+8)blueCool++;if(a&&r>g*1.3&&r>b*1.3)blueRed++;const[rr,rg,rb,ra]=red.data.slice(i,i+4);if(ra&&rr>rg*1.3&&rr>rb*1.3)redWarm++;}assert.ok(blueCool>150);assert.equal(blueRed,0);assert.ok(redWarm>150);const pale=rgb(copper,17,12);assert.ok(pale[0]>210&&pale[1]>210&&pale[2]>180,'copper has a pale posterior lateral band');assert.notEqual(digest(blue),digest(copper));});
test('distinct diagnostic marks and silhouettes survive the native small sprites',()=>{const ling=sprite('lingcod'),salmon=sprite('salmon'),mackerel=sprite('mackerel'),flat=sprite('halibut');assert.ok(ling.data[(12*48+1)*4+3]>0,'lingcod caudal fin is filled, not deeply forked');assert.ok(flat.data[(12*48+1)*4+3]>0,'halibut tail is filled');assert.ok(salmon.data[(9*48+5)*4+3]>0);assert.notDeepEqual(rgb(mackerel,18,9),rgb(mackerel,19,13),'mackerel striped back differs from silver belly');for(const f of PIXEL_FISH){const s=sprite(fishSpriteKind(f));assert.ok(s.data.filter((v,i)=>i%4===3&&v).length>100);}});
