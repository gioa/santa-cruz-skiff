import {fishMassKg} from '../../dist/pixel-fish-mass.js';
import {createFishFight,stepFishFight,canLandFish} from '../../dist/pixel-fish-fight.js';
import {stepFishingLine,rodTipPosition} from '../../dist/pixel-fishing-physics.js';
export function encounter({drag=.85,depth=12,variation=.5,inches=32,dt=.05}={}){
 const fish={fightKind:'halibut',latin:'Paralichthys californicus',length:inches*2.54};fish.kg=fishMassKg(fish,fish.length);
 const s={fishState:'fight',fish,fishFight:createFishFight(fish,variation),rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',crankRate:1.2,drag,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:depth,paidLineMeters:depth+2.5,lineSlackMeters:0};s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-depth};
 let time=0,out=0,peak=0,maxLoad=0,nearRun=false,slowest=1,frames=[];
 for(;time<360;time+=dt){s.crankRate=1.2;const r=stepFishFight(fish,s.fishFight,{...s,dt,time});s.fishFight=r.fight;s.fishPullN=r.pullN;s.fishMotion=r.motion;Object.assign(s,stepFishingLine(s,{dt,environment:{bottomDepth:30},fishPullN:r.pullN,fishMotion:r.motion}));out+=s.payoutRate*dt;peak=Math.max(peak,r.pullN);maxLoad=Math.max(maxLoad,s.rodLoadN);slowest=Math.min(slowest,s.retrieveRate);if(r.motion.phase==='dive')nearRun=true;if(Math.round(time/dt)%20===0)frames.push({time,depth:s.lureDepth,force:r.pullN,retrieve:s.retrieveRate,phase:r.motion.phase,energy:s.fishFight.energy});if(canLandFish(s))break;}
 return{inches,kg:fish.kg,drag,depth,variation,landed:canLandFish(s),seconds:+time.toFixed(2),out:+out.toFixed(2),peak:+peak.toFixed(2),maxLoad:+maxLoad.toFixed(2),slowest:+slowest.toFixed(3),nearRun,frames};
}
if(process.argv[1]?.endsWith('compare.mjs'))console.log(JSON.stringify([.35,.48,.85].map(drag=>{const{frames,...r}=encounter({drag});return r;}),null,2));
