import {fishBodyPose,drawFishBody} from './pixel-fish-motion.js?v=20260928-pixel-v75';
// A shared measuring board: a fish never grows to fill its card. The same
// centimetre-to-pixel scale applies to every species and every catch on a view.
export const FISH_BOARD_SPAN_CM=121.92; // 48 in
const boundsCache=new WeakMap();

// Exact identity mapping shared by catch cards, history, cooler and fight view.
// A missing identity must not silently become a red rockfish.
export const FISH_ART_IDENTITIES=Object.freeze([
 {kind:'blue',latin:'Sebastes mystinus',aliases:['blue_rockfish','blue rockfish','蓝岩鱼']},
 {kind:'copper',latin:'Sebastes caurinus',aliases:['copper_rockfish','copper rockfish','铜岩鱼']},
 {kind:'vermilion',latin:'Sebastes miniatus',aliases:['vermilion_rockfish','vermilion rockfish','朱红岩鱼','红岩鱼']},
 {kind:'halibut',latin:'Paralichthys californicus',aliases:['california_halibut','california halibut','加州大比目鱼','加州比目鱼']},
 {kind:'mackerel',latin:'Scomber japonicus',aliases:['pacific_mackerel','pacific mackerel','pacific chub mackerel','太平洋鲭鱼']},
 {kind:'lingcod',latin:'Ophiodon elongatus',aliases:['lingcod','长蛇齿单线鱼','灵鳕']},
 {kind:'salmon',latin:'Oncorhynchus tshawytscha',aliases:['chinook_salmon','chinook salmon','king salmon','帝王鲑','奇努克鲑']},
 {kind:'seabass',latin:'Atractoscion nobilis',aliases:['white_seabass','white seabass','wsb','白海鲈','白海鲈鱼','白鲈']},
 {kind:'bonito',latin:'Sarda chiliensis lineolata',aliases:['pacific_bonito','pacific bonito','Sarda chiliensis','Sarda lineolata','太平洋狐鲣','太平洋鲣']},
 {kind:'croaker',latin:'Genyonemus lineatus',aliases:['white_croaker','white croaker','白石首鱼']},
 {kind:'sanddab',latin:'Citharichthys sordidus',aliases:['pacific_sanddab','pacific sanddab','太平洋沙鲽']},
 {kind:'anchovy',latin:'Engraulis mordax',aliases:['northern_anchovy','northern anchovy','北方鳀鱼','鳀鱼']},
 {kind:'sardine',latin:'Sardinops sagax',aliases:['pacific_sardine','pacific sardine','太平洋沙丁鱼','沙丁鱼']},
 {kind:'rockfish',latin:'Sebastes melanops',aliases:['black_rockfish','black rockfish','黑岩鱼']},
].map(f=>Object.freeze({...f,aliases:Object.freeze(f.aliases)})));
const normalizeFishName=value=>String(value||'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
const artByName=new Map(FISH_ART_IDENTITIES.flatMap(f=>[f.kind,f.latin,...f.aliases].map(name=>[normalizeFishName(name),f.kind])));
export function fishSpriteKind(f={}){
 const fish=typeof f==='string'?{name:f}:f||{};
 // Scientific identity takes priority over a translated or stale display name.
 for(const value of [fish.latin,fish.scientificName,fish.speciesId,fish.id,fish.name,fish.commonName]){
  for(const name of String(value||'').split('·')){const kind=artByName.get(normalizeFishName(name));if(kind)return kind;}
 }
 return 'unknown';
}

// The authored 48 x 24 sprites have different transparent margins. Measure
// their visible silhouettes once, so those margins cannot distort fish length.
export function fishSpriteBounds(sprite){
 if(!sprite)return{x:0,y:0,width:0,height:0};
 if(boundsCache.has(sprite))return boundsCache.get(sprite);
 const width=Math.max(0,Math.floor(sprite.width||0)),height=Math.max(0,Math.floor(sprite.height||0));
 let bounds={x:0,y:0,width,height};
 try{
  const data=sprite.getContext('2d').getImageData(0,0,width,height).data;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  bounds=right<left?{x:0,y:0,width:0,height:0}:{x:left,y:top,width:right-left+1,height:bottom-top+1};
 }catch{/* A foreign image without readable pixels retains its original bounds. */}
 Object.freeze(bounds);boundsCache.set(sprite,bounds);return bounds;
}

export function fishArtLayout(f={},options={}){
 const compact=Boolean(options.compact),baseWidth=Math.max(compact?48:120,Number(options.width)||480);
 const baseHeight=Math.max(24,Number(options.height)||(compact?48:248));
 const padding=compact?3:16,top=compact?3:12,bottom=compact?13:38;
 const pxPerCm=(baseWidth-padding*2)/FISH_BOARD_SPAN_CM;
 const lengthCm=Number.isFinite(Number(f?.length))?Math.max(0,Number(f.length)):0;
 // Keep a fixed 48-inch board. Oversize fish retain scale and clip at its end.
 const spanCm=FISH_BOARD_SPAN_CM;
 const spriteBounds=options.spriteBounds||{width:48,height:24};
 const fishWidth=lengthCm*pxPerCm;
 const fishHeight=spriteBounds.width>0?fishWidth*spriteBounds.height/spriteBounds.width:0;
 const width=Math.ceil(baseWidth);
 const height=Math.max(Math.ceil(baseHeight),Math.ceil(top+fishHeight+bottom));
 const rulerY=height-bottom+3;
 return{width,height,baseWidth,compact,padding,pxPerCm,lengthCm,spanCm,spanInches:spanCm/2.54,fishWidth,fishHeight,fishX:padding,fishY:top+(height-bottom-top-fishHeight)/2,rulerY,measurementType:f?.lengthType==='fork'?'fork':'total'};
}

const lengthWithinBoard=layout=>layout.lengthCm<=layout.spanCm;

export function drawFishArt(canvas,sprite,f={},options={}){
 const bounds=fishSpriteBounds(sprite),layout=fishArtLayout(f,{...options,spriteBounds:bounds});
 canvas.width=layout.width;canvas.height=layout.height;
 const ctx=canvas.getContext('2d');if(!ctx)return layout;
 const{width,height,compact,padding,pxPerCm,rulerY,fishX,fishY,fishWidth,fishHeight,spanInches}=layout;
 ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#c2d4b7';ctx.fillRect(0,0,width,height);
 // Quiet, straight measuring-board seams also provide a common physical frame.
 ctx.fillStyle='#b5c9ad';for(let y=compact?12:32;y<rulerY;y+=compact?12:32)ctx.fillRect(0,y,width,1);
 ctx.fillStyle='#ecdfb9';ctx.fillRect(0,rulerY,width,height-rulerY);
 ctx.fillStyle='#456055';ctx.fillRect(padding,rulerY,width-padding*2,1);
 const tickStep=compact?6:1,labelStep=compact?24:12;
 ctx.font=`${compact?7:10}px monospace`;ctx.textBaseline='top';
 for(let inch=0;inch<=spanInches+.001;inch+=tickStep){
  const x=padding+inch*2.54*pxPerCm,major=inch%labelStep===0;
  ctx.fillRect(Math.round(x),rulerY,1,major?(compact?5:11):inch%6===0?7:4);
  if(major){
   ctx.textAlign=inch===0?'left':inch>=spanInches-.001?'right':'center';
   ctx.fillText(inch===0?'0':inch===48?'48 in':String(inch),x,rulerY+(compact?5:14));
  }
 }
 if(bounds.width&&bounds.height&&fishWidth>0){
  ctx.fillStyle='#708875';ctx.fillRect(padding,compact?2:7,1,rulerY-(compact?2:7));
  // Source sprites face right. Put the nose at the same ruler zero for all fish.
  ctx.save();ctx.beginPath();ctx.rect(padding,0,width-padding*2,rulerY);ctx.clip();ctx.translate(fishX+fishWidth,fishY);ctx.scale(-1,1);
  const pose=options.animate?fishBodyPose(fishSpriteKind(f),{time:options.time||0,mass:f.kg,energy:options.energy??.6,landed:true,reducedMotion:options.reducedMotion}):null;
  drawFishBody(ctx,sprite,bounds,{length:fishWidth,height:fishHeight,pose:pose?{...pose,pitch:0}:null});ctx.restore();
  if(lengthWithinBoard(layout)){ctx.fillStyle='#456055';ctx.fillRect(Math.round(fishX+fishWidth),rulerY-(compact?3:5),1,compact?4:6);}
 }
 return layout;
}
