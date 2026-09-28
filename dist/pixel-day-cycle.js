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

/** Restore trip time independently of save-version markers. Never add wall-clock
 * absence: the voyage is paused while the player is away. */
export function restoreTripTime(saved,fallbackDayStart){
 const nonnegative=n=>Number.isFinite(n)&&n>=0;
 const elapsed=nonnegative(saved?.elapsed)?saved.elapsed:nonnegative(saved?.time)?saved.time:0;
 const match=/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(saved?.clock||'');
 const clockSeconds=match&&Number(match[1])>=6&&Number(match[1])<=18&&Number(match[2])<60&&Number(match[3]||0)<60?(Number(match[1])-6)*3600+Number(match[2])*60+Number(match[3]||0):null;
 const gameElapsed=nonnegative(saved?.gameElapsed)?saved.gameElapsed:clockSeconds??elapsed*(Number.isFinite(saved?.timeScale)&&saved.timeScale>0?saved.timeScale:1);
 return{time:nonnegative(saved?.time)?saved.time:elapsed,elapsed,dayNumber:Number.isInteger(saved?.dayNumber)&&saved.dayNumber>0?saved.dayNumber:1,dayStartAt:typeof saved?.dayStartAt==='string'&&Number.isFinite(Date.parse(saved.dayStartAt))?saved.dayStartAt:fallbackDayStart,gameElapsed:Math.max(0,Math.min(DAY_LENGTH_SECONDS,gameElapsed))};
}
