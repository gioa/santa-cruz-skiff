// Local QA only: a mixed cooler, insufficient credits, actual eight-second dock check.
start(false);sim.randomWeather=false;const qs=sim.state;qs.profile.credits=25;
qs.catches=[40,60].map((length,i)=>({speciesId:'california_halibut',name:'加州大比目鱼',latin:'Paralichthys californicus',catchId:'qa-'+i,length,kg:1,kept:true,caughtAt:'2026-09-27T13:00:00Z',caughtGPS:{lat:36.9505,lon:-122.0288},hookCount:1,lineCount:1,hasDescendingDevice:true,landingNetDiameterInches:20}));
sim.patrol.beginLanding(qs);updateUI();
