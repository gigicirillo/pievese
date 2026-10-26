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
$('.match-close').addEventListener('click',()=>{$('.match-card').hidden=true;try{sessionStorage.setItem('pievese-match-hidden','1');}catch{}});
try{if(sessionStorage.getItem('pievese-match-hidden')==='1')$('.match-card').hidden=true;}catch{}
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

