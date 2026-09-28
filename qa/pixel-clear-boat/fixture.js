// Synthetic static comparison: identical dawn, fog, boat position; zero bilge water.
start(false);sim.randomWeather=false;Object.assign(sim.conditions,{mode:'daily',fog:.7,cloudCover:.7,daylight:.3,rain:0,windKnots:0,waveHeight:0,swellHeight:0,windWaveHeight:0});Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',loaded:true,moored:false,boatX:HARBOR.boatX-100,boatZ:HARBOR.boatZ-150,heading:0,time:0,heave:0,roll:0,pitch:0,paused:true});sim.state.stability.waterLitres=0;updateUI();

if(new URLSearchParams(location.search).has('fight')){Object.assign(sim.state,{fishState:'fight',fish:{name:'蓝岩鱼',latin:'Sebastes mystinus',length:30,kg:.6},lineDistance:8,lureDepth:5,paidLineMeters:10,rodBend:.2,rodLoadN:5});updateUI();}
