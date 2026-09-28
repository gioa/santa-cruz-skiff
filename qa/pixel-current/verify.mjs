import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {stepFishingLine,rodTipPosition} from '../../dist/pixel-fishing-physics.js';
const results=[];
for(const scenario of['codrift','bottom','wind','snag'])for(const dt of[1/60,.1,.25]){
 const s={rig:'bottom',rigWeightGrams:85,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:scenario==='wind'?'brake':'free',paidLineMeters:40,lureDepth:scenario==='bottom'||scenario==='snag'?9.7:10};const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-s.lureDepth};if(scenario==='snag'){s.snagged=true;s.snagPoint={...s.bobber};}const start={...s.bobber};let maxLoad=0,maxSlack=0;
 const current={x:scenario==='bottom'?.05:.35,z:0},velocity={vx:scenario==='codrift'?.35:scenario==='wind'?.65:scenario==='snag'?.1:0,vz:0};
 for(let t=0;t<600-dt/2;t+=dt){s.boatX+=velocity.vx*dt;Object.assign(s,stepFishingLine(s,{dt,current,velocity,environment:{bottomDepth:scenario==='bottom'||scenario==='snag'?10:80,habitat:'sand'}}));for(const v of[s.bobber.x,s.bobber.z,s.bobber.height,s.paidLineMeters,s.rodLoadN])assert.ok(Number.isFinite(v));assert.ok(s.paidLineMeters<=120);maxLoad=Math.max(maxLoad,s.rodLoadN);maxSlack=Math.max(maxSlack,s.lineSlackMeters);if(scenario==='bottom'||scenario==='snag')assert.deepEqual(s.bobber,start);}
 results.push({scenario,dt,seconds:600,boatX:s.boatX,lureX:s.bobber.x,lureDepth:s.lureDepth,maxLoadN:maxLoad,maxSlackM:maxSlack,paidLineM:s.paidLineMeters});
}
writeFileSync(new URL('physics-results.json',import.meta.url),JSON.stringify(results,null,2));console.log('12 × 600 simulated seconds passed; this is automated physics coverage, not 10 minutes of manual play.');
