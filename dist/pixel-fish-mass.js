import {fishSpecies} from './fish-species.js?v=species-1';
/** Whole wet mass (kg) from the game's species-specific ruler length (cm).
 * Population fits, units, length conversions and extrapolation limits:
 * docs/fish-mass-audit.md. These are typical masses, not exact wild specimens.
 */
const mean=(a,b)=>(a+b)/2;
// NOAA forage-fish GLMs use total mm / grams. Average spring and summer
// predictions, not log coefficients; encounter type must not change condition.
const forage=(L,a,b,summer)=>mean(Math.exp(a),Math.exp(a+summer))*(L*10)**b/1000;
const chinookFork=L=>Math.max(0,L<72?.957*L-.979:.969*L-1.442);
export const FISH_MASS_MODELS=Object.freeze({
 'Sebastes mystinus':L=>.000009774*(L*10)**3.09/1000,
 // PFMC 2023 §2.4.4 gives cm without a TL/FL designation. TL is an
 // explicit close-tail approximation, not an invented length conversion.
 'Sebastes caurinus':L=>mean(.0000096*L**3.19,.0000111*L**3.15),
 'Sebastes miniatus':L=>{
  const fork=.8665+.946*L; // Echeverria & Lenarz: FLmm=8.665+.946*TLmm.
  return mean(Math.exp(-11.316)*fork**3.112,Math.exp(-10.833)*fork**2.968);
 },
 // Retain the already corrected California halibut / southern lingcod fits.
 'Paralichthys californicus':L=>mean(.00000621,.00000607)*L**3.14,
 'Ophiodon elongatus':L=>mean(.000003450*L**3.2364,.000002425*L**3.3367),
 'Scomber japonicus':L=>forage(L,-12.631,3.165,.083),
 'Engraulis mordax':L=>forage(L,-12.847,3.167,.087),
 'Sardinops sagax':L=>forage(L,-12.475,3.121,.174),
 'Oncorhynchus tshawytscha':L=>.003118*chinookFork(L)**3.3641/1000,
 'Atractoscion nobilis':L=>.000015491*(L*10)**2.9216/1000,
 // Bonito is the one existing fork-length ruler; NOAA Table 23 is g / cm.
 'Sarda chiliensis lineolata':L=>.009376*L**3.08962/1000,
 'Genyonemus lineatus':L=>mean(.0109*L**3.0239,.0111*L**3.0114)/1000,
 'Citharichthys sordidus':L=>.005336*L**3.1859/1000,
});
const gramPrecision=new Set(['Engraulis mordax','Sardinops sagax','Scomber japonicus']);
export function fishMassKg(fish,lengthCm){
 const L=Number(lengthCm),id=fishSpecies(fish)?.latin||fish?.latin,model=Object.hasOwn(FISH_MASS_MODELS,id)?FISH_MASS_MODELS[id]:null;
 if(!Number.isFinite(L)||L<=0||!model)return 0;
 const kg=model(L);if(!Number.isFinite(kg)||kg<0)return 0;
 // Same species, same rounding whether it is a visible school or regular bite.
 const precision=gramPrecision.has(id)?1000:100;
 return Math.round(kg*precision)/precision;
}

// Inverse of the same monotonic species curve, for a new catch authored from
// a mass range. Existing catches without measured length are not backfilled.
export function fishLengthCmFromMass(fish,weightKg){
 const kg=Number(weightKg),id=fishSpecies(fish)?.latin||fish?.latin,model=Object.hasOwn(FISH_MASS_MODELS,id)?FISH_MASS_MODELS[id]:null;
 if(!(kg>0)||!Number.isFinite(kg)||!model)return null;
 let lo=0,hi=400;if(model(hi)<kg)return null;
 for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(model(mid)<kg)lo=mid;else hi=mid;}
 return Math.round((lo+hi)*5)/10;
}
