import {pierRings,landPolygons,coastLines,buildingFootprints,FISHING_SPOTS,onLand,onPier} from './geography.js?v=20260927-pixel-v7';
import {HARBOR} from './harbor-layout.js?v=20260927-pixel-v7';
import {depthInfoAt} from './bathymetry.js?v=20260927-pixel-v7';
import {createWildlife,drawWildlife} from './pixel-wildlife.js?v=20260927-pixel-v7';
import {cameraOffset,unprojectPixel,stepDeadzoneCamera,keepCameraPointsVisible,cameraDeadzone,cameraZoomForState,zoomCameraAt,rectilinearOutline} from './pixel-camera.js?v=20260927-pixel-v7';
import {ladderPoint} from './swimming.js?v=20260927-pixel-v7';

// The map keeps the same metre coordinates as the sailing simulation. The
// people and boat are deliberately enlarged, like a handheld-era RPG, so that
// hands, tackle and the outboard remain legible on a phone.
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=(n^(n>>>13))*1274126177;return((n^(n>>>16))>>>0)/4294967295;};
const rectRing=r=>[{x:r.minX,z:r.minZ},{x:r.maxX,z:r.minZ},{x:r.maxX,z:r.maxZ},{x:r.minX,z:r.maxZ}];
// These are presentation-only outlines. Navigation and collision keep the
// untouched geographic rings imported above.
const artPierRings=pierRings.map(r=>rectilinearOutline(r,{grid:1,span:14}));
const artLandPolygons=landPolygons.map(r=>rectilinearOutline(r,{grid:3,span:12}));
const artCoastLines=coastLines.map(r=>rectilinearOutline(r,{grid:3,span:12,closed:false}));
const artBuildings=new Map(buildingFootprints.map(b=>[b.id,rectilinearOutline(b.points,{grid:1,span:6})]));
const artHarborPool=rectilinearOutline([{x:-31,z:-75},{x:-43,z:-77},{x:-49,z:-68},{x:-50,z:-59},{x:-44,z:-47},{x:-36,z:-44},{x:-31,z:-51}],{grid:2,span:8});

export function createPixelWorld(canvas,{sprites={},conditions={}}={}){
  const ctx=canvas.getContext('2d',{alpha:false});
  const camera={x:HARBOR.spawnX-7,z:HARBOR.spawnZ-7,scale:6,width:640,height:360};
  let pixelOffset=cameraOffset(camera);
  let cssWidth=640,cssHeight=360,clock=0,zoomOverride=null,initialized=false,lastBoat=null,cameraResized=false,lastMode=null;
  const wakes=[];
  let seaConditions=conditions;
  const ecology=createWildlife({habitat:(x,z)=>({water:!onLand(x,z)&&!onPier(x,z),depth:depthInfoAt(x,z).value??0}),origin:{x:HARBOR.boatX,z:HARBOR.boatZ}});
  const deckPattern=document.createElement('canvas');deckPattern.width=32;deckPattern.height=20;
  const dc=deckPattern.getContext('2d');dc.fillStyle='#cfa474';dc.fillRect(0,0,32,20);
  for(let y=0;y<20;y+=5){dc.fillStyle=y%10?'#dcb47f':'#bd9069';dc.fillRect(0,y,32,1);dc.fillStyle='#aa7f60';dc.fillRect(y%10?13:26,y,1,5);dc.fillStyle='#e5bf88';dc.fillRect(2,y+1,9,1);dc.fillStyle='#c3976e';dc.fillRect(16,y+3,11,1);}
  const plankPattern=ctx.createPattern(deckPattern,'repeat');
  const roofPatterns=['#557d7d','#678d8a','#6c8588'].map(base=>{const tile=document.createElement('canvas');tile.width=24;tile.height=16;const r=tile.getContext('2d');r.fillStyle=base;r.fillRect(0,0,24,16);for(let y=0;y<16;y+=4){r.fillStyle='#8ba59a';r.fillRect(0,y,24,1);r.fillStyle='#47666c';r.fillRect(y%8?5:17,y+1,1,3);r.fillStyle='#759b91';r.fillRect(y%8?7:2,y+2,8,1);}return ctx.createPattern(tile,'repeat');});
  function resize(width,height){
    cssWidth=Math.max(1,width);cssHeight=Math.max(1,height);
    const portrait=height>width*1.12;
    // A fixed logical pixel density preserves crisp sprites at any DPR, while
    // a portrait phone receives a taller view instead of a squeezed desktop.
    const logicalWidth=portrait?Math.min(360,Math.max(300,Math.round(width*.84))):Math.min(800,Math.max(560,Math.round(width/2)));
    const logicalHeight=Math.round(logicalWidth*height/width);cameraResized=canvas.width!==logicalWidth||canvas.height!==logicalHeight;
    if(cameraResized){canvas.width=logicalWidth;canvas.height=logicalHeight;}
    camera.width=canvas.width;camera.height=canvas.height;
    camera.viewport={height:cssHeight,bottom:cssHeight<=500&&cssWidth>cssHeight?126:232,gap:10};
    pixelOffset=cameraOffset(camera);ctx.imageSmoothingEnabled=false;
  }
  function point(x,z){return{x:Math.round(x*camera.scale)+pixelOffset.x,y:Math.round(z*camera.scale)+pixelOffset.y};}
  function screenToWorld(x,y){return unprojectPixel(camera,x*canvas.width/cssWidth,y*canvas.height/cssHeight);}
  function cssWorldToScreen(x,z){const p=point(x,z);return{x:p.x*cssWidth/canvas.width,y:p.y*cssHeight/canvas.height,visible:p.x>=0&&p.x<=canvas.width&&p.y>=0&&p.y<=canvas.height};}
  function path(points,dx=0,dy=0){ctx.beginPath();for(let i=0;i<points.length;i++){const p=point(points[i].x,points[i].z);i?ctx.lineTo(p.x+dx,p.y+dy):ctx.moveTo(p.x+dx,p.y+dy);}ctx.closePath();}
  function pixelLine(x1,y1,x2,y2,color,width=1){x1=Math.round(x1);y1=Math.round(y1);x2=Math.round(x2);y2=Math.round(y2);const dx=Math.abs(x2-x1),sx=x1<x2?1:-1,dy=-Math.abs(y2-y1),sy=y1<y2?1:-1,w=Math.max(1,Math.round(width));let error=dx+dy;ctx.fillStyle=color;for(let i=0;i<3000;i++){ctx.fillRect(x1-Math.floor(w/2),y1-Math.floor(w/2),w,w);if(x1===x2&&y1===y2)break;const e=2*error;if(e>=dy){error+=dy;x1+=sx;}if(e<=dx){error+=dx;y1+=sy;}}}
  function worldLine(a,b,color,width=1){const p=point(a.x,a.z),q=point(b.x,b.z);pixelLine(p.x,p.y,q.x,q.y,color,width);}
  function visible(x,z,pad=100){const p=point(x,z);return p.x>-pad&&p.x<canvas.width+pad&&p.y>-pad&&p.y<canvas.height+pad;}
  function sprite(name,x,y,scale=1,opts={}){
    const asset=sprites[name];
    if(asset){const im=asset.image||asset.canvas||asset;if(im.width){ctx.drawImage(im,Math.round(x-im.width*scale/2),Math.round(y-im.height*scale),Math.round(im.width*scale),Math.round(im.height*scale));return true;}}
    if(typeof sprites.draw==='function'){sprites.draw(ctx,name,Math.round(x),Math.round(y),{scale,...opts});return true;}
    return false;
  }
  function smallShadow(x,y,w,h,alpha=.2){ctx.fillStyle=`rgba(22,57,65,${alpha})`;ctx.fillRect(Math.round(x-w/2)+2,Math.round(y-h/2),Math.round(w)-4,Math.round(h));ctx.fillRect(Math.round(x-w/2),Math.round(y-h/2)+2,Math.round(w),Math.max(1,Math.round(h)-4));}
  function ocean(){
    ctx.fillStyle='#3899a3';ctx.fillRect(0,0,canvas.width,canvas.height);
    const s=camera.scale,x0=camera.x-canvas.width/(2*s)-15,x1=camera.x+canvas.width/(2*s)+15,z0=camera.z-canvas.height/(2*s)-15,z1=camera.z+canvas.height/(2*s)+15;
    // Long stepped colour shelves, then separate small crests: readable water
    // without high frequency glitter or a screen-space scrolling texture.
    for(let z=Math.floor(z0/18)*18;z<z1;z+=18)for(let x=Math.floor(x0/24)*24;x<x1;x+=24){
      const n=hash(x,z),p=point(x+n*8,z+n*5),w=Math.ceil((10+n*10)*s),h=Math.ceil((2+n*5)*s);
      // Stepped, overlapping shelves of colour rather than a visible tile grid.
      ctx.fillStyle=n>.5?'#3a9da5':'#36969f';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+w*.6,p.y);ctx.lineTo(p.x+w*.6,p.y+h*.25);ctx.lineTo(p.x+w,p.y+h*.25);ctx.lineTo(p.x+w,p.y+h*.7);ctx.lineTo(p.x+w*.75,p.y+h*.7);ctx.lineTo(p.x+w*.75,p.y+h);ctx.lineTo(p.x+w*.15,p.y+h);ctx.lineTo(p.x+w*.15,p.y+h*.7);ctx.lineTo(p.x,p.y+h*.7);ctx.closePath();ctx.fill();
      if(n>.48){ctx.fillStyle='#42a6ab';ctx.fillRect(p.x+Math.round(w*.18),p.y+Math.round(h*.56),Math.round(w*.45),Math.max(1,Math.round(s*.35)));}
    }
    // Coastline bath of shallow turquoise; geometry itself comes from OSM.
    for(const ring of artCoastLines){ctx.beginPath();for(let i=0;i<ring.length;i++){const p=point(ring[i].x,ring[i].z);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle='#4fb8b1';ctx.lineWidth=Math.max(10,42*s);ctx.lineJoin='miter';ctx.stroke();ctx.strokeStyle='#72c9ba';ctx.lineWidth=Math.max(5,15*s);ctx.stroke();}
    for(let z=Math.floor(z0/7)*7;z<z1;z+=7)for(let x=Math.floor(x0/9)*9;x<x1;x+=9){
      const n=hash(x+17,z-61),p=point(x+n*5+Math.sin(clock*.2+n*8)*.45,z+n*3);const phase=(clock*.21+n*4)%1;
      ctx.globalAlpha=.2+Math.sin(phase*Math.PI)*.3;ctx.fillStyle=n>.7?'#b7e8d3':'#76c7c1';
      const w=Math.max(3,Math.round((.5+n*1.2)*s));ctx.fillRect(p.x,p.y,w,1);if(n>.75){ctx.fillRect(p.x+2,p.y+1,w-4,1);ctx.fillRect(p.x+w,p.y-1,2,1);}
    }ctx.globalAlpha=1;
    // The wharf's submerged pilings and calm pool remain visible through the
    // water; their darker colour also makes the left boarding landing clear.
    path(artHarborPool);ctx.fillStyle='#35969f';ctx.fill();
    for(const spot of FISHING_SPOTS){if(spot.kind!=='kelp'||!visible(spot.x,spot.z,300))continue;for(let i=0;i<50;i++){const a=hash(i,41)*TAU,r=Math.sqrt(hash(i,32))*42,p=point(spot.x+Math.cos(a)*r,spot.z+Math.sin(a)*r);ctx.fillStyle=i%3?'#397f7e':'#428d81';ctx.fillRect(p.x,p.y,Math.max(2,s),Math.max(3,s*2));ctx.fillRect(p.x-s,p.y+s*2,Math.max(2,s*2),Math.max(2,s));}}
    // Schools are only visual. Catch probability and species stay in the sim.
    const focusX=lastBoat?.x??HARBOR.boatX,focusZ=lastBoat?.z??HARBOR.boatZ;
    for(let i=0;i<5;i++){const a=clock*.11+i*.85,x=focusX+Math.sin(a)*10-7,z=focusZ+Math.cos(a*.8)*8+5,p=point(x,z);ctx.globalAlpha=.2;ctx.fillStyle='#1c6574';ctx.fillRect(p.x,p.y,6,2);ctx.fillRect(p.x+5,p.y-1,2,4);}ctx.globalAlpha=1;
  }
  function terrain(){
    for(const ring of artLandPolygons){path(ring,4,5);ctx.fillStyle='#2d8f92';ctx.fill();path(ring);ctx.fillStyle='#ead6a6';ctx.fill();ctx.strokeStyle='#f4e4bd';ctx.lineWidth=Math.max(2,camera.scale*2);ctx.stroke();}
    for(const ring of artPierRings){
      path(ring,Math.max(4,camera.scale*.8),Math.max(7,camera.scale*1.4));ctx.fillStyle='rgba(20,83,91,.32)';ctx.fill();
      path(ring,0,Math.max(3,camera.scale*.7));ctx.fillStyle='#796649';ctx.fill();
      path(ring);ctx.fillStyle='#c49a70';ctx.fill();ctx.save();ctx.clip();const o=point(0,0);plankPattern.setTransform(new DOMMatrix().translate(o.x,o.y).scale(camera.scale/6));ctx.fillStyle=plankPattern;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
      path(ring);ctx.strokeStyle='#f2d49b';ctx.lineWidth=3;ctx.stroke();
      // Rail gaps at the boarding stair are intentional and match the route.
      for(let k=0;k<ring.length-1;k++){const a=ring[k],b=ring[k+1],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/3.5);for(let j=0;j<n;j++){const f=j/n,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;if(x<-24&&z>-70&&z<-52||!visible(x,z,20))continue;const p=point(x,z);ctx.fillStyle='#655e4d';ctx.fillRect(p.x-2,p.y-1,4,7);ctx.fillStyle='#fff1c5';ctx.fillRect(p.x-2,p.y-3,4,3);}}
    }
    // A small fixed landing reached by the parallel stair, on the left when
    // walking seaward. No invented floating marina replaces the real wharf.
    const steps=[HARBOR.connector,HARBOR.stair,HARBOR.landing];
    for(let i=0;i<steps.length;i++){const ring=rectRing(steps[i]);path(ring,3,5);ctx.fillStyle='#225e69';ctx.fill();path(ring);ctx.fillStyle=i===1?'#ad9270':'#d7b684';ctx.fill();ctx.strokeStyle='#f1dfaf';ctx.lineWidth=2;ctx.stroke();}
    for(let z=HARBOR.stair.minZ;z<HARBOR.stair.maxZ;z+=.62)worldLine({x:HARBOR.stair.minX,z},{x:HARBOR.stair.maxX,z},'#786c55',1);
    // Landing mooring cleats, ropes and the compact yellow davit.
    const c=point(HARBOR.craneX,HARBOR.craneZ);smallShadow(c.x+4,c.y+4,18,8,.25);ctx.fillStyle='#625950';ctx.fillRect(c.x-4,c.y-2,8,7);pixelLine(c.x,c.y,c.x,c.y-25,'#7e6146',5);pixelLine(c.x-2,c.y-25,c.x-28,c.y-12,'#725342',5);pixelLine(c.x,c.y-25,c.x-27,c.y-13,'#e5b451',3);pixelLine(c.x,c.y-30,c.x-29,c.y-14,'#fff0aa',1);pixelLine(c.x-27,c.y-13,c.x-27,c.y+4,'#526971',1);ctx.fillStyle='#f2cd73';ctx.fillRect(c.x-29,c.y+2,5,4);
  }
  function hut(b){
    const p=point(-.2,-50.3),scale=clamp(camera.scale/8,.35,1.1);
    smallShadow(p.x+6,p.y+4,132*scale,28*scale,.25);
    if(sprite('hut',p.x,p.y,scale)||sprite('shop',p.x,p.y,scale))return;
    const w=Math.round(104*scale),h=Math.round(62*scale),x=p.x-w/2,y=p.y-h;
    ctx.fillStyle='#245f69';ctx.fillRect(x,y,w,h);ctx.fillStyle='#4f9994';ctx.fillRect(x+3,y+13,w-6,h-15);ctx.fillStyle='#2e6f76';for(let yy=y+18;yy<p.y;yy+=5)ctx.fillRect(x+3,yy,w-6,1);
    ctx.fillStyle='#285a69';ctx.fillRect(x-4,y-6,w+8,22);ctx.fillStyle='#397786';ctx.fillRect(x,y-10,w,19);ctx.fillStyle='#9ec4b1';for(let xx=x+4;xx<x+w;xx+=7)ctx.fillRect(xx,y-8,2,20);
    ctx.fillStyle='#fff0c1';ctx.fillRect(x+4,y+13,w-8,12);ctx.fillStyle='#456366';ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.fillText('SANTA CRUZ BOAT RENTALS',p.x,y+21);
    ctx.fillStyle='#234c59';ctx.fillRect(x+9,y+33,27,22);ctx.fillRect(x+w-35,y+32,21,31);ctx.fillStyle='#96cbc0';ctx.fillRect(x+11,y+35,23,13);ctx.fillRect(x+w-32,y+35,15,12);ctx.fillStyle='#ddb776';ctx.fillRect(x+4,p.y-4,w-8,4);
  }
  function buildings(){
    for(const b of buildingFootprints){
      const cx=b.points.reduce((s,p)=>s+p.x,0)/b.points.length,cz=b.points.reduce((s,p)=>s+p.z,0)/b.points.length;
      if(!visible(cx,cz,220)||Math.hypot(cx+2,cz+60)<13)continue;
      const outline=artBuildings.get(b.id);path(outline,5,7);ctx.fillStyle='rgba(55,73,65,.25)';ctx.fill();path(outline,0,4);ctx.fillStyle='#d6c38f';ctx.fill();path(outline);const texture=roofPatterns[Math.abs(Number(b.id))%3],o=point(0,0);texture.setTransform(new DOMMatrix().translate(o.x,o.y).scale(camera.scale/6));ctx.fillStyle=texture;ctx.fill();ctx.strokeStyle='#38575f';ctx.lineWidth=3;ctx.stroke();
      const p=point(cx,cz);ctx.fillStyle='#324b55';ctx.fillRect(p.x-7,p.y-3,14,8);ctx.fillStyle='#a7b5a2';ctx.fillRect(p.x-8,p.y-5,14,6);ctx.fillStyle='#d4d9b7';ctx.fillRect(p.x-7,p.y-5,12,1);ctx.fillStyle='#5c7375';for(let xx=p.x-5;xx<p.x+6;xx+=3)ctx.fillRect(xx,p.y-3,1,3);
    }
    if(visible(0,-60,170))hut();
  }
  function person(x,z,opts={}){
    const p=point(x,z),scale=opts.scale??clamp(camera.scale/5.8,.7,1.25),walking=opts.walking,frame=Math.floor(clock*8)%4;
    smallShadow(p.x+2,p.y+1,13*scale,5*scale,.24);
    if(typeof sprites.drawPerson==='function'){sprites.drawPerson(ctx,p.x,p.y,{...opts,scale,frame,time:clock});return;}
    const heading=opts.heading||0,dx=-Math.sin(heading),dz=-Math.cos(heading),direction=Math.abs(dx)>Math.abs(dz)?dx<0?'west':'east':dz<0?'north':'south';
    const asset=opts.staff?sprites.dockWorker:sprites.directions?.[direction]?.[walking?(frame%2)+1:0]||sprites.angler;
    if(asset){ctx.drawImage(asset,Math.round(p.x-asset.width*scale/2),Math.round(p.y-(asset.height-1)*scale),Math.round(asset.width*scale),Math.round(asset.height*scale));return;}
    if(sprite(opts.staff?'staff':'person',p.x,p.y,scale,{...opts,frame}))return;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);const bounce=walking?Math.sin(clock*15):0,leg=walking?Math.round(Math.sin(clock*15)*2):0;ctx.translate(0,bounce);
    ctx.fillStyle='#284750';ctx.fillRect(-5,-5+leg,4,5);ctx.fillRect(2,-5-leg,4,5);ctx.fillStyle=opts.staff?'#356475':'#d5834c';ctx.fillRect(-6,-17,12,12);ctx.fillStyle='#f0a85c';ctx.fillRect(-4,-15,3,7);ctx.fillRect(2,-15,3,7);ctx.fillStyle='#e1b38a';ctx.fillRect(-4,-23,9,8);ctx.fillRect(-8,-13,3,7);ctx.fillRect(6,-13,3,7);ctx.fillStyle='#2d5961';ctx.fillRect(-5,-26,10,5);ctx.fillStyle='#f3cd77';ctx.fillRect(-6,-23,13,2);ctx.fillStyle='#364a4d';ctx.fillRect(1,-20,1,1);ctx.restore();
  }
  function dockLife(){
    // Work equipment stays beside the hut, leaving the actual walking path clear.
    const props=[[-11,-51,'crate'],[-11.8,-49,'bucket'],[-3,-46,'crate'],[-1,-45.8,'cooler'],[-21,-74,'barrel'],[-19,-38,'bench']];
    for(const[x,z,name]of props){if(!visible(x,z,25))continue;const p=point(x,z),s=clamp(camera.scale/6,.45,1.1);smallShadow(p.x+2,p.y+1,15*s,5*s,.15);if(sprite(name,p.x,p.y,s))continue;ctx.fillStyle=name==='bucket'?'#789f96':'#94744f';ctx.fillRect(p.x-5*s,p.y-9*s,10*s,9*s);ctx.fillStyle='#e3c48c';ctx.fillRect(p.x-6*s,p.y-10*s,12*s,2*s);ctx.fillStyle='#b79861';ctx.fillRect(p.x-3*s,p.y-7*s,2*s,5*s);}
    // The counter attendant is the only dock NPC. Keep the spawn-to-counter
    // and stair approaches free of decorative bystanders or wandering crowds.
    if(visible(-8,-56,30))person(-8,-56,{staff:true,heading:Math.PI*.5});
    // A pair of parked rental skiffs on the deck advertises the service without
    // adding clickable markers or floating instructional text.
    for(const [x,z]of[[-21,-48],[-21,-43.5]]){const p=point(x,z);if(!visible(x,z,50))continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/2);const s=clamp(camera.scale*.083,.35,.6);ctx.fillStyle='#8b7054';ctx.fillRect(-15*s,-24*s,30*s,5*s);ctx.fillRect(-15*s,22*s,30*s,5*s);if(sprites.boat)ctx.drawImage(sprites.boat,-24*s,-44*s,48*s,88*s);else{ctx.fillStyle='#ecdeb1';ctx.fillRect(-6,-17,12,31);ctx.fillStyle='#568f7e';ctx.fillRect(-4,-7,8,19);ctx.fillStyle='#c5a47b';ctx.fillRect(-4,-4,8,2);ctx.fillRect(-4,6,8,2);}ctx.restore();}
  }
  function drawWake(state,dt){
    const x=state.boatX??HARBOR.boatX,z=state.boatZ??HARBOR.boatZ;
    if(lastBoat&&Math.hypot(lastBoat.x-x,lastBoat.z-z)>.6&&Math.abs(state.speed||0)>.25){wakes.push({x,z,h:state.heading||0,life:0});lastBoat={x,z};}else if(!lastBoat)lastBoat={x,z};
    for(let i=wakes.length-1;i>=0;i--){const w=wakes[i];w.life+=dt;if(w.life>6){wakes.splice(i,1);continue;}const p=point(w.x,w.z),age=w.life,spread=(.4+age*.35)*camera.scale;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-(w.h||0));ctx.globalAlpha=(1-age/6)*.5;ctx.fillStyle='#d5edcd';for(let side of[-1,1])ctx.fillRect(Math.round(side*spread),Math.round(age*camera.scale*.4),Math.max(2,4-age*.5),1);ctx.restore();}
  }
  function boat(state){
    const x=state.boatX??HARBOR.boatX,z=state.boatZ??HARBOR.boatZ,p=point(x,z),heading=state.heading||0;
    const occupied=state.mode==='boat',fishActive=!['idle','landed'].includes(state.fishState||'idle');
    const scale=occupied?clamp(camera.scale*.18,.78,1.18):clamp(camera.scale*.14,.64,.95),hoisted=state.launchStage==='stored'||state.launchStage==='lowering',lift=hoisted?(1-(state.launchStage==='lowering'?state.launchProgress||0:0))*20:0,bob=hoisted?-lift:Math.round(Math.sin(clock*1.8)*.8);
    const bodyX=state.standing?(state.deckX||0)*15:0,bodyY=state.standing?(state.deckZ??.8)*14-10:0;
    const pose=fishActive?'fishing':state.engine?'driving':'seated';
    ctx.save();ctx.translate(p.x,p.y+bob);ctx.rotate(-heading);
    smallShadow(4,6,42*scale,73*scale,.25);
    if(typeof sprites.drawBoat==='function')sprites.drawBoat(ctx,0,0,{scale,occupied,pose,time:clock,tiller:state.tiller||0,reeling:state.reeling,castPower:state.castPower||0,fishState:state.fishState});
    else{
      const asset=sprites.boat?.image||sprites.boat?.canvas||sprites.boat;
      if(asset?.width)ctx.drawImage(asset,-asset.width*scale/2,-asset.height*scale/2,asset.width*scale,asset.height*scale);
      else{
        ctx.scale(scale,scale);ctx.fillStyle='#3a625c';ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(14,-24);ctx.lineTo(20,-2);ctx.lineTo(18,34);ctx.lineTo(-18,34);ctx.lineTo(-20,-2);ctx.lineTo(-14,-24);ctx.closePath();ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#f3deb1';ctx.stroke();ctx.fillStyle='#d7bd81';ctx.fillRect(-14,-7,28,5);ctx.fillRect(-15,18,30,5);ctx.fillStyle='#335c5c';ctx.fillRect(-4,35,9,10);ctx.fillStyle='#659c83';ctx.fillRect(-12,-23,24,13);ctx.fillStyle='#cfaa71';for(let i=-11;i<15;i+=6)ctx.fillRect(i,-4,1,23);ctx.scale(1/scale,1/scale);
      }
      if(occupied&&(sprites.anglerFish||sprites.anglerDrive||sprites.angler)){
        ctx.save();ctx.scale(scale,scale);
        const driver=pose==='driving',active=pose==='fishing',personAsset=active?sprites.anglerFish:driver?sprites.anglerDrive:sprites.anglerBack||sprites.angler;
        ctx.translate(bodyX,bodyY);
        const px=-8,py=driver?8:-8;
        ctx.drawImage(personAsset,px,py);
        if(driver){
          // One connected hand-to-tiller segment, ending at the outboard grip.
          const hand={x:-3,y:py+18},grip={x:-5+Math.sin((state.tiller||0)*.45)*4,y:24};
          pixelLine(-2,34,grip.x,grip.y,'#304956',2);pixelLine(hand.x,hand.y,grip.x,grip.y,'#e8ac79',2);ctx.fillStyle='#ffd5a0';ctx.fillRect(grip.x-1,grip.y-1,3,2);
        }else if(active){
          const hand={x:px+12,y:py+15},lift=(state.castPower||0)*11,bend=state.fishState==='fight'?(state.tension||0)*.07:0;
          pixelLine(hand.x,hand.y,25,-26-lift,'#304956',2);pixelLine(25,-26-lift,40,-40+bend-lift,'#d8c28a',1);ctx.fillStyle='#4c6872';ctx.fillRect(hand.x+1,hand.y-1,4,4);ctx.fillStyle='#e8ac79';ctx.fillRect(hand.x-1,hand.y+1,3,2);const crank=Math.round(Math.sin(clock*12)*2)*(state.reeling?1:0);ctx.fillStyle='#ffd5a0';ctx.fillRect(hand.x+4,hand.y+crank,2,2);
        }
        ctx.restore();
      }else if(occupied){
        // These arms and tackle are authored together, so the hands cannot
        // detach from the reel or tiller as the boat rotates.
        ctx.save();ctx.scale(scale,scale);ctx.translate(0,12);ctx.fillStyle='#243f4c';ctx.fillRect(-6,4,5,10);ctx.fillRect(3,4,5,10);ctx.fillStyle='#de8b4d';ctx.fillRect(-8,-10,16,17);ctx.fillStyle='#ffd17c';ctx.fillRect(-6,-8,4,12);ctx.fillRect(3,-8,3,12);ctx.fillStyle='#dfb48b';ctx.fillRect(-5,-20,11,10);ctx.fillStyle='#31535a';ctx.fillRect(-6,-23,12,5);ctx.fillStyle='#ebc777';ctx.fillRect(-8,-19,16,3);
        if(pose==='driving'){pixelLine(6,-3,9,9,'#e1b58e',4);pixelLine(9,9,3,23,'#343f43',3);ctx.fillStyle='#d6aa86';ctx.fillRect(7,7,4,4);}else if(pose==='fishing'){pixelLine(7,-5,16,-6,'#dfb38b',4);pixelLine(-6,-6,14,-8,'#d4a17b',3);pixelLine(14,-8,35,-41-(state.castPower||0)*10,'#443c3b',2);pixelLine(35,-41,40,-52,'#f1d893',1);ctx.fillStyle='#446574';ctx.fillRect(13,-10,5,6);ctx.fillStyle='#e6bf78';ctx.fillRect(16,-8,3,3);if(state.reeling)ctx.fillRect(18+Math.round(Math.sin(clock*13)*2),-6,2,2);}else{ctx.fillStyle='#d9ae83';ctx.fillRect(-10,-3,3,8);ctx.fillRect(8,-3,3,8);}ctx.restore();
      }
    }
    // Three bright rungs at the port stern make the reboarding target visible.
    pixelLine(-19*scale,22*scale,-25*scale,22*scale,'#c4d5c6',1);pixelLine(-19*scale,31*scale,-25*scale,31*scale,'#93b0b1',1);pixelLine(-25*scale,22*scale,-25*scale,31*scale,'#c4d5c6',1);pixelLine(-21*scale,25*scale,-25*scale,25*scale,'#dce3ca',1);pixelLine(-21*scale,28*scale,-25*scale,28*scale,'#dce3ca',1);
    ctx.restore();
    if(hoisted){const c=point(HARBOR.craneX,HARBOR.craneZ),hook={x:c.x-27,y:c.y-13};pixelLine(hook.x,hook.y,p.x,p.y+bob-14*scale,'#e8d7a3',1);pixelLine(p.x,p.y+bob-14*scale,p.x-14*scale,p.y+bob+3*scale,'#b4c5a9',1);pixelLine(p.x,p.y+bob-14*scale,p.x+14*scale,p.y+bob+3*scale,'#e7e4be',1);}
    if(state.moored&&!hoisted){const cleat=point(HARBOR.mooringX,HARBOR.mooringZ),bow={x:p.x-32*scale*Math.sin(heading),y:p.y-32*scale*Math.cos(heading)+bob};ctx.strokeStyle='#e3d49b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cleat.x,cleat.y);ctx.quadraticCurveTo((cleat.x+bow.x)/2,(cleat.y+bow.y)/2+4,bow.x,bow.y);ctx.stroke();}
    if(state.anchor){const a=point(x-2.4,z+4);pixelLine(p.x-4,p.y+12,a.x,a.y,'#c6d7b6',1);ctx.fillStyle='#377b82';ctx.fillRect(a.x-3,a.y,6,2);}
    if(occupied&&fishActive&&state.bobber){
      const bx=state.bobber.x??x-5,bz=state.bobber.z??z-9,q=point(bx,bz),sh=(state.bobber.height||0)*camera.scale;
      const lx=(40+bodyX)*scale,lz=(-40+bodyY-(state.castPower||0)*11+(state.fishState==='fight'?(state.tension||0)*.07:0))*scale,tip={x:p.x+lx*Math.cos(heading)+lz*Math.sin(heading),y:p.y-lx*Math.sin(heading)+lz*Math.cos(heading)+bob};
      ctx.strokeStyle='#e8f0cf';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.round(tip.x),Math.round(tip.y));ctx.quadraticCurveTo(Math.round((tip.x+q.x)*.5),Math.round((tip.y+q.y)*.5+Math.min(16,state.lineDistance||8)),q.x,q.y-sh);ctx.stroke();
      const ripple=state.fishState==='bite'||state.fishState==='fight';ctx.strokeStyle=ripple?'#e5edbc':'#79c5be';ctx.lineWidth=1;const rr=(clock*(ripple?10:3))%12;ctx.strokeRect(q.x-rr,q.y-rr*.3,rr*2,rr*.6);ctx.fillStyle='#e8e4ba';ctx.fillRect(q.x-2,q.y-5-sh,4,7);ctx.fillStyle='#d76b53';ctx.fillRect(q.x-2,q.y-5-sh,4,3);ctx.fillStyle='#f6edd1';ctx.fillRect(q.x,q.y-7-sh,1,3);
      if(ripple){ctx.fillStyle='#ddf0cf';for(let i=0;i<5;i++){const a=i*1.25+clock*2;ctx.fillRect(q.x+Math.cos(a)*9,q.y+Math.sin(a)*4,2,1);}}
    }
  }
  function wildlife(){
    for(let i=0;i<3;i++){
      const x=camera.x-45+((clock*2.2+i*38)%100),z=camera.z-30+Math.sin(clock*.08+i)*12,p=point(x,z),flap=Math.round(Math.sin(clock*5+i)*2);
      ctx.fillStyle='rgba(23,91,95,.15)';ctx.fillRect(p.x+8,p.y+19,7,2);if(!sprite(flap>0?'gull2':'gull',p.x,p.y,.6)){pixelLine(p.x-5,p.y+flap,p.x,p.y,'#f4eed0',1);pixelLine(p.x,p.y,p.x+5,p.y+flap,'#f4eed0',1);ctx.fillStyle='#b7bba4';ctx.fillRect(p.x,p.y,1,2);}
    }
  }
  function patrol(state){
    const patrol=state.inspection;if(!patrol||!Number.isFinite(patrol.x)||!Number.isFinite(patrol.z)||!visible(patrol.x,patrol.z,100))return;
    const p=point(patrol.x,patrol.z),scale=clamp(camera.scale*.19,.8,1.3),moving=patrol.phase==='approaching'||patrol.phase==='departing';
    ctx.save();ctx.translate(p.x,p.y+Math.round(Math.sin(clock*1.4)*.6));ctx.rotate(-(patrol.heading||0));ctx.scale(scale,scale);
    smallShadow(4,6,32,68,.2);
    if(moving){ctx.globalAlpha=.55;for(let i=0;i<5;i++){ctx.fillStyle='#d8ead3';ctx.fillRect(-8-i*2,32+i*5+(clock*8)%5,3,1);ctx.fillRect(7+i*2,32+i*5+(clock*8)%5,3,1);}ctx.globalAlpha=1;}
    ctx.fillStyle='#244c68';ctx.beginPath();ctx.moveTo(0,-36);ctx.lineTo(8,-29);ctx.lineTo(15,-13);ctx.lineTo(16,27);ctx.lineTo(12,34);ctx.lineTo(-12,34);ctx.lineTo(-16,27);ctx.lineTo(-15,-13);ctx.lineTo(-8,-29);ctx.closePath();ctx.fill();
    ctx.fillStyle='#efeed7';ctx.beginPath();ctx.moveTo(0,-33);ctx.lineTo(7,-26);ctx.lineTo(12,-12);ctx.lineTo(13,26);ctx.lineTo(10,30);ctx.lineTo(-10,30);ctx.lineTo(-13,26);ctx.lineTo(-12,-12);ctx.lineTo(-7,-26);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c0d2ca';ctx.fillRect(-10,-10,20,34);ctx.fillStyle='#f7f1d7';ctx.fillRect(-8,-11,16,3);ctx.fillRect(-11,25,22,3);ctx.fillStyle='#3d758d';ctx.fillRect(-14,-7,3,23);ctx.fillRect(11,-7,3,23);
    ctx.fillStyle='#284758';ctx.fillRect(-8,-9,16,16);ctx.fillStyle='#c6d8cf';ctx.fillRect(-7,-10,14,3);ctx.fillStyle='#628d9c';ctx.fillRect(-6,-5,12,7);ctx.fillStyle='#a6c4c4';ctx.fillRect(-5,-4,4,4);ctx.fillStyle='#e9eddb';ctx.fillRect(-8,6,16,3);
    ctx.fillStyle='#2d465a';ctx.fillRect(-5,30,10,9);ctx.fillStyle='#95b2b1';ctx.fillRect(-4,31,8,2);ctx.fillStyle='#40596b';ctx.fillRect(-2,38,4,5);
    if(camera.scale>=4){ctx.fillStyle='#315b6b';ctx.font='bold 5px monospace';ctx.textAlign='center';ctx.fillText('DFW',0,-17);}
    pixelLine(-7,5,-7,-18,'#a9c4ba',1);ctx.fillStyle=Math.sin(clock*4)>0?'#e4ba69':'#877955';ctx.fillRect(-9,-19,4,3);
    if(sprites.dockWorker)ctx.drawImage(sprites.dockWorker,-7,3,14,23);
    ctx.restore();
  }
  function routeMarker(state){
    // One small ground marker gives immediate feedback for tap-to-walk.
    const walkTarget=state.walkTarget||state.walkRoute?.at(-1);
    if(state.mode==='walk'&&state.autoWalk&&walkTarget){
      const p=point(walkTarget.x,walkTarget.z),r=6+Math.round(Math.sin(clock*5));
      ctx.fillStyle='#244d50';ctx.fillRect(p.x-r-1,p.y-4,5,2);ctx.fillRect(p.x+r-3,p.y-4,5,2);ctx.fillRect(p.x-r-1,p.y+3,5,2);ctx.fillRect(p.x+r-3,p.y+3,5,2);
      ctx.fillStyle='#ffe3a0';for(const side of[-1,1]){ctx.fillRect(p.x+side*r-(side>0?3:0),p.y-4,4,1);ctx.fillRect(p.x+side*r,p.y-4,1,3);ctx.fillRect(p.x+side*r-(side>0?3:0),p.y+3,4,1);ctx.fillRect(p.x+side*r,p.y+1,1,3);}return;
    }
    // Offshore courses keep their small destination pennant.
    const w=state.waypoint;if(!w||!visible(w.x,w.z,10))return;const p=point(w.x,w.z);ctx.globalAlpha=.55;ctx.strokeStyle='#e9dc9a';ctx.lineWidth=1;ctx.strokeRect(p.x-5,p.y-2,10,4);ctx.globalAlpha=1;pixelLine(p.x,p.y,p.x,p.y-14,'#efdfaa',1);ctx.fillStyle='#e4b762';ctx.fillRect(p.x+1,p.y-14,7,4);
  }
  function draw(state,dt=1/60){
    dt=clamp(Number.isFinite(dt)?dt:1/60,0,.1);clock+=dt;
    const mode=state.mode||'intro',swim=state.swim||{},focus=mode==='boat'?{x:state.boatX,z:state.boatZ}:mode==='swim'?{x:swim.x??state.playerX,z:swim.z??state.playerZ}:{x:state.playerX??HARBOR.spawnX,z:state.playerZ??HARBOR.spawnZ};
    const fishing=mode==='boat'&&!['idle','landed'].includes(state.fishState||'idle'),nearDock=Math.hypot(focus.x-HARBOR.spawnX,focus.z-HARBOR.spawnZ)<70;
    const castFocus=fishing&&state.bobber?{x:(focus.x+state.bobber.x)/2,z:(focus.z+state.bobber.z)/2}:focus;
    const wantedZoom=zoomOverride??cameraZoomForState(camera,state);
    // Start with the rental hut and left landing together in view. Thereafter
    // movement within the broad deadzone never drags the scenery along.
    let targetX=focus.x,targetZ=focus.z-4;
    if(mode==='intro'||mode==='walk'&&nearDock){targetX=focus.x-7;targetZ=focus.z-6;}
    if(!initialized){camera.x=targetX;camera.z=targetZ;camera.scale=wantedZoom;initialized=true;}else{
      const scaleChanged=camera.scale!==wantedZoom;
      if(scaleChanged)Object.assign(camera,zoomCameraAt(camera,wantedZoom,focus));
    }
    // Apply the visible playfield on the very first frame too, particularly
    // when resuming a boat trip on a short phone above the fixed console.
    Object.assign(camera,stepDeadzoneCamera(camera,castFocus,{mode}));
    if(fishing&&state.bobber)Object.assign(camera,keepCameraPointsVisible(camera,[focus,state.bobber],{paddingBottom:camera.height-cameraDeadzone(camera,'boat').bottom}));
    cameraResized=false;lastMode=mode;pixelOffset=cameraOffset(camera);
    const nature=ecology.update(state,dt,seaConditions);
    ctx.imageSmoothingEnabled=false;ocean();drawWildlife(ctx,nature,{project:point,scale:camera.scale,sprites,layer:'water'});terrain();drawWake(state,dt);routeMarker(state);buildings();dockLife();boat(state);patrol(state);
    if(mode==='walk'||mode==='intro')person(focus.x,focus.z,{walking:state.walking,heading:state.yaw||0});
    if(mode==='swim'){
      const p=point(focus.x,focus.z);ctx.strokeStyle='#c5e4c4';ctx.strokeRect(p.x-12,p.y+2,24,5);ctx.fillStyle='#e3b78d';ctx.fillRect(p.x-4,p.y-8,9,9);ctx.fillStyle='#365762';ctx.fillRect(p.x-5,p.y-11,11,4);ctx.fillStyle=state.pfd===false?'#57827d':'#e99b50';ctx.fillRect(p.x-7,p.y,14,5);pixelLine(p.x-8,p.y+1,p.x-14,p.y+Math.sin(clock*6)*3,'#e2b68d',3);pixelLine(p.x+8,p.y+1,p.x+14,p.y-Math.sin(clock*6)*3,'#e2b68d',3);
    }
    wildlife();drawWildlife(ctx,nature,{project:point,scale:camera.scale,sprites,layer:'air'});
    // Subtle warm morning light is baked into the palette, never a dark filter.
    // Dawn therefore remains readable on a phone in daylight.
    return {camera,rodVisible:fishing,wildlife:ecology.snapshot()};
  }
  resize(canvas.clientWidth||640,canvas.clientHeight||360);
  function interactionAnchors(state){
    const bx=state.boatX??HARBOR.boatX,bz=state.boatZ??HARBOR.boatZ,heading=state.heading||0,ladder=ladderPoint(bx,bz,heading),motor={x:bx+Math.sin(heading)*2.4,z:bz+Math.cos(heading)*2.4};
    const anchor=(x,z,offsetY=0)=>{const p=cssWorldToScreen(x,z);return{...p,y:p.y+offsetY,worldX:x,worldZ:z};};
    const counter=anchor(-8,-56,-22*cssHeight/canvas.height),boarding=anchor(HARBOR.boardingX,HARBOR.boardingZ),boatAnchor=anchor(bx,bz),dock=anchor(HARBOR.boardingX,HARBOR.boardingZ);
    const scale=state.mode==='boat'?clamp(camera.scale*.18,.78,1.18):clamp(camera.scale*.14,.64,.95),p=point(bx,bz),bob=Math.round(Math.sin(clock*1.8)*.8);
    const boatSocket=(x,y,world)=>{const sx=p.x+scale*(x*Math.cos(heading)+y*Math.sin(heading)),sy=p.y+scale*(-x*Math.sin(heading)+y*Math.cos(heading))+bob;return{x:sx*cssWidth/canvas.width,y:sy*cssHeight/canvas.height,visible:sx>=0&&sx<=canvas.width&&sy>=0&&sy<=canvas.height,worldX:world.x,worldZ:world.z};};
    const ladderAnchor=boatSocket(-25,27,ladder),engine=boatSocket(0,38,motor);
    return{counter,npc:counter,boarding,boat:boatAnchor,dock,returnDock:dock,ladder:ladderAnchor,engine};
  }
  function walkingTargetAt(x,y,state){
    if(state.mode!=='walk')return null;
    const ratio=cssWidth/canvas.width,hit=(cx,cy,w,h)=>Math.abs(x-cx)<=Math.max(44,w)/2&&Math.abs(y-cy)<=Math.max(44,h)/2;
    // Hit the actual enlarged artwork, not the ground behind the sprite.
    const staff=cssWorldToScreen(-8,-56),personScale=clamp(camera.scale/5.8,.7,1.25)*ratio;
    if(hit(staff.x,staff.y-13*personScale,22*personScale,30*personScale))return'counter';
    const landing=cssWorldToScreen(HARBOR.boardingX,HARBOR.boardingZ);
    if(hit(landing.x,landing.y,44,44))return'boarding';
    const bx=state.boatX??HARBOR.boatX,bz=state.boatZ??HARBOR.boatZ;
    if(Math.hypot(bx-HARBOR.boatX,bz-HARBOR.boatZ)<16){
      const boatPoint=cssWorldToScreen(bx,bz),scale=clamp(camera.scale*.14,.64,.95)*ratio,heading=state.heading||0;
      const lift=['stored','lowering'].includes(state.launchStage)?(1-(state.launchStage==='lowering'?state.launchProgress||0:0))*20*ratio:0;
      const dx=x-boatPoint.x,dy=y-boatPoint.y+lift,c=Math.cos(heading),a=Math.sin(heading);
      if(Math.abs(dx*c-dy*a)<=Math.max(44,48*scale)/2&&Math.abs(dx*a+dy*c)<=Math.max(44,88*scale)/2)return'boarding';
    }
    const hutPoint=cssWorldToScreen(-.2,-50.3),hutScale=clamp(camera.scale/8,.35,1.1)*ratio;
    if(hit(hutPoint.x,hutPoint.y-54*hutScale,128*hutScale,108*hutScale))return'counter';
    return null;
  }
  function publicState(){const active=ecology.snapshot(),history=ecology.history;return{renderer:'Canvas 2D',camera:{x:+camera.x.toFixed(2),z:+camera.z.toFixed(2),scale:+camera.scale.toFixed(2),width:camera.width,height:camera.height,mode:'deadzone',deadzone:cameraDeadzone(camera,lastMode||'walk')},wildlife:{active,counts:active.reduce((counts,e)=>(counts[e.type]=(counts[e.type]||0)+1,counts),{bait:0,dolphins:0,whale:0}),encounters:history.map(e=>({...e})),illustrativeRates:true}};}
  return {resize,draw,screenToWorld,worldToScreen:point,cssWorldToScreen,interactionAnchors,walkingTargetAt,camera,wildlife:ecology,publicState,setConditions:value=>{seaConditions=value||{};},setZoom:value=>{zoomOverride=value==null?null:Math.round(clamp(value,2,9));}};
}
