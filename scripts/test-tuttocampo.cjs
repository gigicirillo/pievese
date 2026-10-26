'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {dateFromLabel,kickoffUTC,upcoming,validateStandings}=require('./update-tuttocampo.cjs');
test('Italian fixture dates follow source years across New Year',()=>{
 assert.equal(dateFromLabel('Dom. 1 novembre','1|11|2026'),'2026-11-01');
 assert.equal(dateFromLabel('Dom. 3 gennaio','3|1|2027'),'2027-01-03');
 assert.throws(()=>dateFromLabel('31 febbraio','28|2|2027'));
});
test('Rome kickoff handles winter and summer time',()=>{
 assert.equal(kickoffUTC('2026-11-01','14:30'),'2026-11-01T13:30:00.000Z');
 assert.equal(kickoffUTC('2026-09-20','15:00'),'2026-09-20T13:00:00.000Z');
 assert.equal(kickoffUTC('2026-11-01','--'),null);
});
test('Only the nearest unplayed Pievese fixture is selected',()=>{
 const fixture=(id,date,unplayed=true,homeId='770503')=>({sourceUrl:id,date:date.slice(0,10),kickoff:date,unplayed,homeId,awayId:'1'});
 const rows=[fixture('past','2026-10-25T14:00:00Z'),fixture('later','2026-11-08T13:30:00Z'),fixture('next','2026-11-01T13:30:00Z'),fixture('played','2026-10-29T13:30:00Z',false),fixture('other','2026-10-30T13:30:00Z',true,'2')];
 assert.equal(upcoming(rows,new Date('2026-10-26T08:00:00Z')).sourceUrl,'next');
 assert.equal(upcoming(rows,new Date('2026-12-01T08:00:00Z')),null);
});
test('Incomplete or incoherent standings cannot replace saved data',()=>{
 const rows=Array.from({length:16},(_,i)=>({position:i+1,teamId:i===9?'770503':String(i+1),team:i===9?'Pievese':'Squadra '+i,points:10,played:8,wins:2,draws:4,losses:2,goalsFor:10,goalsAgainst:8,goalDifference:2}));
 assert.equal(validateStandings(rows).length,16);
 assert.throws(()=>validateStandings(rows.slice(0,5)));
 assert.throws(()=>validateStandings(rows.map((r,i)=>i===0?{...r,played:9}:r)));
 assert.throws(()=>validateStandings(rows.map(r=>({...r,teamId:'1'}))));
});
