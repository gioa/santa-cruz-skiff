/** Species-specific body articulation. Frequency/amplitude are animation
 * tuning, not measured hooked-fish kinematics. No animation delays landing. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FISH_BODY_PROFILES=Object.freeze({
 blue:{hz:3.8,tail:.09,roll:.08},copper:{hz:3.1,tail:.11,roll:.12},vermilion:{hz:3.4,tail:.10,roll:.1},rockfish:{hz:3.5,tail:.1,roll:.1},
 lingcod:{hz:2.5,tail:.19,roll:.13},halibut:{hz:2.8,tail:.11,roll:.65},sanddab:{hz:4.2,tail:.08,roll:.45},
 salmon:{hz:3.1,tail:.17,roll:.25},seabass:{hz:2.1,tail:.14,roll:.14},bonito:{hz:5.3,tail:.12,roll:.2},
 mackerel:{hz:6.3,tail:.13,roll:.2},croaker:{hz:4.4,tail:.1,roll:.15},anchovy:{hz:7,tail:.12,roll:.2},sardine:{hz:6.5,tail:.12,roll:.2},
 unknown:{hz:3,tail:.09,roll:.1},
});
export function fishBodyPose(kind,{time=0,mass=1,energy=1,headShake=0,phase='',landed=false,reducedMotion=false,jumpVelocity=0,airborne=false}={}){
 const p=FISH_BODY_PROFILES[kind]||FISH_BODY_PROFILES.unknown;
 if(reducedMotion)return{tail:0,wave:0,pitch:0,roll:1};
 const rate=p.hz*clamp(Math.pow(Math.max(.05,mass),-.12),.65,1.45),t=time*rate*Math.PI*2;
 const fatigue=.15+.85*Math.sqrt(clamp(energy,0,1));
 // Quiet breathing between irregular kicks; a caught fish is not a metronome.
 const kick=landed?Math.max(0,Math.sin(time*2.2+.4))**8:clamp(.15+headShake*.6+(['run','kick','jump','dive'].includes(phase)?.35:0),0,1);
 const effort=fatigue*(landed?.13+.87*kick:kick);
 return{tail:p.tail*effort,wave:t,pitch:airborne?clamp(jumpVelocity*.14,-.55,.55):Math.sin(t*.43)*.055*effort,roll:1-p.roll*Math.abs(Math.sin(t*.47))*effort};
}
/** Head stays at (x + length, y + height/2), with no gap at the hook.
 * One-source-pixel strips bend the body and tail without stretching its scale. */
export function drawFishBody(ctx,sprite,bounds,{x=0,y=0,length,height,pose}={}){
 if(!pose||!pose.tail&&!pose.pitch&&pose.roll===1){ctx.drawImage(sprite,bounds.x,bounds.y,bounds.width,bounds.height,x,y,length,height);return;}
 for(let i=0;i<bounds.width;i++){
  const u=i/Math.max(1,bounds.width-1),tail=1-u;
  const bend=Math.sin(pose.wave-tail*4)*pose.tail*length*tail**2;
  const offset=bend+Math.sin(pose.pitch)*length*tail;
  const h=height*(1-(1-pose.roll)*Math.sin(Math.PI*u));
  ctx.drawImage(sprite,bounds.x+i,bounds.y,1,bounds.height,x+i/bounds.width*length,y+(height-h)/2+offset,length/bounds.width,h);
 }
}
