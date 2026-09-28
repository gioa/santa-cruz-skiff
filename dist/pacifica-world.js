// Original canvas pixel art for the Pacifica / Linda Mar shore scene.
// Coordinates are shared with pacifica-sim; no image downloads are needed.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shoreY=x=>420+18*Math.sin(x/240)+9*Math.sin(x/87);
const noise=(x,y=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
const C={deep:'#3d7d88',sea:'#4d969b',shallow:'#7bb6b0',foam:'#e6eed1',sand:'#e7cea0',dry:'#f0dcb0',wet:'#c2bc99',ink:'#314e51',grass:'#788a61',darkGrass:'#536f5d',coral:'#c97459'};
const FONT={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],'&':['01100','10010','10100','01000','10101','10010','01101'],'/':['00001','00001','00010','00100','01000','10000','10000'],'-':['00000','00000','00000','11111','00000','00000','00000'],' ':['000'],0:['01110','10001','10011','10101','11001','10001','01110'],1:['010','110','010','010','010','010','111'],2:['01110','10001','00001','00110','01000','10000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['10010','10010','10010','11111','00010','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110']};

export function createPacificaWorld(canvas){
  const ctx=canvas.getContext('2d',{alpha:false});
  const camera={x:740,y:590,scale:.65,width:900,height:600};
  let cssWidth=900,cssHeight=600,insets={top:90,bottom:200},now=0,lastTime=null,lastState=null,manualFocus=null,initialized=false;
  const cache=document.createElement('canvas');cache.width=2040;cache.height=1640;
  const b=cache.getContext('2d');b.translate(320,200);
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
  function headlands(){
    // The stepped coastal bluffs frame the open sweep of Linda Mar Beach.
    poly(b,[[-320,64],[-60,64],[-60,93],[19,93],[19,132],[65,132],[65,174],[96,174],[96,215],[130,215],[130,267],[155,267],[155,318],[184,318],[184,360],[213,360],[213,402],[-320,438]],'#658679');
    poly(b,[[-320,63],[-55,63],[-55,96],[17,96],[17,139],[57,139],[57,181],[86,181],[86,225],[119,225],[119,279],[143,279],[143,326],[175,326],[175,375],[-320,401]],'#83997b');
    poly(b,[[-150,106],[-40,106],[-40,142],[12,142],[12,201],[50,201],[50,266],[82,266],[82,328],[-70,346]],'#9cab82');
    poly(b,[[1720,95],[1500,95],[1500,142],[1450,142],[1450,202],[1415,202],[1415,246],[1375,246],[1375,280],[1335,280],[1335,317],[1295,317],[1295,356],[1265,356],[1265,408],[1720,450]],'#607d70');
    poly(b,[[1720,96],[1500,96],[1500,149],[1460,149],[1460,211],[1425,211],[1425,256],[1390,256],[1390,292],[1350,292],[1350,330],[1310,330],[1310,372],[1720,415]],'#8c9e7d');
    for(let i=0;i<58;i++){const side=i%2===0,x=side?-80+noise(i,9)*245:1320+noise(i,10)*240,y=150+noise(i,11)*235;if((side&&x<y*.46-12)||(!side&&x>1490-y*.45))R(b,x,y,10+noise(i,12)*28,4,'#758d71');}
    for(let i=0;i<13;i++)rock(b,i<7?40+i*25:1270+(i-7)*24,365+noise(i,88)*55,20+noise(i,20)*28,12+noise(i,22)*15);
    // Distant mist masks the back edge of the hills without flattening the surf.
    b.globalAlpha=.17;R(b,-320,77,2040,13,'#c2d5c0');R(b,-320,104,2040,7,'#dce3cc');b.globalAlpha=1;
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
  function terrain(){
    R(b,-320,-200,2040,1640,C.sea);
    for(let y=-200;y<510;y+=26){const t=clamp((y+150)/680,0,1);const colors=['#397886','#3e838e','#448d95','#509a9e','#59a3a5','#65aaa9','#76b6af'];R(b,-320,y,2040,27,colors[Math.min(6,Math.floor(t*7))]);}
    for(let i=0;i<300;i++){const x=-300+noise(i,1)*2000,y=-150+noise(i,2)*590;R(b,x,y,14+noise(i,3)*50,2,i%3?'#78b7b1':'#8fc5b9');}
    const coast=[];for(let x=-320;x<=1730;x+=10)coast.push([x,Math.round(shoreY(x)/4)*4]);
    poly(b,[...coast,[1730,1440],[-320,1440]],C.wet);
    poly(b,[...coast.map(([x,y])=>[x,y+22]),[1730,1440],[-320,1440]],'#dbcca5');
    poly(b,[...coast.map(([x,y])=>[x,y+43]),[1730,1440],[-320,1440]],C.sand);
    poly(b,[...coast.map(([x,y])=>[x,y+100+6*Math.sin(x/140)]),[1730,1440],[-320,1440]],C.dry);
    for(let i=0;i<2100;i++){const x=-300+noise(i,19)*2020,y=shoreY(x)+33+noise(i,31)*985;R(b,x,y,i%5===0?5:2,i%8===0?2:1,i%3?'#d9c297':'#f8e8c4');}
    // Broad dune banks at the back, leaving the wet sand unobstructed.
    for(let i=0;i<32;i++){const x=-200+i*65,y=948+Math.sin(i*.8)*21;poly(b,[[x-40,y+20],[x-25,y],[x+15,y],[x+15,y-9],[x+66,y-9],[x+66,y],[x+100,y],[x+122,y+45],[x+125,1440],[x-40,1440]],i%2?'#d8c796':'#dfcea0');}
    for(let i=0;i<195;i++){const x=-270+noise(i,41)*1950,y=948+noise(i,42)*440;grass(b,x,y,.7+noise(i,43)*.5,i%3?C.grass:'#929969');}
    // Soft winding beach access tracks, with an elevated plank walk to the shop.
    for(let x=865;x<1510;x+=8){const y=916-Math.sin((x-800)/680)*63;R(b,x,y,10,36,'#ddc699');R(b,x,y+4,10,27,'#e8d4a9');}
    poly(b,[[1214,812],[1510,858],[1510,902],[1205,846],[1101,846],[1101,813]],'#a48d68');
    for(let x=1110;x<1510;x+=10){const y=x<1220?815:815+(x-1220)*.16;R(b,x,y,8,30,'#c5aa7a');R(b,x,y+2,7,2,'#e1c594');R(b,x+7,y,2,30,'#8e7e61');}
    for(let x=1220;x<1500;x+=42){const y=822+(x-1220)*.16;R(b,x,y-9,4,43,'#8c8265');R(b,x-1,y-12,6,5,'#ddd0a0');}
    line(b,1220,816,1500,861,'#ae9d78',3);
    // Seaside cottages peek over the dune, with space between each silhouette.
    cottage(b,80,889,100,'#d6ad8d');cottage(b,241,920,89,'#d1c5a0');cottage(b,435,949,105,'#a9b4a0');cottage(b,1373,721,115,'#d5b590');
    for(let i=0;i<28;i++){const x=35+i*18,y=988+Math.sin(i*.15)*7;R(b,x,y-18,4,22,'#a19471');R(b,x-1,y-21,6,4,'#e0d0a6');if(i<27)line(b,x,y-13,x+19,y-12,'#c5b38a',2);}
    headlands();
    // A driftwood seat, washed-up kelp, shells and a solitary beach umbrella.
    line(b,519,713,610,722,'#b69a72',11);line(b,525,710,607,718,'#d4b88a',4);line(b,548,714,538,730,'#9d8561',5);line(b,589,721,601,733,'#9d8561',5);
    for(let i=0;i<24;i++){const x=245+noise(i,68)*880,y=shoreY(x)+55+noise(i,69)*38;R(b,x,y,3,2,'#b29569');if(i%4===0){R(b,x-3,y-1,8,2,'#f9e8c6');R(b,x-1,y-3,4,2,'#ead0a8');}}
    for(const[x,y]of[[357,566],[732,617],[899,740]]){R(b,x,y,19,3,'#9b9e71');R(b,x+8,y-4,18,2,'#a8a879');R(b,x+18,y-2,2,8,'#979969');}
    shadow(b,386,832,66,13,.13);R(b,382,781,3,55,'#9e8864');poly(b,[[350,785],[360,772],[375,765],[393,765],[408,772],[416,785]],'#d48a67');poly(b,[[350,785],[375,765],[370,785]],'#edce9a');poly(b,[[390,785],[393,765],[416,785]],'#f4d9a8');R(b,350,785,66,4,'#bf765c');R(b,405,824,30,5,'#6e9184');R(b,404,829,4,10,'#8e8567');R(b,429,829,4,10,'#8e8567');
    // Coastal wayfinding is readable artwork, separate from the game HUD.
    R(b,945,791,6,63,'#8a7957');R(b,1006,791,6,63,'#8a7957');R(b,933,780,91,45,'#416b68');R(b,930,777,97,5,'#c3b184');R(b,934,781,89,2,'#739587');text(b,'PACIFICA',978,790,1.7,'#f2dfb3');text(b,'LINDA MAR',978,809,1.2,'#bad0b1');
    for(const[x,y]of[[913,841],[1009,862],[1254,880],[870,943],[625,965],[736,995],[1330,721],[1256,685]])grass(b,x,y,1.3);
    shop();
  }
  terrain();

  function resize(width,height){
    cssWidth=Math.max(1,width);cssHeight=Math.max(1,height);
    const widthLogical=Math.min(1000,Math.max(360,Math.round(width*.66)));
    canvas.width=widthLogical;canvas.height=Math.round(widthLogical*height/width);camera.width=canvas.width;camera.height=canvas.height;ctx.imageSmoothingEnabled=false;initialized=false;
  }
  function viewport(){const s=canvas.height/cssHeight;return{top:Math.min(insets.top*s,canvas.height*.3),bottom:Math.min(insets.bottom*s,canvas.height*.5)};}
  function cameraTarget(state){
    const compact=cssWidth<720||cssHeight<520,pl=state.player||{x:1100,y:865},v=viewport(),available=canvas.height-v.top-v.bottom;
    let scale=compact?Math.min(.86,canvas.width/510,available/310):Math.max(.4,Math.min(.73,canvas.width/1460,available/720));
    const centerY=v.top+available*.5;
    let target=manualFocus||{x:compact?clamp(pl.x,210,1190):clamp(pl.x*.17+595,670,800),y:compact?pl.y-115:560};
    if(!manualFocus&&state.cast&&!['walk','landed'].includes(state.phase)){
      const cast=state.cast,ratio=state.phase==='fighting'?clamp((state.lineDistance||cast.distance)/(cast.distance||1),.08,1.5):1;
      const fishX=cast.origin.x+(cast.target.x-cast.origin.x)*ratio,fishY=Math.min(cast.origin.y+(cast.target.y-cast.origin.y)*ratio,shoreY(fishX)-5);
      const minY=Math.min(fishY,cast.target.y)-55,maxY=pl.y+25,minX=Math.min(pl.x-35,fishX)-30,maxX=Math.max(pl.x+35,fishX)+30;
      scale=Math.min(scale,available/(maxY-minY),canvas.width/(maxX-minX));
      target={x:(minX+maxX)/2,y:(minY+maxY)/2};
    }
    return{x:target.x,y:target.y,scale,screenY:centerY};
  }
  let offset={x:0,y:0};
  function project(x,y){return{x:Math.round((x-camera.x)*camera.scale+canvas.width/2),y:Math.round((y-camera.y)*camera.scale+offset.y)};}
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();const x=(clientX-r.left)*canvas.width/r.width,y=(clientY-r.top)*canvas.height/r.height;return{x:camera.x+(x-canvas.width/2)/camera.scale,y:camera.y+(y-offset.y)/camera.scale};}
  function worldToScreen(x,y){const p=typeof x==='object'?project(x.x,x.y):project(x,y),r=canvas.getBoundingClientRect();return{x:p.x*r.width/canvas.width,y:p.y*r.height/canvas.height,clientX:r.left+p.x*r.width/canvas.width,clientY:r.top+p.y*r.height/canvas.height,visible:p.x>=0&&p.x<=canvas.width&&p.y>=0&&p.y<=canvas.height};}
  function visible(x,y,pad=80){const p=project(x,y);return p.x>-pad&&p.x<canvas.width+pad&&p.y>-pad&&p.y<canvas.height+pad;}
  function waves(){
    // Uneven broken crests travel onto the sand and recede together.
    for(let band=0;band<5;band++){
      const progress=(now*.1+band*.21)%1,dist=26+(1-progress)*226,alpha=Math.sin(progress*Math.PI)*.7;
      ctx.globalAlpha=alpha;
      for(let x=170;x<1300;x+=9){const n=noise(Math.floor(x/45),band);if(n<.12&&progress<.78)continue;const y=shoreY(x)-dist+Math.sin(x/43+band)*4;
        R(ctx,x,y,10,band<2?3:2,band%2?'#cee4c7':'#ebefd3');if(n>.56)R(ctx,x+2,y+4,7,2,'#a6d0ba');if(n>.81)R(ctx,x-2,y+8,3,2,'#c7e2c5');
      }
    }
    ctx.globalAlpha=1;
    const runup=10+Math.sin(now*.84)*8;
    for(let x=174;x<1280;x+=8){const y=shoreY(x)+runup+Math.sin(x/21+now*.6)*3;R(ctx,x,y,9,3,'#eff0d4');if(noise(x,74)>.5)R(ctx,x+2,y+4,4,2,'#e3e7c8');}
    for(let i=0;i<35;i++){const x=230+noise(i,47)*990,y=shoreY(x)-36-noise(i,48)*248;ctx.globalAlpha=.2+.15*Math.sin(now+i);R(ctx,x+Math.sin(now*.5+i)*4,y,8+noise(i,49)*17,2,'#dfebd2');}ctx.globalAlpha=1;
  }
  function gull(x,y,flight=false,variant=0){
    if(flight){const wing=Math.sin(now*4+variant)>0?7:-3;line(ctx,x,y,x-8,y-wing,'#edf0db',2);line(ctx,x,y,x+8,y-wing,'#edf0db',2);R(ctx,x-2,y,4,3,'#4e6e70');R(ctx,x+8,y-wing,3,2,'#617e7d');return;}
    shadow(ctx,x,y+4,12,4,.13);R(ctx,x-6,y-3,11,6,'#e9ead6');R(ctx,x-1,y-7,6,7,'#f6eed7');R(ctx,x-6,y-1,6,3,'#7e9490');R(ctx,x+5,y-5,4,2,'#cfa46b');R(ctx,x+2,y-6,1,1,'#3c5659');R(ctx,x-2,y+3,1,4,'#a19169');R(ctx,x+2,y+3,1,4,'#a19169');
  }
  function person(x,y,{staff=false,walking=false,fishing=false,facing='up',small=false}={}){
    if(!visible(x,y))return;const t=walking?Math.sin(now*11):0,leg=Math.round(t*3),s=small?.85:1;
    shadow(ctx,x+2,y+1,25*s,8*s,.22);ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);const bob=walking?-Math.abs(Math.round(t)):0;ctx.translate(0,bob);
    R(ctx,-7,-10+leg,6,10-leg,'#405a58');R(ctx,2,-10-leg,6,10+leg,'#405a58');R(ctx,-8,-3+leg,8,4,'#2d494d');R(ctx,2,-3-leg,8,4,'#2d494d');
    R(ctx,-10,-26,20,18,staff?'#658c82':'#b76e50');R(ctx,-7,-25,14,17,staff?'#7fa395':'#d38f61');R(ctx,-7,-24,4,12,staff?'#d9cba0':'#e7ad72');R(ctx,5,-22,3,12,staff?'#425e5b':'#9f624f');
    if(!staff){R(ctx,-5,-22,10,13,'#827f59');R(ctx,-4,-21,8,2,'#b6a576');R(ctx,-4,-11,8,2,'#4c6457');}
    R(ctx,-6,-36,13,11,'#d6aa81');R(ctx,-7,-35,3,7,'#b68664');
    R(ctx,-8,-40,15,7,staff?'#718376':'#476767');R(ctx,-10,-35,21,3,staff?'#c4b58b':'#e0c292');R(ctx,-6,-40,12,2,staff?'#9baa8b':'#78988a');
    const front=staff||facing===2||facing==='down'||facing==='south';if(front){R(ctx,3,-30,2,2,'#394e4d');R(ctx,2,-27,4,1,'#b58164');}else R(ctx,-5,-31,11,3,'#644f45');
    if(fishing){line(ctx,-10,-23,-13,-28,'#dcad81',4);line(ctx,9,-23,4,-27,'#e8bb8d',4);R(ctx,-14,-29,6,4,'#edc99b');}else{R(ctx,-13,-24,4,12+leg,'#dfb289');R(ctx,10,-24,4,12-leg,'#e7bb8d');}
    if(staff){R(ctx,-5,-19,11,9,'#4b6b64');R(ctx,-2,-24,4,4,'#e6d2a2');}ctx.restore();
  }
  function ring(x,y,r,color,alpha=1){ctx.globalAlpha=alpha;const points=[];for(let i=0;i<20;i++){const a=i/20*TAU;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r*.42]);}for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];line(ctx,p[0],p[1],q[0],q[1],color,2);}ctx.globalAlpha=1;}
  function fishing(state){
    const p=state.player||{x:1100,y:865},cast=state.cast,active=cast&&!['walk','landed'].includes(state.phase);
    const tip={x:p.x-21,y:p.y-66};
    if(active){
      const fight=state.phase==='fighting',bite=state.phase==='bite',f=state.phase==='casting'?clamp((cast.flight||0)/(cast.flightDuration||1),0,1):1;
      const ratio=fight?clamp((state.lineDistance||cast.distance)/(cast.distance||1),.08,1.5):1;
      const tx=cast.origin.x+(cast.target.x-cast.origin.x)*ratio,ty=cast.origin.y+(cast.target.y-cast.origin.y)*ratio;
      const target={x:p.x+(tx-p.x)*f+(fight?Math.sin(now*3)*7:0),y:p.y+(ty-p.y)*f-Math.sin(f*Math.PI)*115};
      if(fight)target.y=Math.min(target.y,shoreY(target.x)-5);
      const bend=fight?12*(state.tension||0):0;
      const rodTip={x:tip.x+bend,y:tip.y+bend*.7};
      const mid={x:(rodTip.x+target.x)/2,y:(rodTip.y+target.y)/2+(fight?3:17)};
      line(ctx,rodTip.x,rodTip.y,mid.x,mid.y,'#e9dfb6',1);line(ctx,mid.x,mid.y,target.x,target.y,'#e9dfb6',1);
      if(state.phase==='casting'){shadow(ctx,target.x,target.y+Math.sin(f*Math.PI)*115,8,3,.22);R(ctx,target.x-2,target.y-3,4,6,'#d27a59');R(ctx,target.x-2,target.y-4,4,2,'#fff0c2');}
      else{
        ring(target.x,target.y,11+Math.sin(now*3)*2,'#e0ead0',.65);
        if(fight){const size=11+Math.min(12,(state.fish?.weightKg||1)*2);R(ctx,target.x-size/2,target.y-3,size,5,'#476d6c');poly(ctx,[[target.x-size/2,target.y],[target.x-size/2-7,target.y-5],[target.x-size/2-7,target.y+5]],'#547973');R(ctx,target.x+size/4,target.y-4,3,2,'#c4d5b6');for(let i=0;i<5;i++){const a=now*3+i*1.2;R(ctx,target.x+Math.cos(a)*17,target.y+Math.sin(a)*7,4,2,'#f1f1d8');}}
        else{const pulse=bite?4:2;R(ctx,target.x-pulse,target.y,pulse*2,1,'#a9cbb5');} // Bottom rigs show a line-entry ripple, not a float.
        if(bite){ring(target.x,target.y,21+(now*20)%16,'#ffe2a0',.7);R(ctx,target.x-2,target.y-35,4,13,'#fff1b7');R(ctx,target.x-2,target.y-17,4,4,'#fff1b7');}
      }
      // The flexing rod is connected to the hands, and line starts at its tip.
      line(ctx,p.x-12,p.y-27,p.x-22,p.y-51,'#354e50',3);line(ctx,p.x-22,p.y-51,rodTip.x,rodTip.y,'#354e50',2);line(ctx,p.x-12,p.y-28,p.x-17,p.y-39,'#caa374',3);R(ctx,p.x-14,p.y-32,6,5,'#aeb4a0');
      return target;
    }
    line(ctx,p.x+11,p.y-19,p.x+21,p.y-65,'#3e5656',2);R(ctx,p.x+10,p.y-20,3,10,'#c1a071');R(ctx,p.x+8,p.y-23,6,5,'#aab3a0');return null;
  }
  function draw(state={},time=0){
    lastState=state;now=Number.isFinite(state.elapsed)?state.elapsed:time;const raw=Number.isFinite(time)?time:now,dt=lastTime===null?.016:clamp(raw-lastTime,0,.1);lastTime=raw;
    const target=cameraTarget(state),fitImmediately=state.phase==='casting',ease=initialized&&!fitImmediately?1-Math.exp(-dt*6):1;camera.x+=(target.x-camera.x)*ease;camera.y+=(target.y-camera.y)*ease;camera.scale+=(target.scale-camera.scale)*ease;offset.y=target.screenY;initialized=true;
    ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;R(ctx,0,0,canvas.width,canvas.height,C.dry);
    const origin=project(0,0);ctx.setTransform(camera.scale,0,0,camera.scale,origin.x,origin.y);
    R(ctx,-10000,-10000,20000,10440,C.sea);R(ctx,-10000,440,20000,10000,C.dry);
    // Continue the authored edge colors outside the compact map when a wide
    // viewport zooms out to frame a long surf cast.
    ctx.drawImage(cache,0,0,1,cache.height,-10000,-200,9680,1640);
    ctx.drawImage(cache,cache.width-1,0,1,cache.height,1720,-200,10000,1640);
    ctx.drawImage(cache,-320,-200);waves();
    for(let i=0;i<3;i++){const x=430+i*270+Math.sin(now*.07+i)*125,y=197+Math.sin(now*.11+i*2)*43;gull(x,y,true,i);}
    gull(648,572);gull(673,580);gull(719,561);gull(1297,719);
    // Sand footprints are ephemeral and always stay behind the walking angler.
    const p=state.player||{x:1100,y:865};if(state.walkTarget){const dx=state.walkTarget.x-p.x,dy=state.walkTarget.y-p.y,d=Math.hypot(dx,dy)||1;if(p.y>shoreY(p.x)+35)for(let i=1;i<5;i++){const xx=p.x-dx/d*i*13+(i%2?3:-3),yy=p.y-dy/d*i*13;R(ctx,xx,yy,3,5,'#cbb88f');}}
    if(state.walkTarget&&Math.hypot(state.walkTarget.x-p.x,state.walkTarget.y-p.y)>18){ring(state.walkTarget.x,state.walkTarget.y,11,'#f9efcc',.8);R(ctx,state.walkTarget.x-2,state.walkTarget.y-2,4,3,'#a59471');}
    // A local surf angler and the shopkeeper bring scale and life to the beach.
    person(462,shoreY(462)+64,{small:true,fishing:true});line(ctx,451,shoreY(462)+38,441,shoreY(462)+3,'#496463',2);bucket(ctx,484,shoreY(462)+70);
    person(1197,813,{staff:true,small:true,facing:'down'});
    person(p.x,p.y,{walking:state.player?.walking,facing:state.player?.facing,fishing:!!state.cast&&!['walk','landed'].includes(state.phase)});
    const castTarget=fishing(state);
    if(state.phase==='landed'){ring(p.x,p.y+2,23,'#f0d292',.5);if(state.fish){R(ctx,p.x+21,p.y-25,18,7,'#8caa91');poly(ctx,[[p.x+38,p.y-22],[p.x+44,p.y-29],[p.x+44,p.y-16]],'#607f74');R(ctx,p.x+22,p.y-25,2,2,'#34595d');}}
    // Subtle salt haze over far water; no screen-sized translucent overlay.
    ctx.globalAlpha=.1;R(ctx,210,128,980,6,'#eff1d5');R(ctx,368,141,560,3,'#eff1d5');ctx.globalAlpha=1;
    ctx.setTransform(1,0,0,1,0,0);
    return{player:worldToScreen(p),shop:worldToScreen(1130,815),castTarget:castTarget?worldToScreen(castTarget):null,camera:{...camera}};
  }
  return{resize,draw,screenToWorld,worldToScreen,focus(x,y){manualFocus=typeof x==='object'?{x:x.x,y:x.y}:{x,y};if(x==null)manualFocus=null;initialized=false;},setInsets(value={}){insets={...insets,...value};initialized=false;},get camera(){return{...camera};},get state(){return lastState;}};
}
