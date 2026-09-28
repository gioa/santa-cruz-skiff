// Read-only UI availability, matching the retained control's shift interlocks.
// The model remains responsible for the actual outboard and trolling limits.
export function helmShiftAvailability(vessel,control){
  const rigDeployed=['flight','sinking','waiting','bite','fight'].includes(vessel.fishState);
  const active=vessel.mode==='boat'&&!vessel.standing&&!vessel.moored&&!vessel.docking&&!vessel.paused&&Boolean(vessel.canOperateHelm??vessel.fishState==='idle');
  const gear=['F','N','R'].includes(control.gear)?control.gear:'N';
  const idleThrottle=Number.isFinite(control.throttle)&&control.throttle<=.08&&(!Number.isFinite(vessel.throttle)||Math.abs(vessel.throttle)<=.08);
  const canShift=active&&gear==='N'&&idleThrottle&&Number.isFinite(vessel.speed)&&Math.abs(vessel.speed)<.8;
  const option=(target,allowed=true)=>{const current=gear===target,visible=allowed&&(current||canShift);return{visible,enabled:active&&visible,current};};
  return{active,rigDeployed,neutralizeReverse:rigDeployed&&gear==='R',
    gears:{F:option('F'),N:{visible:true,enabled:active,current:gear==='N'},R:option('R',!rigDeployed)}};
}
