// Cross-scene biological identity. Encounter ranges, fight tuning, local rules
// and rewards belong to their own systems. Chinese common names are editorial
// labels; scientific names and stable species IDs disambiguate regional aliases.
// Sources and migration policy: docs/shared-fish-species.md.
const records=[
 ['blue_rockfish','蓝岩鱼','Blue Rockfish','Sebastes mystinus','blue',[]],
 ['copper_rockfish','铜岩鱼','Copper Rockfish','Sebastes caurinus','copper',[]],
 ['vermilion_rockfish','朱红岩鱼','Vermilion Rockfish','Sebastes miniatus','vermilion',['红岩鱼']],
 ['black_rockfish','黑岩鱼','Black Rockfish','Sebastes melanops','rockfish',[]],
 ['california_halibut','加州大比目鱼','California Halibut','Paralichthys californicus','halibut',['加州比目鱼','加州牙鲆']],
 ['pacific_mackerel','太平洋鲭鱼','Pacific Mackerel','Scomber japonicus','mackerel',['pacific chub mackerel']],
 ['lingcod','长蛇齿单线鱼','Lingcod','Ophiodon elongatus','lingcod',['灵鳕']],
 ['chinook_salmon','帝王鲑','Chinook Salmon','Oncorhynchus tshawytscha','salmon',['奇努克鲑','king salmon']],
 ['white_seabass','白海鲈','White Seabass','Atractoscion nobilis','seabass',['白海鲈鱼','白鲈','wsb']],
 ['pacific_bonito','太平洋狐鲣','Pacific Bonito','Sarda chiliensis lineolata','bonito',['Sarda chiliensis','Sarda lineolata','太平洋鲣']],
 ['white_croaker','白石首鱼','White Croaker','Genyonemus lineatus','croaker',[]],
 ['pacific_sanddab','太平洋沙鲽','Pacific Sanddab','Citharichthys sordidus','sanddab',[]],
 ['northern_anchovy','北方鳀鱼','Northern Anchovy','Engraulis mordax','anchovy',['鳀鱼']],
 ['pacific_sardine','太平洋沙丁鱼','Pacific Sardine','Sardinops sagax','sardine',['沙丁鱼']],
 ['redtail_surfperch','红尾海鲫','Redtail Surfperch','Amphistichus rhodoterus','surfperch',[]],
 ['striped_bass','条纹鲈','Striped Bass','Morone saxatilis','striped_bass',[]],
 // Distinct known identities without encounter art remain unknown silhouettes.
 ['barred_surfperch','银双齿海鲫','Barred Surfperch','Amphistichus argenteus',null,[]],
 ['sunset_rockfish','夕阳岩鱼','Sunset Rockfish','Sebastes crocotulus',null,[]],
 ['yelloweye_rockfish','黄眼岩鱼','Yelloweye Rockfish','Sebastes ruberrimus',null,[]],
 ['quillback_rockfish','刺背岩鱼','Quillback Rockfish','Sebastes maliger',null,[]],
 ['cowcod','牛岩鱼','Cowcod','Sebastes levis',null,[]],
 ['bronzespotted_rockfish','铜斑岩鱼','Bronzespotted Rockfish','Sebastes gilli',null,[]],
];
export const FISH_SPECIES=Object.freeze(records.map(([id,name,commonName,latin,artKind,aliases])=>Object.freeze({id,name,commonName,latin,artKind,aliases:Object.freeze(aliases)})));
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
const byIdentity=new Map();
for(const f of FISH_SPECIES)for(const name of[f.id,f.name,f.commonName,f.latin,f.artKind,...f.aliases])if(name)byIdentity.set(normalize(name),f);
const ambiguousGroups=new Set(['rockfish','surfperch','halibut','salmon','mackerel','seabass','bonito']);
export function fishSpecies(value){
 const f=typeof value==='string'?{name:value}:value||{};
 // Explicit biological IDs are authoritative, even when not yet catalogued.
 // Never turn a Pacific halibut into a California halibut via a stale label.
 for(const value of[f.latin,f.scientificName,f.speciesId])if(String(value??'').trim())return byIdentity.get(normalize(value))||null;
 // Short old engine IDs are accepted only as IDs, not as family/group names.
 if(f.id){const match=byIdentity.get(normalize(f.id));if(match)return match;}
 for(const value of[f.name,f.commonName,f.nameEn]){
  for(const part of String(value??'').split('·')){const key=normalize(part);if(ambiguousGroups.has(key))continue;const match=byIdentity.get(key);if(match)return match;}
 }
 return null;
}
export function normalizeFishIdentity(value){
 const fish=typeof value==='string'?{name:value}:value||{},species=fishSpecies(fish);
 return species?{...fish,speciesId:species.id,name:species.name,commonName:species.commonName,nameEn:species.commonName,latin:species.latin}:{...fish};
}
export function fishSpeciesKey(fish){return fishSpecies(fish)?.id||normalize(typeof fish==='string'?fish:fish?.latin||fish?.scientificName||fish?.speciesId||fish?.id||fish?.name||'');}
