// Isolated QA fixture. The visible controls below call the production hold/release binding.
start(false);const p=FISHING_SPOTS[3],s=sim.state;
Object.assign(s,{mode:'boat',rentalPaid:true,launchStage:'afloat',moored:false,rodMount:'hand',fishState:'fight',reelMode:'brake',rodElevation:24,rodAzimuth:70,boatX:p.x,boatZ:p.z,heading:0,drag:.65,paidLineMeters:13,lureDepth:10,lineSlackMeters:0,fish:{name:'加州比目鱼',latin:'Paralichthys californicus',fightKind:'halibut',length:81.28,kg:6.1},paused:false});
syncVessel(sim.vessel,{x:p.x,z:p.z,heading:0,clearMotion:true});s.rodTip=rodTipPosition(s);s.bobber={x:s.rodTip.x,z:s.rodTip.z,height:s.rodTip.height-13};s.fishFight=createFishFight(s.fish,.5);s.hookHold=createHookHold(s.fish,getRigProfile(s.rig),.5);s.hookHold.threshold=Infinity;
const panel=document.createElement('div');panel.style='position:fixed;top:110px;right:10px;z-index:55;display:flex;gap:4px';panel.innerHTML='<button id="qa-hold" style="padding:10px">测试：按住拉杆</button><button id="qa-release" style="padding:10px">测试：松手</button>';document.body.append(panel);
document.querySelector('#qa-hold').onclick=()=>{focusRod.setHeld(true);};
document.querySelector('#qa-release').onclick=()=>{focusRod.setHeld(false);};
updateUI();
