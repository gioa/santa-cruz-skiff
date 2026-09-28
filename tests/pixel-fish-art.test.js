import test from 'node:test';
import assert from 'node:assert/strict';
import {fishArtLayout,fishSpriteBounds,fishSpriteKind,drawFishArt,FISH_BOARD_SPAN_CM} from '../dist/pixel-fish-art.js';

function sprite(width,height,opaque){
 let reads=0;const data=new Uint8ClampedArray(width*height*4);
 for(const[x,y]of opaque)data[(y*width+x)*4+3]=255;
 return{width,height,reads:()=>reads,getContext:()=>({getImageData:()=>{reads++;return{data};}})};
}
function canvas(){
 const calls=[];const ctx={fillRect(...args){calls.push(['fillRect',...args]);},fillText(...args){calls.push(['fillText',...args]);},beginPath(){},rect(...args){calls.push(['clipRect',...args]);},clip(){calls.push(['clip']);},save(){},restore(){},translate(...args){calls.push(['translate',...args]);},scale(...args){calls.push(['scale',...args]);},drawImage(...args){calls.push(['drawImage',...args]);}};
 return{width:0,height:0,ctx,calls,getContext:()=>ctx};
}

test('all fish lengths use one linear board scale, including small catches',()=>{
 for(const options of[{width:300,height:180},{width:480,height:248},{width:96,height:48,compact:true}]){
  const small=fishArtLayout({length:20},options),large=fishArtLayout({length:100},options);
  assert.equal(large.fishWidth/small.fishWidth,5);
  assert.equal(small.pxPerCm,large.pxPerCm);
  assert.equal(small.spanCm,FISH_BOARD_SPAN_CM);assert.equal(large.spanCm,FISH_BOARD_SPAN_CM);
  assert.equal(small.width,large.width);assert.equal(small.fishX,large.fishX);
  assert.equal(small.width,options.width,'floating point roundoff must not add horizontal overflow');
  assert.ok(small.fishWidth<small.width*.17,'a small fish must remain small on the board');
 }
 for(const width of[250,337,351,365,390,415])assert.equal(fishArtLayout({length:53},{width}).width,width);
});

test('oversize catches keep the same scale on a fixed 48-inch clipped board',()=>{
 const normal=fishArtLayout({length:100},{width:300,height:180});
 const large=fishArtLayout({length:250},{width:300,height:180});
 assert.equal(large.pxPerCm,normal.pxPerCm);assert.equal(large.width,normal.width);
 assert.equal(large.spanInches,48);assert.equal(large.lengthCm,250);
 assert.equal(large.fishWidth,normal.fishWidth*2.5);assert.ok(large.fishX+large.fishWidth>large.width);
 const board=canvas();drawFishArt(board,sprite(48,24,[[0,0],[47,23]]),{length:250},{width:300});
 assert.ok(board.calls.some(c=>c[0]==='clipRect'&&c[1]===16&&c[3]===268));
 assert.ok(board.calls.some(c=>c[0]==='clip'));
});

test('opaque sprite bounds exclude transparent margins once and include both endpoints',()=>{
 const art=sprite(48,24,[[4,3],[43,20],[21,9]]);
 assert.deepEqual(fishSpriteBounds(art),{x:4,y:3,width:40,height:18});
 assert.deepEqual(fishSpriteBounds(art),{x:4,y:3,width:40,height:18});assert.equal(art.reads(),1);
 const empty=sprite(48,24,[]);assert.deepEqual(fishSpriteBounds(empty),{x:0,y:0,width:0,height:0});
});

test('drawing crops transparent borders, preserves species aspect, and puts the head at ruler zero',()=>{
 const art=sprite(48,24,[[4,3],[43,20]]),board=canvas();
 const layout=drawFishArt(board,art,{length:76.2},{width:300,height:180});
 const draw=board.calls.find(c=>c[0]==='drawImage');
 assert.deepEqual(draw.slice(2,8),[4,3,40,18,0,0]);
 assert.equal(draw[8],layout.fishWidth);assert.equal(draw[9],layout.fishWidth*18/40);
 assert.ok(board.calls.some(c=>c[0]==='scale'&&c[1]===-1&&c[2]===1));
 const translate=board.calls.find(c=>c[0]==='translate');assert.equal(translate[1]-layout.fishWidth,layout.padding);
 assert.equal(board.width,layout.width);assert.equal(board.height,layout.height);assert.equal(board.ctx.imageSmoothingEnabled,false);
 assert.ok(board.calls.some(c=>c[0]==='fillText'&&c[1]==='48 in'));
});

test('same measured length has the same silhouette width across sprites with different padding',()=>{
 const narrow=sprite(48,24,[[12,6],[35,17]]),wide=sprite(48,24,[[1,2],[46,22]]);
 const a=drawFishArt(canvas(),narrow,{length:50},{width:96,height:48,compact:true});
 const b=drawFishArt(canvas(),wide,{length:50},{width:96,height:48,compact:true});
 assert.equal(a.fishWidth,b.fishWidth);assert.notEqual(a.fishHeight,b.fishHeight);
 assert.equal(a.pxPerCm,b.pxPerCm);
});

test('species selection and fork-length metadata survive common and scientific names',()=>{
 for(const[latin,kind]of[['Genyonemus lineatus','croaker'],['Citharichthys sordidus','sanddab'],['Paralichthys californicus','halibut'],['Ophiodon elongatus','lingcod'],['Scomber japonicus','mackerel'],['Sebastes miniatus','vermilion'],['Oncorhynchus tshawytscha','salmon'],['Atractoscion nobilis','seabass'],['Sarda chiliensis lineolata','bonito'],['Sebastes mystinus','blue']])assert.equal(fishSpriteKind({latin}),kind);
 assert.equal(fishSpriteKind({name:'长蛇齿单线鱼'}),'lingcod');
 assert.equal(fishArtLayout({length:50,lengthType:'fork'}).measurementType,'fork');
 assert.equal(fishArtLayout({length:50}).measurementType,'total');
 assert.equal(fishArtLayout({length:NaN}).fishWidth,0);
 assert.equal(fishArtLayout({length:-20}).fishWidth,0);
});
