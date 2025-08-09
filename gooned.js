
(async()=>{
  // Built-in playlist + any admin-added entries (active only)
  const BUILTIN = window.GOONED_MANIFEST || [];
  const ADMIN_KEY = 'GOONED_CUSTOM';
  function readAdminEntries(){
    try { return (JSON.parse(localStorage.getItem(ADMIN_KEY)||'[]')||[]).filter(e=>e && (e.active!==false)); }
    catch { return []; }
  }
  let PLAYLIST_ORIG = BUILTIN.concat(readAdminEntries()); // submissions are NOT auto-included (moderated only)
  let PLAYLIST = PLAYLIST_ORIG.slice();

  // ---- cache busting ----
  let BUILD_AT = 0;
  async function loadBuildMeta(){
    try {
      const r = await fetch('/build.json', { cache: 'no-store' });
      const j = await r.json();
      BUILD_AT = j && j.builtAt ? j.builtAt : Date.now();
    } catch {
      BUILD_AT = Date.now();
    }
  }
  function withVersion(url){
    if (!url) return url;
    if (/^(data:|blob:)/i.test(url)) return url; // don't version data/blob URLs
    return url + (url.includes('?') ? '&' : '?') + 'v=' + BUILD_AT;
  }


  function rebuildPlaylist(){
    PLAYLIST_ORIG = BUILTIN.concat(readAdminEntries());
    PLAYLIST = PLAYLIST_ORIG.slice();
  }
  // Shuffle playlist at game start
  shuffle(PLAYLIST);

  // Defaults
  let maxZoomSteps = 5;   // 5 or 6
  let finalFrac = 0.70;   // 0.70, 0.75, 0.80
  let ROUND_SECONDS = 20; // per-round timer

  // Elements
  const canvas = document.getElementById('goonleCanvas');
  const ctx = canvas.getContext('2d');
  const guessForm = document.getElementById('guessForm');
  const guessInput = document.getElementById('guessInput');
  const statusEl = document.getElementById('status');
  const triesEl = document.getElementById('tries');
  const messageEl = document.getElementById('message');
  const revealBtn = document.getElementById('revealBtn');
  const nextBtn = document.getElementById('nextBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const shareBtn = document.getElementById('shareBtn');
  const roundInfo = document.getElementById('roundInfo');
  const scoreInfo = document.getElementById('scoreInfo');
  const timerEl = document.getElementById('timer');
  const modal = document.getElementById('resultModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const finalModal = document.getElementById('finalModal');
  const finalBody = document.getElementById('finalBody');
  const restartBtn = document.getElementById('restartBtn');
  const revealNameEl = document.getElementById('revealName');

  // Settings
  const stepsSelect = document.getElementById('stepsSelect');
  const finalCropSelect = document.getElementById('finalCropSelect');
  const timerSelect = document.getElementById('timerSelect');
  const applyBtn = document.getElementById('applyBtn');

  // Public submissions
  const SUBMIT_KEY = 'GOONED_SUBMISSIONS';
  function readSubmissions(){ try { return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '[]'); } catch { return []; } }
  function writeSubmissions(arr){ localStorage.setItem(SUBMIT_KEY, JSON.stringify(arr)); }
  const userSubmitForm = document.getElementById('userSubmitForm');
  if (userSubmitForm){
    const userImageFile = document.getElementById('userImageFile');
    const userAnswerText = document.getElementById('userAnswerText');
    const userSubmitMsg = document.getElementById('userSubmitMsg');
    userSubmitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const file = userImageFile.files[0];
      const answer = (userAnswerText.value || '').trim();
      if (!file || !answer) return;
      const reader = new FileReader();
      reader.onload = () => {
        const arr = readSubmissions();
        arr.push({ src: reader.result, answer, when: Date.now() });
        writeSubmissions(arr);
        userImageFile.value = ''; userAnswerText.value = '';
        userSubmitMsg.textContent = 'Thanks! Your submission has been queued for admin approval.';
        setTimeout(() => userSubmitMsg.textContent = '', 4000);
      };
      reader.readAsDataURL(file);
    });
  }

  // State
  let round = 0, score = 0, zoom = maxZoomSteps, tries = 0, finished = false;
  let img = new Image();
  let timeLeft = ROUND_SECONDS;
  let timerId = null;
  let revealFull = false;

  function normalize(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
  function shuffle(array){ for (let i=array.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } }

  function startTimer(){
    stopTimer(); timeLeft = ROUND_SECONDS; renderTimer();
    timerId = setInterval(()=>{
      timeLeft--; renderTimer();
      if (timeLeft <= 0){ stopTimer(); if (!finished){ zoom = 1; draw(); updateHUD(); endImage(false, '(Time up)'); } }
    },1000);
  }
  function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }
  function renderTimer(){ timerEl.textContent = `${timeLeft}s`; }

  function loadRound(){
    // refresh playlist with any new admin entries
    PLAYLIST_ORIG = BUILTIN.concat(readAdminEntries()); // submissions are NOT auto-included (moderated only)
    PLAYLIST = PLAYLIST_ORIG.slice();

    finished = false; tries = 0; zoom = maxZoomSteps; revealFull = false;
    if (revealNameEl) revealNameEl.textContent = '';
    messageEl.textContent=''; guessInput.value=''; guessInput.disabled=false;
    document.getElementById('guessButton').disabled=false; nextBtn.disabled=true;

    // safety
    if (!PLAYLIST.length){ PLAYLIST = [{src:'assets/placeholder.jpg', answer:'Placeholder'}]; }

    const item = PLAYLIST[round];
    img = new Image(); img.src = withVersion(item.src);
    img.onload = ()=>{ draw(); updateHUD(); updateTopbar(); startTimer(); };
  }
  function updateTopbar(){ roundInfo.textContent = `Round ${round+1} / ${PLAYLIST.length}`; scoreInfo.textContent = `Score ${score}`; }
  function updateHUD(){ statusEl.textContent = `Step ${zoom}/${maxZoomSteps}`; triesEl.textContent = `Tries: ${tries}`; }

  function draw(){
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0,0,cw,ch);

    let srcW, srcH, sx, sy;
    if (revealFull){
      srcW = img.width; srcH = img.height; sx = 0; sy = 0;
    } else {
      const t = (maxZoomSteps - zoom) / (maxZoomSteps - 1 || 1); // 0..1
      const frac = 0.25 + t * (finalFrac - 0.25);               // 0.25 .. finalFrac
      srcW = Math.max(1, img.width * frac);
      srcH = Math.max(1, img.height * frac);
      const cx = img.width/2, cy = img.height/2;
      sx = Math.max(0, Math.min(img.width - srcW, cx - srcW/2));
      sy = Math.max(0, Math.min(img.height - srcH, cy - srcH/2));
    }

    const containScale = Math.min(cw / srcW, ch / srcH);
    const dw = Math.floor(srcW * containScale);
    const dh = Math.floor(srcH * containScale);
    const dx = Math.floor((cw - dw) / 2);
    const dy = Math.floor((ch - dh) / 2);

    ctx.fillStyle='#0b1020'; ctx.fillRect(0,0,cw,ch);
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(img, sx, sy, srcW, srcH, dx, dy, dw, dh);
  }

  function endImage(win, extra=''){
    revealFull = true; zoom = 1; draw(); finished = true; stopTimer();
    guessInput.disabled = true; document.getElementById('guessButton').disabled = true; nextBtn.disabled = false;
    const answer = PLAYLIST[round].answer;
    const base = win ? `🎉 Correct in ${tries} ${tries===1?'try':'tries'}!` : `❌ Out of guesses! The answer was: ${answer}`;
    const msg = extra ? `${base} ${extra}` : base;
    messageEl.textContent = msg; modalTitle.textContent = win ? 'You guessed it!' : 'Revealed'; modalBody.textContent = msg;
    if (typeof modal.showModal === 'function') modal.showModal();
  }

  function nextRound(){
    round++;
    if (round >= PLAYLIST.length){
      finalBody.textContent = `You scored ${score} / ${PLAYLIST.length}.`;
      if (typeof finalModal.showModal === 'function') finalModal.showModal();
      return;
    }await loadBuildMeta();
  
    loadRound();
  }

  // Events
  guessForm.addEventListener('submit',(e)=>{
    e.preventDefault(); if (finished) return;
    const userGuess = normalize(guessInput.value);
    if (!userGuess){
      // Empty guess: zoom out further instead of requiring text
      zoom = Math.max(1, zoom - 1);
      draw(); updateHUD();
      if (zoom === 1) endImage(false); else messageEl.textContent = 'Zooming out…';
      return;
    }
    guessInput.value=''; tries++;
    const correct = userGuess === normalize(PLAYLIST[round].answer);
// Always show full image after a guess
revealFull = true; draw();
if (correct){
  score++;
  if (revealNameEl) revealNameEl.textContent = PLAYLIST[round].answer;
  endImage(true); updateTopbar(); return;
} else {
  if (revealNameEl) revealNameEl.textContent = PLAYLIST[round].answer;
  endImage(false); updateTopbar(); return;
}

    if (correct){ score++; revealFull = true; draw(); if(revealNameEl) revealNameEl.textContent = PLAYLIST[round].answer; endImage(true); updateTopbar(); return; }
    // zoom-out on incorrect disabled; end round immediately
  });
  revealBtn.addEventListener('click', ()=>{ if (!finished){ revealFull = true; zoom = 1; draw(); updateHUD(); endImage(false); }});
  nextBtn.addEventListener('click', ()=> nextRound());
  shareBtn.addEventListener('click', async ()=>{
    const text = `GOONED — Score: ${score} / ${PLAYLIST.length}`;
    try{ await navigator.clipboard.writeText(text); messageEl.textContent = 'Result copied!'; }catch{ messageEl.textContent = text; }
  });
  shuffleBtn.addEventListener('click', ()=>{
  rebuildPlaylist();
  shuffle(PLAYLIST);
  round = 0; score = 0; finished = false; revealFull = false;
  zoom = MAX_ZOOM; draw(); updateHUD();
  loadRound(); updateTopbar();
});

  // Settings apply
  applyBtn.addEventListener('click', ()=>{
    const steps = parseInt(stepsSelect.value, 10);
    const frac = parseFloat(finalCropSelect.value);
    const t = parseInt(timerSelect.value, 10);
    if (steps >= 2 && steps <= 6) maxZoomSteps = steps;
    if (frac >= 0.6 && frac <= 0.95) finalFrac = frac;
    if (t >= 5 && t <= 120) ROUND_SECONDS = t;
    loadRound(); updateTopbar();
  });

  if ('ResizeObserver' in window){ const ro = new ResizeObserver(()=> draw()); ro.observe(canvas); } else { window.addEventListener('resize', draw); }
  restartBtn?.addEventListener('click', ()=>{
    rebuildPlaylist();
    shuffle(PLAYLIST);
    round = 0; score = 0; finished = false; revealFull = false;
    zoom = MAX_ZOOM;
    loadRound(); updateTopbar(); draw(); updateHUD();
  });

  shuffleBtn?.addEventListener('click', ()=>{
    rebuildPlaylist();
    shuffle(PLAYLIST);
    round = 0; score = 0; finished = false; revealFull = false;
    zoom = MAX_ZOOM;
    loadRound(); updateTopbar(); draw(); updateHUD();
  });

  // Dynamic updates: if admin adds/removes entries in another tab, rebuild & shuffle
  window.addEventListener('storage', (e)=>{
    if (!e) return;
    if (e.key === 'GOONED_CUSTOM'){ 
      rebuildPlaylist(); 
      shuffle(PLAYLIST); 
      round = 0; score = 0; finished = false; revealFull = false; 
      zoom = MAX_ZOOM; 
      loadRound(); updateTopbar(); draw(); updateHUD();
    }
  });

  // Start
  loadRound();
})();