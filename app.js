const $=s=>document.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const stage=$('.stage'),video=$('#mobile-film'),media=$('.media-window'),cinema=$('.cinema');
const chapters=[...document.querySelectorAll('.chapter')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let manifest,cinemaTop=0,span=1,smoothY=scrollY,lastTime=0,raf=0,active=-1,videoFallback=false;
function measure(){
 cinemaTop=cinema.getBoundingClientRect().top+scrollY;
 span=Math.max(1,(cinema.offsetHeight-innerHeight)/3);
 wake();
}
function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function prepareVideo(){
 if(!manifest?.ready)return;
 const clip=manifest.clips[2];
 video.src=video.canPlayType('video/mp4; codecs="avc1.42E01F"')?'assets/strike-fluid.mp4':'assets/strike-fluid.webm';
 video.poster=clip.frames+'0001.jpg';
 video.load();
}
function render(y){
 const t=clamp((y-cinemaTop)/span,0,2.999);
 const index=Math.floor(t),p=t-index;
 document.body.classList.toggle('has-scrolled',scrollY>12);
 chapters.forEach((el,i)=>{
  const fadeIn=i===0?1:clamp((t-i)/.08);
  const fadeOut=i===2?1:clamp((i+.98-t)/.08);
  const visible=fadeIn*fadeOut;
  el.style.setProperty('--visibility',visible);
  el.style.setProperty('--rise',((1-visible)*9)+'px');
  el.setAttribute('aria-hidden',visible<.02?'true':'false');
 });
 if(active!==index){
  const previous=active;active=index;
  stage.classList.toggle('is-strike',index===2);
  $('#chapter-number').textContent=String(index+1).padStart(2,'0');
  $('#chapter-label').textContent=['LA LUCE','L’APPARTENENZA','IL MOMENTO'][index];
  if(index===2&&!reduced.matches){
   if(previous!==2&&video.readyState>=1)video.currentTime=0;
   video.play().catch(()=>{});
  }else video.pause();
 }
 if(index<2){
  media.style.setProperty('--crest-turn',(reduced.matches?0:(index===0?-4+p*8:4-p*8))+'deg');
  media.style.setProperty('--crest-y',(reduced.matches?0:(index===0?Math.sin(p*Math.PI)*-7:-p*28))+'px');
  media.style.setProperty('--crest-scale',index===0?1:1-p*.09);
  media.style.setProperty('--crest-light',String(1+Math.sin(p*Math.PI)*.08));
 }
 const outside=scrollY>=cinemaTop+cinema.offsetHeight||scrollY+innerHeight<cinemaTop;
 if(outside)video.pause();
 else if(index===2&&!reduced.matches&&video.paused&&!video.ended)video.play().catch(()=>{});
}
function tick(time){
 raf=0;if(document.hidden)return;
 const dt=Math.min(50,lastTime?time-lastTime:16.7);lastTime=time;
 smoothY=reduced.matches?scrollY:smoothY+(scrollY-smoothY)*(1-Math.exp(-dt/65));
 if(Math.abs(smoothY-scrollY)<.08)smoothY=scrollY;
 render(smoothY);
 if(Math.abs(smoothY-scrollY)>.08)wake();
}
const menu=$('#main-menu'),menuButton=$('.menu-toggle');
function closeMenu(){menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menu.classList.toggle('is-open',open);});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
$('.match-close').addEventListener('click',()=>{$('.match-card').hidden=true;try{sessionStorage.setItem(matchStorageKey,'1');}catch{}});

function configureMembership() {
  if (!manifest?.membershipEndpoint || !manifest.privacyUrl) return;
  const endpoint = new URL(manifest.membershipEndpoint, location.href);
  if (endpoint.protocol !== 'https:') return;
  const form = $('#membership-form');
  form.hidden = false;
  $('.membership-link').hidden = true;
  $('.membership-note').hidden = true;
  $('#privacy-link').href = manifest.privacyUrl;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button');
    button.disabled = true;
    $('#form-status').textContent = 'Invio in corso…';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try { response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('#email').value.trim(), consent: true, source: 'pievese-centenario' }), signal: controller.signal }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error('Invio non riuscito');
      $('#form-status').textContent = 'Richiesta inviata. Grazie per essere al nostro fianco.';
      form.reset();
    } catch { $('#form-status').textContent = 'Invio non riuscito. Riprova oppure contatta il club su Instagram.'; }
    finally { button.disabled = false; }
  });
}



let matchStorageKey='pievese-match-hidden';
const SPORTS_SOURCE='https://www.tuttocampo.it/Umbria/PrimaCategoria/GironeB/Risultati';
const sportsDate=value=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
function sportsNode(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n;}
function sourceLink(text,url=SPORTS_SOURCE){const n=sportsNode('a',text);n.href=url.startsWith('https://www.tuttocampo.it/')?url:SPORTS_SOURCE;n.target='_blank';n.rel='noopener noreferrer';return n;}
async function loadSportsData(){
 try{
  const response=await fetch('assets/tuttocampo.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Dati non disponibili');
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.standings)||data.standings.length<8||!data.standings.some(r=>r.teamId==='770503')||!Number.isFinite(Date.parse(data.updatedAt)))throw new Error('Dati non validi');
  const container=$('#standings-container'),table=sportsNode('table',undefined,'sports-table');
  table.append(sportsNode('caption','Prima Categoria · Girone B · Umbria','sr-only'));
  const head=sportsNode('thead'),header=sportsNode('tr');
  ['Pos.','Squadra','Punti','G','V','N','P','GF','GS','DR'].forEach(text=>{const cell=sportsNode('th',text);cell.scope='col';header.append(cell);});head.append(header);table.append(head);
  const body=sportsNode('tbody');
  for(const row of data.standings){
   const tr=sportsNode('tr');if(row.teamId==='770503')tr.className='pievese-row';
   [row.position,row.team,row.points,row.played,row.wins,row.draws,row.losses,row.goalsFor,row.goalsAgainst,row.goalDifference].forEach((value,i)=>{const cell=sportsNode(i===1?'th':'td',value);if(i===1)cell.scope='row';tr.append(cell);});body.append(tr);
  }
  table.append(body);const scroll=sportsNode('div',undefined,'sports-table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Classifica completa del Girone B');scroll.append(table);
  const footer=sportsNode('div',undefined,'sports-footer'),old=Date.now()-Date.parse(data.updatedAt)>8*86400000;
  footer.append(sportsNode('span',(old?'Ultimo dato disponibile: ':'Aggiornata: ')+sportsDate(data.updatedAt),'sports-stamp'),sourceLink('Fonte: Tuttocampo ↗'));
  container.replaceChildren(scroll,footer);if(old)container.classList.add('sports-stale');
  $('#sports-update-note').textContent='Aggiornamento automatico settimanale · Pievese evidenziata';
  const m=data.nextMatch,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const future=m&&(m.homeId==='770503'||m.awayId==='770503')&&(m.kickoff?Date.parse(m.kickoff)>Date.now():m.date>=today);
  const teams=$('.match-teams'),detail=$('.match-card p'),link=$('.match-card>a');
  if(future){
   const home=sportsNode('span',m.home),away=sportsNode('span',m.away);home.title=m.home;away.title=m.away;teams.replaceChildren(home,sportsNode('span','VS','match-vs'),away);
   const dateLabel=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'short',day:'numeric',month:'short'}).format(new Date(m.date+'T12:00:00Z'));
   detail.replaceChildren(document.createTextNode(dateLabel+' · '+(m.time||'orario da confermare')),document.createElement('br'),document.createTextNode(m.round+'ª giornata · '+(m.homeId==='770503'?'In casa':'In trasferta')));
   link.href=m.sourceUrl.startsWith('https://www.tuttocampo.it/')?m.sourceUrl:SPORTS_SOURCE;link.textContent='Dettagli su Tuttocampo ↗';matchStorageKey='pievese-match-hidden:'+m.sourceUrl;
  }else{
   teams.replaceChildren(sportsNode('span','PIEVESE'),sportsNode('span','·','match-vs'),sportsNode('span','IN AGGIORNAMENTO'));detail.textContent='Prossimo incontro in aggiornamento.';link.href=SPORTS_SOURCE;link.textContent='Consulta Tuttocampo ↗';matchStorageKey='pievese-match-hidden:'+data.updatedAt.slice(0,10);
  }
  $('.match-card').hidden=false;$('.match-card').title='Fonte: Tuttocampo · aggiornamento '+sportsDate(data.updatedAt);
  try{if(sessionStorage.getItem(matchStorageKey)==='1')$('.match-card').hidden=true;}catch{}
 }catch{$('#sports-update-note').textContent='Dati non disponibili. Consulta la fonte Tuttocampo.';}
}

async function initialize(){
 measure();
 try{
  const response=await fetch('assets/manifest.json',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Manifest unavailable');
  manifest=await response.json();
  $('#crest').src=manifest.logo;$('#crest').hidden=false;
  prepareVideo();
 }catch{}
 try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);}catch{}
 configureMembership();
 void loadSportsData();
 $('.load-percent').textContent='100%';$('.light-line i').style.width='100%';
 $('.loader').classList.add('done');$('.loader').setAttribute('aria-hidden','true');
 measure();wake();
}
addEventListener('scroll',wake,{passive:true});addEventListener('resize',measure,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;video.pause();}else{lastTime=0;if(active===2&&!reduced.matches)video.play().catch(()=>{});wake();}});
reduced.addEventListener('change',()=>{if(reduced.matches)video.pause();else if(active===2)video.play().catch(()=>{});wake();});
video.addEventListener('canplay',()=>{if(active===2&&!reduced.matches)video.play().catch(()=>{});});
video.addEventListener('error',()=>{
 if(!videoFallback&&manifest?.ready){videoFallback=true;const clip=manifest.clips[2];video.src=video.canPlayType('video/mp4; codecs="avc1.42E01F"')?clip.video:clip.webm;video.load();}
});
initialize();

