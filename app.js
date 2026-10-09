const $ = (selector) => document.querySelector(selector);
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const loader = $('.loader');
const percent = $('.load-percent');
const light = $('.light-line i');
const canvas = $('#film');
const ctx = canvas.getContext('2d', { alpha: false });
const video = $('#mobile-film');
const chapters = [...document.querySelectorAll('.chapter')];
const creed = $('.creed');
const creedLines = [...document.querySelectorAll('.creed-lines p')];
const letters = [...$('.letters').textContent].map((letter) => {
  const span = document.createElement('span');
  span.textContent = letter;
  return span;
});
$('.letters').replaceChildren(...letters);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 760px)');
const connection = navigator.connection;
let fallback = reduced.matches || mobile.matches || !!connection?.saveData;
let manifest;
let lenis;
let raf = 0;
let smoothScroll = scrollY;
let lastTime = 0;
let currentKey = '';
let desiredKey = '';
let activeVideo = '';
let geometry = [];
let creedBounds;
let membershipBounds;
let generation = 0;
const blobs = new Map();
const decoded = new Map();
const decoding = new Map();
const MAX_DECODED = 12;
const visibility = (progress) => clamp(progress / .08) * clamp((1 - progress) / .12);
function progress(rect, position) {
  return clamp((position - rect.top) / Math.max(1, rect.height - innerHeight));
}
function measure() {
  geometry = chapters.map((element) => ({ top: element.getBoundingClientRect().top + scrollY, height: element.offsetHeight }));
  creedBounds = { top: creed.getBoundingClientRect().top + scrollY, height: creed.offsetHeight };
  membershipBounds = { top: $('.membership').getBoundingClientRect().top + scrollY, height: $('.membership').offsetHeight };
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  currentKey = '';
  wake();
}
async function timedFetch(url, timeout = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response;
  } finally { clearTimeout(timer); }
}
function updateLoader(value) {
  const amount = Math.round(value);
  percent.textContent = `${amount}%`;
  light.style.width = `${amount}%`;
}
async function decode(key) {
  if (decoded.has(key)) {
    const bitmap = decoded.get(key);
    decoded.delete(key); decoded.set(key, bitmap);
    return bitmap;
  }
  if (decoding.has(key)) return decoding.get(key);
  if (!blobs.has(key)) return null;
  const promise = createImageBitmap(blobs.get(key)).then((bitmap) => {
    decoded.set(key, bitmap);
    while (decoded.size > MAX_DECODED) {
      const oldest = decoded.keys().next().value;
      decoded.get(oldest).close(); decoded.delete(oldest);
    }
    return bitmap;
  }).finally(() => decoding.delete(key));
  decoding.set(key, promise);
  return promise;
}
function paint(bitmap, key) {
  if (!bitmap || currentKey === key || key !== desiredKey) return;
  const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale, height = bitmap.height * scale;
  ctx.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  currentKey = key;
}
async function drawFrame(clip, frame) {
  const key = `${clip}/${frame}`;
  desiredKey = key;
  if (key === currentKey) return;
  try { paint(await decode(key), key); }
  catch { activateFallback(); }
}
function activateFallback() {
  fallback = true;
  document.body.classList.add('fallback-mode');
  lenis?.destroy(); lenis = undefined;
  smoothScroll = scrollY;
  measure();
}
function switchVideo(clip) {
  if (!manifest?.ready || activeVideo === clip.id) return;
  activeVideo = clip.id;
  video.pause(); video.src = clip.video;
  video.poster = manifest.anchor;
  // Reduced motion uses the MP4 as a still; deliberate user motion preferences
  // take precedence over autoplay. On ordinary mobile it loops silently.
  video.autoplay = !reduced.matches;
  video.load();
  if (!reduced.matches) video.play().catch(() => {});
}
function render(position) {
  let active = 0;
  geometry.forEach((rect, index) => {
    if (position >= rect.top) active = index;
    const p = progress(rect, position);
    const visible = index === 0 ? clamp((1 - p) / .12) : visibility(p);
    chapters[index].style.setProperty('--visibility', String(visible));
    chapters[index].style.setProperty('--rise', `${(1 - visible) * 16}px`);
  });
  const p = progress(geometry[active], position);
  const clip = manifest?.clips?.[active];
  if (clip && manifest.ready) {
    if (fallback) switchVideo(clip);
    else drawFrame(clip.id, Math.round(p * (manifest.frameCount - 1)) + 1);
  }
  $('#chapter-number').textContent = String(active + 1).padStart(2, '0');
  $('#chapter-label').textContent = ['LA LUCE', 'L’APPARTENENZA', 'IL MOMENTO'][active];
  const heroProgress = progress(geometry[0], position);
  letters.forEach((letter, i) => {
    const v = clamp((heroProgress + .09 - i * .022) / .05);
    letter.style.setProperty('--letter-opacity', String(v));
    letter.style.setProperty('--letter-rise', `${(1 - v) * 12}px`);
  });
  const cp = progress(creedBounds, position);
  creedLines.forEach((line, i) => {
    const distance = Math.abs(cp * 2.8 - (i + .2));
    const v = clamp(1 - distance / .6);
    line.style.setProperty('--line-opacity', String(v));
    line.style.setProperty('--line-rise', `${(1 - v) * 20}px`);
  });
  const mp = clamp((position + innerHeight - membershipBounds.top) / innerHeight);
  $('.final-crest').style.setProperty('--lift', `${fallback ? 0 : mp * 25}px`);
}
function tick(time) {
  raf = 0;
  if (document.hidden) return;
  lenis?.raf(time);
  const dt = Math.min(64, lastTime ? time - lastTime : 16.7);
  lastTime = time;
  const target = scrollY;
  smoothScroll = fallback ? target : smoothScroll + (target - smoothScroll) * (1 - Math.exp(-dt / 65));
  if (Math.abs(target - smoothScroll) < .15) smoothScroll = target;
  render(smoothScroll);
  if (lenis || Math.abs(target - smoothScroll) > .15) wake();
}
function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
async function preloadFrames() {
  const tasks = manifest.clips.flatMap((clip) => Array.from({ length: manifest.frameCount }, (_, n) => ({ key: `${clip.id}/${n + 1}`, url: `${clip.frames}${String(n + 1).padStart(4, '0')}.jpg` })));
  let next = 0, complete = 0, failed = false;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < tasks.length && !failed) {
      const task = tasks[next++];
      try {
        const response = await timedFetch(task.url);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Invalid frame');
        blobs.set(task.key, blob);
        complete++;
        updateLoader(complete / tasks.length * 99);
      } catch { failed = true; }
    }
  }));
  if (failed) { blobs.clear(); activateFallback(); return; }
  await decode(`${manifest.clips[0].id}/1`);
}
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
async function initialize() {
  const token = ++generation;
  try {
    manifest = await (await timedFetch('assets/manifest.json')).json();
    if (manifest.ready) {
      const crest = $('#crest');
      crest.src = manifest.logo;
      crest.addEventListener('load', () => { crest.hidden = false; }, { once: true });
      if (!fallback && typeof createImageBitmap === 'function') await preloadFrames();
      else activateFallback();
    } else activateFallback();
    configureMembership();
  } catch { activateFallback(); }
  if (token !== generation) return;
  if (!fallback && window.Lenis) lenis = new window.Lenis({ lerp: .09, smoothWheel: true, anchors: true });
  measure();
  updateLoader(100);
  requestAnimationFrame(() => requestAnimationFrame(() => { loader.classList.add('done'); loader.setAttribute('aria-hidden', 'true'); }));
  wake();
}
addEventListener('scroll', wake, { passive: true });
addEventListener('resize', measure, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; video.pause(); } else { lastTime = 0; wake(); if (fallback && manifest?.ready && !reduced.matches) video.play().catch(() => {}); } });
reduced.addEventListener('change', () => { if (reduced.matches) { activateFallback(); video.pause(); } });
mobile.addEventListener('change', () => { if (mobile.matches) activateFallback(); });
video.addEventListener('error', () => { video.hidden = true; });
initialize();
