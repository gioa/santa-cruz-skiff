import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('NOAA CSV ingestion rejects missing/outlier/future cells and picks nearest valid cell at latest hour',()=>{
 const result=execFileSync('python3',['-c',`
import sys,datetime,json
sys.path.insert(0,'scripts')
from surface_current import parse_surface_current
raw='time,latitude,longitude,water_u,water_v\\nUTC,degrees_north,degrees_east,m s-1,m s-1\\n2026-09-27T11:00:00Z,36.94,-122.02,NaN,NaN\\n2026-09-27T11:00:00Z,36.93,-122.02,.1,.2\\n2026-09-27T11:00:00Z,36.90,-122.02,.4,.5\\n2026-09-27T10:00:00Z,36.94,-122.02,.6,.7\\n2026-09-28T11:00:00Z,36.94,-122.02,.8,.9\\n2026-09-27T11:00:00Z,36.94,-122.02,-327.67,-327.67\\n'
now=datetime.datetime(2026,9,27,12,tzinfo=datetime.timezone.utc)
sample=parse_surface_current(raw,now)
try:parse_surface_current('time,latitude,longitude,water_u,water_v\\nUTC,degrees_north,degrees_east,m s-1,m s-1\\n',now)
except ValueError:sample['missingRejected']=True
print(json.dumps(sample))
`],{encoding:'utf8'});
 const s=JSON.parse(result);assert.equal(s.eastMps,.1);assert.equal(s.northMps,.2);assert.equal(s.missingRejected,true);assert.ok(s.distanceKm<2);
});
