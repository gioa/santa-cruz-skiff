import test from 'node:test';import assert from 'node:assert/strict';
import {ownedRodChoices,rodSelectionStatus} from '../dist/pixel-rod-selection.js';
test('rod picker exposes only owned rods, never store items or unknown ids',()=>{
 const profile={owned:['rod','bait','rod_light','missing'],loadout:{rod:'rod_light'}};
 assert.deepEqual(ownedRodChoices(profile).map(r=>r.id),['rod','rod_light']);
 const status=rodSelectionStatus({profile,fishState:'idle',rodMount:'port'});assert.equal(status.active.id,'rod_light');assert.equal(status.location,'左舷竿架');assert.equal(status.switchable,true);
 for(const fishState of['flight','sinking','waiting','bite','fight'])assert.equal(rodSelectionStatus({profile,fishState}).switchable,false);
 assert.equal(rodSelectionStatus({profile:{owned:['rod'],loadout:{rod:'rod'}},fishState:'idle',rodMount:'hand'}).switchable,false);
});
