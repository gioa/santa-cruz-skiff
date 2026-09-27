/** Species/size-dependent hooked-fish approximation, in active real seconds.
 * Body-size and swimming evidence is documented in docs/fish-fight-research.md.
 * Hooked thrust, duty cycles and energy budgets below are simulation tuning,
 * NOT measured force records or a conversion of fish weight into line tension.
 * No health threshold or minimum fight duration is required to land a fish.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export const FISH_FIGHT_PROFILES=Object.freeze({
 rockfish:{base:1.0,burst:5.4,run:2.0,rest:6.8,speed:.62,lateral:.18,dive:.24,budget:75,shake:3.8},
 lingcod:{base:1.65,burst:6.4,run:3.8,rest:5.7,speed:.94,lateral:.3,dive:.5,budget:120,shake:2.5},
 halibut:{base:1.25,burst:5.7,run:3.1,rest:7.2,speed:.88,lateral:.55,dive:.26,budget:130,shake:2.8},
 mackerel:{base:1.2,burst:4.3,run:2.7,rest:2.6,speed:.7,lateral:.45,dive:.05,budget:105,shake:5.1},
 salmon:{base:2.3,burst:8.2,run:8.8,rest:7.4,speed:1.65,lateral:.7,dive:.18,budget:235,shake:3.1},
 seabass:{base:2.0,burst:7.6,run:7.2,rest:9.5,speed:1.22,lateral:.27,dive:.56,budget:190,shake:2.1},
 bonito:{base:2.4,burst:9.0,run:5.4,rest:3.1,speed:1.5,lateral:.9,dive:.12,budget:280,shake:4.5},
});
export function fishFightKind(fish={}){
 const key=`${fish.fightKind||''} ${fish.latin||''} ${fish.name||''}`;
 if(/salmon|tshawytscha|鲑/i.test(key))return'salmon';
 if(/seabass|nobilis|白海鲈/i.test(key))return'seabass';
 if(/bonito|Sarda|鲣/i.test(key))return'bonito';
 if(/lingcod|elongatus|单线/i.test(key))return'lingcod';
 if(/halibut|californicus|比目/i.test(key))return'halibut';
 if(/mackerel|japonicus|鲭鱼/i.test(key))return'mackerel';
 return'rockfish';
}
export function createFishFight(fish={},variation=.5){
 const kind=fishFightKind(fish),mass=clamp(finite(fish.kg,.6),.05,80),p=FISH_FIGHT_PROFILES[kind];
 return{kind,mass,energy:1,variation:clamp(finite(variation,.5),0,1),capacityJ:p.budget*Math.pow(mass,.85),workJ:0};
}
export function stepFishFight(fish={},fight,{dt=.1,time=0,rodLoadN=0,payoutRate=0,retrieveRate=0,lineSlackMeters=0,lureDepth=0}={}){
 const f=fight||createFishFight(fish),p=FISH_FIGHT_PROFILES[f.kind]||FISH_FIGHT_PROFILES.rockfish;
 dt=clamp(finite(dt),0,.25);time=Math.max(0,finite(time));
 const massScale=Math.pow(f.mass,.78),v=.88+f.variation*.24,energy=clamp(finite(f.energy,1),0,1);
 const largeRock=f.kind==='rockfish'?clamp((f.mass-1.5)/4,0,1):0;
 const run=p.run*(1+.8*largeRock),rest=p.rest*(1-.2*largeRock),cycle=(run+rest)*v,phase=time%cycle,burst=phase<run*v;
 // Short accelerating surges with rounded ends, not every fish sharing one sine.
 const envelope=burst?Math.sin(Math.PI*clamp(phase/(run*v),0,1))**.55:0;
 const rockFloor=.44+.16*largeRock;
 const fatigue=.12+.88*Math.sqrt(energy),rockSettle=f.kind==='rockfish'?(rockFloor+(1-rockFloor)*Math.exp(-time/(11+17*largeRock))):1;
 const headShake=(.5+.5*Math.sin(time*p.shake*Math.PI*2+f.variation*3))*envelope*fatigue;
 const drive=massScale*(p.base*.55+p.burst*(1+.2*largeRock)*envelope)*fatigue*rockSettle*v;
 const pullN=Math.max(.12,drive*(.86+.14*headShake));
 const loaded=lineSlackMeters<.3&&rodLoadN>.25;
 // Work against the line plus muscle effort under load. Free slack lets fish
 // recover; merely waiting does not empty a timer-based health bar.
 const effort=loaded?(pullN*(.045+envelope*.16)+Math.max(0,rodLoadN)*(Math.max(0,retrieveRate)+Math.max(0,payoutRate)*.32)):0;
 const recovery=loaded?0:dt*.008;
 const nextEnergy=clamp(energy-effort*dt/Math.max(1,f.capacityJ)+recovery,.025,1);
 const runSpeedMps=p.speed*Math.pow(f.mass,.12)*envelope*fatigue*rockSettle;
 const lateralMps=Math.sin(time*.62+f.variation*5)*p.lateral*envelope*fatigue;
 // Pelagic runs gradually travel upwards; bottom species stay close to reef.
 const diveMps=burst?p.dive*envelope*fatigue:((f.kind==='salmon'||f.kind==='bonito')&&lureDepth>1?-.16:0);
 return{fight:{...f,energy:nextEnergy,workJ:finite(f.workJ)+effort*dt},pullN,
  motion:{runSpeedMps,lateralMps,diveMps,headShake,phase:envelope>.15?(f.kind==='rockfish'?'kick':'run'):energy<.25?'settle':'glide'}};
}
/** At the gunwale, an adequately controlled fish can be netted immediately.
 * A small fish never has to spend a scripted amount of time being fought.
 */
export function canLandFish(s){
 return s.fishState==='fight'&&s.reelMode!=='free'&&s.paidLineMeters<=finite(s.rodTip?.height)+1.05&&s.lureDepth<1.1&&s.payoutRate<.12&&finite(s.fishPullN)<=Math.max(3,finite(s.dragThresholdN,13.5)*1.05);
}
