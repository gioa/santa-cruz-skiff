import {bathymetry,elevationAtGPS} from './bathymetry.js?v=20260928-pixel-v73';
import {seafloor,seafloorAtGPS} from './pixel-seafloor.js?v=20260928-pixel-v73';
import {landPolygons,pierRings,toGPS} from './pixel-geography.js?v=20260928-pixel-v73';
import {CHART_HOME,BED_COLORS,BED_LABELS,FEET_PER_METER,chartMeters,chartProjection,zoomChart,chartSample,depthContours,depthColor} from './pixel-chart-data.js?v=20260928-pixel-v73';
let layers=null,contours=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function makeLayers(){
 if(layers)return layers;
 layers={};
 for(const mode of ['bottom','depth']){
  const c=document.createElement('canvas');c.width=seafloor.width;c.height=seafloor.height;
  const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   const lon=seafloor.west+(x+.5)/c.width*(seafloor.east-seafloor.west),lat=seafloor.north-(y+.5)/c.height*(seafloor.north-seafloor.south),e=elevationAtGPS(lon,lat),bed=seafloorAtGPS(lon,lat);
   const known=mode==='bottom'?bed.mapped:Number.isFinite(e),color=mode==='bottom'?BED_COLORS[bed.kind]:depthColor(Number.isFinite(e)?Math.max(0,-e):null);
   // Shade the measured relief only. Categorical boundaries remain unblended.
   const east=elevationAtGPS(lon+.0002,lat),north=elevationAtGPS(lon,lat+.0002);
   let shade=Number.isFinite(e)&&Number.isFinite(east)&&Number.isFinite(north)?clamp(1+(east-e)*.025-(north-e)*.025,.76,1.09):1;
   if(!known&&(x+y)%7<2)shade*=.84;
   const n=parseInt(color.slice(1),16),i=(y*c.width+x)*4;
   im.data[i]=clamp((n>>16)*shade,0,255);im.data[i+1]=clamp((n>>8&255)*shade,0,255);im.data[i+2]=clamp((n&255)*shade,0,255);im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);layers[mode]=c;
 }
 contours=depthContours(bathymetry,Array.from({length:24},(_,i)=>(i+1)*10));
 return layers;
}
export function chartMarkup(){return`<div class="chart-controls"><div role="group" aria-label="海图图层"><button id="chart-bottom" aria-pressed="true">底质</button><button id="chart-depth" aria-pressed="false">水深</button></div><div role="group" aria-label="海图缩放"><button id="chart-out" aria-label="缩小海图">−</button><button id="chart-locate" aria-label="定位当前位置">⌖</button><button id="chart-home" aria-label="海图全览">全览</button><button id="chart-in" aria-label="放大海图">＋</button></div></div><div class="chart-frame"><canvas id="chart" tabindex="0" role="img" aria-label="Santa Cruz 海底地形图；北向上，拖动平移，双指缩放，轻点标记目的地并查看底质与参考水深"></canvas><span class="chart-hint">拖动 · 双指缩放 · 点选</span></div><div id="chart-reading" class="chart-reading" aria-live="polite">轻点海面查看底质与参考水深</div><div class="chart-destination"><span id="chart-route-status" aria-live="polite">蓝色箭头 · 当前位置</span><button id="chart-navigate" class="primary" disabled>前往标点</button></div><div id="chart-legend" class="chart-legend"></div><p class="chart-datum">等深线与水深：ft · 历史 MHW 基准</p>`;}
export function mountChart(root,{gpsPosition=null,canNavigate=false,heading=0,waypoint=null,planDestination=()=>({ok:false,message:'先登船。'}),onNavigate=()=>{}}={}){
 makeLayers();
 const canvas=root.querySelector('#chart'),ctx=canvas.getContext('2d'),reading=root.querySelector('#chart-reading'),legend=root.querySelector('#chart-legend'),abort=new AbortController(),signal=abort.signal;
 let W=0,H=0,view=null,layer='bottom',selection=waypoint,plan=null,frame=0,gesture=null;
 const pointers=new Map(),go=root.querySelector('#chart-navigate'),routeStatus=root.querySelector('#chart-route-status');
 const geographicRings=[...landPolygons.map(r=>({pier:false,points:r.map(p=>toGPS(p.x,p.z))})),...pierRings.map(r=>({pier:true,points:r.map(p=>toGPS(p.x,p.z))}))];
 const home=()=>{view={x:0,y:0,mpp:CHART_HOME.spanMeters/W};updateReading();schedule();};
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 function updateReading(){
  go.disabled=true;plan=null;
  if(!selection){reading.textContent='轻点海面查看底质与参考水深';routeStatus.textContent=gpsPosition?(canNavigate?'轻点海面选择航点':'蓝色箭头 · 当前位置；自动航行需要电推马达'):'纸质海图 · 不提供实时定位';delete canvas.dataset.destination;return;}
  plan=canNavigate?planDestination(selection):{ok:false,message:gpsPosition?'GPS 显示当前位置；自动航行需要电推马达。':'纸质海图只提供海域资料。'};go.disabled=!plan.ok;
  routeStatus.textContent=plan.ok?'航线已规划 · 蓝色箭头为当前位置':plan.message;
  canvas.dataset.destination=JSON.stringify(selection);
  const s=chartSample(selection.lon,selection.lat);
  reading.textContent=s.land?'岸线／码头':`${s.bed.label} · ${s.depthMeters===null?'水深资料空缺':`${Math.round(s.depthMeters*FEET_PER_METER)} ft`}`;
  canvas.setAttribute('aria-description',reading.textContent);
 }
 function updateLegend(){
  legend.innerHTML=layer==='bottom'?Object.entries(BED_LABELS).map(([id,label])=>`<span><i style="background:${BED_COLORS[id]}" class="${id==='unknown'?'no-data':''}"></i>${label}</span>`).join(''):[0,20,40,60,80,100].map(ft=>`<span><i style="background:${depthColor(ft*.3048)}"></i>${ft}${ft===100?'+':''} ft</span>`).join('');
  root.querySelector('#chart-bottom').setAttribute('aria-pressed',String(layer==='bottom'));root.querySelector('#chart-depth').setAttribute('aria-pressed',String(layer==='depth'));
 }
 function draw(){
  if(!view||!W||!H)return;
  const dpr=canvas.width/W;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=BED_COLORS.unknown;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#718e8d55';ctx.lineWidth=1;for(let i=-H;i<W;i+=16){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+H,H);ctx.stroke();}
  const project=chartProjection(view,W,H).screen,a=project(seafloor.west,seafloor.north),b=project(seafloor.east,seafloor.south);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(layers[layer],a.x,a.y,b.x-a.x,b.y-a.y);
  // Each axis uses the same metres-per-pixel: no stretched coastline or depth contours.
  const visible=(p,margin=20)=>p.x>-margin&&p.y>-margin&&p.x<W+margin&&p.y<H+margin;
  const labelPoints=[];
  for(const [ft,segments]of contours){
   if(view.mpp>12&&ft%20)continue;
   ctx.strokeStyle=layer==='depth'?'#173f5b88':'#315b6480';ctx.lineWidth=ft%20===0?1:.65;ctx.beginPath();let candidate=[];
   for(const [p,q]of segments){const u=project(p.lon,p.lat),v=project(q.lon,q.lat);if(!visible(u)&&!visible(v))continue;ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);candidate.push(u);}
   ctx.stroke();
   for(let i=0;i<candidate.length;i+=Math.max(1,Math.floor(candidate.length/18))){const p=candidate[i];if(p.x<35||p.x>W-35||p.y<35||p.y>H-40||labelPoints.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<68))continue;labelPoints.push({...p,text:String(ft)});if(labelPoints.filter(p=>p.text===String(ft)).length>=3)break;}
  }
  for(const r of geographicRings){ctx.beginPath();r.points.forEach((p,i)=>{const q=project(p.lon,p.lat);ctx[i?'lineTo':'moveTo'](q.x,q.y);});ctx.closePath();ctx.fillStyle=r.pier?'#ae805b':'#eee2b8';ctx.fill();ctx.strokeStyle=r.pier?'#755d44':'#677c67';ctx.lineWidth=r.pier?1:1.2;ctx.stroke();}
  ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of labelPoints){ctx.fillStyle=layer==='depth'?'#d4e5dded':'#e9dfbced';ctx.fillRect(p.x-13,p.y-7,26,14);ctx.fillStyle='#234d59';ctx.fillText(p.text,p.x,p.y);}
  if(gpsPosition){
   const origin=project(gpsPosition.lon,gpsPosition.lat);
   if(plan?.ok&&plan.route?.length){ctx.save();ctx.strokeStyle='#fff5d9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(origin.x,origin.y);for(const p of plan.route){const q=project(p.lon,p.lat);ctx.lineTo(q.x,q.y);}ctx.stroke();ctx.strokeStyle='#245d9e';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.stroke();ctx.restore();}
   // Always keep the position discoverable after panning or zooming away.
   const px=clamp(origin.x,15,W-45),py=clamp(origin.y,24,H-48),offscreen=Math.abs(px-origin.x)>.5||Math.abs(py-origin.y)>.5;
   ctx.save();ctx.translate(px,py);ctx.rotate(offscreen?Math.atan2(origin.x-px,-(origin.y-py)):(heading||0)*Math.PI/180);ctx.fillStyle='#246cb6';ctx.strokeStyle='#fff6de';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(8,9);ctx.lineTo(0,5);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
   ctx.font='bold 11px sans-serif';ctx.textAlign='center';const label=offscreen?'位置在图外':'当前位置';ctx.fillStyle='#fff5d9ee';ctx.fillRect(clamp(px-32,2,W-66),py+14,64,18);ctx.fillStyle='#245d9e';ctx.fillText(label,clamp(px,34,W-34),py+23);
   canvas.dataset.position=JSON.stringify(gpsPosition);
  }
  if(selection){const p=project(selection.lon,selection.lat);ctx.strokeStyle='#ad4737';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.moveTo(p.x-14,p.y);ctx.lineTo(p.x+14,p.y);ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x,p.y+14);ctx.stroke();}
  // True north and a geographic scale. Travel compression never rescales depth.
  ctx.fillStyle='#fff3d8e8';ctx.fillRect(W-34,8,26,44);ctx.fillStyle='#244c50';ctx.font='bold 12px monospace';ctx.fillText('N',W-21,18);ctx.beginPath();ctx.moveTo(W-21,28);ctx.lineTo(W-27,43);ctx.lineTo(W-15,43);ctx.closePath();ctx.fill();
  const maxFeet=W*.25*view.mpp*FEET_PER_METER,power=10**Math.floor(Math.log10(maxFeet)),ft=[5,2,1].map(n=>n*power).find(n=>n<=maxFeet)||power/2,length=ft/FEET_PER_METER/view.mpp;
  ctx.fillStyle='#fff3d8e8';ctx.fillRect(9,H-34,length+16,26);ctx.strokeStyle='#244c50';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,H-17);ctx.lineTo(17,H-12);ctx.lineTo(17+length,H-12);ctx.lineTo(17+length,H-17);ctx.stroke();ctx.fillStyle='#244c50';ctx.font='10px monospace';ctx.fillText(`${ft.toLocaleString('en-US')} ft`,17+length/2,H-25);
  canvas.dataset.layer=layer;canvas.dataset.metersPerPixel=String(view.mpp);
 }
 function resize(){const rect=canvas.getBoundingClientRect(),oldW=W;W=Math.max(1,rect.width);H=Math.max(1,rect.height);const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);if(!view)home();else if(oldW)view.mpp*=oldW/W;schedule();}
 function local(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 function zoom(factor,point={x:W/2,y:H/2}){view=zoomChart(view,factor,point,W,H);schedule();}
 function bind(id,fn){root.querySelector(id).addEventListener('click',fn,{signal});}
 bind('#chart-locate',()=>{if(gpsPosition){view={...chartMeters(gpsPosition.lon,gpsPosition.lat),mpp:Math.min(view.mpp,5)};schedule();}});
 root.querySelector('#chart-locate').disabled=!gpsPosition;root.querySelector('#chart-locate').hidden=!gpsPosition;go.hidden=!canNavigate;
 bind('#chart-navigate',()=>{if(selection&&plan?.ok)onNavigate({...selection});});
 bind('#chart-in',()=>zoom(.5));bind('#chart-out',()=>zoom(2));bind('#chart-home',home);
 for(const kind of ['bottom','depth'])bind(`#chart-${kind}`,()=>{layer=kind;updateLegend();schedule();});
 function beginGesture(){
  const p=[...pointers.values()];gesture=p.length===1?{type:'pan',origin:p[0],last:p[0],moved:false}:{type:'pinch',distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}};
 }
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,local(e));canvas.setPointerCapture(e.pointerId);beginGesture();},{signal});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;e.preventDefault();const p=local(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){const [a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
   if(gesture.type!=='pinch')beginGesture();zoom(gesture.distance/distance,gesture.center);view.x-=(center.x-gesture.center.x)*view.mpp;view.y+=(center.y-gesture.center.y)*view.mpp;gesture={type:'pinch',distance,center};
  }else if(gesture.type==='pan'){gesture.moved||=Math.hypot(p.x-gesture.origin.x,p.y-gesture.origin.y)>6;if(gesture.moved){const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;view.x-=dx*view.mpp;view.y+=dy*view.mpp;gesture.last=p;}}
  // Keep the survey within reach; no infinite panning into blank ocean.
  const lo=chartMeters(seafloor.west,seafloor.south),hi=chartMeters(seafloor.east,seafloor.north);view.x=clamp(view.x,lo.x,hi.x);view.y=clamp(view.y,lo.y,hi.y);schedule();
 },{signal});
 function end(e,cancelled=false){if(!pointers.has(e.pointerId))return;const tap=!cancelled&&pointers.size===1&&gesture?.type==='pan'&&!gesture.moved;if(tap){const p=local(e);selection=chartProjection(view,W,H).gps(p.x,p.y);updateReading();}pointers.delete(e.pointerId);if(pointers.size){beginGesture();gesture.moved=true;}else gesture=null;schedule();}
 canvas.addEventListener('pointerup',e=>end(e),{signal});canvas.addEventListener('pointercancel',e=>end(e,true),{signal});canvas.addEventListener('lostpointercapture',e=>end(e,true),{signal});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-200,200)*.003),local(e));},{passive:false,signal});
 canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoom(.5);else if(e.key==='-')zoom(2);else if(e.key==='Home')home();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){view.x+=({'ArrowLeft':-1,'ArrowRight':1}[e.key]||0)*view.mpp*70;view.y+=({'ArrowDown':-1,'ArrowUp':1}[e.key]||0)*view.mpp*70;schedule();}else return;e.preventDefault();},{signal});
 const observer=new ResizeObserver(resize);observer.observe(canvas);updateLegend();resize();
 return{destroy(){abort.abort();observer.disconnect();if(frame)cancelAnimationFrame(frame);pointers.clear();},inspect(lon,lat){selection={lon,lat};const p=chartMeters(lon,lat);view={...p,mpp:Math.min(view.mpp,5)};updateReading();schedule();}};
}
