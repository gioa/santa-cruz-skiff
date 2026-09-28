// A shared measuring board: a fish never grows to fill its card. The same
// centimetre-to-pixel scale applies to every species and every catch on a view.
export const FISH_BOARD_SPAN_CM=152.4; // 60 in / 5 ft
const boundsCache=new WeakMap();

export function fishSpriteKind(f={}){
 const latin=f?.latin||'',name=f?.name||'';
 if(/Genyonemus/.test(latin))return'croaker';
 if(/Citharichthys sordidus/.test(latin))return'sanddab';
 if(/miniatus/.test(latin))return'vermilion';
 if(/tshawytscha/.test(latin))return'salmon';
 if(/nobilis/.test(latin))return'seabass';
 if(/Sarda/.test(latin))return'bonito';
 if(/Paralichthys/.test(latin)||name.includes('比目'))return'halibut';
 if(/Scomber/.test(latin)||name.includes('鲭'))return'mackerel';
 if(/Ophiodon/.test(latin)||name.includes('单线'))return'lingcod';
 return'rockfish';
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
 // Older or imported catches may exceed today's species maxima. Extend the
 // board by whole feet; keep the scale rather than shrinking or clipping fish.
 const spanCm=Math.max(FISH_BOARD_SPAN_CM,Math.ceil(lengthCm/30.48)*30.48);
 const spriteBounds=options.spriteBounds||{width:48,height:24};
 const fishWidth=lengthCm*pxPerCm;
 const fishHeight=spriteBounds.width>0?fishWidth*spriteBounds.height/spriteBounds.width:0;
 const width=spanCm===FISH_BOARD_SPAN_CM?Math.ceil(baseWidth):Math.ceil(spanCm*pxPerCm+padding*2);
 const height=Math.max(Math.ceil(baseHeight),Math.ceil(top+fishHeight+bottom));
 const rulerY=height-bottom+3;
 return{width,height,baseWidth,compact,padding,pxPerCm,lengthCm,spanCm,spanInches:spanCm/2.54,fishWidth,fishHeight,fishX:padding,fishY:top+(height-bottom-top-fishHeight)/2,rulerY,measurementType:f?.lengthType==='fork'?'fork':'total'};
}

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
 const tickStep=compact?6:1,labelStep=12;
 ctx.font=`${compact?7:10}px monospace`;ctx.textBaseline='top';
 for(let inch=0;inch<=spanInches+.001;inch+=tickStep){
  const x=padding+inch*2.54*pxPerCm,major=inch%labelStep===0;
  ctx.fillRect(Math.round(x),rulerY,1,major?(compact?5:11):inch%6===0?7:4);
  if(major){
   ctx.textAlign=inch===0?'left':inch>=spanInches-.001?'right':'center';
   ctx.fillText(inch===0?'0':compact?`${inch/12}′`:`${inch/12} ft`,x,rulerY+(compact?5:14));
  }
 }
 if(bounds.width&&bounds.height&&fishWidth>0){
  ctx.fillStyle='#708875';ctx.fillRect(padding,compact?2:7,1,rulerY-(compact?2:7));
  // Source sprites face right. Put the nose at the same ruler zero for all fish.
  ctx.save();ctx.translate(fishX+fishWidth,fishY);ctx.scale(-1,1);
  ctx.drawImage(sprite,bounds.x,bounds.y,bounds.width,bounds.height,0,0,fishWidth,fishHeight);ctx.restore();
  ctx.fillStyle='#456055';ctx.fillRect(Math.round(fishX+fishWidth),rulerY-(compact?3:5),1,compact?4:6);
 }
 return layout;
}
