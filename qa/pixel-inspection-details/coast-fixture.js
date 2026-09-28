// Local QA only: enter through the actual gate and trigger the existing patrol.
sim.state.credits=25;sim.state.catches=[{id:'surfperch',name:'红尾海鲫',catchId:91,weightKg:.8},{id:'halibut',name:'加州比目鱼',catchId:92,weightKg:2}];
Object.assign(sim.state.player,sim.scene.pier.gate);sim.enterPier();sim.random=()=>0;sim.checkPier(30);start();
