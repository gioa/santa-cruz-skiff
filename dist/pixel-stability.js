/** Tuned open-skiff stability, SI units. Hull coefficients are game estimates,
 * not measured GZ curves or operating limits. Integrate in active REAL seconds. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const RESCUE_FEE=50;
export const HOSPITAL_FEE=250; // Fictional game credits; not a medical cost estimate.
export function createStability(saved={}){return {waterLitres:0,sloshing:0,overturnSeconds:0,capsized:false,ingressLps:0,impact:0,...saved};}
export function rightingArm(angle,waterLitres=0,payloadKg=0){
 const wet=clamp(waterLitres/220,0,1),gm=Math.max(.08,.62-wet*.49-payloadKg*.00065),limit=(105-wet*42)*Math.PI/180;
 return gm*Math.sin(angle)*(Math.cos(angle)-Math.cos(limit))/(1-Math.cos(limit));
}
export function stepStability(v,{dt,water,mass,crewKg=82,payloadKg=0,crewX=0,bailing=false,windSide=0}){
 const s=v.stability??=createStability(),h=dt;if(!h||s.capsized)return;
 const relative=v.roll-water.roll,wet=clamp(s.waterLitres/220,0,1),inertia=mass*.43+145+s.waterLitres*.8;
 s.sloshing+=(Math.sin(relative)-s.sloshing)*(1-Math.exp(-h*2));
 // Nonlinear righting moment changes sign beyond the vanishing-stability angle.
 const righting=mass*9.81*rightingArm(relative,s.waterLitres,payloadKg);
 const windMoment=1.225*.65*windSide*Math.abs(windSide),turnMoment=-mass*v.speed*v.yawRate*.045;
 const sloshMoment=s.waterLitres*9.81*.3*s.sloshing;
 v.rollRate+=(-righting-crewKg*9.81*crewX+windMoment+turnMoment+sloshMoment-(440+mass*.6)*v.rollRate)/inertia*h;
 v.rollRate=clamp(v.rollRate,-2.8,2.8);v.roll=clamp(v.roll+v.rollRate*h,-Math.PI,Math.PI);
 // Both gunwales follow the sampled local surface. Green water only enters
 // when water actually overtops a rim; high smooth swell alone isn't failure.
 // Heave already includes displacement from payload and shipped water.
 const freeboard=.42,side=.86*Math.abs(Math.sin(v.roll)-Math.tan(water.roll)*Math.cos(v.roll));
 const immersion=water.height-v.y-freeboard*Math.cos(v.roll)+side;
 const ingress=38*Math.max(0,immersion)**1.5;
 s.ingressLps=ingress;s.impact=Math.min(1,ingress/12);
 s.waterLitres=clamp(s.waterLitres+(ingress-(bailing?1.4:0))*h,0,500);
 // Sustained beyond-beam immersion, not a single noisy angle sample.
 const lost=Math.abs(v.roll)>Math.PI/2||s.waterLitres>390;
 s.overturnSeconds=lost?s.overturnSeconds+h:Math.max(0,s.overturnSeconds-h*2);
 if(s.overturnSeconds>.65)s.capsized=true;
}
