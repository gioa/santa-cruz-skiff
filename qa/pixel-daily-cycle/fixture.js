
// Local-only synthetic QA fixture. No production storage is touched.
start(false);const qs=new URLSearchParams(location.search),scenario=qs.get('scenario')||'late';
sim.state.profile.credits=100;
if(scenario!=='shore'){Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:HARBOR.boatX-100,boatZ:HARBOR.boatZ-150});syncVessel(sim.vessel,{x:sim.state.boatX,z:sim.state.boatZ,heading:0,clearMotion:true});}
if(scenario==='rain')sim.state.dailyWeather={...sim.state.dailyWeather,kind:'rain',cloud:1,rain:.9,windBase:18,seaBreeze:4,swellHeight:1.8};
sim.state.gameElapsed=scenario==='rain'?5*3600:11*3600+50*60;sim.state.clock=sim.clock();sim.updateDailyWeather();updateUI();
const qa=document.createElement('div');qa.style.cssText='position:fixed;top:120px;left:12px;z-index:110;display:flex;gap:4px';
for(const [label,action] of [['QA:收船',()=>{sim.state.gameElapsed=12*3600-.5;sim.state.clock=sim.clock();}],['QA:吊船',()=>{sim.state.gameElapsed=12*3600;sim.state.clock=sim.clock();sim.beginDayEnd();sim.stepDayEnd(3.1);sim.pause(true);updateUI();}],['QA:夜幕',()=>{sim.state.gameElapsed=12*3600;sim.state.clock=sim.clock();sim.beginDayEnd();sim.stepDayEnd(6.6);sim.pause(true);updateUI();}],['QA:继续',()=>sim.pause(false)]]){const b=document.createElement('button');b.textContent=label;b.style.cssText='font-size:10px;min-height:24px;padding:4px';b.onclick=action;qa.appendChild(b);}document.body.appendChild(qa);
