/** Virtual tackle specifications and encounter tuning, not measured product data.
 * Six-hook rigs: https://hayabusaglobal.com/products/S002AE/
 * US hook labels are authored; Japanese Sabiki sizes are NOT interchangeable.
 * Species: https://www.fisheries.noaa.gov/species/northern-anchovy
 * https://www.fisheries.noaa.gov/species/pacific-sardine
 */
export const SABIKI_ROD={id:'rod_sabiki',slot:'rod',name:'活饵竿 · 六钩 Sabiki 套装',price:120,kg:.55,desc:'7 ft 活饵竿与手动轮 · 含六枚美制 #10 仿鱼皮钩、1 oz 底坠 · 鱼群附近轻提缓收',strength:.8,retrieve:1,sensitivity:1.2,premadeRig:'sabiki6'};
export const SABIKI_ITEM={id:'rig_sabiki6',slot:'rig',name:'六钩 Sabiki 活饵钓组',price:25,kg:.06,desc:'六枚美制 #10 仿鱼皮 J 型钩 · 1 oz 底坠 · 无需另挂鱼饵',rig:'sabiki6',hooks:6};
export const SABIKI_RIG={id:'sabiki6',hookSize:'#10',hookGapMm:3.5,hookWire:'fine',hookWireStrengthN:10,hookStyle:'j',item:'rig_sabiki6',name:'六钩 Sabiki 活饵钓组',english:'Six-hook baitfish Sabiki',hooks:6,defaultWeightGrams:28,baitAboveBottom:.35,sinkFactor:.7,dragArea:.00026,snagFactor:1.45,layer:'midwater',defaultFishingDepth:4,technique:'六枚小钩分布在不同泳层；靠近饵鱼群垂直下放、锁杯轻提，持续受力即可挂鱼；缓收时其余空钩仍可中鱼。',targetSpecies:['anchovy','sardine','mackerel'],speciesBias:{blue:.5,copper:.4,halibut:.2,mackerel:2.4,lingcod:.2}};
export const SABIKI_HOOK_SPACING=.28;
export const SABIKI_FISH=Object.freeze({
 'anchovy-school':Object.freeze({name:'北方鳀鱼',commonName:'Northern Anchovy',latin:'Engraulis mordax',min:8,max:15,referenceLength:12,weight:.015,color:'#a9cccb',baitfish:true}),
 'sardine-school':Object.freeze({name:'太平洋沙丁鱼',commonName:'Pacific Sardine',latin:'Sardinops sagax',min:12,max:23,referenceLength:18,weight:.055,color:'#9fbec1',baitfish:true}),
 'mackerel-school':Object.freeze({name:'太平洋鲭鱼',commonName:'Pacific Mackerel',latin:'Scomber japonicus',min:15,max:26,referenceLength:22,weight:.12,color:'#73b8c1',baitfish:true}),
});
