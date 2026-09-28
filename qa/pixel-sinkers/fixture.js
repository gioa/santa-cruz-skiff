// Local QA only; no user saves and no QA controls in the published game.
start(false);const q=sim.state;Object.assign(q,{mode:'walk',playerX:HARBOR.counterX,playerZ:HARBOR.counterZ});q.profile.credits=500;sim.buyGear('sinker_8oz');sim.buyGear('rig_feather40');openGear('rig','all','rod');
