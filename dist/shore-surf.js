// Surf-zone model for the shore scenes: realistic wave climate, individual
// breaking waves, bores, foam and swash. See docs/shore-wave-model.md.
//
// Evidence (numbers are rounded game inputs, not a forecast):
//  - Wave climate: monthly medians and 10th/90th percentiles of significant
//    height and dominant period from NOAA NDBC hourly records: 46237 (San
//    Francisco Bar, nearshore off Pacifica, 2019–2024) and 46012 (Half Moon
//    Bay, 24 nm offshore, 2019–2023; the beaches sit in Pillar Point's shadow).
//  - Broken waves decay toward a stable height Γh (Dally, Dean & Dalrymple
//    1985) and re-form in deep troughs; crests are short and breaks peel along
//    them; foam persists for about a minute and drifts shoreward.
//  - Individual heights follow a Rayleigh distribution (Longuet-Higgins 1952);
//    Thornton & Guza (1983) found it still holds approximately in the surf.
//  - Breaking starts near H/h ≈ 0.78 (McCowan) and rises on steeper beds;
//    inside the surf zone heights saturate at Hrms ≈ 0.42 h (Thornton & Guza
//    1982), i.e. individual broken waves ≈ 0.55–0.6 h. Waves that cross a bar
//    into a deeper trough stop breaking and re-form before the shorebreak.
//  - Breaker type from the surf-similarity (Iribarren) number at breaking:
//    spilling < 0.4 < plunging < 2 < surging/collapsing (Battjes 1974).
//  - Runup: Stockdon et al. (2006) setup, incident and infragravity swash.
//  - Longshore current scale: Longuet-Higgins (1970), V ≈ 1.17 √(g Hb) sinθ cosθ.
// Beach shapes: Sharp Park is a steep, coarse magnetite-sand beach with a
// narrow surf zone and a heavy plunging shorebreak; Half Moon Bay's Dunes–
// Venice–Francis strand is finer sand, flatter and barred, with a wide surf
// zone that is sheltered by Pillar Point in the north.
const TAU=Math.PI*2,G=9.81;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const bell=(v,w)=>Math.exp(-(v/w)*(v/w));
export const SURF_DOMAIN_M=420;
// The grid also reaches this far inland of the mean-tide reference shoreline,
// enough for the high-tide waterline on Half Moon Bay's flat face.
export const SURF_INLAND_M=24;
const STEP=1,INLAND=SURF_INLAND_M/STEP;

// Monthly [Hs median, Hs p10, Hs p90 (m), Tp median, Tp p10, Tp p90 (s), mean direction (°T)]
export const WAVE_CLIMATE=Object.freeze({
 pacifica:Object.freeze({station:'NDBC 46237 San Francisco Bar',shoreNormal:262,exposure:[1,1.08],months:[
  [2.13,1.23,3.36,14.3,11.1,16.7,271],[1.81,1.17,2.89,13.3,10.5,16.7,272],[1.75,1.02,2.75,13.3,9.1,16.7,268],[1.54,1.08,2.31,12.5,7.7,16.7,268],
  [1.53,1.09,2.22,12.5,7.7,16.7,263],[1.34,1.02,1.88,11.8,7.4,16.7,262],[1.19,.86,1.59,13.3,7.1,16.7,257],[1.08,.81,1.46,13.3,6.9,16.7,254],
  [1.16,.83,1.69,14.3,8.7,16.7,255],[1.33,.86,2.1,13.3,10,16.7,261],[1.53,.9,2.37,13.3,10,16.7,268],[1.9,1.02,3.29,13.3,10,16.7,270]]}),
 'half-moon-bay':Object.freeze({station:'NDBC 46012 Half Moon Bay (offshore), Pillar Point sheltering applied',shoreNormal:245,exposure:[.42,.72],months:[
  [2.97,1.69,4.6,13.8,10.8,17.4,290],[2.55,1.58,4.08,12.9,9.1,16,301],[2.32,1.21,3.65,12.1,8.3,16,297],[1.97,1.32,3.53,11.4,7.7,16,295],
  [2.22,1.42,3.41,10,7.7,14.8,300],[1.8,1.28,2.73,10,7.1,14.8,293],[1.7,1.04,2.42,9.1,7.1,14.8,301],[1.65,1.02,2.32,9.1,6.7,14.8,300],
  [1.6,1.07,2.66,10.8,7.1,16,287],[2.14,1.2,3.38,12.1,9.1,14.8,293],[2.19,1.32,3.4,12.1,10,16,297],[2.42,1.09,4.17,12.9,10,16,291]]}),
});
const hashUnit=n=>{let x=Math.imul((n|0)^0x9e3779b9,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;return((x>>>0)+.5)/4294967296;};
const dateHash=(scene,date)=>{let h=2166136261;for(const c of `${scene}:${date}`)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
// Inverse normal CDF (Acklam's rational approximation, |error| < 1e-8).
function normalQuantile(p){p=clamp(p,1e-9,1-1e-9);const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924],b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857],c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878],d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742];
 if(p<.02425){const q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-.02425){const q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 const q=p-.5,r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
const lognormalFrom=(median,p10,p90,u)=>Math.exp(Math.log(median)+normalQuantile(u)*(Math.log(p90)-Math.log(p10))/(2*1.2816));

/** Offshore sea state for a trip day, drawn from that month's buoy statistics.
 * Deterministic per scene and date; it drifts slowly through the game day. */
export function climateSeaState(sceneId,date,gameHours=0){
 const c=WAVE_CLIMATE[sceneId]||WAVE_CLIMATE.pacifica,d=/^\d{4}-(\d{2})-\d{2}$/.exec(String(date||''));
 const month=d?clamp(Number(d[1]),1,12):9,[hs,hs10,hs90,tp,tp10,tp90,dir]=c.months[month-1],seed=dateHash(sceneId,date||'');
 const drift=1+.12*Math.sin(TAU*(finite(gameHours)/19+hashUnit(seed+3)));
 const waveHeightM=clamp(lognormalFrom(hs,hs10,hs90,hashUnit(seed))*drift,.2,7);
 const wavePeriodS=clamp(lognormalFrom(tp,tp10,tp90,.25+.5*hashUnit(seed+1)),5,20);
 // Refract the deep-water angle to ~8 m depth (Snell): sinθ = sinθ0 · c/c0.
 const theta0=clamp(((dir+180-c.shoreNormal)%360+360)%360-180,-80,80)*Math.PI/180,c0=G*wavePeriodS/TAU,c8=phaseSpeed(wavePeriodS,8);
 const waveDirectionDeg=Math.asin(clamp(Math.sin(theta0)*c8/c0,-.99,.99))*180/Math.PI;
 return{waveHeightM,wavePeriodS,waveDirectionDeg,month,source:c.station,climate:true};
}

const kMemo=new Map();
export function waveNumber(period,depth){
 depth=Math.max(.02,depth);
 // Memoised on 0.1% relative depth steps (and 0.05 s periods).
 const bucket=Math.round(Math.log(depth)*1000),key=Math.round(period*20)*100000+bucket;
 const hit=kMemo.get(key);if(hit!==undefined)return hit;
 if(kMemo.size>200000)kMemo.clear();
 const k=solveWaveNumber(Math.round(period*20)/20,Math.exp(bucket/1000));kMemo.set(key,k);return k;
}
function solveWaveNumber(period,depth){
 const omega=TAU/period,omega2=omega*omega;depth=Math.max(.02,depth);
 let k=Math.max(omega2/G,omega/Math.sqrt(G*depth));
 for(let i=0;i<8;i++){const kh=k*depth,t=Math.tanh(kh),f=G*k*t-omega2;k=Math.max(1e-6,k-f/(G*(t+kh*(1-t*t))));}
 return k;
}
function phaseSpeed(period,depth){return TAU/period/waveNumber(period,depth);}
function groupSpeed(period,depth){const k=waveNumber(period,depth),kh=Math.min(350,k*depth);return TAU/period/k*.5*(1+2*kh/Math.sinh(2*kh));}

// Per-beach cross-shore shape. `face` is the steep beach face near the
// shoreline, then the nearshore slope, a trough and an alongshore-varying bar.
export const BEACH_SHAPE=Object.freeze({
// `datum` is the mean-tide water level on the bed: the reference shoreline sits
// in ~10 cm of water at mid tide and moves with the tide on the steep face.
 pacifica:Object.freeze({faceWidth:20,faceSlope:.10,nearSlope:.022,bar:[60,10,6],barAmp:.85,trough:.5,troughAmp:.55,channelDepth:1.6,datum:.55}),
 'half-moon-bay':Object.freeze({faceWidth:30,faceSlope:.04,nearSlope:.013,bar:[108,18,11],barAmp:1.15,trough:.46,troughAmp:.8,channelDepth:2,datum:.55}),
});
export function beachShape(sceneId,x){
 const b=BEACH_SHAPE[sceneId]||BEACH_SHAPE.pacifica;
 const barDistance=b.bar[0]+b.bar[1]*Math.sin(x/530)+b.bar[2]*Math.sin(x/183);
 return{...b,barDistance,troughDistance:barDistance*b.trough,slope:b.nearSlope};
}
/** Still-water depth (m) at `offshore` metres from the reference shoreline. */
export function bedDepth(shape,offshore,tide,gap=0){
 // Inland of the reference shoreline the beach face keeps rising (negative
 // depth = dry sand), so a high tide moves the real waterline up the face.
 const d=finite(offshore,0),face=d<0?d*shape.faceSlope:Math.min(d,shape.faceWidth)*shape.faceSlope+Math.max(0,d-shape.faceWidth)*shape.nearSlope;
 const trough=shape.troughAmp*bell(d-shape.troughDistance,shape.troughDistance*.38);
 const bar=shape.barAmp*(1-.7*gap)*bell(d-shape.barDistance,shape.barDistance*.16);
 const channel=gap*shape.channelDepth*bell(d-shape.barDistance,shape.barDistance*.55);
 return face+trough-bar+channel+tide-finite(shape.datum,0);
}

// ---- individual waves ----------------------------------------------------
// Heights at the domain edge: Rayleigh-distributed with Hs as the mean of the
// highest third, grouped into sets by a slow envelope over the wave index.
export function waveHeightAt(index,hs,alongshoreM=null){
 const u=hashUnit(index*7919+13),rayleigh=Math.sqrt(-Math.log(1-u*.9995));
 // Set envelope averages 1 so the Rayleigh statistics keep Hs as H1/3.
 const set=1+.3*Math.sin(index*TAU/7.3)+.15*Math.sin(index*TAU/17.1+1.3);
 return hs/1.416*rayleigh*clamp(set,.5,1.45)*(alongshoreM===null?1:crestFactor(index,alongshoreM));
}
// Real swell is short-crested (directional spread): a wave's height varies
// along its crest in sections of roughly a hundred metres, so it breaks first
// at its peaks and the break line of each wave falls somewhere different.
export const CREST_SECTION_M=90;
// Peeling: a break spreads ±PEEL_M along the crest into parts within ~15% of breaking.
const PEEL_M=60;
const crestNode=(index,i)=>1+.44*(hashUnit(index*104729+i*7+3)-.5);
export function crestFactor(index,alongshoreM){
 const u=alongshoreM/CREST_SECTION_M+hashUnit(index*31+5)*3,i0=Math.floor(u),f=u-i0,s=f*f*(3-2*f);
 const a=crestNode(index,i0),b=crestNode(index,i0+1);
 return a+(b-a)*s;
}
/** Highest nearby part of the same crest, weighted down with distance, over
 * this part's own height. The crest is monotone between nodes, so its nodes
 * and the window ends are the only candidates. */
function crestPeel(index,alongshoreM){
 const own=crestFactor(index,alongshoreM),off=hashUnit(index*31+5)*3,weight=d=>1-.15*Math.abs(d)/PEEL_M;
 let best=Math.max(crestFactor(index,alongshoreM-PEEL_M),crestFactor(index,alongshoreM+PEEL_M))*weight(PEEL_M);
 for(let i=Math.ceil((alongshoreM-PEEL_M)/CREST_SECTION_M+off);i<=(alongshoreM+PEEL_M)/CREST_SECTION_M+off;i++)
  best=Math.max(best,crestNode(index,i)*weight((i-off)*CREST_SECTION_M-alongshoreM));
 return Math.max(1,best/own);
}
const marchCache=new Map();
function cacheSet(key,value){if(marchCache.size>24000)marchCache.clear();marchCache.set(key,value);return value;}
/** Cross-shore profile of one column: depth every STEP metres, from
 * SURF_INLAND_M inland of the reference shoreline out to SURF_DOMAIN_M. */
function columnDepths(sceneId,shape,tide,gap,period){
 const key=`d:${sceneId}:${shape.barDistance.toFixed(1)}:${tide.toFixed(2)}:${gap.toFixed(2)}:${period.toFixed(1)}`;
 const hit=marchCache.get(key);if(hit)return hit;
 const n=SURF_DOMAIN_M/STEP+INLAND+1,depth=new Float32Array(n),cg=new Float32Array(n);
 for(let i=0;i<n;i++){depth[i]=bedDepth(shape,(i-INLAND)*STEP,tide,gap);cg[i]=groupSpeed(period,Math.max(.05,depth[i]));}
 // Still-water line (first wet cell) and the last cell deep enough for a bore
 // to still be a wave (≈0.25 m) where runup is driven from.
 let wet=0;while(wet<n-1&&depth[wet]<DRY)wet++;
 let toe=wet;while(toe<n-1&&depth[toe]<.25)toe++;
 depth.cg=cg;depth.wet=wet;depth.toe=toe;
 return cacheSet(key,depth);
}
const DRY=.03,DDD_K=.15,DDD_GAMMA=.4;
const BREAK_STATES=['unbroken','breaking','bore','reformed'];
/** March a wave of domain-edge height `h0` shoreward across a column.
 * Returns per-metre height, state (0 unbroken, 1 breaking/dissipating,
 * 2 broken bore not dissipating, 3 re-formed after a bar), breaker type and a
 * running sum of foam made (for foam that drifts shoreward after the wave). */
function marchWave(depths,key,h0,period,peel=1){
 const hit=marchCache.get(key);if(hit)return hit;
 const n=depths.length,H=new Float32Array(n),state=new Uint8Array(n),type=new Uint8Array(n),made=new Float32Array(n+1),roller=new Float32Array(n);
 const L0=G*period*period/TAU,cg=depths.cg,cgEdge=cg[n-1],wet=depths.wet;
 let broken=false,height=h0,ref=h0,breakType=0,outer=-1,flux=0;
 for(let i=n-1;i>=wet;i--){
  const h=Math.max(.02,depths[i]);
  if(!broken){
   height=ref*Math.sqrt(cgEdge/cg[i]);
   const slope=Math.max(.002,Math.abs(depths[Math.min(n-1,i+4)]-depths[Math.max(0,i-4)])/(8*STEP));
   const iribarren=slope/Math.sqrt(Math.max(.01,height)/L0);
   // Steeper beds hold taller waves before they break (plunging/surging).
   const gammaB=clamp(.72+1.6*slope+.12*Math.min(2,iribarren),.72,1.15);
   // `peel` > 1: a nearby higher part of this crest is already breaking and the
   // break runs along the crest into this slightly lower part.
   if(height*peel>=gammaB*h){broken=true;height=Math.min(height,gammaB*h);flux=height*height*cg[i];breakType=iribarren<.4?1:iribarren<2?2:3;state[i]=1;roller[i]=1;}
   else state[i]=ref<h0-1e-6?3:0;
  }else{
   // Dally, Dean & Dalrymple (1985): the broken wave's energy flux decays
   // toward a stable flux at H = Γh; bigger bores stay bigger for longer, and
   // one that crosses into a deep trough re-forms when it reaches Γh.
   const stable=DDD_GAMMA*h*DDD_GAMMA*h*cg[i];
   flux-=Math.min(1,DDD_K*STEP/h)*(flux-stable);
   height=Math.min(Math.sqrt(Math.max(0,flux)/cg[i]),.9*h);flux=Math.min(flux,height*height*cg[i]);
   if(flux<=stable*1.02&&h>.4){broken=false;state[i]=3;ref=height/Math.sqrt(cgEdge/cg[i]);}
   else state[i]=height>=.5*h?1:2;
   // Roller intensity: how far the bore still is above its stable height, so a
   // dying bore fades rather than switching off where it re-forms.
   if(broken)roller[i]=clamp(3*(flux-stable)/Math.max(1e-9,flux),.08,1);
  }
  H[i]=height;type[i]=breakType;if(state[i]===1&&outer<0)outer=i;
 }
 // Every wave that reaches the still-water line ends as a bore in the swash.
 if(wet<n&&state[wet]!==1&&state[wet]!==2&&H[wet]>.02){state[wet]=1;roller[wet]=1;if(outer<0)outer=wet;}
 for(let i=0;i<n;i++)made[i+1]=made[i]+clamp(H[i]/.4,.3,1)*roller[i];
 return cacheSet(key,{H,state,type,outer,made,roller});
}
const TYPE_NAMES=['none','spilling','plunging','surging'];

/** Surf state for one alongshore column. `phaseAt(offshore)` is the shared
 * traveling wave phase; `hs` the domain-edge significant height. */
export function surfColumn({sceneId,shape,tide,gap,period,hs,phaseAt,omega,alongshore=null}){
 tide=Math.round(tide*20)/20;period=Math.round(period*10)/10;
 const depths=columnDepths(sceneId,shape,tide,gap,period),n=depths.length;
 const hsKey=Math.round(hs*20)/20,base=`${sceneId}:${shape.barDistance.toFixed(1)}:${tide.toFixed(2)}:${gap.toFixed(2)}:${period.toFixed(1)}`;
 const memo=new Map();
 const wave=index=>{
  let w=memo.get(index);if(w!==undefined)return w;
  const raw=waveHeightAt(index,hsKey,alongshore),h0=Math.round(raw*200)/200;
  const peel=alongshore!==null&&raw>0?Math.round(crestPeel(index,alongshore)*200)/200:1;
  w=h0>0?marchWave(depths,`w:${base}:${h0}:${peel}`,h0,period,peel):null;memo.set(index,w);return w;
 };
 const sig=hsKey>0?marchWave(depths,`w:${base}:${hsKey}`,hsKey,period):null;
 // Ensemble-mean foam made per metre, over Rayleigh height quantiles: the
 // source of older, well-mixed foam that no longer tracks a single wave.
 let mean=null;
 const meanMade=()=>{
  if(mean||!(hsKey>0))return mean;const key=`m:${base}:${hsKey}`;mean=marchCache.get(key);if(mean)return mean;
  const made=new Float64Array(n+1),q=[.05,.15,.25,.35,.45,.55,.65,.75,.85,.95];
  for(const p of q){const h0=Math.round(hsKey/1.416*Math.sqrt(-Math.log(1-p))*200)/200,w=marchWave(depths,`w:${base}:${h0}`,h0,period);for(let i=0;i<=n;i++)made[i]+=w.made[i]/q.length;}
  return mean=cacheSet(key,made);
 };
 return{depths,n,wave,sig,omega,meanMade,
  cell:offshore=>clamp(Math.round(offshore/STEP)+INLAND,0,n-1),
  offshoreOf:i=>(i-INLAND)*STEP,
  // Still-water line and the bore toe (≈0.25 m deep), offshore metres.
  waterline:(depths.wet-INLAND)*STEP,toe:depths.toe,
  // Index of the most recent crest to pass `offshore` and seconds since it did.
  lastCrest(offshore){const phase=phaseAt(offshore),index=Math.floor(phase/TAU);return{index,age:(phase-index*TAU)/omega};},
 };
}
// Foam: the roller and bubble plume of a breaking wave are bright for a few
// seconds; the foam mat it leaves lasts tens of seconds and drifts shoreward
// with the surface mass transport (a few tenths of a m/s in the surf zone), so
// the inner surf zone stays white between waves and troughs stay darker —
// as time-exposure (Argus) images of barred beaches show.
const FOAM_WAVES=5,FOAM_DRIFT=.5,FOAM_LIFE=60;
const foamWindow=(made,i,n,dt)=>{
 const from=i+FOAM_DRIFT*dt/STEP,spread=3+.5*FOAM_DRIFT*dt/STEP;
 const a=clamp(Math.round(from-spread),i,n-1),b=clamp(Math.round(from+spread),i,n-1);
 return(made[b+1]-made[a])/(b-a+1);
};
export function sampleSurfColumn(col,offshore){
 const i=col.cell(offshore);
 let foam=0,active=0,crestHeight=0,crestState='unbroken',crestType='none',age=Infinity;
 if(col.depths[i]<DRY)return{foam:0,active:0,crestHeight:0,crestState,crestType,crestAge:age,significantHeight:0,saturated:false,dry:true};
 const last=col.lastCrest(offshore);
 for(let k=0;k<FOAM_WAVES;k++){
  const index=last.index-k,dt=last.age+k*TAU/Math.max(1e-6,col.omega??1),w=col.wave(index);
  if(!w)break;
  const s=w.state[i];
  if(k===0){crestHeight=w.H[i];crestState=BREAK_STATES[s];crestType=TYPE_NAMES[w.type[i]];age=dt;}
  if(s===1||s===2){
   const strength=clamp(w.H[i]/.4,.3,1)*w.roller[i];
   foam+=strength*Math.exp(-dt/4);
   if(s===1&&dt<1.2)active=Math.max(active,strength*(1-dt/1.2));
  }
  // Foam mat this wave made upstream that has since drifted here, spreading as it goes.
  foam+=.45*foamWindow(w.made,i,col.n,dt)*Math.exp(-dt/FOAM_LIFE);
 }
 // Older foam from all earlier waves, as a geometric sum over the ensemble mean.
 const mean=col.meanMade?.();
 if(mean&&last.index!==undefined){
  const T=TAU/Math.max(1e-6,col.omega??1),dt=last.age+FOAM_WAVES*T;
  foam+=.45*foamWindow(mean,i,col.n,dt+2*T)*Math.exp(-dt/FOAM_LIFE)/(1-Math.exp(-T/FOAM_LIFE));
 }
 return{foam:clamp(foam,0,1),active:clamp(active,0,1),crestHeight,crestState,crestType,crestAge:age,
  significantHeight:col.sig?col.sig.H[i]:0,saturated:col.sig?col.sig.state[i]===1||col.sig.state[i]===2:false,dry:false};
}
/** Stockdon et al. (2006) runup statistics for a beach-face slope. */
export function stockdonRunup(hs,period,faceSlope){
 const L0=G*period*period/TAU,hl=Math.sqrt(Math.max(0,hs*L0)),xi=faceSlope/Math.sqrt(Math.max(1e-4,hs/L0));
 const setup=.35*faceSlope*hl,incident=.75*faceSlope*hl,infragravity=.06*hl;
 const r2=xi<.3?.043*hl:1.1*(setup+.5*Math.sqrt(incident*incident+infragravity*infragravity));
 return{setup,incident,infragravity,r2,iribarren:xi};
}
