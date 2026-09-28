// Served by the local Playwright route only; never imported by the game.
window.shoreQA={sim,start,setup({pier=false,x=2440,power=.65}={}){
 closeDialog();sim.clearLine();sim.state.inspection=null;inspectionId=null;sim.state.onPier=false;sim.state.pierExposure=0;
 sim.rng=()=>.12;sim.state.rodSupplies[sim.state.activeRod]={id:'carolina_rig',condition:1,bait:{kind:'sandcrab',condition:1}};
 if(pier){Object.assign(sim.state.player,scene.pier.gate);sim.enterPier();Object.assign(sim.state.player,scene.pier.tip);}
 else Object.assign(sim.state.player,{x,y:scene.shoreY(x)+57});
 const result=sim.cast({power,aim:.25});if(!result.ok)throw new Error(result.message);
 for(let i=0;i<240&&sim.state.phase!=='bite';i++)sim.update(.25);
 if(sim.state.phase!=='bite')throw new Error('Fixture did not reach bite');
}};
