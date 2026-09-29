import {formatLength,formatWeight} from './units.js';
import {fishSpriteKind,fishSpriteBounds} from './pixel-fish-art.js';
export function sabikiCatchMarkup(fish){
 return `<p class="modal-desc">${fish.length} 条 · ${formatWeight(fish.reduce((n,f)=>n+f.kg,0))}</p><canvas id="sabiki-catch-art" role="img" aria-label="本次六钩 Sabiki 鱼获，按同一把 12 英寸尺显示" style="display:block;width:100%;height:auto;image-rendering:pixelated"></canvas><div class="button-row"><button class="primary" id="keep-fish">全部收入冰箱</button><button class="secondary" id="release-fish">全部记录并放流</button></div>`;
}
export function drawSabikiCatch(canvas,fish,sprites){
 if(!canvas)return;canvas.width=360;canvas.height=28+fish.length*68;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#c2d4b7';c.fillRect(0,0,canvas.width,canvas.height);
 const left=18,scale=324/30.48;c.fillStyle='#456055';c.font='9px monospace';
 for(let inch=0;inch<=12;inch++){const x=left+inch*2.54*scale;c.fillRect(x,12,1,inch%3?4:7);if(inch%3===0)c.fillText(`${inch}`,x-3,9);}
 fish.forEach((f,i)=>{const y=30+i*68,asset=sprites.fish[fishSpriteKind(f)],crop=fishSpriteBounds(asset),width=f.length*scale,height=crop.width?width*crop.height/crop.width:0;c.fillStyle='#aec4a6';c.fillRect(left,y+39,324,1);
  if(crop.width){c.save();c.translate(left+width,y);c.scale(-1,1);c.drawImage(asset,crop.x,crop.y,crop.width,crop.height,0,0,width,height);c.restore();}
  c.fillStyle='#264b4a';c.font='11px sans-serif';c.fillText(`${i+1}. ${f.name} · ${formatLength(f.length)} · ${formatWeight(f.kg)}`,left,y+57);
 });
 canvas.dataset.catchCount=String(fish.length);
}
