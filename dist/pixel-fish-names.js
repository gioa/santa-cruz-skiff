import {identifyRegulatedSpecies} from './fishing-regulations.js';
import {fishSpecies} from './fish-species.js';

// All scenes and old saved catches use the same preferred display identity.
export function fishCommonName(fish){return fishSpecies(fish)?.commonName||fish?.commonName||fish?.nameEn||'';}
export function fishDisplayName(fish){
 const name=fishSpecies(fish)?.name||(typeof fish==='string'?fish:fish?.name||fish?.latin||''),common=fishCommonName(fish);
 return common&&common.toLowerCase()!==name.toLowerCase()?`${name} · ${common}`:name;
}
