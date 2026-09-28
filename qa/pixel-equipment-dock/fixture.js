// QA module also imports syncVessel and sets saved=null before constructing the simulation.
// Local-only synthetic equipment fixture; never edits the public save.
start(false);sim.state.profile.credits=1000;
Object.assign(sim.state,{playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});
const scenario=new URLSearchParams(location.search).get('scenario')||'boat';
if(scenario!=='starter')for(const id of ['nautical_chart','gps','compass','sounder','trolling_motor']){sim.buyGear(id);sim.equip(id);}
if(scenario==='boat'){sim.launchBoat();const p=FISHING_SPOTS[1];Object.assign(sim.state,{mode:'boat',launchStage:'afloat',loaded:true,boatX:p.x,boatZ:p.z,moored:false});syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});}
updateUI();
