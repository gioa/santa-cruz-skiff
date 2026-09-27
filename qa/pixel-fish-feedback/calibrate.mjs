// Deterministic engineering scenarios, not browser playtime or measured fish data.
import {writeFile} from 'node:fs/promises';
import {createFishFight,stepFishFight,canLandFish} from '../../dist/pixel-fish-fight.js';
import {stepFishingLine,rodTipPosition} from '../../dist/pixel-fishing-physics.js';
const scenarios=[['small rockfish','rockfish',.45],['ordinary rockfish','rockfish',1.2],['large rockfish','rockfish',5.5],['Chinook salmon','salmon',6],['white seabass','seabass',12],['Pacific bonito','bonito',3.5]],results=[];
for(const[name,kind,kg]of scenarios){
 const fish={fightKind:kind,kg},s={fishState:'fight',fish,fishFight:createFishFight(fish),rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'brake',crankRate:1.2,drag:.48,pumpHeight:0,rodBend:0,rodLoadN:0,lureDepth:12,paidLineMeters:14.5,lineSlackMeters:0};s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:-12};
 let maxPull=0,out=0,peakLine=s.paidLineMeters,time=0;
 for(;time<600;time+=.05){const r=stepFishFight(fish,s.fishFight,{...s,dt:.05,time});s.fishFight=r.fight;s.fishPullN=r.pullN;s.fishMotion=r.motion;Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:30},fishPullN:r.pullN,fishMotion:r.motion}));maxPull=Math.max(maxPull,r.pullN);out+=s.payoutRate*.05;peakLine=Math.max(peakLine,s.paidLineMeters);if(canLandFish(s))break;}
 results.push({name,kg,landed:canLandFish(s),seconds:+time.toFixed(1),peakSimulatedThrustN:+maxPull.toFixed(1),linePaidOutMeters:+out.toFixed(1),maximumLineMeters:+peakLine.toFixed(1),remainingEnergy:+s.fishFight.energy.toFixed(2)});
}
const report={note:'Simulation calibration, not empirical hooked-force measurements. Same starter tackle, 12 m depth, 1.2 handle rev/s, steady winding, no hand-tuned per-fish landing time.',results};
await writeFile(new URL('./calibration.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
