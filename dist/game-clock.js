// One game clock for every destination: game time runs at ten times active
// real time. Physics (waves, fish motion, casting) stays in real seconds; only
// the calendar, time of day and tides use game time.
export const GAME_TIME_SCALE=10;
export const DAY_START_HOUR=6;
export const gameSeconds=realSeconds=>Math.max(0,Number.isFinite(realSeconds)?realSeconds:0)*GAME_TIME_SCALE;
// Minutes since midnight on the first trip day (06:00 start), not wrapped.
export const gameMinutesOfTrip=realSeconds=>DAY_START_HOUR*60+gameSeconds(realSeconds)/60;
export function formatGameClock(realSeconds){
 const minutes=Math.floor(gameMinutesOfTrip(realSeconds));
 return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
// Calendar instant for a trip that started at 06:00 UTC-labelled local time on `date`.
export const gameCalendar=(date,realSeconds)=>new Date(Date.parse(date+'T06:00:00Z')+gameSeconds(realSeconds)*1000);
