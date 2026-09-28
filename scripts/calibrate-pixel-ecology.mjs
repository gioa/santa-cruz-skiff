/** Reproducible, deterministic model calibration, not observed fishing CPUE.
 * Run from any directory: node scripts/calibrate-pixel-ecology.mjs */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
globalThis.fetch=async url=>new Response(await readFile(url));
const {PIXEL_FISH}=await import('../dist/pixel-sim.js');
const {fromGPS,toGPS}=await import('../dist/pixel-geography.js');
const {depthInfoAt}=await import('../dist/bathymetry.js');
const {seafloorAt,fishingHabitatAt}=await import('../dist/pixel-seafloor.js');
const {fishEncounter}=await import('../dist/pixel-fish-ecology.js');
const {getRigProfile,rigSpeciesKey}=await import('../dist/fishing-rigs.js');
const scenarios=[
 {id:'stationary_squid_bottom',rig:'bottom',bait:'squid',baitForm:'strip',anchored:true,driftSpeedMps:0,pumping:false,layer:'bottom'},
 {id:'slow_drift_squid_bottom',rig:'bottom',bait:'squid',baitForm:'strip',anchored:false,driftSpeedMps:.3,pumping:false,layer:'bottom'},
 {id:'slow_drift_anchovy_slider',rig:'slider',bait:'anchovy',baitForm:'deadwhole',anchored:false,driftSpeedMps:.3,pumping:false,layer:'bottom'},
 {id:'trolling_anchovy_slider',rig:'slider',bait:'anchovy',baitForm:'deadwhole',anchored:false,driftSpeedMps:1.2,pumping:false,layer:'bottom'},
 {id:'stationary_feather40',rig:'feather40',bait:'feather',anchored:true,driftSpeedMps:0,pumping:false,layer:'bottom'},
 {id:'lifted_feather40',rig:'feather40',bait:'feather',anchored:true,driftSpeedMps:0,pumping:true,lureVerticalSpeedMps:.52,layer:'bottom'},
 {id:'lifted_squid_tipped_feather40',rig:'feather40',bait:'squid',baitForm:'strip',baitTipped:true,tipFreshness:1,anchored:true,driftSpeedMps:0,pumping:true,lureVerticalSpeedMps:.52,layer:'bottom'},
 {id:'midwater_small_feather',rig:'sabiki',bait:'feather',anchored:true,driftSpeedMps:0,pumping:true,lureVerticalSpeedMps:.52,layer:'midwater'},
 {id:'midwater_trolling_jig',rig:'jig',bait:'jig',anchored:false,driftSpeedMps:1.2,pumping:false,layer:'midwater'},
];
const positions=[
 {id:'wharf_middle_west',label:'Near middle Wharf, west of the straight playable deck',x:-60,z:-80},
 {id:'lighthouse_outer',label:'Lighthouse Point outer reference',...fromGPS(-122.0288,36.9505)},
 {id:'main_beach_outer',label:'Main Beach outer reference',...fromGPS(-122.0118,36.9585)},
];
const sites=positions.map(site=>({...site,gps:toGPS(site.x,site.z),depth:depthInfoAt(site.x,site.z),rawUSGS:seafloorAt(site.x,site.z),fishingHabitat:fishingHabitatAt(site.x,site.z)}));
const records=[];
for(const site of sites)for(let month=1;month<=12;month++)for(const scenario of scenarios){
 const rig=getRigProfile(scenario.rig),bottomDepth=site.depth.value;
 if(bottomDepth==null)throw Error(`No mapped NOAA depth at ${site.id}`);
 const env={...scenario,habitat:site.fishingHabitat.kind,bottomDepth,
  lureDepth:scenario.layer==='bottom'?Math.max(.2,bottomDepth-rig.baitAboveBottom):Math.min(5,bottomDepth*.5),
  month,waterTemp:14,currentMps:.1,boatSpeedMps:0,retrieveSpeedMps:0,
  freshness:1,baitTipped:scenario.baitTipped??!['jig','sabiki','feather40'].includes(rig.id),tipFreshness:scenario.tipFreshness??0};
 const {weights,totalWeight,ratePerSecond}=fishEncounter(PIXEL_FISH,env);
 records.push({site:site.id,month,scenario:scenario.id,environment:env,
  simulatedEncounterRatePerActiveSecond:ratePerSecond,
  meanActiveSecondsPerEncounter:ratePerSecond>0?1/ratePerSecond:null,
  species:PIXEL_FISH.map((f,i)=>({id:rigSpeciesKey(f),latin:f.latin,
   simulatedEncounterRatePerActiveSecond:weights[i]*.018,
   conditionalShareOfEncounters:totalWeight>0?weights[i]/totalWeight:0}))});
}
const sourceFiles=['dist/pixel-fish-ecology.js','dist/fishing-rigs.js','dist/pixel-consumables.js','dist/pixel-sim.js','dist/pixel-seafloor.js','dist/data/seafloor.json','dist/data/bathymetry.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')])));
const record=(site,scenario,month=9)=>records.find(r=>r.site===site&&r.scenario===scenario&&r.month===month);
const speciesRate=(row,id)=>row.species.find(f=>f.id===id).simulatedEncounterRatePerActiveSecond;
const comparison=sites.map(site=>{
 const stationary=record(site.id,'stationary_squid_bottom'),drift=record(site.id,'slow_drift_anchovy_slider'),troll=record(site.id,'trolling_anchovy_slider');
 return{site:site.id,month:9,halibut:{stationaryStripRate:speciesRate(stationary,'halibut'),slowDriftAnchovyRate:speciesRate(drift,'halibut'),trollingAnchovyRate:speciesRate(troll,'halibut'),slowDriftToStationaryRateRatio:speciesRate(drift,'halibut')/speciesRate(stationary,'halibut')},stationaryTopSpecies:[...stationary.species].sort((a,b)=>b.conditionalShareOfEncounters-a.conditionalShareOfEncounters).slice(0,3).map(f=>f.id)};
});
const output={schemaVersion:1,model:'Santa Cruz simulated encounter calibration',evidenceReviewedOn:'2026-09-27',reproduce:'node scripts/calibrate-pixel-ecology.mjs',
 limitations:['All rates and conditional shares are synthetic game parameters, not observed catches or measured percentages.',
 'Conditioned share describes which species follows an encounter, not the probability of an encounter.',
 'Water temperature is held at14C across all months to isolate monthly changes, not a forecast or seasonal temperature series.',
 'These are instantaneous controlled presentations at a fixed bait layer, not whole-trip outcomes; line hydrodynamics, loss, bait depletion and legal retention are not simulated here.',
 'boatSpeedMps remains0 because the shared rig-physics environment already carries relative flow. Actual movement is passed independently as driftSpeedMps, matching PixelSimulation.rigEnvironment.',
 'The Wharf USGS cell is NoData. Its fishing habitat is a marked local written-account approximation; Lighthouse and MainBeach use mapped USGS substrate.'],
 sourceHashes,fishCount:PIXEL_FISH.length,sites,scenarios,comparisons:comparison,records};
const destination=new URL('qa/pixel-ecology/',root);await mkdir(destination,{recursive:true});
await writeFile(new URL('calibration.json',destination),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({records:records.length,fishCount:PIXEL_FISH.length,comparisons:comparison},null,2));
