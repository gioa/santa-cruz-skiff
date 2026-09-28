/** Whole wet mass in kg, length in cm. Empirical fits and approximation limits
 * are recorded in docs/fish-mass-motion.md; never use a size-range midpoint. */
export function fishMassKg(fish,lengthCm){
 const L=Number(lengthCm);if(!Number.isFinite(L)||L<=0)return 0;
 const id=fish.latin||'';let kg;
 if(id==='Ophiodon elongatus'){
  // PFMC 2021 southern assessment, §2.3.4. Sex-averaged fork-length fits.
  // Lingcod TL and FL are similar; TL is retained for the game's legal ruler.
  kg=(.000003450*L**3.2364+.000002425*L**3.3367)/2;
 }else if(id==='Paralichthys californicus'){
  // CDFW 2024 assessment Table 12: both sexes, whole kg / total cm.
  kg=(.00000621+.00000607)/2*L**3.14;
 }else{
  // Existing documented reference specimens, not fitted population equations.
  const reference=Number(fish.referenceLength),mass=Number(fish.weight);
  if(!(reference>0&&mass>0))return 0;
  kg=mass*(L/reference)**2.7;
 }
 const precision=fish.baitfish?1000:100;return Math.round(kg*precision)/precision;
}
