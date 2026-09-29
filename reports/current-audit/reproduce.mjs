import {readFile,writeFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {stepFishingLine,rodTipPosition,fishingCurrent}=await import('../../dist/pixel-fishing-physics.js');
const {fishingScenePoint,FISHING_SCENE_SCALE}=await import('../../dist/pixel-fishing-projection.js');
const {sea}=await import('../../dist/marine.js');
function run({currentX=0,boatVx=0,weight=85,bottom=10,depth=9.7,duration=60}){
 const s={rig:'bottom',rigWeightGrams:weight,boatX:0,boatZ:0,heading:0,rodElevation:45,rodAzimuth:70,rodMount:'hand',reelMode:'free',crankRate:0,drag:.48,rodBend:0,rodLoadN:0,lureDepth:depth,paidLineMeters:90};const tip=rodTipPosition(s);s.bobber={x:tip.x,z:tip.z,height:-depth};const start={...s.bobber};
 for(let i=0;i<duration*20;i++){s.boatX+=boatVx*.05;Object.assign(s,stepFishingLine(s,{dt:.05,environment:{bottomDepth:bottom,lineDiameterMm:.36},current:{x:currentX,z:0},velocity:{vx:boatVx,vz:0}}));}
 return{weightGrams:weight,currentMps:currentX,boatMps:boatVx,seconds:duration,lureGroundDisplacement:s.bobber.x-start.x,relativeX:s.bobber.x-s.boatX-start.x,depth:s.lureDepth,bottomContact:s.rigPresentation.bottomContact,loadN:s.rodLoadN};
}
const fixed={x:0,z:0};const result={release:'d8bd2be',defaultCurrent:fishingCurrent(sea),marineCurrentFields:Object.keys(sea).filter(k=>/current/i.test(k)),bottomWeakFlow:[run({currentX:.05,weight:85}),run({currentX:.05,weight:340})],midwaterSharedFlow:run({currentX:.5,boatVx:.5,bottom:200,depth:3,duration:10}),midwaterStill:run({bottom:200,depth:3,duration:10}),fixedHookDisplay:{scale:FISHING_SCENE_SCALE,before:fishingScenePoint({boatX:0,boatZ:0},fixed),afterBoatMovesOneMeter:fishingScenePoint({boatX:1,boatZ:0},fixed)}};
await writeFile(new URL('./results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
