import {drawShorePerson} from './shore-people.js';
import {ANGLERS} from './shore-lore.js';
// Shared pixel-art shoreline renderer. Fixed bathymetry, animated surf and
// game collision geometry all use shore-data; the camera follows a long coast.
import {getShoreScene, sampleShore, shoreSurfField, onPier} from './shore-data.js';
import {shoreCastPosition} from './shore-casting.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {shoreWaterContact,shoreTackleLine,shoreRigUsesFloat,shoreLineWaterEntry} from './shore-tackle-visual.js';
import {shoreRodPose,shoreActionCameraTarget,advanceShoreActionCamera,shoreFishVisual,drawShoreFish,shoreCastPreviewVisual,drawShoreCastPreview} from './shore-action-view.js';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=(x,y=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
// Smooth value noise in [0, 1]: 1-D along the coast and 2-D for foam patches.
const smooth=t=>t*t*(3-2*t);
const vnoise=(x,seed)=>{const i=Math.floor(x),f=smooth(x-i),a=noise(i,seed),b=noise(i+1,seed);return a+(b-a)*f;};
const vnoise2=(x,y,seed=0)=>{const i=Math.floor(x),j=Math.floor(y),fx=smooth(x-i),fy=smooth(y-j),h=(a,b)=>noise(a+seed*7919,b);
  const top=h(i,j)+(h(i+1,j)-h(i,j))*fx,bottom=h(i,j+1)+(h(i+1,j+1)-h(i,j+1))*fx;return top+(bottom-top)*fy;};
const hexRGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mixTone=(a,b,t)=>{const p=hexRGB(a),q=hexRGB(b);return`rgb(${p.map((v,i)=>Math.round(v+(q[i]-v)*t)).join(',')})`;};
const FONT={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],'&':['01100','10010','10100','01000','10101','10010','01101'],'/':['00001','00001','00010','00100','01000','10000','10000'],'-':['00000','00000','00000','11111','00000','00000','00000'],' ':['000'],0:['01110','10001','10011','10101','11001','10001','01110'],1:['010','110','010','010','010','010','111'],2:['01110','10001','00001','00110','01000','10000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['10010','10010','10010','11111','00010','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110']};

export function createPacificaWorld(canvas,{sceneId='pacifica'}={}){
  const scene=getShoreScene(sceneId),hmb=scene.id==='half-moon-bay';
  const C={ink:'#314e51',darkGrass:'#536f5d',coral:'#c97459',...scene.palette};
  const ctx=canvas.getContext('2d',{alpha:false});
  const camera={x:scene.spawn.x,y:scene.spawn.y-150,scale:.65,width:900,height:600};
  let cssWidth=900,cssHeight=600,insets={top:90,bottom:200},now=0,lastTime=null,lastState=null,manualFocus=null,initialized=false,b=null,lastTackle=null,drawOptions={};
  const chunkSize=512,chunks=new Map();let deepTile=null;
  const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function poly(g,pts,c){g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();}
  function line(g,x0,y0,x1,y1,c,w=2){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(let i=0;i<4000;i++){R(g,x0,y0,w,w,c);if(x0===x1&&y0===y1)break;const e=err*2;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}}
  function text(g,label,x,y,size=2,color=C.ink,align='center'){
    const chars=[...label.toUpperCase()].map(c=>FONT[c]||FONT[' ']);const width=chars.reduce((n,p)=>n+(p[0].length+1)*size,0)-size;
    let px=x-(align==='center'?width/2:0);for(const glyph of chars){for(let row=0;row<glyph.length;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')R(g,px+col*size,y+row*size,size,size,color);px+=(glyph[0].length+1)*size;}
  }
  function shadow(g,x,y,w=26,h=8,alpha=.16){g.globalAlpha=alpha;R(g,x-w/2+4,y-h/2,w-8,h,'#375454');R(g,x-w/2,y-h/2+2,w,h-4,'#375454');g.globalAlpha=1;}
  function grass(g,x,y,size=1,tone=C.grass){
    shadow(g,x,y+2,21*size,5*size,.09);for(let i=0;i<5;i++){const lean=(i-2)*4*size;line(g,x+(i-2)*2*size,y,x+lean,y-(6+noise(i,x)*10)*size,tone,2*size);}R(g,x-8*size,y,18*size,2*size,'#a3a879');
  }
  function rock(g,x,y,w,h){shadow(g,x+4,y+3,w+10,9,.16);poly(g,[[x-w/2,y],[x-w/2,y-h*.6],[x-w*.25,y-h],[x+w*.2,y-h],[x+w/2,y-h*.55],[x+w/2,y]],'#7a8d83');poly(g,[[x-w/2+3,y-h*.6],[x-w*.25,y-h],[x+w*.2,y-h],[x+w*.37,y-h*.6]],'#afbaa0');R(g,x-w*.3,y-h*.55,w*.5,2,'#c2c7ac');R(g,x+w*.24,y-h*.5,3,h*.5,'#5b756f');}
  function crate(g,x,y,size=21){shadow(g,x+size/2,y+size,25,6,.16);R(g,x,y,size,size,'#886c4e');R(g,x+2,y+2,size-4,size-4,'#bb9565');for(let yy=y+5;yy<y+size;yy+=6)R(g,x+2,yy,size-4,2,'#96734e');R(g,x,y,3,size,'#d6b37b');R(g,x+size-3,y,3,size,'#d6b37b');R(g,x+2,y+2,size-4,2,'#edcb92');}
  function bucket(g,x,y,color='#6b9896'){shadow(g,x,y+1,22,5,.16);R(g,x-9,y-15,18,15,color);R(g,x-11,y-17,22,4,'#dbe0ba');R(g,x-7,y-15,14,3,'#395f65');R(g,x-6,y-9,3,8,'#a0c5b7');line(g,x-10,y-15,x-8,y-23,'#708982');line(g,x-8,y-23,x+8,y-23,'#708982');line(g,x+8,y-23,x+10,y-15,'#708982');}
  function cottage(g,x,y,w=98,color='#d5a77d'){
    shadow(g,x+w/2+8,y+78,w+18,18,.18);R(g,x,y+24,w,49,'#5b7067');R(g,x+4,y+24,w-8,45,color);for(let yy=y+33;yy<y+68;yy+=7)R(g,x+4,yy,w-8,2,'#b89876');
    poly(g,[[x-7,y+27],[x+15,y],[x+w-19,y],[x+w+5,y+27]],'#4e7775');R(g,x-6,y+26,w+10,5,'#355c60');for(let dy=6;dy<25;dy+=6)R(g,x+17-dy*.65,y+dy,w-37+dy*1.1,2,'#78a096');
    R(g,x+w-24,y-9,10,18,'#be9270');R(g,x+w-27,y-10,15,3,'#e4c59b');
    for(const xx of[x+12,x+w-32]){R(g,xx,y+41,21,20,'#ede1b9');R(g,xx+3,y+44,15,14,'#507f86');R(g,xx+10,y+44,2,14,'#efe4bd');R(g,xx+3,y+50,15,2,'#efe4bd');R(g,xx-2,y+61,25,3,'#688b73');}
    R(g,x+w/2-10,y+43,20,30,'#49686a');R(g,x+w/2-7,y+47,14,14,'#87b5ab');R(g,x+w/2+4,y+64,2,2,'#e8c786');R(g,x+w/2-15,y+73,30,5,'#c3ad85');
  }
  function shop(){
    const x=1050,y=670,w=160;
    shadow(b,x+w/2+12,790,w+44,28,.2);
    R(b,x-5,y+31,w+10,93,'#53655b');R(b,x,y+27,w,94,'#8ea497');R(b,x+4,y+32,w-8,85,'#a8b5a0');
    for(let yy=y+38;yy<y+120;yy+=8){R(b,x+4,yy,w-8,2,'#80968a');R(b,x+4,yy+2,w-8,1,'#c4c8ac');}
    // Hand-tiled sea-green roof, a cream fascia and warm striped canvas.
    poly(b,[[x-13,y+39],[x+9,y-18],[x+w-6,y-18],[x+w+16,y+39]],'#365d62');
    poly(b,[[x-10,y+33],[x+12,y-15],[x+w-10,y-15],[x+w+11,y+33]],'#527d7b');
    for(let yy=-11;yy<31;yy+=8){const left=x+10-(yy+11)*.43,right=x+w-9+(yy+11)*.43;R(b,left,y+yy,right-left,2,'#85a599');for(let xx=left+8;xx<right;xx+=17)R(b,xx+(yy%16?4:0),y+yy+2,2,6,'#3e696c');}
    R(b,x-12,y+33,w+26,7,'#294e54');R(b,x-13,y+40,w+26,4,'#d4c79f');
    R(b,x-4,y+47,w+8,27,'#3e6565');R(b,x-1,y+48,w+2,23,'#f4e4bc');R(b,x+2,y+50,w-4,2,'#fff0ca');text(b,'BAIT & TACKLE',x+w/2,y+55,1.8,'#355859');
    R(b,x+10,y+80,42,35,'#36555b');R(b,x+106,y+80,42,35,'#36555b');
    for(const xx of[x+13,x+109]){R(b,xx,y+83,36,25,'#74aaa8');R(b,xx+3,y+86,7,13,'#c8e3c3');R(b,xx+18,y+83,3,25,'#dce0b8');R(b,xx,y+95,36,3,'#dce0b8');R(b,xx-4,y+110,44,5,'#e2cea2');}
    R(b,x+66,y+81,31,40,'#3e5c5a');R(b,x+70,y+83,23,36,'#637f75');R(b,x+73,y+85,17,18,'#a2c3b2');R(b,x+87,y+108,3,3,'#eed392');R(b,x+61,y+120,41,8,'#c5b185');R(b,x+57,y+128,49,8,'#e0c99b');R(b,x+53,y+136,57,6,'#b2a07d');
    for(let xx=x-7,i=0;xx<x+w+7;xx+=14,i++){const c=i%2?'#f4e1b7':'#c9785c';poly(b,[[xx,y+73],[xx+14,y+73],[xx+18,y+84],[xx+4,y+84]],c);R(b,xx+4,y+84,14,6,i%2?'#e8d5af':'#b96551');R(b,xx+5,y+90,12,3,i%2?'#d8c5a4':'#a55a4b');}
    R(b,x-5,y+85,3,39,'#9b7756');R(b,x+w+7,y+85,3,39,'#9b7756');
    // Outdoor tackle wall and bait coolers make the storefront readable at a glance.
    R(b,x-47,y+81,33,4,'#a5865e');R(b,x-46,y+113,31,4,'#a5865e');
    for(let i=0;i<4;i++){line(b,x-43+i*9,y+119,x-46+i*9,y+53+i*3,'#405958',2);R(b,x-45+i*9,y+107,4,10,'#c5a574');R(b,x-47+i*9,y+99,6,5,'#e2c998');}
    crate(b,x+w+23,y+113,23);crate(b,x+w+26,y+94,19);bucket(b,x-30,y+138);
    R(b,x+w+7,y+133,32,19,'#9daea0');R(b,x+w+5,y+130,36,6,'#f2e4be');R(b,x+w+10,y+138,26,2,'#567772');R(b,x+w+21,y+134,4,5,'#406563');
    // Small glowing OPEN board and a sand crab pictogram chalkboard.
    R(b,x+119,y+86,24,12,'#e9d295');text(b,'OPEN',x+131,y+88,1,'#465f54');
    R(b,x+14,y+136,28,31,'#93754f');R(b,x+17,y+139,22,24,'#365f60');line(b,x+14,y+135,x+11,y+172,'#78654a',3);line(b,x+42,y+135,x+46,y+172,'#78654a',3);text(b,'BAIT',x+28,y+141,1,'#e7d9af');R(b,x+23,y+154,11,5,'#e9c58c');for(const dx of[-3,0,9,12])line(b,x+23+dx,y+155,x+21+dx,y+151,'#e9c58c',1);
    // Shop bell and wind pennant.
    R(b,x+w+24,y+22,3,72,'#657d70');poly(b,[[x+w+27,y+25],[x+w+54,y+30],[x+w+27,y+37]],'#d38a63');R(b,x+w+23,y+20,5,5,'#e4c995');
  }

  function beachSign(g,label,sub,x,y){
    const width=Math.max(86,label.length*7+16);
    R(g,x-width/2+8,y+14,5,49,'#82765d');R(g,x+width/2-13,y+14,5,49,'#82765d');
    R(g,x-width/2,y-2,width,40,'#355d60');R(g,x-width/2-3,y-5,width+6,5,'#c6bc99');
    R(g,x-width/2+3,y,width-6,2,'#809e91');text(g,label,x,y+7,1.5,'#f1e3bf');
    if(sub)text(g,sub,x,y+24,1,'#c7d5bd');
  }
  function creekX(creek,y){return creek.x+Math.sin((y-460)/155)*43+Math.sin(y/63)*9;}
  function terrainChunk(cx,cy){
    const cache=document.createElement('canvas');cache.width=chunkSize;cache.height=chunkSize;
    b=cache.getContext('2d',{alpha:false});b.translate(-cx,-cy);
    R(b,cx,cy,chunkSize,chunkSize,C.dry);
    // Submerged bars are pale; deeper troughs and channel cuts remain dark.
    // This is sampled once per cached tile, not painted as a repeating texture.
    const waterTones=hmb?['#93b9aa','#81ada4','#70a09e','#5a8d96','#477d8c','#3c7183']:
      ['#83a59a','#709b96','#5a8b90','#487d86','#3d6d7e','#315d70'];
    // Depth shading every 8 px, blended between neighbouring tones with a
    // little grain so the bar, trough and rip channels shade without bands.
    for(let x=cx;x<cx+chunkSize;x+=8){
      const sy=scene.shoreY(x+4);
      for(let y=cy;y<Math.min(cy+chunkSize,sy+16);y+=8){
        const bed=sampleShore(scene,x+4,y+4,0,{},{surf:false});
        const t=clamp(bed.depth/1.05+(noise(x>>3,(y>>3)+5)-.5)*.35,0,4.999),lo=Math.floor(t);
        R(b,x,y,8,8,mixTone(waterTones[lo],waterTones[lo+1],smooth(t-lo)));
        if(noise(x>>3,y>>3)>.93)R(b,x+noise(y,x)*6,y+noise(x,y+1)*6,4+noise(x+1,y)*9,1,t<2?C.shallow:C.sea);
      }
    }
    const coast=[];for(let x=cx-8;x<=cx+chunkSize+8;x+=8)coast.push([x,Math.round(scene.shoreY(x)/2)*2]);
    const bottom=cy+chunkSize+2;
    // Swash-wetted sand, the damp band up to the high-tide line, then sand and
    // dry sand. Each boundary wanders on its own; nothing runs parallel.
    const bands=[[0,0,C.wet],[28,9,hmb?'#b7b6a2':'#686c66'],[58,16,C.sand],[118,26,C.dry]];
    const edge=(x,y,k)=>y+bands[k][0]+(k?bands[k][1]*(2*vnoise(x/(150+60*k),40+k)-1)+bands[k][1]*.35*(2*vnoise(x/37,50+k)-1):0);
    bands.forEach(([,,color],k)=>{
      const pts=coast.map(([x,y])=>[x,edge(x,y,k)]);
      if(bottom>Math.min(...pts.map(p=>p[1])))poly(b,[...pts,[cx+chunkSize+8,bottom],[cx-8,bottom]],color);
    });
    // Wrack line: broken strands of kelp and debris along the last high tide.
    for(let x=Math.floor(cx/6)*6;x<cx+chunkSize+6;x+=6){
      if(vnoise(x/90,61)<.42||noise(x,62)>.7)continue;
      const y=edge(x,scene.shoreY(x),2)-2+noise(x,63)*5;if(y<cy-4||y>cy+chunkSize+4)continue;
      R(b,x,y,3+noise(x,64)*6,noise(x,65)>.6?2:1,noise(x,66)>.5?(hmb?'#8c8a6d':'#3f4640'):(hmb?'#a39d7e':'#565a4f'));
    }
    // Coordinate-seeded grains continue across tile boundaries and do not swim.
    for(let gx=Math.floor(cx/18)*18;gx<cx+chunkSize;gx+=18)for(let gy=Math.floor(cy/19)*19;gy<cy+chunkSize;gy+=19){
      const x=gx+noise(gx,gy)*15,y=gy+noise(gy,gx)*16,shore=scene.shoreY(x),off=y-shore;
      if(off<8||off>660)continue;
      R(b,x,y,noise(gx+1,gy)>.83?4:2,noise(gx+2,gy)>.9?2:1,noise(gx,gy+1)>.5?C.grain:C.grainDark);
      if(!hmb&&off<63&&noise(gx+7,gy)>.56){R(b,x,y,4,3,'#333d41');R(b,x,y,3,1,'#82857b');}
      if(!hmb&&off>30&&off<110&&noise(Math.floor(x/95),Math.floor(y/19))>.77){R(b,x-4,y,13,2,'#4b5353');R(b,x,y+3,9,1,'#59605b');}
    }
    if(hmb){
      // A low vegetated dune ridge, with the two creek mouths cutting across it.
      for(let x=Math.floor(cx/70)*70-70;x<cx+chunkSize+70;x+=70){
        const y=902+Math.sin(x/380)*25+Math.sin(x/89)*11;
        poly(b,[[x-30,y+42],[x-9,y+8],[x+22,y-10],[x+55,y-10],[x+87,y+23],[x+111,y+70],[x+111,1400],[x-30,1400]],'#c4c1a3');
        poly(b,[[x-9,y+8],[x+22,y-10],[x+55,y-10],[x+75,y+14],[x+17,y+20]],'#d5d0b2');
      }
      for(let x=Math.floor(cx/31)*31;x<cx+chunkSize+31;x+=31){const y=954+noise(x,73)*250;if(y>cy-30&&y<cy+chunkSize+35)grass(b,x,y,.65+noise(x,31)*.65,noise(x,99)>.45?C.grass:'#747f66');}
      for(const creek of scene.creeks||[]){
        if(Math.abs(creek.x-(cx+256))>360)continue;
        for(let y=Math.max(cy-16,scene.shoreY(creek.x)+3);y<cy+chunkSize+16;y+=8){
          const x=creekX(creek,y),w=19+15*Math.sin(y/213)**2+4*Math.sin(y/29);
          R(b,x-w-13,y,w*2+26,9,'#a4ac9c');R(b,x-w,y,w*2,9,'#67948e');if(noise(creek.x,y)>.77)R(b,x-w+6+noise(y,creek.x)*12,y+1,5+noise(y,17)*10,1,'#93b2a1');
        }
      }
      // Francis Beach has a campground behind the dune, not enclosing cliffs.
      for(let x=5550;x<7330;x+=175){const y=1055+Math.sin(x/87)*29;if(x>cx-140&&x<cx+chunkSize+140&&y>cy-120&&y<cy+chunkSize+80){
        shadow(b,x,y+20,99,16,.12);poly(b,[[x-40,y+16],[x-5,y-26],[x+37,y+16]],noise(x,81)>.5?'#92a599':'#c59770');
        poly(b,[[x-5,y-26],[x+8,y+16],[x+37,y+16]],'#627e76');R(b,x-27,y+15,66,4,'#5d756c');
        line(b,x+48,y+7,x+96,y+7,'#a08e6c',6);line(b,x+55,y+7,x+54,y+23,'#766c55',4);line(b,x+89,y+7,x+90,y+23,'#766c55',4);
      }}
    }else{
      // Sharp Park's long levee and promenade run behind the dark beach.
      for(let x=Math.floor(cx/16)*16;x<cx+chunkSize+16;x+=16){const y=899+Math.sin(x/820)*8;
        R(b,x,y,17,60,'#797e71');R(b,x,y+7,17,7,'#8e9281');R(b,x,y+42,17,27,'#b3af94');R(b,x,y+46,17,3,'#d2c7a9');
        if(noise(x,133)>.42)rock(b,x,y+27,13+noise(x,134)*12,8+noise(x,135)*9);
      }
      for(let x=Math.floor(cx/60)*60;x<cx+chunkSize+60;x+=60){const y=1000+noise(x,321)*95;if(y>cy-35&&y<cy+chunkSize+35)grass(b,x,y,.8+noise(x,113)*.8);}
      if(cy+chunkSize>950&&cy<1150)for(let x=80;x<5350;x+=297)if(x>cx-120&&x<cx+chunkSize)cottage(b,x,1030+noise(x,64)*25,88+noise(x,94)*17,noise(x,81)>.5?'#c0b69e':'#a6afa0');
      // Mori Point occurs only at the south end; the north coast stays open.
      if(cx+chunkSize>5860){
        poly(b,[[5905,1040],[5950,892],[6010,821],[6070,667],[6130,575],[6180,429],[6240,368],[6285,238],[6360,152],[6530,146],[6750,208],[6750,1400],[5905,1400]],'#616f61');
        poly(b,[[5960,1010],[6000,891],[6070,812],[6120,653],[6180,565],[6224,428],[6283,368],[6320,250],[6390,193],[6650,200],[6750,1400],[5990,1400]],'#8b9470');
        poly(b,[[6224,428],[6283,368],[6320,250],[6390,193],[6650,200],[6650,343],[6380,322],[6330,420],[6250,486]],'#9ca17a');
        for(let i=0;i<31;i++){const x=6020+noise(i,614)*440,y=630+noise(i,615)*590;grass(b,x,y,1+noise(i,616),i%3?'#6e7d60':'#a3a77e');}
        for(let i=0;i<17;i++)rock(b,6040+noise(i,712)*230,410+noise(i,713)*240,25+noise(i,714)*34,19+noise(i,715)*25);
      }
    }
    // Sparse driftwood, kelp and shells add scale without filling every beach tile.
    for(let x=Math.floor(cx/240)*240;x<cx+chunkSize+240;x+=240){
      const sy=scene.shoreY(x),y=sy+139+noise(x,32)*135;
      if(y>cy-35&&y<cy+chunkSize+35&&noise(x,17)>.42){line(b,x,y,x+46,y+6,'#918972',6);line(b,x+2,y-1,x+43,y+4,'#b4aa8c',2);line(b,x+19,y+2,x+27,y-6,'#918972',3);}
      if(sy+55>cy-30&&sy+55<cy+chunkSize+30){R(b,x+45,sy+68,17,2,'#757c56');R(b,x+51,sy+65,9,2,'#7e845b');R(b,x+58,sy+68,2,8,'#727653');}
    }
    if(cx<1300&&cx+chunkSize>970&&cy<870&&cy+chunkSize>640)shop();
    if(cx<1070&&cx+chunkSize>900&&cy<850&&cy+chunkSize>760)beachSign(b,hmb?'HALF MOON BAY':'PACIFICA',hmb?'DUNES / VENICE':'SHARP PARK',974,781);
    const labels=hmb?['DUNES','FRENCHMANS','VENICE','PILARCITOS','FRANCIS','SOUTH BEACH']:['NORTH BEACH','OLD PIER','SAND TROUGH','BAR GAP','SOUTH BEACH','MORI POINT'];
    scene.zones.forEach((zone,i)=>{if(zone.x>cx-100&&zone.x<cx+chunkSize+100&&cy<885&&cy+chunkSize>770)beachSign(b,labels[i]||'BEACH','COAST TRAIL',zone.x,805);});
    b=null;return cache;
  }
  function bounds(pad=0){return{left:camera.x-canvas.width/(2*camera.scale)-pad,right:camera.x+canvas.width/(2*camera.scale)+pad,top:camera.y-offset.y/camera.scale-pad,bottom:camera.y+(canvas.height-offset.y)/camera.scale+pad};}
  function offshoreTile(){
    if(deepTile)return deepTile;deepTile=document.createElement('canvas');deepTile.width=chunkSize;deepTile.height=chunkSize;const g=deepTile.getContext('2d',{alpha:false});R(g,0,0,chunkSize,chunkSize,C.deep);
    for(let i=0;i<190;i++){const x=noise(i,918)*chunkSize,y=noise(i,919)*chunkSize;g.globalAlpha=.22;R(g,x,y,5+noise(i,920)*11,1,C.sea);}g.globalAlpha=1;return deepTile;
  }
  function drawTerrain(){
    const v=bounds(12),firstX=Math.floor(v.left/chunkSize),lastX=Math.floor(v.right/chunkSize),firstY=Math.floor(v.top/chunkSize),lastY=Math.floor(v.bottom/chunkSize);
    for(let tx=firstX;tx<=lastX;tx++)for(let ty=firstY;ty<=lastY;ty++){
      const key=tx+','+ty,farOffshore=(ty+1)*chunkSize<=-512;let tile=farOffshore?offshoreTile():chunks.get(key);
      if(!tile){tile=terrainChunk(tx*chunkSize,ty*chunkSize);chunks.set(key,tile);}
      else if(!farOffshore){chunks.delete(key);chunks.set(key,tile);}
      // Snap shared edges in screen pixels so scaled tiles cannot show seams.
      const a=project(tx*chunkSize,ty*chunkSize),z=project((tx+1)*chunkSize,(ty+1)*chunkSize);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(tile,a.x,a.y,z.x-a.x,z.y-a.y);ctx.restore();
    }
    // Bounded LRU: a long walk does not retain a canvas for the entire coastline.
    const visibleLandRows=Math.max(0,lastY-Math.max(firstY,-1)+1),tileBudget=Math.max(54,(lastX-firstX+1)*visibleLandRows+4);
    while(chunks.size>tileBudget)chunks.delete(chunks.keys().next().value);
  }
  function pier(){
    const p=scene.pier;if(!p)return;
    const v=bounds(70);if(v.right<p.x-60||v.left>p.x+220||v.bottom<p.top-40||v.top>p.bottom+100)return;
    // Piles and cast shadows are below the continuous concrete deck.
    for(let y=p.top+16;y<p.bottom;y+=89){
      if(y<v.top-100||y>v.bottom+100)continue;
      for(const x of[p.x-20,p.x+20]){R(ctx,x+6,y+9,10,27,'#3b666d');R(ctx,x-3,y,7,31,'#737b71');R(ctx,x-2,y+1,2,21,'#a2a18c');}
    }
    for(const d of p.deck){R(ctx,d.left+10,d.top+12,d.right-d.left,d.bottom-d.top,'#3e6870');R(ctx,d.left,d.top,d.right-d.left,d.bottom-d.top,'#858d83');R(ctx,d.left+4,d.top+4,d.right-d.left-8,d.bottom-d.top-8,'#b6b7a4');}
    // Seams, aggregate and shallow spalling weather the deck without gaps in it.
    for(let y=Math.max(p.top+4,Math.floor(v.top/19)*19);y<Math.min(p.bottom,v.bottom+30);y+=19){
      R(ctx,p.x-22,y,44,1,'#999f90');if(noise(y,349)>.57){R(ctx,p.x-19+noise(y,351)*29,y+8,7,2,'#7b857d');R(ctx,p.x-17+noise(y,352)*29,y+10,4,1,'#d0cfb6');}
    }
    function rail(x0,y0,x1,y1){line(ctx,x0,y0-15,x1,y1-15,'#d0cdb3',2);line(ctx,x0,y0-6,x1,y1-6,'#8b9789',1);const dist=Math.hypot(x1-x0,y1-y0),n=Math.ceil(dist/24);for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;if(!visible(x,y,50))continue;R(ctx,x-1,y-19,3,24,'#6e7b74');R(ctx,x,y-18,1,15,'#c1c2ac');if(i%7===3)R(ctx,x-1,y-7,2,5,'#8f7862');}}
    rail(p.x-27,p.top,p.x+190,p.top);rail(p.x-27,p.top,p.x-27,p.bottom);rail(p.x+27,p.top+60,p.x+27,p.bottom);rail(p.x+190,p.top,p.x+190,p.top+60);rail(p.x+27,p.top+60,p.x+190,p.top+60);
    for(let y=p.top+130;y<p.bottom-70;y+=254){if(!visible(p.x,y,100))continue;R(ctx,p.x-19,y-13,15,6,'#6a7e76');R(ctx,p.x-18,y-6,3,7,'#727f74');R(ctx,p.x-7,y-6,3,7,'#727f74');}
    // The locked work fence is an explicit game boundary. No bypass is drawn.
    const gy=p.gate.y;R(ctx,p.x-39,gy-43,3,57,'#566d69');R(ctx,p.x+37,gy-43,3,57,'#566d69');
    line(ctx,p.x-38,gy-42,p.x+38,gy-42,'#aeb9a8',3);line(ctx,p.x-38,gy+5,p.x+38,gy+5,'#7c9286',2);
    for(let dx=-38;dx<=38;dx+=8){line(ctx,p.x+dx,gy-40,p.x+Math.min(38,dx+26),gy+2,'#92a799',1);line(ctx,p.x+dx,gy+2,p.x+Math.min(38,dx+26),gy-40,'#849c91',1);}
    R(ctx,p.x-27,gy-33,54,27,'#cf8c5b');R(ctx,p.x-25,gy-31,50,23,'#ead7a8');text(ctx,'CLOSED',p.x,gy-28,1,'#664f40');text(ctx,'REPAIR',p.x,gy-17,1,'#775c43');
    for(const x of[p.x-47,p.x+48]){R(ctx,x-7,gy+16,14,3,'#725f48');poly(ctx,[[x-5,gy+15],[x-2,gy-4],[x+2,gy-4],[x+6,gy+15]],'#c77f4f');R(ctx,x-4,gy+5,8,4,'#eadbb8');}
  }

  function resize(width,height){
    cssWidth=Math.max(1,width);cssHeight=Math.max(1,height);
    const widthLogical=Math.min(1000,Math.max(360,Math.round(width*.66)));
    canvas.width=widthLogical;canvas.height=Math.round(widthLogical*height/width);camera.width=canvas.width;camera.height=canvas.height;ctx.imageSmoothingEnabled=false;initialized=false;
  }
  function viewport(){const s=canvas.height/cssHeight;return{top:insets.top*s,bottom:insets.bottom*s,left:(insets.left||0)*s,right:(insets.right||0)*s};}
  function cameraTarget(state,options){
    const compact=cssWidth<720||cssHeight<520,v=viewport(),available=Math.max(100,canvas.height-v.top-v.bottom);
    const baseScale=Math.max(.25,compact?Math.min(.86,canvas.width/510,available/365):Math.min(.76,canvas.width/1150,available/680));
    return shoreActionCameraTarget(scene,state,{width:canvas.width,height:canvas.height,top:v.top,bottom:v.bottom,left:v.left,right:v.right,baseScale,manualFocus,actionFocus:options.actionFocus,rodLift:options.rodLift,rodSweep:options.rodSweep});
  }
  let offset={x:0,y:0};
  function project(x,y){return{x:Math.round((x-camera.x)*camera.scale+canvas.width/2),y:Math.round((y-camera.y)*camera.scale+offset.y)};}
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();const x=(clientX-r.left)*canvas.width/r.width,y=(clientY-r.top)*canvas.height/r.height;return{x:camera.x+(x-canvas.width/2)/camera.scale,y:camera.y+(y-offset.y)/camera.scale};}
  function worldToScreen(x,y){const p=typeof x==='object'?project(x.x,x.y):project(x,y),r=canvas.getBoundingClientRect();return{x:p.x*r.width/canvas.width,y:p.y*r.height/canvas.height,clientX:r.left+p.x*r.width/canvas.width,clientY:r.top+p.y*r.height/canvas.height,visible:p.x>=0&&p.x<=canvas.width&&p.y>=0&&p.y<=canvas.height};}
  function visible(x,y,pad=80){const p=project(x,y);return p.x>-pad&&p.x<canvas.width+pad&&p.y>-pad&&p.y<canvas.height+pad;}
  function moriLand(x,y){
    if(hmb||x<5905)return false;
    const edge=[[5905,1040],[5950,892],[6010,821],[6070,667],[6130,575],[6180,429],[6240,368],[6285,238],[6360,152],[6530,146],[6750,208]];
    for(let i=1;i<edge.length;i++){const a=edge[i-1],z=edge[i];if(x<=z[0])return y>=a[1]+(z[1]-a[1])*(x-a[0])/(z[0]-a[0]);}return true;
  }
  // Surf: every crest is an individual wave from shore-surf.js. Unbroken swell
  // shows as a darker steepening face; breaking waves throw a white lip
  // (plunging throws spray ahead of it), broken bores are wide white bands,
  // foam lingers and fades behind them, and each bore runs up the beach face.
  // Offscreen layers: cells are drawn opaque and each layer is composited once,
  // so neighbouring cells never double-blend into a grid of seams.
  const layers={};
  function layer(name){
    let l=layers[name];
    if(!l||l.canvas.width!==canvas.width||l.canvas.height!==canvas.height){const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;l=layers[name]={canvas:c,g:c.getContext('2d')};}
    l.g.setTransform(1,0,0,1,0,0);l.g.clearRect(0,0,l.canvas.width,l.canvas.height);l.g.setTransform(ctx.getTransform());return l.g;
  }
  function composite(name,alpha){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=alpha;ctx.drawImage(layers[name].canvas,0,0);ctx.restore();}
  const FOAM=['#adcbc2','#c9ddd4','#e1ebdf','#f5f7ec'];
  function waves(){
    const v=bounds(30),step=8,left=Math.floor(v.left/step)*step,sea=lastState?.seaState,cell=2.5*3.2,cols=[];
    for(let x=left;x<v.right;x+=step){
      const sy=scene.shoreY(x);
      if(sy<v.top-60||sy-1400>v.bottom){cols.push(null);continue;}
      const f=shoreSurfField(scene,x,now,sea);
      if(!f.crests.length&&!f.surfZoneWidth&&!f.foamReach){cols.push(null);continue;}
      // Foam every 2.5 m from the real (tidal) waterline to beyond the outermost break.
      const start=Math.min(0,-Math.floor(f.waterlineMeters/2.5)*2.5),reach=Math.min(420,Math.max(f.surfZoneWidth,f.foamReach)+30);
      const foam=new Float32Array(Math.max(0,Math.ceil((reach-start)/2.5)));
      for(let k=0;k<foam.length;k++)foam[k]=f.foamAt(start+k*2.5);
      cols.push({x,sy,f,start,foam,col:Math.floor(x/step)});
    }
    const at=(c,d)=>{if(!c)return 0;const k=Math.round((d-c.start)/2.5);return k>=0&&k<c.foam.length?c.foam[k]:0;};
    const shade=layer('shade'),g=layer('foam'),sheet=[];
    for(let ci=0;ci<cols.length;ci++){
      const c=cols[ci];if(!c){sheet.push(null);continue;}
      const {x,sy,f,col}=c,metres=x/3.2;
      // Foam mat. Whitewater spreads sideways into the unbroken part of a crest,
      // floating foam gathers into patches that drift shoreward, and each cell
      // fades in and out on its own slow clock.
      for(let k=0;k<c.foam.length;k++){
        const d=c.start+k*2.5,y=sy-d*3.2;if(y<v.top-8||y>v.bottom+8||moriLand(x,y))continue;
        let a=c.foam[k];
        for(let o=1;o<=3;o++)a=Math.max(a,(.95-o*.25)*Math.max(at(cols[ci-o],d),at(cols[ci+o],d)));
        if(a<.04)continue;
        const patch=.5+.9*vnoise2(metres/17+now*.006,(d+.5*now)/6,3);
        if(a<.85)a=clamp(a*patch,0,1);
        const row=Math.round(d/2.5),h=noise(col,row),twinkle=Math.abs(2*((h*7.3+now/(8+7*noise(row,col)))%1)-1);
        if(twinkle>a*1.5)continue;
        if(a>.6)R(g,x,y-cell,step+1,cell+1,FOAM[Math.min(3,Math.floor(a*3.99))]);
        // Thin foam is lace: scattered streaks of varying length, off the cell grid.
        else R(g,x+(noise(col,row+99)-.5)*6,y-cell+(noise(row,col+7)-.5)*5,3+noise(col+3,row)*9,a>.3?3:2,FOAM[Math.min(3,Math.floor(a*3.99))]);
      }
      for(const w of f.crests){
        const y=sy-w.offshore*3.2;if(y<v.top-30||y>v.bottom+30||moriLand(x,y))continue;
        const hPx=Math.max(1,w.height*3.2),n=noise(col,w.index);
        if(w.state==='unbroken'||w.state==='reformed'){
          // Steepening face: a darker band on the shoreward side and a lighter crest.
          const steep=clamp(w.steepness/.78,0,1);if(steep<.12)continue;
          R(shade,x,y,step+1,Math.max(1,hPx*.6*steep),steep>.55?C.deep:C.sea);
          if(steep>.8)R(g,x,y-1,step+1,2,FOAM[1+Math.floor(n*2)]);
          continue;
        }
        if(w.state==='breaking'&&w.sinceBreak!==null&&w.sinceBreak<Math.max(3,w.height*4)){
          // Fresh break: the lip over its shadowed face. Plunging lips throw spray ahead.
          R(g,x,y-2,step+1,Math.max(2,hPx*.55),FOAM[3]);
          R(shade,x,y+Math.max(2,hPx*.55)-2,step+1,Math.max(1,hPx*.35),C.deep);
          if(w.type==='plunging'||w.type==='surging'){
            const throw_=hPx*(.6+.5*n);
            R(g,x+2,y+throw_,3,2,FOAM[3]);if(n>.4)R(g,x+5,y+throw_*.7,2,2,FOAM[2]);if(w.height>1.2&&n>.6)R(g,x+1,y-hPx*.9,2,2,FOAM[3]);
          }
          continue;
        }
        // Broken bore: a lumpy white front with aerated, streaky water behind it.
        const band=(1+1.8*w.height)*3.2*(.4+.6*w.roller),front=(n-.5)*3+(vnoise(metres/6,w.index)-.5)*4;
        R(g,x,y+front-3,step+1,w.roller>.5?5:3,FOAM[w.roller>.3?3:2]);
        for(let k=0;k<band;k+=3){
          const m=noise(col*31+k,w.index),fade=1-k/band;
          if(m>(.25+.6*fade)*(.5+.5*w.roller))continue;
          R(g,x+(m>.8?2:0),y+front-3-k,step+1-(m>.8?3:0),3,FOAM[fade>.6?3:m>.5?1:2]);
        }
      }
      // Swash: the last bore runs up the face as a sheet with a lobed, foamy
      // front that differs from wave to wave, then drains back.
      const wl=sy+f.waterlineMeters*3.2,lobe=.72+.56*vnoise(metres/13+f.swashWave*3.7,70);
      const front=wl+Math.max(.6,f.swashMeters*3.2*lobe);
      if(front>v.top-10&&wl<v.bottom+10&&!moriLand(x,wl)){
        sheet.push({x,wl,front});
        const rush=clamp(1-f.swashPhase/.4,0,1),bandPx=4+10*rush;
        R(g,x,front-1,step+1,2,FOAM[rush>.2?3:1]);
        for(let k=2;k<bandPx;k+=2){const m=noise(col*17+k,f.swashWave);if(m<rush*(1-k/bandPx)*1.3)R(g,x+(m>.5?1:0),front-1-k,step,2,FOAM[m<.3?3:2]);}
        if(rush===0&&noise(col,f.swashWave)>.55)R(g,x+2,front+2,3,1,FOAM[1]);
      }else sheet.push(null);
    }
    // One translucent water film per run of wet columns.
    for(let i=0;i<sheet.length;){
      if(!sheet[i]){i++;continue;}
      let j=i;while(j+1<sheet.length&&sheet[j+1])j++;
      const run=sheet.slice(i,j+1),last=run.at(-1);
      ctx.globalAlpha=.36;poly(ctx,[...run.map(p=>[p.x,p.wl-2]),[last.x+step,last.wl-2],[last.x+step,last.front],...run.map(p=>[p.x,p.front]).reverse()],C.shallow);
      i=j+1;
    }
    ctx.globalAlpha=1;
    composite('shade',.4);composite('foam',.93);
  }
  function gull(x,y,flight=false,variant=0){
    if(flight){const wing=Math.sin(now*4+variant)>0?7:-3;line(ctx,x,y,x-8,y-wing,'#edf0db',2);line(ctx,x,y,x+8,y-wing,'#edf0db',2);R(ctx,x-2,y,4,3,'#4e6e70');R(ctx,x+8,y-wing,3,2,'#617e7d');return;}
    shadow(ctx,x,y+4,12,4,.13);R(ctx,x-6,y-3,11,6,'#e9ead6');R(ctx,x-1,y-7,6,7,'#f6eed7');R(ctx,x-6,y-1,6,3,'#7e9490');R(ctx,x+5,y-5,4,2,'#cfa46b');R(ctx,x+2,y-6,1,1,'#3c5659');R(ctx,x-2,y+3,1,4,'#a19169');R(ctx,x+2,y+3,1,4,'#a19169');
  }
  function person(x,y,{staff=false,warden=false,walking=false,fishing=false,facing='up',small=false,veteran=null}={}){
    if(!visible(x,y))return;const scale=small?.85:1;
    shadow(ctx,x+2,y+1,25*scale,8*scale,.22);ctx.save();ctx.translate(Math.round(x),Math.round(y));
    drawShorePerson(ctx,{style:warden?'warden':staff?'staff':veteran?.style||'player',walking,fishing,facing,time:now,scale});ctx.restore();
  }

  // 空军大队长: his gear, the rod in a sand spike, and a line out to his real bait.
  function regularAngler(state){
    const r=state.regular;if(!r||r.mode==='away')return;
    const walking=['arriving','moving','leaving'].includes(r.mode),holding=['casting','bite','fighting','landed'].includes(r.mode);
    const far=r.bait||r.fight?.from;if(!visible(r.x,r.y)&&!(far&&visible(far.x,far.y)))return;
    if(!walking){
      // Cooler with a ruler on the lid, bait bucket and sand spike.
      shadow(ctx,r.x+27,r.y+1,24,6,.16);R(ctx,r.x+17,r.y-13,20,13,'#dcd6bd');R(ctx,r.x+17,r.y-15,20,4,'#3f6a8c');R(ctx,r.x+19,r.y-14,16,1,'#e8c77c');
      bucket(ctx,r.x-27,r.y+4,'#b87150');line(ctx,r.x+12,r.y+3,r.x+12,r.y-14,'#8a8f86',2);
    }
    person(r.x,r.y,{veteran:ANGLERS[3],walking,fishing:holding,facing:walking?(r.route?.[0]?.x>r.x?1:3):-1});
    if(walking){line(ctx,r.x+9,r.y-34,r.x+14,r.y-84,'#3b4f55',2);return;}
    let tip;
    if(holding){const bend=r.mode==='fighting'?Math.sin(now*6)*2:0,butt={x:r.x-10,y:r.y-23};tip=r.mode==='fighting'?{x:r.x-24+bend,y:r.y-50}:{x:r.x-21,y:r.y-64};
      line(ctx,butt.x,butt.y,(butt.x+tip.x)/2-(r.mode==='fighting'?4:0),(butt.y+tip.y)/2,'#3b4f55',2);line(ctx,(butt.x+tip.x)/2-(r.mode==='fighting'?4:0),(butt.y+tip.y)/2,tip.x,tip.y,'#3b4f55',2);}
    else{tip={x:r.x+3,y:r.y-64};line(ctx,r.x+12,r.y-10,tip.x,tip.y,'#3b4f55',2);if(r.mode==='soaking')R(ctx,tip.x-1,tip.y-1,3,3,'#e2c56e');}
    let end=null;
    if(r.mode==='casting'&&r.bait){const k=clamp(1-r.timer/1.8,0,1);end={x:tip.x+(r.bait.x-tip.x)*k,y:tip.y+(r.bait.y-tip.y)*k-Math.sin(k*Math.PI)*60};}
    else if(['soaking','bite'].includes(r.mode)&&r.bait)end={x:r.bait.x,y:r.bait.y};
    else if(r.mode==='fighting'&&r.fight){const k=clamp(r.fight.elapsed/r.fight.duration,0,1),shore=scene.shoreY(r.x)+4;
      end={x:r.fight.from.x+(r.x-r.fight.from.x)*k+Math.sin(now*1.7)*14*(1-k),y:r.fight.from.y+(shore-r.fight.from.y)*k};
      ctx.globalAlpha=.7;R(ctx,end.x-4,end.y-1,9,2,'#f3f4e7');ctx.globalAlpha=1;}
    if(end){if(r.mode==='bite'){tip.x+=Math.sin(now*28)*1.5;}ctx.globalAlpha=.5;line(ctx,tip.x,tip.y,end.x,end.y,'#e6eadb',1);ctx.globalAlpha=1;}
    if(r.mode==='landed'&&r.landed){
      // The fish in his hands: a silver striper with dark lines, or a perch.
      const bass=r.landed.species==='striped_bass',len=bass?30:18,x=r.x+8,y=r.y-30;
      R(ctx,x,y,len,bass?7:8,bass?'#c8d0c8':'#d8c89a');poly(ctx,[[x+len,y+3],[x+len+6,y-2],[x+len+6,y+9]],bass?'#8e9a96':'#b59c68');
      if(bass)for(let i=0;i<4;i++)R(ctx,x+3,y+1+i*1.6,len-6,1,'#4d5a5c');R(ctx,x+2,y+2,2,2,'#2f4546');
    }
  }
  function ring(x,y,r,color,alpha=1){ctx.globalAlpha=alpha;const points=[];for(let i=0;i<20;i++){const a=i/20*TAU;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r*.42]);}for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];line(ctx,p[0],p[1],q[0],q[1],color,2);}ctx.globalAlpha=1;}
  function fishing(state){
    lastTackle=null;
    const p=state.player||{x:1100,y:865},cast=state.cast,active=cast&&!['walk','landed'].includes(state.phase);
    const rod=shoreRodPose(state,drawOptions);
    if(active){
      const fight=state.phase==='fighting',bite=state.phase==='bite',casting=state.phase==='casting';
      const ground=casting?shoreCastPosition(cast,cast.flight||0):fight?shoreFishPosition(scene,state):cast.target;
      // Flight height is measured in metres by the shared casting model. The
      // sprite rod stays readable, while lure and shadow keep the world scale.
      const floating=!casting&&shoreRigUsesFloat(state);
      const sample=casting||floating?null:sampleShore(scene,ground.x,ground.y,now,state.seaState);
      const depth=sample?(fight?Number.isFinite(state.fishMotion?.depth)?state.fishMotion.depth:sample.depth*.72:Number.isFinite(state.presentation?.depth)?state.presentation.depth:sample.depth):0;
      const entryWorld=casting?ground:shoreLineWaterEntry(scene,state,ground,depth);
      const contact=casting?null:shoreWaterContact(scene,entryWorld,now,state.seaState);
      const target={x:entryWorld.x,y:entryWorld.y-(casting?ground.height*3.2:contact.height*3.2)};
      const tension=clamp(Number.isFinite(state.tension)?state.tension:0,0,1);
      const bend=rod.bend,rodTip=rod.tip;
      const airHeight=fight?Math.max(0,state.fishMotion?.airHeight||0):0;
      const attachment={x:target.x,y:target.y+(floating&&bite?2:0)-(floating?0:airHeight*3.2)};
      const strand=shoreTackleLine(rodTip,attachment,{tension,sag:casting?17:fight?6:17,
        flowX:contact?.flowX,flowY:contact?.flowY,scale:1});
      lastTackle={rodTip,waterEntry:target,entryWorld,terminalPosition:ground,attachment,line:strand,bend,surfaceHeight:contact?.height||0,
        tilt:floating?contact.tilt:0,breaking:contact?.breaking||0,floatVisible:floating,rodControls:rod.controls,rodPoints:rod.points,airHeight};
      for(let i=1;i<strand.length;i++)line(ctx,strand[i-1].x,strand[i-1].y,strand[i].x,strand[i].y,i>strand.length-4&&!casting?'#b4d0bd':'#e9dfb6',1);
      if(casting){shadow(ctx,ground.x,ground.y,8,3,.22);R(ctx,target.x-2,target.y-3,4,6,'#d27a59');R(ctx,target.x-2,target.y-4,4,2,'#fff0c2');}
      else{
        const flow=Math.hypot(contact.flowX,contact.flowY),radius=4+Math.min(6,flow*3+contact.breaking*3);
        if(floating)ring(target.x,target.y,radius,'#e0ead0',.35+contact.foam*.4);
        if(floating){
          // The float marks the suspended hook; a bite dips its bright tip.
          const floatY=attachment.y,lean=contact.tilt*8;
          R(ctx,target.x+lean-1,floatY-9,2,5,'#e26e50');R(ctx,target.x+lean*.4-3,floatY-4,6,4,'#fff0cf');R(ctx,target.x-2,floatY,4,2,'#c96a47');
        }else if(!airHeight){
          // The underwater rig/fish has no surface sprite or target ring.
          // Small separated streaks mark only the line cutting into the sea.
          R(ctx,target.x-4,target.y,2,1,'#a9cbb5');R(ctx,target.x+2,target.y,2,1,'#a9cbb5');
        }
        // A passing roller washes over the water contact, never over the tip
        // or the dry span. Persistent foam alone does not submerge the float.
        if(contact.breaking>.05){const wash=2+contact.breaking*5;R(ctx,target.x-wash,target.y-1,wash*2,1+contact.breaking*2,C.foam);}
        if(floating&&airHeight>0)line(ctx,attachment.x,attachment.y,ground.x,ground.y-contact.height*3.2-airHeight*3.2,'#e9dfb6',1);
        if(bite){const cue=floating?target:rodTip;ring(cue.x,cue.y,21+(now*20)%16,'#ffe2a0',.7);R(ctx,cue.x-2,cue.y-35,4,13,'#fff1b7');R(ctx,cue.x-2,cue.y-17,4,4,'#fff1b7');}
      }
      // The flexing rod is connected to the hands, and line starts at its tip.
      for(let i=1;i<rod.points.length;i++)line(ctx,rod.points[i-1].x,rod.points[i-1].y,rod.points[i].x,rod.points[i].y,'#354e50',i<4?3:2);
      line(ctx,p.x-12,p.y-28,p.x-17,p.y-39,'#caa374',3);R(ctx,p.x-14,p.y-32,6,5,'#aeb4a0');
      // Keep navigation/debug castTarget on the simulated horizontal point;
      // only tackle artwork receives the surface-height projection.
      return casting?target:ground;
    }
    line(ctx,p.x+11,p.y-19,p.x+21,p.y-65,'#3e5656',2);R(ctx,p.x+10,p.y-20,3,10,'#c1a071');R(ctx,p.x+8,p.y-23,6,5,'#aab3a0');return null;
  }

  function draw(state={},time=0,options={}){
    const {reducedMotion=false}=options;drawOptions=options;
    lastState=state;now=reducedMotion?0:Number.isFinite(state.elapsed)?state.elapsed:time;const raw=Number.isFinite(time)?time:now,dt=lastTime===null?.016:clamp(raw-lastTime,0,.1);lastTime=raw;
    const target=cameraTarget(state,options);if(initialized)camera.y+=(target.screenY-offset.y)/camera.scale;Object.assign(camera,advanceShoreActionCamera(camera,target,dt,{initialized,reducedMotion}));offset.y=target.screenY;initialized=true;
    ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;R(ctx,0,0,canvas.width,canvas.height,C.deep);
    const origin=project(0,0);ctx.setTransform(camera.scale,0,0,camera.scale,origin.x,origin.y);
    drawTerrain();waves();pier();
    const castPreview=shoreCastPreviewVisual(state);drawShoreCastPreview(castPreview,(...args)=>line(ctx,...args));
    const v=bounds(80);
    for(let i=Math.floor(v.left/430);i<Math.ceil(v.right/430);i++){const x=i*430+Math.sin(now*.07+i)*68,y=scene.shoreY(x)-160+Math.sin(now*.11+i*2)*43;if(visible(x,y))gull(x,y,true,i);}
    for(let x=Math.floor(v.left/575)*575;x<v.right;x+=575){const y=scene.shoreY(x)+87;if(visible(x,y)){gull(x+13,y);if(noise(x,71)>.5)gull(x+34,y+10);}}
    const p=state.player||scene.spawn,onDeck=onPier(scene,p.x,p.y);
    if(state.walkTarget&&!onDeck){const dx=state.walkTarget.x-p.x,dy=state.walkTarget.y-p.y,d=Math.hypot(dx,dy)||1;if(p.y>scene.shoreY(p.x)+35)for(let i=1;i<5;i++){const xx=p.x-dx/d*i*13+(i%2?3:-3),yy=p.y-dy/d*i*13;R(ctx,xx,yy,3,5,hmb?'#b8b19c':'#696e66');}}
    if(state.walkTarget&&Math.hypot(state.walkTarget.x-p.x,state.walkTarget.y-p.y)>18&&visible(state.walkTarget.x,state.walkTarget.y)){ring(state.walkTarget.x,state.walkTarget.y,11,'#eee7bf',.8);R(ctx,state.walkTarget.x-2,state.walkTarget.y-2,4,3,'#859178');}
    const encounter=state.shoreLore?.encounter;if(encounter&&visible(encounter.x,encounter.y)){person(encounter.x,encounter.y,{veteran:ANGLERS[encounter.angler],fishing:true});line(ctx,encounter.x-11,encounter.y-25,encounter.x-21,encounter.y-61,'#496463',2);bucket(ctx,encounter.x+22,encounter.y+4);}

    person(scene.shop.x+147,scene.shop.door.y-2,{staff:true,small:true,facing:'down'});
    regularAngler(state);
    const warden=state.warden;if(warden&&visible(warden.x,warden.y))person(warden.x,warden.y,{warden:true,walking:true,facing:warden.facing??-1});
    const fishVisual=shoreFishVisual(scene,state,{time:now,reducedMotion,cameraScale:camera.scale});
    person(p.x,p.y,{walking:state.player?.walking,facing:state.player?.facing,fishing:!!state.cast&&!['walk','landed'].includes(state.phase)});
    const castTarget=fishing(state);drawShoreFish(ctx,fishVisual,{line:(...args)=>line(ctx,...args),ring,foam:C.foam});
    if(state.inspection){
      const inspection=state.inspection,ix=inspection.x??inspection.position?.x??p.x+15,iy=inspection.y??inspection.position?.y??p.y+28;
      person(ix,iy,{warden:true,facing:'down'});R(ctx,ix-13,iy-57,29,12,'#e6d7ae');text(ctx,'CHECK',ix+1,iy-55,1,'#4b6357');
    }
    if(state.phase==='landed'){ring(p.x,p.y+2,23,'#f0d292',.5);if(state.fish){
      const smelt=state.fish.id==='jacksmelt',croaker=state.fish.id==='white_croaker';
      R(ctx,p.x+21,p.y-25,smelt?24:18,smelt?4:7,croaker?'#bdc4ac':smelt?'#adc7ba':'#8caa91');
      const tailX=p.x+(smelt?44:38);poly(ctx,[[tailX,p.y-22],[tailX+6,p.y-28],[tailX+6,p.y-17]],croaker?'#aeaa80':'#607f74');
      if(smelt)R(ctx,p.x+23,p.y-23,20,1,'#e7ecd4');if(croaker)R(ctx,p.x+27,p.y-23,2,2,'#6a756b');R(ctx,p.x+22,p.y-25,2,2,'#34595d');
    }}
    ctx.setTransform(1,0,0,1,0,0);
    return{player:worldToScreen(p),shop:worldToScreen(scene.shop.door),pier:scene.pier?worldToScreen(scene.pier.gate):null,castTarget:castTarget?worldToScreen(castTarget):null,camera:{...camera},tackle:lastTackle,actionCamera:{mode:target.mode,focus:target.focus,desiredScale:target.scale,safeBounds:target.safeBounds},fishVisual,castPreview};
  }
  return{resize,draw,screenToWorld,worldToScreen,focus(x,y){manualFocus=typeof x==='object'&&x?{x:x.x,y:x.y}:{x,y};if(x==null)manualFocus=null;initialized=false;},setInsets(value={}){insets={...insets,...value};},get camera(){return{...camera};},get state(){return lastState;}};
}
