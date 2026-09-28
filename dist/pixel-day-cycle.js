export const DAY_CLOSE_HOUR=18;
export const DAY_LENGTH_SECONDS=(DAY_CLOSE_HOUR-6)*3600;
export const DAY_TRANSITION_SECONDS=10;
export const TOW_FEE=50; // Virtual credits, not a real Santa Cruz tow rate.
export function dayTransitionVisual(t){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const elapsed=clamp(t?.elapsed||0,0,10);
 // Covered cut to harbor, visible reverse hoist, night, then a readable dawn.
 const shade=elapsed<1.2?elapsed/1.2:elapsed<2?1-(elapsed-1.2)/.8:elapsed<4.8?0:elapsed<6?(elapsed-4.8)/1.2:elapsed<7.5?1:1-(elapsed-7.5)/2.5;
 return{shade:clamp(shade,0,1),phase:elapsed<1.2?(t?.rescue?'救援返港':t?.late?'拖回码头':'收船'):elapsed<4.8?'收船上岸':elapsed<7.5?'夜幕降临':'次日 · 06:00',progress:elapsed/10};
}
