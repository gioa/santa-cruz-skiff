// Shared wear policy, independent of boat/shore inventory and rig geometry.
// Empty retrieval does not consume bait; only these fishing events wear it.
export const USABLE_CONDITION=.08;
const NATURAL=Object.freeze({bite:.15,catch:1,escape:.28});
const SOFT=Object.freeze({bite:.025,catch:.23,escape:.14});
export function wearFishingSupply(supply,event){
 if(!supply)return;
 if(supply.bait){const policy=supply.bait.kind==='jig'?SOFT:NATURAL;const loss=Object.hasOwn(policy,event)?policy[event]:0;supply.bait.condition=Math.max(0,supply.bait.condition-loss);}
 if(event==='catch')supply.condition=Math.max(0,supply.condition-.025);
}
