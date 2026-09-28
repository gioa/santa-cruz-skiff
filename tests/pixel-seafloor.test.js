import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {seafloor,seafloorAtGPS,seafloorAt,fishingHabitatAt}=await import('../dist/pixel-seafloor.js');
const {fromGPS}=await import('../dist/pixel-geography.js');

test('seafloor extract retains categorical USGS habitat data and provenance',()=>{
 assert.equal(seafloor.rows.length,seafloor.height);assert.ok(seafloor.rows.every(r=>r.length===seafloor.width&&/^[0-5]+$/.test(r)));
 assert.ok(seafloor.sources.every(s=>s.url.startsWith('https://cmgds.marine.usgs.gov/')&&/^[a-f0-9]{64}$/.test(s.sha256)));
 assert.equal(seafloorAtGPS(-122.0288,36.9505).kind,'reef');assert.equal(seafloorAtGPS(-122.0118,36.9585).kind,'sand');
 const p=fromGPS(-122.0118,36.9585);assert.deepEqual(seafloorAt(p.x,p.z),seafloorAtGPS(-122.0118,36.9585));
});

test('survey gaps stay unknown and a local wharf description never becomes a measured GIS cell',()=>{
 const raw=seafloorAt(-60,-80),context=fishingHabitatAt(-60,-80);
 assert.equal(raw.kind,'unknown');assert.equal(raw.mapped,false);assert.equal(context.kind,'sand');assert.equal(context.mapped,false);assert.equal(context.contextual,true);
 assert.equal(fishingHabitatAt(-35,-420).kind,'mixed','outer wharf structure can occasionally hold rock-oriented fish');
 assert.equal(fishingHabitatAt(-35,-420).contextual,true);
 for(const [lon,lat]of[[-130,30],[NaN,37],[-122,Infinity]]){const s=seafloorAtGPS(lon,lat);assert.equal(s.kind,'unknown');assert.equal(s.mapped,false);}
 assert.equal(seafloorAtGPS(-121.9845,36.9515).kind,'unknown','a named reef waypoint cannot fill a real survey gap');
});
