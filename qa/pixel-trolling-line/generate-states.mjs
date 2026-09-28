import {writeFileSync} from 'node:fs';
import {stepFishingLine,rodTipPosition} from '../../dist/pixel-fishing-physics.js';
import {getRodCurve,getFishingLine} from '../../dist/pixel-rod-geometry.js';
let s={boatX:0,boatZ:0,heading:0,rig:'bottom',rigWeightGrams:85,rodMount:'starboard',rodElevation:45,rodAzimuth:70,paidLineMeters:15,lureDepth:12,reelMode:'brake',fishState:'waiting'};let tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-12};
const snapshots=[];
for(let i=0;i<1800;i++){let speed=i<300?0:i<900?1:i<1200?1:0;s.heading=i<900?0:i<1200?(i-900)/300*Math.PI/2:Math.PI/2;let vx=-Math.sin(s.heading)*speed,vz=-Math.cos(s.heading)*speed;s.boatX+=vx/30;s.boatZ+=vz/30;Object.assign(s,stepFishingLine(s,{dt:1/30,environment:{bottomDepth:60,habitat:'sand'},velocity:{vx,vz}}));if([299,899,1199,1799].includes(i))snapshots.push(structuredClone(s));}
writeFileSync('qa/pixel-trolling-line/states.json',JSON.stringify(snapshots,null,2));
