import test from 'node:test';
import assert from 'node:assert/strict';
import {PacificaSimulation} from '../dist/pacifica-sim.js';
import {playShoreSession,californiaSessionEpoch,summarizeShoreSessions} from '../scripts/simulate-shore-day.mjs';

test('scheduled California hours handle summer, winter and both DST boundaries explicitly',()=>{
 assert.equal(new Date(californiaSessionEpoch('2026-09-30',6)).toISOString(),'2026-09-30T13:00:00.000Z');
 assert.equal(new Date(californiaSessionEpoch('2026-01-15',6)).toISOString(),'2026-01-15T14:00:00.000Z');
 assert.throws(()=>californiaSessionEpoch('2026-03-08',2),/nonexistent/);
 assert.equal(new Date(californiaSessionEpoch('2026-11-01',1)).toISOString(),'2026-11-01T08:00:00.000Z');
 assert.throws(()=>californiaSessionEpoch('2026-02-30',6),/Invalid/);
});

// This factory tests report accounting at an exact boundary. It supplies a
// terminal engine event only in this unit test, never in experiment reports.
function terminalFixture({phase='landed',updateNumber=2}={}){
 let updates=0,instance;
 const createSimulation=options=>{
  const sim=instance=new PacificaSimulation(options),update=sim.update.bind(sim);
  sim.update=(dt,input)=>{
   update(dt,input);updates++;
   if(updates===updateNumber){
    sim.state.phase=phase;
    sim.state.fish={id:'surfperch',catchId:1,length:26,weightKg:.42,caughtDate:'2026-09-30'};
    sim.state.fightElapsed=12.5;
    if(phase==='landed')sim.state.stats.caught++;
   }
  };
  return sim;
 };
 const report=playShoreSession({profile:'pacifica-crab',seconds:.2,step:.1},{createSimulation});
 return{report,sim:instance,updates};
}

test('a landing completed by the final update is counted and released without advancing past the deadline',()=>{
 const {report,sim,updates}=terminalFixture();
 assert.equal(updates,2);assert.equal(report.seconds,.2);assert.equal(report.calendarSeconds,.2);
 assert.equal(report.landed,1);assert.equal(report.blank,false);assert.equal(report.firstLandingSeconds,.2);
 assert.deepEqual(report.species,{surfperch:1});assert.equal(report.catches.length,1);
 assert.equal(report.catches[0].fightSeconds,12.5);assert.equal(report.finalPhase,'walk');
 assert.equal(report.activeFishAtEnd,null);assert.equal(sim.state.stats.released,1);
 assert.equal(sim.state.catchHistory.length,1);assert.equal(sim.state.catchHistory[0].status,'released');
});

test('a landing processed before the deadline is not counted twice by final draining',()=>{
 const {report,sim,updates}=terminalFixture({updateNumber:1});
 assert.equal(updates,2);assert.equal(report.landed,1);assert.equal(report.firstLandingSeconds,.1);
 assert.equal(report.catches.length,1);assert.equal(sim.state.stats.released,1);
});

test('a fish still fighting at the deadline stays censored and is not promoted to a catch',()=>{
 const {report,sim,updates}=terminalFixture({phase:'fighting'});
 assert.equal(updates,2);assert.equal(report.landed,0);assert.equal(report.blank,false);assert.equal(report.zeroLandings,true);assert.equal(report.censored,true);
 assert.equal(report.firstLandingSeconds,null);assert.equal(report.finalPhase,'fighting');
 assert.equal(report.activeFishAtEnd.species,'surfperch');assert.equal(report.activeFishAtEnd.fightSeconds,12.5);
 assert.equal(sim.state.stats.released,0);assert.equal(sim.state.catchHistory.length,0);
 const summary=summarizeShoreSessions([report]);assert.equal(summary.blankSessions,0);assert.equal(summary.zeroLandingSessions,1);
 assert.equal(summary.censoredSessions,1);assert.equal(summary.activeFishAtEnd,1);assert.deepEqual(summary.censoredSpecies,{surfperch:1});
});

test('summary rates use full scheduled duration and disclose stopped time separately',()=>{
 const {report}=terminalFixture();
 const rows=[{...report,requestedSeconds:900,seconds:900,stoppedSeconds:600,stoppedReason:'bait exhausted'},
  {...report,requestedSeconds:900,seconds:900,stoppedSeconds:0,stoppedReason:null}];
 const summary=summarizeShoreSessions(rows);
 assert.equal(summary.landedPerScheduledHour,4);assert.equal(summary.scheduledSeconds,1800);
 assert.equal(summary.stoppedSeconds,600);assert.deepEqual(summary.stoppedByReason,{'bait exhausted':{sessions:1,seconds:600}});
 assert.equal('landedPerActiveHour' in summary,false);
});
