// Display boundaries only: vessel physics remains in m/s; NOAA wind input is
// recorded in knots. A nautical mile is exactly 1,852 metres.
export function knotsToMps(knots){return Number.isFinite(knots)?knots*1852/3600:NaN;}
export function mpsToKmh(mps){return Number.isFinite(mps)?mps*3.6:NaN;}

function reading(value,unit,decimals){
 const precision=Number.isInteger(decimals)?Math.max(0,Math.min(3,decimals)):1;
 return `${Number.isFinite(value)?value.toFixed(precision):'—'} ${unit}`;
}

// Reverse motion still reports the magnitude of vessel speed; the gear lever
// separately identifies forward/reverse. Wind speed cannot be negative.
export function formatSpeed(mps,decimals=1){return reading(Math.abs(mpsToKmh(mps)),'km/h',decimals);}
export function formatWind(knots,decimals=1){return reading(Math.max(0,knotsToMps(knots)),'m/s',decimals);}
