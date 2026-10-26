const $=s=>document.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const canvas=$('#film'),ctx=canvas.getContext('2d',{alpha:false});
const stage=$('.stage'),video=$('#mobile-film'),media=$('.media-window');
const chapters=[...document.querySelectorAll('.chapter')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width:760px)');
let fallback=mobile.matches||reduced.matches||!!navigator.connection?.saveData;
let manifest,rects=[],smoothY=scrollY,lastTime=0,raf=0,active=-1,wanted=1,lastPaint='',pending=0;
const frames=new Map(),inFlight=new Set(),failed=new Set();
const CACHE_LIMIT=20,CONCURRENCY=4;
let videoStarted=false;
function progress(rect,y){return clamp((y-rect.top)/Math.max(1,rect.height-innerHeight));}
function measure(){
 rects=chapters.map(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight}));
 const box=media.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);lastPaint='';wake();
}
function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function touchFrame(n){const f=frames.get(n);if(f){frames.delete(n);frames.set(n,f);}return f;}
function cover(bitmap,alpha=1){
 const s=Math.max(canvas.width/bitmap.width,canvas.height/bitmap.height);
 ctx.globalAlpha=alpha;ctx.drawImage(bitmap,(canvas.width-bitmap.width*s)/2,(canvas.height-bitmap.height*s)/2,bitmap.width*s,bitmap.height*s);ctx.globalAlpha=1;
}
function frameUrl(n){return manifest.clips[2].frames+String(n).padStart(4,'0')+'.jpg';}
async function fetchFrame(n){
 if(frames.has(n)||inFlight.has(n)||failed.has(n)||n<1||n>manifest.frameCount)return;
 inFlight.add(n);pending++;
 try{
  const res=await fetch(frameUrl(n),{signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error('Frame '+res.status);
  const bitmap=await createImageBitmap(await res.blob());
  frames.set(n,bitmap);
  while(frames.size>CACHE_LIMIT){
   const farthest=[...frames.keys()].sort((a,b)=>Math.abs(b-wanted)-Math.abs(a-wanted))[0];
   frames.get(farthest).close();frames.delete(farthest);
  }
 }catch{failed.add(n);}
 finally{inFlight.delete(n);pending--;wake();}
}
function scheduleFrames(){
 if(!manifest?.ready||fallback)return;
 const base=Math.floor(wanted),list=[base,base+1];
 for(let i=1;i<=7;i++)list.push(base+i+1,base-i);
 for(const n of list){
  if(pending>=CONCURRENCY)break;
  if(n>=1&&n<=manifest.frameCount&&!frames.has(n)&&!inFlight.has(n)&&!failed.has(n))void fetchFrame(n);
 }
}
function draw(){
 const low=Math.floor(wanted),high=Math.min(manifest.frameCount,low+1),fraction=wanted-low;
 const a=touchFrame(low),b=touchFrame(high);
 if(!a&&failed.has(low)&&!pending){setFallback();startVideo();return;}
 if(a){const key=low+':'+(b?fraction.toFixed(3):'single');if(lastPaint!==key){cover(a);if(b&&high!==low)cover(b,fraction);lastPaint=key;}}
 else if(!lastPaint&&frames.size){const near=[...frames.keys()].sort((a,b)=>Math.abs(a-wanted)-Math.abs(b-wanted))[0];cover(frames.get(near));lastPaint='near'+near;}
 scheduleFrames();
}
function startVideo(){
 if(videoStarted||!manifest?.ready)return;
 videoStarted=true;
 const clip=manifest.clips[2];
 video.src=video.canPlayType('video/mp4; codecs="avc1.42E01F"')||!clip.webm?clip.video:clip.webm;
 video.poster=frameUrl(1);video.load();
 if(!reduced.matches)video.play().catch(()=>{});
}
function render(y){
 if(!rects.length)return;
 let index=0;rects.forEach((r,i)=>{if(y>=r.top)index=i;const p=progress(r,y);const visibility=i===0?clamp((1-p)/.15):clamp(p/.10)*clamp((1-p)/.15);chapters[i].style.setProperty('--visibility',visibility);chapters[i].style.setProperty('--rise',((1-visibility)*12)+'px');});
 const p=progress(rects[index],y);
 if(active!==index){active=index;stage.classList.toggle('is-strike',index===2);$('#chapter-number').textContent=String(index+1).padStart(2,'0');$('#chapter-label').textContent=['LA LUCE','L’APPARTENENZA','IL MOMENTO'][index];}
 if(index<2){
  const turn=reduced.matches?0:(index===0?-4+p*8:4-p*8);
  const lift=reduced.matches?0:(index===0?Math.sin(p*Math.PI)*-7:-p*28);
  media.style.setProperty('--crest-turn',turn+'deg');
  media.style.setProperty('--crest-y',lift+'px');
  media.style.setProperty('--crest-scale',index===0?1:1-p*.09);
  media.style.setProperty('--sweep',(-110+p*240)+'%');
  video.pause();
 }else if(manifest?.ready){
  if(fallback){startVideo();if(!reduced.matches&&video.paused)video.play().catch(()=>{});}
  else{wanted=1+p*(manifest.frameCount-1);draw();}
 }
}
function tick(time){
 raf=0;if(document.hidden)return;
 const dt=Math.min(50,lastTime?time-lastTime:16.7);lastTime=time;
 smoothY=reduced.matches?scrollY:smoothY+(scrollY-smoothY)*(1-Math.exp(-dt/95));
 if(Math.abs(smoothY-scrollY)<.08)smoothY=scrollY;
 render(smoothY);
 if(Math.abs(smoothY-scrollY)>.08||pending>0)wake();
}
function setFallback(){fallback=true;document.body.classList.add('fallback-mode');measure();}
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
  if(fallback)setFallback();
  else if(typeof createImageBitmap!=='function')setFallback();
  else{wanted=1;scheduleFrames();}
 }catch{setFallback();}
 try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);}catch{}
 configureMembership();
 $('.load-percent').textContent='100%';$('.light-line i').style.width='100%';
 $('.loader').classList.add('done');$('.loader').setAttribute('aria-hidden','true');
 measure();wake();
}
addEventListener('scroll',wake,{passive:true});addEventListener('resize',measure,{passive:true});
new ResizeObserver(measure).observe(media);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;video.pause();}else{lastTime=0;wake();}});
mobile.addEventListener('change',()=>{if(mobile.matches)setFallback();});
reduced.addEventListener('change',()=>{if(reduced.matches){setFallback();video.pause();}wake();});
video.addEventListener('error',()=>{video.hidden=true;media.style.backgroundImage='url("'+frameUrl(1)+'")';media.style.backgroundSize='cover';});
initialize();

