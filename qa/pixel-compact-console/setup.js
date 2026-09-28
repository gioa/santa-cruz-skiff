// Local fixture setup only; append to the production game module for UI QA.

start(false);sim.conditions.windKnots=0;sim.conditions.waveHeight=0;
Object.assign(sim.state,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,loaded:true,boatX:FISHING_SPOTS[1].x,boatZ:FISHING_SPOTS[1].z,heading:0});
syncVessel(sim.vessel,{x:sim.state.boatX,z:sim.state.boatZ,heading:0,clearMotion:true});
sim.lowerRig();sim.state.biteAt=Infinity;sim.state.snagThreshold=Infinity;
for(let i=0;i<180;i++)sim.step(.1,{});sim.setReelMode('brake');updateUI();

if(new URLSearchParams(location.search).has('fight')){sim.state.fishState='bite';sim.state.biteFish={name:'加州比目鱼',latin:'Paralichthys californicus',fightKind:'halibut',length:81.28,kg:6.1};sim.ensureBitingFish();sim.state.biteHold.canSeat=true;sim.state.biteEngagement=10;sim.state.rodLoadN=2;sim.state.lineSlackMeters=0;sim.hook({automatic:true});updateUI();}
