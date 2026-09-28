import {fishFightKind} from './pixel-fish-fight.js?v=20260927-pixel-v22';

/** Mouth fit, initial purchase and wire strength are separate constraints.
 * Every dimension/force/curve here is GAME TUNING, not measured morphology,
 * fish catch percentages or a universal conversion from a US hook number.
 * Nominal hook sizes vary by manufacturer and pattern. These are properties
 * of the game's specific premade hooks; small hooks are not a big-fish ban.
 * See docs/pixel-hook-size-evidence.md for evidence and limitations.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// Calibrated effective mouth opening per cm of fish length, not survey data.
const mouthScale={rockfish:1.1,mackerel:.5,lingcod:1.6,halibut:1.3,salmon:.8,seabass:1.1,bonito:.9,croaker:.75,sanddab:.7};

export function hookSizeFit(fish={},rig={}){
 const gap=rig?.hookGapMm,wire=rig?.hookWireStrengthN;
 // Backward-compatible unspecified hooks retain the previous neutral model.
 if(!Number.isFinite(gap)||gap<=0)return{hookSize:null,mouthSpanMm:null,hookGapMm:null,mouthFit:1,purchase:1,seatChance:1,wireStrengthN:500};
 const kind=fishFightKind(fish||{}),mass=clamp(finite(fish?.kg,.6),.01,80);
 const length=clamp(finite(fish?.length,30*Math.cbrt(mass/.7)),1,300);
 const blue=/mystinus|blue|蓝岩/i.test(`${fish?.latin||''} ${fish?.name||''} ${fish?.id||''}`);
 const mouthSpanMm=length*(blue?.95:mouthScale[kind]),hookGapMm=clamp(gap,.1,100);
 const ratio=hookGapMm/mouthSpanMm;
 // Oversized hooks can still be nibbled, but cannot seat if too large to enter.
 // There is broad overlap for large-mouthed rockfish and lingcod.
 const mouthFit=1-smooth(.55,1.2,ratio);
 // A small gap reaches less tissue on a large jaw, without excluding that fish.
 const purchase=clamp(ratio/.17,.14,1),seatChance=mouthFit*(.38+.62*purchase);
 return{hookSize:typeof rig.hookSize==='string'?rig.hookSize:null,mouthSpanMm,hookGapMm,mouthFit,purchase,seatChance,wireStrengthN:clamp(finite(wire,500),1,500)};
}
