// Display conversions only. Physics and saved measurements retain their source
// units (SI, with NOAA wind in knots); US customary units are used in the UI.
const convert=(value,factor,offset=0)=>Number.isFinite(value)?value*factor+offset:NaN;
export const metersToFeet=meters=>convert(meters,1/.3048);
export const cmToInches=cm=>convert(cm,1/2.54);
export const kgToPounds=kg=>convert(kg,1/.45359237);
export const gramsToOunces=grams=>convert(grams,1/28.349523125);
export const metersToMiles=meters=>convert(meters,1/1609.344);
export const mpsToMph=mps=>convert(mps,3600/1609.344);
export const knotsToMph=knots=>convert(knots,1852/1609.344);
export const celsiusToFahrenheit=celsius=>convert(celsius,9/5,32);

export function formatNumber(value,decimals=1){
 const precision=Number.isInteger(decimals)?Math.max(0,Math.min(3,decimals)):1;
 return Number.isFinite(value)?value.toFixed(precision):'—';
}
const reading=(value,unit,decimals)=>`${formatNumber(value,decimals)} ${unit}`;

// Reverse motion reports speed magnitude; the lever separately shows the gear.
export const formatSpeed=(mps,decimals=1)=>reading(Math.abs(mpsToMph(mps)),'mph',decimals);
export const formatWind=(knots,decimals=1)=>reading(Math.max(0,knotsToMph(knots)),'mph',decimals);
export const formatDepth=(meters,decimals=1)=>reading(metersToFeet(meters),'ft',decimals);
export const formatLength=(cm,decimals=1)=>reading(cmToInches(cm),'in',decimals);
export const formatWeight=(kg,decimals=2)=>reading(kgToPounds(kg),'lb',decimals);
export const formatSinker=(grams,decimals=2)=>reading(gramsToOunces(grams),'oz',decimals);
export const formatDistance=(meters,decimals=2)=>reading(metersToMiles(meters),'mi',decimals);
export const formatTemperature=(celsius,decimals=1)=>reading(celsiusToFahrenheit(celsius),'°F',decimals);

// Old saves contain rendered catch notes. Convert that known note format only,
// without rewriting their source measurements or unrelated journal entries.
export const formatLegacyCatchNote=text=>String(text).replace(/(\d+(?:\.\d+)?) cm \/ (\d+(?:\.\d+)?) kg/g,(_,length,weight)=>`${formatLength(Number(length))} / ${formatWeight(Number(weight))}`);
