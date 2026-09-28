import {identifyRegulatedSpecies} from './fishing-regulations.js?v=20260927-pixel-v37';

// Resolve old catches too, without changing the Chinese identity used by saves,
// rewards and species rules. The species catalogue supplies the common names.
export function fishCommonName(fish){
 const species=identifyRegulatedSpecies(fish);
 const name=species?.names.find(name=>/^[a-z]/i.test(name));
 return name?name.replace(/\b[a-z]/g,c=>c.toUpperCase()):fish?.commonName||'';
}
export function fishDisplayName(fish){
 const name=typeof fish==='string'?fish:fish?.name||fish?.latin||'',common=fishCommonName(fish);
 return common&&common.toLowerCase()!==name.toLowerCase()?`${name} · ${common}`:name;
}
