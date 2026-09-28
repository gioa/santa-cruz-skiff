
// LOCAL QA fixture only: fresh synthetic profile, no public save edited.
start(false);sim.state.profile.credits=1000;
Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
const scenario=new URLSearchParams(location.search).get('scenario')||'shop';
if(scenario==='shop'){openGear('shop','other','nautical_chart');}
else {for(const id of (scenario==='paper'?['nautical_chart']:scenario==='gps'?['gps']:scenario==='motor'?['trolling_motor']:['nautical_chart','gps','trolling_motor'])){sim.buyGear(id);sim.equip(id);}
sim.launchBoat();const p=FISHING_SPOTS[1];Object.assign(sim.state,{mode:'boat',launchStage:'afloat',loaded:true,boatX:p.x,boatZ:p.z,moored:false});syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});updateUI();}
