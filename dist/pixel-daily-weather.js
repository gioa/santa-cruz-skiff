// Monterey Bay inspired, seeded game weather; these are NOT live observations.
// Wind-from bearings and swell-from bearings are independent. SI wave heights.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
export function weatherRandom(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function generateDailyWeather(seed,day=1,month=9){
 const r=weatherRandom((seed>>>0)^Math.imul(day,2654435761)),winter=month<=3||month>=11,storm=r()<(winter?.2:.035),fog=!storm&&r()<(month>=5&&month<=10?.5:.25);
 return{version:1,seed:seed>>>0,day,kind:storm?'rain':fog?'fog':r()<.45?'cloud':'sun',windBase:storm?12+r()*7:2+r()*5,seaBreeze:storm?2+r()*4:3+r()*8,windDirection:storm?165+r()*65:270+r()*60,swellHeight:storm?1.2+r()*1.2:.25+r()*(winter?1.45:1),swellPeriod:7+r()*9,swellDirection:r()<.25?180+r()*30:275+r()*40,cloud:storm?.85+r()*.15:fog?.7:.1+r()*.5,rain:storm?.35+r()*.6:0,waterTemp:11+r()*5,phase:r()*Math.PI*2};
}
export function dailyConditions(day,gameElapsed=0,realSeconds=0){
 const hour=6+gameElapsed/3600,afternoon=Math.max(0,Math.sin((hour-8)/12*Math.PI)),gust=1+.09*Math.sin(realSeconds*.37+day.phase)+.05*Math.sin(realSeconds*.11),windKnots=(day.windBase+day.seaBreeze*afternoon)*gust;
 const fog=day.kind==='fog'?clamp((11-hour)/5,0,1)*.7:0,rain=day.rain*(.65+.35*Math.sin(hour*.7+day.phase)**2),windWaveHeight=clamp((windKnots-3)*.042,0,1.1);
 return{mode:'daily',label:rain>.15?'阵雨':fog>.12?'海雾':day.cloud>.5?'多云':'晴间多云',windKnots,windDirection:day.windDirection+Math.sin(hour*.45)*8,waveHeight:Math.hypot(day.swellHeight,windWaveHeight),swellHeight:day.swellHeight,period:day.swellPeriod,waveDirection:day.swellDirection,windWaveHeight,windWavePeriod:2.5+windKnots*.09,cloudCover:day.cloud,fog,rain,waterTemp:day.waterTemp,daylight:clamp(Math.sin((hour-5)/15*Math.PI),.3,1),fresh:false};
}
export function sampleDailyWater(x,z,time,c={}){
 const wave=(height,period,from,phase=0)=>{if(!height)return 0;const a=(134-(from??300))*Math.PI/180,p=Math.max(2,period||9),w=2*Math.PI/p,k=w*w/9.81;return height*.35*Math.sin(k*(x*Math.sin(a)+z*Math.cos(a))-w*time+phase);};
 return wave(c.swellHeight??c.waveHeight,c.period,c.waveDirection)+wave(c.windWaveHeight,c.windWavePeriod,c.windDirection,1.7);
}
// Pixel weather accents share the same conditions as the hull and line solver.
export function drawWeatherOverlay(ctx,width,height,c={},time=0,{layer='all'}={}){
 const atmosphere=layer!=='rain',precipitation=layer!=='atmosphere';
 ctx.save();if(atmosphere&&c.cloudCover){ctx.fillStyle=`rgba(35,55,71,${c.cloudCover*.1})`;ctx.fillRect(0,0,width,height);}
 if(atmosphere&&c.daylight<.55){ctx.fillStyle=`rgba(200,118,69,${(.55-c.daylight)*.23})`;ctx.fillRect(0,0,width,height);}
 if(atmosphere&&c.fog){ctx.fillStyle=`rgba(216,227,216,${c.fog*.42})`;ctx.fillRect(0,0,width,height);for(let i=0;i<5;i++){ctx.fillStyle=`rgba(227,234,224,${c.fog*.075})`;ctx.fillRect(((time*3+i*width*.31)%(width*1.4))-width*.4,height*(i*.18),width*.8,28);}}
 if(precipitation&&c.rain){const a=(134-c.windDirection)*Math.PI/180,dx=Math.sin(a)*c.windKnots*.16;ctx.strokeStyle=`rgba(207,231,220,${.2+c.rain*.2})`;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<Math.round(70*c.rain);i++){const x=((i*97+time*dx*6)%width+width)%width,y=(i*53+time*160)%height;ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(x+dx),Math.round(y+6));}ctx.stroke();}ctx.restore();
}
