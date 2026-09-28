import {rodFlexPoint} from './pixel-rod-response.js?v=20260927-pixel-v54';
// Shared presentation geometry. The model supplies angles, mount and actual
// load-derived bend; rendering never invents fish pulls or changes line length.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f)=>Number.isFinite(n)?n:f;
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const radians=n=>n*Math.PI/180;

export function getFishingPresentation(state){
  const active=!['idle','landed'].includes(state.fishState||'idle');
  const deployed=active&&state.fishState!=='casting'&&Boolean(state.bobber);
  const flight=deployed&&state.fishState==='flight';
  const showFloat=deployed&&state.rig==='float';
  return{active,deployed,showFloat,kind:!deployed?'none':flight?'flight':showFloat?'float':'submerged',cameraTracksLure:deployed&&(flight||showFloat)};
}

/**
 * Canvas coordinates, in the same native 48 x 88 boat sprite space. origin is
 * the boat centre after its wave offset; scale matches the hull sprite scale.
 * Angles are degrees: azimuth is relative to the bow, positive toward starboard.
 * points[0] is the fore-hand grip; points.at(-1) is the one shared line tip.
 */
export function getRodCurve(state,{origin={x:0,y:0},scale=1,heading=finite(state.heading,0),bodyX=0,bodyY=0,segments=20}={}){
  segments=Math.round(clamp(finite(segments,20),4,64));
  const mount=['port','starboard'].includes(state.rodMount)?state.rodMount:'hand',mounted=mount!=='hand';
  const elevation=clamp(finite(state.rodElevation,45),5,85),azimuth=clamp(finite(state.rodAzimuth,mount==='port'?-70:70),-180,180),bend=clamp(finite(state.rodBend,0),0,1);
  const localBase=mounted?{x:mount==='port'?-17:17,y:7}:{x:bodyX+4,y:bodyY+7};
  const rotate=(x,y)=>({x:origin.x+scale*(x*Math.cos(heading)+y*Math.sin(heading)),y:origin.y+scale*(-x*Math.sin(heading)+y*Math.cos(heading))});
  const base=rotate(localBase.x,localBase.y),a=heading-radians(azimuth),dx=-Math.sin(a),dy=-Math.cos(a),e=radians(elevation),length=52,points=[];
  const baseHeight=mounted?9:12;
  let tipGround,tipHeight;
  for(let i=0;i<=segments;i++){
    const t=i/segments,tipMotion=rodFlexPoint(state,t,length),flex=tipMotion.shape,horizontal=length*Math.cos(e)*t+bend*length*.10*flex;
    // Flexible upper third bends down under the model's tension. The butt and
    // grip remain exactly anchored, and the curve cannot flip through the water.
    const rise=length*Math.sin(e)*t-bend*length*.62*flex;
    const height=Math.max(2,baseHeight+rise*.67),lift=height-baseHeight;
    points.push({x:base.x+(dx*horizontal+tipMotion.x)*scale,y:base.y+(dy*horizontal-lift+tipMotion.y)*scale});
    if(i===segments){tipGround={x:base.x+dx*horizontal*scale,y:base.y+dy*horizontal*scale+baseHeight*scale};tipHeight=height;}
  }
  const tip=points.at(-1),tangent=points[1],norm=Math.hypot(tangent.x-base.x,tangent.y-base.y)||1,ux=(tangent.x-base.x)/norm,uy=(tangent.y-base.y)/norm;
  const butt={x:base.x-ux*9*scale,y:base.y-uy*9*scale},rearGrip=lerp(butt,base,.45),reel={x:base.x-uy*3*scale-ux*2*scale,y:base.y+ux*3*scale-uy*2*scale};
  // A near-vertical rod still clears the rail. Its entry point is outboard,
  // never a line painted across the middle of the open boat.
  const side=mount==='port'?-1:mount==='starboard'?1:Math.sin(radians(azimuth))<0?-1:1;
  const localGround={x:localBase.x+Math.sin(radians(azimuth))*(length*Math.cos(e)+bend*length*.10),y:localBase.y-Math.cos(radians(azimuth))*(length*Math.cos(e)+bend*length*.10)};
  const waterBase=rotate(side*Math.max(27,Math.abs(localGround.x)),localGround.y);waterBase.y+=baseHeight*scale;
  return{points,base,tip,butt,rearGrip,reel,tipGround,waterBase,tipHeightPixels:tipHeight*scale,tipHeightMeters:tipHeight/24,mount,mounted,elevation,azimuth,bend,scale,
    shoulders:[rotate(bodyX-5,bodyY+5),rotate(bodyX+5,bodyY+4)],socket:rotate(localBase.x,localBase.y+5)};
}

export function getReelPose(state,rod,{turns=0}={}){
  const angle=turns*Math.PI*2,knob={x:rod.reel.x+Math.cos(angle)*4*rod.scale,y:rod.reel.y+Math.sin(angle)*3*rod.scale};
  return{knob,hands:rod.mounted?[]:state.reeling?[rod.base,knob]:[rod.rearGrip,rod.base]};
}

/** Surface intersection reconciled with the enlarged rod artwork, plus a short
 * fading underwater tail. A surface float/airborne lure retains its true point.
 */
export function getFishingLine(state,rod,{project=(x,z)=>({x,y:z}),cameraScale=6}={}){
  const presentation=getFishingPresentation(state);if(!presentation.deployed)return{...presentation,start:rod.tip,end:null,points:[],underwater:[]};
  const target=presentation.showFloat&&presentation.kind!=='flight'?(state.floatPosition||state.bobber):state.bobber;
  const lure=project(target.x,target.z),height=presentation.kind==='flight'?Math.max(0,finite(target.height,0)):0;
  let end={x:lure.x,y:lure.y-height*cameraScale},underwater=[],entrySource=null;
  if(presentation.kind==='flight'&&state.castFlight?.version===1){const f=state.castFlight,start=project(f.start.x,f.start.z),fade=1-clamp(f.t/f.duration,0,1);end.x+=(rod.tip.x-start.x)*fade;end.y+=(rod.tip.y-(start.y-f.start.height*cameraScale))*fade;}
  if(presentation.kind==='submerged'){
    let underwaterTarget=lure;
    if(Number.isFinite(state.lineEntry?.x)&&Number.isFinite(state.lineEntry?.z)&&Number.isFinite(state.rodTip?.x)&&Number.isFinite(state.rodTip?.z)){
      const physicalTip=project(state.rodTip.x,state.rodTip.z),physicalEntry=project(state.lineEntry.x,state.lineEntry.z);
      const heightPixels=Math.max(1,rod.tipHeightPixels),heightMeters=Math.max(.01,finite(state.rodTip.height,1)),pixelsPerMeter=Math.max(.01,cameraScale);
      if(state.castLine){
        // A cast hits its world-space target. Intersect the ray from the
        // enlarged rod with the surface; at splashdown it is exactly the
        // cast target, then it moves continuously as the tackle sinks/tows.
        const depth=Math.max(0,-finite(target.height,-finite(state.lureDepth,0)));
        end=depth===0?{...lure}:lerp(rod.waterBase,lure,heightPixels/(heightPixels+depth*pixelsPerMeter));
      }else{
        // Rod artwork is enlarged relative to the map. Scaling only its
        // vertical height made a towed line look almost vertical/fixed.
        // Preserve horizontal displacement / height (the physical line
        // slope), in BOTH world axes, on that same artwork scale.
        const scale=heightPixels/(heightMeters*pixelsPerMeter);
        end={x:rod.waterBase.x+(physicalEntry.x-physicalTip.x)*scale,y:rod.waterBase.y+(physicalEntry.y-physicalTip.y)*scale};
        underwaterTarget={x:end.x+(lure.x-physicalEntry.x),y:end.y+(lure.y-physicalEntry.y)};
      }
      entrySource='model';
    }else{
      const depth=Math.max(.1,finite(state.lureDepth,.1)),fraction=rod.tipHeightMeters/(rod.tipHeightMeters+depth);end=lerp(rod.waterBase,lure,fraction);entrySource='projection';
    }
    const dx=underwaterTarget.x-end.x,dy=underwaterTarget.y-end.y,len=Math.hypot(dx,dy)||1,tail=Math.min(7*rod.scale,len);
    underwater=[end,{x:end.x+dx/len*tail,y:end.y+dy/len*tail+2*rod.scale}];
  }
  const free=state.reelMode==='free',slack=Number.isFinite(state.lineSlackMeters)?clamp(state.lineSlackMeters*1.5,0,18):free?Math.min(10,3+Math.max(0,finite(state.paidLineMeters,0)-finite(state.lureDepth,0))*.25):Math.max(0,2-rod.bend*2),control=lerp(rod.tip,end,.5);control.y+=slack*rod.scale;
  const points=[];for(let i=0;i<=16;i++){const t=i/16,u=1-t;points.push({x:u*u*rod.tip.x+2*u*t*control.x+t*t*end.x,y:u*u*rod.tip.y+2*u*t*control.y+t*t*end.y});}
  // Preserve reference identity as well as values: the line begins at the exact
  // same point used for the rod's final raster segment.
  points[0]=rod.tip;points[points.length-1]=end;
  return{...presentation,start:rod.tip,end,points,underwater,slack,entrySource};
}
