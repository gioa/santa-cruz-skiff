import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.fetch=async url=>new Response(await readFile(url));
const {depthContours,chartProjection,chartMeters,chartGPS,zoomChart,chartSample}=await import('../dist/pixel-chart-data.js');
const {bathymetry,elevationAtGPS}=await import('../dist/bathymetry.js');
const {depthInfoAt}=await import('../dist/bathymetry.js');
const {fromGPS}=await import('../dist/pixel-geography.js');
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('chart uses equal metre scale on both axes, true north up, and reversible GPS projection',()=>{
 for(const [w,h]of[[350,390],[600,390],[700,240]]){
  const view={x:450,y:-210,mpp:12},p=chartProjection(view,w,h),c=chartGPS(450,-210),n=chartGPS(450,-110),e=chartGPS(550,-210),a=p.screen(c.lon,c.lat);
  close(a.x,w/2);close(a.y,h/2);close(p.screen(e.lon,e.lat).x-a.x,100/12);close(a.y-p.screen(n.lon,n.lat).y,100/12);
  const g=p.gps(60,90),q=p.screen(g.lon,g.lat);close(q.x,60);close(q.y,90);
  const z=zoomChart(view,.5,{x:60,y:90},w,h),same=chartProjection(z,w,h).gps(60,90);close(g.lon,same.lon);close(g.lat,same.lat);
 }
});
test('10 ft contour is interpolated at 3.048 m with correct south-to-north rows',()=>{
 const grid={width:2,height:2,west:0,east:1,south:0,north:1,values:[0,-10,0,-10]};
 const segments=depthContours(grid,[10]).get(10);assert.equal(segments.length,1);for(const p of segments[0])close(p.lon,.3048);
 grid.values=[0,0,-10,-10];for(const p of depthContours(grid,[10]).get(10)[0])close(p.lat,.3048);
});
test('NoData never invents contours, and saddle cells produce two finite non-crossing branches',()=>{
 const grid={width:2,height:2,west:0,east:1,south:0,north:1,values:[null,-10,-10,-20]};assert.equal(depthContours(grid,[10,20]).get(10).length,0);
 grid.values=[0,-10,-10,0];const lines=depthContours(grid,[10]).get(10);assert.equal(lines.length,2);
 for(const line of lines)for(const p of line)assert.ok(Number.isFinite(p.lon)&&Number.isFinite(p.lat)&&p.lon>=0&&p.lon<=1&&p.lat>=0&&p.lat<=1);
});
test('real NOAA contour vertices reproduce the original grid depth, never the 12 m simulation fallback',()=>{
 const lines=depthContours(bathymetry,[20,40,60,80,100,120]);
 for(const [ft,segments]of lines){assert.ok(segments.length>0,`${ft} ft`);for(let i=0;i<segments.length;i+=Math.max(1,Math.floor(segments.length/30)))for(const p of segments[i])close(-elevationAtGPS(p.lon,p.lat)/.3048,ft,.001);}
});
test('chart, fishing and sounder share the same real samples while bottom gaps remain independent of depth',()=>{
 for(const [lon,lat,kind]of[[-122.0288,36.9505,'reef'],[-122.0118,36.9585,'sand'],[-121.9845,36.9515,'unknown']]){
  const s=chartSample(lon,lat),p=fromGPS(lon,lat);assert.equal(s.land,false);assert.equal(s.bed.kind,kind);close(s.depthMeters,depthInfoAt(p.x,p.z).value);assert.equal(s.datum,'MHW');
 }
 const outside=chartSample(-123,36);assert.equal(outside.depthMeters,null);assert.equal(outside.bed.mapped,false);
 const land=chartSample(-122.023,36.98);assert.equal(land.land,true);assert.equal(land.depthMeters,null);
});
