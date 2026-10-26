#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const SOURCE = 'https://www.tuttocampo.it/Umbria/PrimaCategoria/GironeB/Risultati';
const BASE = SOURCE.replace(/Risultati$/, '');
const TEAM_ID = '770503';
const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
function dateFromLabel(label, range) {
  const match = clean(label).toLowerCase().match(/(\d{1,2})\s+([a-zà]+)/);
  const anchors = [...range.matchAll(/(\d{1,2})\|(\d{1,2})\|(\d{4})/g)].map(m=>({day:+m[1],month:+m[2],year:+m[3]}));
  if (!match || !anchors.length) throw new Error('Data Tuttocampo non riconosciuta: ' + label);
  const day = +match[1], month = MONTHS.indexOf(match[2]) + 1;
  if (!month) throw new Error('Mese non riconosciuto');
  const years = [...new Set(anchors.flatMap(a=>[a.year-1,a.year,a.year+1]))];
  const candidates = years.map(year=>({year,time:Date.UTC(year,month-1,day)}));
  candidates.sort((a,b)=>Math.min(...anchors.map(d=>Math.abs(a.time-Date.UTC(d.year,d.month-1,d.day))))-Math.min(...anchors.map(d=>Math.abs(b.time-Date.UTC(d.year,d.month-1,d.day)))));
  const year = candidates[0].year;
  const dt = new Date(Date.UTC(year,month-1,day));
  if (dt.getUTCMonth() !== month-1 || dt.getUTCDate() !== day) throw new Error('Data non valida');
  return year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
}
function kickoffUTC(date, time) {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [year,month,day] = date.split('-').map(Number);
  const [hour,minute] = time.split(':').map(Number);
  if(hour>23 || minute>59)throw new Error('Orario non valido');
  const target = Date.UTC(year,month-1,day,hour,minute);
  let guess = target;
  const fmt = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<2;i++){
    const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
    const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    guess -= shown-target;
  }
  return new Date(guess).toISOString();
}
function validateStandings(rows) {
  if(!Array.isArray(rows)||rows.length<8||rows.length>40)throw new Error('Classifica incompleta');
  if(new Set(rows.map(r=>r.teamId)).size!==rows.length)throw new Error('Squadre duplicate');
  if(rows.filter(r=>r.teamId===TEAM_ID&&/^pievese$/i.test(r.team)).length!==1)throw new Error('Pievese assente o ambigua');
  rows.forEach((r,i)=>{
    if(r.position!==i+1 || !r.team || !/^\d+$/.test(r.teamId))throw new Error('Riga classifica non valida');
    for(const key of ['points','played','wins','draws','losses','goalsFor','goalsAgainst','goalDifference'])if(!Number.isInteger(r[key]))throw new Error('Statistica non valida');
    if(r.played!==r.wins+r.draws+r.losses || r.goalDifference!==r.goalsFor-r.goalsAgainst)throw new Error('Statistiche incoerenti');
    if(['played','wins','draws','losses','goalsFor','goalsAgainst'].some(k=>r[k]<0))throw new Error('Statistica negativa');
  });
  return rows;
}
function upcoming(fixtures, now=new Date()) {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const unique = [...new Map(fixtures.map(m=>[m.sourceUrl,m])).values()];
  return unique.filter(m=>m.unplayed && (m.homeId===TEAM_ID||m.awayId===TEAM_ID) && (m.kickoff ? new Date(m.kickoff)>=now : m.date>=today))
    .sort((a,b)=>(a.kickoff||a.date+'T23:59:00Z').localeCompare(b.kickoff||b.date+'T23:59:00Z'))[0] || null;
}
const RANKING_DOM = () => [...document.querySelectorAll('table.table_ranking tbody tr')].map(tr=>{
  const team=tr.querySelector('td.team a'),points=tr.querySelector('td.points');
  if(!team||!points)return null;
  const cells=[...tr.querySelectorAll('td')];
  const stats=cells.slice(cells.indexOf(points),cells.indexOf(points)+8).map(c=>Number(c.innerText.trim().replace(/−/g,'-')));
  return {team:team.innerText.trim().replace(/\s+/g,' '),teamUrl:team.href,stats};
}).filter(Boolean);
const FIXTURE_DOM = () => {
  const range=document.querySelector('#match_date')?.innerText||'';
  const dayText=document.querySelector('#match_day')?.innerText||'';
  let dateLabel='';
  const matches=[];
  for(const row of document.querySelectorAll('table.table-results tbody tr')){
    if(row.classList.contains('date'))dateLabel=row.querySelector('span')?.innerText||'';
    if(!row.classList.contains('match'))continue;
    const home=row.querySelector('td.home'),away=row.querySelector('td.away');
    if(!home||!away)continue;
    matches.push({dateLabel,time:row.querySelector('.hour')?.innerText.trim()||'',home:home.querySelector('.team-name')?.innerText.trim()||'',away:away.querySelector('.team-name')?.innerText.trim()||'',homeId:home.dataset.teamId,awayId:away.dataset.teamId,sourceUrl:row.querySelector('a.info')?.href||row.dataset.link,unplayed:[home,away].every(c=>c.querySelector('.goal')?.innerText.trim()==='-')});
  }
  return {range,dayText,matches,links:[...document.querySelectorAll('#match_days_selection a[data-match-day-id]')].map(a=>({day:Number(a.dataset.matchDayId),url:a.href}))};
};
async function readPage(page, url) {
  if(!url.startsWith(BASE))throw new Error('URL non autorizzato');
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  if(!response||response.status()>=400)throw new Error('Fonte non disponibile: '+response?.status());
  await page.locator('table.table-results tr.match').first().waitFor({state:'attached',timeout:25000});
  return page.evaluate(FIXTURE_DOM);
}
function normalizeFixtures(raw) {
  const round=Number(raw.dayText.match(/\d+/)?.[0]);
  if(!round)throw new Error('Giornata non riconosciuta');
  return raw.matches.filter(m=>m.homeId===TEAM_ID||m.awayId===TEAM_ID).map(m=>{
    if(!m.home||!m.away||!m.sourceUrl?.startsWith(BASE+'Partita/'))throw new Error('Partita incompleta');
    const date=dateFromLabel(m.dateLabel,raw.range);
    return {...m,round,date,kickoff:kickoffUTC(date,m.time)};
  });
}
async function sync(output) {
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({locale:'it-IT',timezoneId:'Europe/Rome'});
    const first=await readPage(page,SOURCE);
    await page.locator('table.table_ranking td.points').first().waitFor({state:'attached',timeout:20000});
    const rank=await page.evaluate(RANKING_DOM);
    const standings=validateStandings(rank.map((r,i)=>{
      const id=r.teamUrl.match(/\/(\d+)\/Scheda(?:$|\?)/)?.[1];
      const [points,played,wins,draws,losses,goalsFor,goalsAgainst,goalDifference]=r.stats;
      return {position:i+1,teamId:id,team:r.team,points,played,wins,draws,losses,goalsFor,goalsAgainst,goalDifference};
    }));
    const current=Number(first.dayText.match(/\d+/)?.[0]);
    const fixtures=normalizeFixtures(first);
    const needed=first.links.filter(l=>l.day>=Math.max(1,current-1)&&l.day<=current+3&&l.day!==current).sort((a,b)=>a.day-b.day);
    for(const link of needed){
      if(!link.url.startsWith(BASE+'Giornata'))throw new Error('Link giornata non valido');
      const raw=await readPage(page,link.url);
      if(Number(raw.dayText.match(/\d+/)?.[0])!==link.day)throw new Error('Giornata non corrispondente');
      fixtures.push(...normalizeFixtures(raw));
    }
    const now=new Date();
    const match=upcoming(fixtures,now);
    if(match && new Date(match.date+'T12:00:00Z')-now>100*86400000)throw new Error('Calendario distante dalla data corrente');
    const nextMatch=match?{home:match.home,away:match.away,homeId:match.homeId,awayId:match.awayId,round:match.round,date:match.date,time:match.time,kickoff:match.kickoff,sourceUrl:match.sourceUrl}:null;
    const data={schemaVersion:1,sourceUrl:SOURCE,league:'Prima Categoria · Girone B · Umbria',updatedAt:now.toISOString(),standings,nextMatch};
    await fs.mkdir(path.dirname(output),{recursive:true});
    const temp=output+'.tmp';
    await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n');
    await fs.rename(temp,output);
    console.log(JSON.stringify({updatedAt:data.updatedAt,teams:standings.length,nextMatch}));
    return data;
  }finally{await browser.close();}
}
module.exports={dateFromLabel,kickoffUTC,validateStandings,upcoming,normalizeFixtures,sync,TEAM_ID};
if(require.main===module)sync(process.argv[2]||path.join(__dirname,'../assets/tuttocampo.json')).catch(error=>{console.error('Aggiornamento interrotto; dati precedenti conservati:',error.message);process.exitCode=1;});
