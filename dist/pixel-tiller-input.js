/** Pure touch geometry for an outboard tiller, not a steering wheel/joystick.
 * The engine pivot is below the handle; neutral points up the screen. Positive
 * handle angle means moving the grip to the right. vessel-physics steer +1
 * turns the bow to port under forward propulsion, so DO NOT invert that sign.
 * Gear selection and release/cancel behaviour belong to the controller.
 */
export const TILLER_MAX_ANGLE=35*Math.PI/180;
export const THROTTLE_TWIST_SWEEP=100*Math.PI/180;
export const TILLER_SOURCES=Object.freeze([
 Object.freeze({
  title:'Honda BF5A Owner’s Manual',
  url:'https://cdn.powerequipment.honda.com/marine/pdf/manuals/00X31ZV16630.pdf',
  pages:'Printed pages 15, 33–34 (PDF pages 17, 35–36)',
  basis:'Separate twist throttle, throttle friction, and F/N/R lever. Reduce throttle to SLOW before shifting. Move the tiller opposite the desired forward turn. Steering friction can hold a course.',
 }),
]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const positive=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:fallback;
const unit=value=>clamp(finite(value),0,1);

/** dx/dy are CSS-pixel offsets from the engine pivot (right/down positive).
 * x/y are the rendered handle tip, still relative to that pivot. The 35-degree
 * stop and touch dead radius are game UI tuning, not Honda specifications.
 * length changes visual geometry, never engine power or vessel turn physics.
 */
export function tillerFromPointer(dx,dy,{length=84,maxAngle=TILLER_MAX_ANGLE,deadRadius=3}={}){
 const arm=positive(length,84),limit=clamp(positive(maxAngle,TILLER_MAX_ANGLE),Math.PI/180,Math.PI/2);
 const dead=clamp(finite(deadRadius,3),0,arm*.3);
 const valid=Number.isFinite(dx)&&Number.isFinite(dy);
 // A finger moving behind the engine cannot rotate the arm through it. Its
 // horizontal side selects the nearest steering stop; directly below is 0.
 const angle=valid&&Math.hypot(dx,dy)>dead?clamp(Math.atan2(dx,Math.max(0,-dy)),-limit,limit):0;
 return{angle,angleDegrees:angle*180/Math.PI,steer:angle/limit,x:Math.sin(angle)*arm,y:-Math.cos(angle)*arm};
}

/** Relative grip motion only. Capture startValue on pointerdown; delta=0
 * preserves it exactly. Positive delta increases power. For an upward drag,
 * the controller supplies startClientY-currentClientY. Never use absolute Y.
 */
export function throttleFromDrag(startValue,delta,{travel=100,invert=false}={}){
 return unit(unit(startValue)+finite(delta)/positive(travel,100)*(invert?-1:1));
}

/** Relative twist in radians, from the same fixed pointerdown angle. Angles
 * may come from atan2(screenY-centreY, screenX-centreX), where clockwise is
 * positive. The shortest arc avoids a jump when crossing the -PI/PI seam.
 * This is a limited-travel throttle; each gesture spans less than 180 degrees.
 */
export function throttleFromTwist(startValue,startAngle,currentAngle,{sweep=THROTTLE_TWIST_SWEEP,invert=false}={}){
 if(!Number.isFinite(startAngle)||!Number.isFinite(currentAngle))return unit(startValue);
 const difference=currentAngle-startAngle,delta=Math.atan2(Math.sin(difference),Math.cos(difference));
 return throttleFromDrag(startValue,delta,{travel:positive(sweep,THROTTLE_TWIST_SWEEP),invert});
}
