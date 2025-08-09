
(()=>{
  // Built-in playlist + any admin-added entries (active only)
  const BUILTIN = window.GOONED_MANIFEST || [];
  const ADMIN_KEY = 'GOONED_CUSTOM';
  function readAdminEntries(){
    try { return (JSON.parse(localStorage.getItem(ADMIN_KEY)||'[]')||[]).filter(e=>e && (e.active!==false)); }
    catch { return []; }
  }
  let PLAYLIST_ORIG = BUILTIN.concat(readAdminEntries()); // submissions are NOT auto-included (moderated only)
  let PLAYLIST = PLAYLIST_ORIG.slice();
  // Shuffle playlist at game start
  shuffle(PLAYLIST);

  
  // --- Injected: remote people.json loader + ETag watch ---
  const DATA_URL = '/data/people.json';
  let LAST_ETAG = null;
  async function loadRemotePeople(force=false, doShuffle=false){
    try{
      const res = await fetch(DATA_URL, {cache:'no-cache'});
      if(!res.ok) return;
      const etag = res.headers.get('ETag') || null;
      if (!force && etag && LAST_ETAG && etag===LAST_ETAG) return;
      const arr = await res.json();
      if(Array.isArray(arr) && arr.length){
        // Map to existing item shape {src, answer}
        PLAYLIST_ORIG = arr.map(x=>({ src: x.image || x.src, answer: x.name || x.answer })).filter(x=>x.src && x.answer);
        PLAYLIST = PLAYLIST_ORIG.slice();
        shuffle(PLAYLIST);
        round = 0; score = 0; zoom = MAX_ZOOM; revealFull = false; finished = false;
        if (typeof draw === 'function') draw();
        if (typeof updateHUD === 'function') updateHUD();
        if (typeof startGame === 'function') startGame();
        loadRound(); updateTopbar();
      }
      LAST_ETAG = etag || LAST_ETAG;
    }catch(e){ console.warn('loadRemotePeople failed', e); }
  }
  async function pollPeopleUpdates(){
    try{
      const r = await fetch(DATA_URL, {method:'HEAD', cache:'no-cache'});
      const etag = r.headers.get('ETag') || null;
      if (LAST_ETAG && etag && etag !== LAST_ETAG){
        await loadRemotePeople(true, true);
      }
      LAST_ETAG = etag || LAST_ETAG;
    }catch(e){ console.warn('poll updates failed', e); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    loadRemotePeople(true, true);
    setInterval(pollPeopleUpdates, 60000);
  });
  window.addEventListener('storage', (e)=>{
    if (e.key === 'people_updated') loadRemotePeople(true, true);
  });
  // --- end injected ---
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
    stopTimer();
    if (ROUND_SECONDS == null) { // infinite mode
      timeLeft = Infinity;
      renderTimer();
      return; // no interval
    }
    timeLeft = ROUND_SECONDS; renderTimer();
    timerId = setInterval(()=>{
      timeLeft--; renderTimer();
      if (timeLeft <= 0){ stopTimer(); if (!finished){ zoom = 1; draw(); updateHUD(); endImage(false, '(Time up)'); } }
    },1000);
  }
  function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }
  function renderTimer(){
    if (ROUND_SECONDS == null || !isFinite(timeLeft)) {
      timerEl.textContent = '∞';
    } else {
      timerEl.textContent = `${timeLeft}s`;
    }
  }

  function loadRound(){
    // keep current PLAYLIST order; do not reset here
finished = false; tries = 0; zoom = maxZoomSteps; revealFull = false;
    if (revealNameEl) revealNameEl.textContent = '';
    messageEl.textContent=''; guessInput.value=''; guessInput.disabled=false;
    document.getElementById('guessButton').disabled=false; nextBtn.disabled=true;

    // safety
    if (!PLAYLIST.length){ PLAYLIST = [{src:'assets/placeholder.jpg', answer:'Placeholder'}]; }

    const item = PLAYLIST[round];
    img = new Image(); img.src = item.src;
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
    }
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
    PLAYLIST = PLAYLIST_ORIG.slice(); shuffle(PLAYLIST);
  round = 0; score = 0; zoom = MAX_ZOOM; revealFull = false; finished = false; draw(); updateHUD(); startGame();
    round = 0; score = 0; loadRound(); updateTopbar();
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
  restartBtn?.addEventListener('click', ()=>{ round = 0; score = 0; loadRound(); updateTopbar(); });

  // Start
  loadRound();
})();


/* === GOONED: Auto-load, Shuffle, and Live-Update Patch (injected) === */
(function(){
  const DATA_URL = '/data/people.json';
  let LAST_ETAG = null;
  let PEOPLE = [];
  let ORDER = [];
  let CURRENT_INDEX = 0;

  // Expose for other scripts
  window.GOONED_STATE = { get PEOPLE(){return PEOPLE}, get ORDER(){return ORDER}, get CURRENT_INDEX(){return CURRENT_INDEX} };

  function secureRandomInt(maxExclusive) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return Math.floor((arr[0] / 0xFFFFFFFF) * maxExclusive);
  }
  function shuffleIndices(n) {
    ORDER = Array.from({length:n}, (_,i)=>i);
    for (let i = ORDER.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [ORDER[i], ORDER[j]] = [ORDER[j], ORDER[i]];
    }
  }

  function currentPerson() {
    const idx = ORDER[CURRENT_INDEX] ?? 0;
    return PEOPLE[idx];
  }

  async function loadPeople({force}={force:false}) {
    const res = await fetch(DATA_URL, {cache:'no-cache'});
    if (!res.ok) { console.error('Failed to load people.json'); return; }
    const etag = res.headers.get('ETag') || null;
    const shouldApply = force || etag !== LAST_ETAG;
    const data = await res.json();
    if (!Array.isArray(data)) { console.error('people.json not array'); return; }
    if (shouldApply) {
      PEOPLE = data.map(p => ({ name: p.name, image: p.image, answer: p.name, src: p.image }));
      shuffleIndices(PEOPLE.length);
      CURRENT_INDEX = 0;
      LAST_ETAG = etag || LAST_ETAG;
      // If a global render function exists, try to start/restart the game
      if (typeof window.renderGameFromPeople === 'function') {
        window.renderGameFromPeople(PEOPLE, ORDER, CURRENT_INDEX);
      } else if (typeof window.renderRound === 'function') {
        window.renderRound(CURRENT_INDEX, currentPerson());
      } else if (typeof window.initGame === 'function') {
        window.initGame(PEOPLE);
      }
    }
  }

  function nextRound() {
    CURRENT_INDEX++;
    if (CURRENT_INDEX >= ORDER.length) {
      shuffleAndRestart();
      return;
    }
    if (typeof window.renderRound === 'function') {
      window.renderRound(CURRENT_INDEX, currentPerson());
    } else if (typeof window.onNextRound === 'function') {
      window.onNextRound(CURRENT_INDEX, currentPerson());
    }
  }

  function shuffleAndRestart() {
    shuffleIndices(PEOPLE.length);
    CURRENT_INDEX = 0;
    if (typeof window.renderGameFromPeople === 'function') {
      window.renderGameFromPeople(PEOPLE, ORDER, CURRENT_INDEX);
    } else if (typeof window.renderRound === 'function') {
      window.renderRound(CURRENT_INDEX, currentPerson());
    } else if (typeof window.initGame === 'function') {
      window.initGame(PEOPLE);
    }
  }

  // Expose helpers
  window.goonedLoadPeople = loadPeople;
  window.goonedNextRound = nextRound;
  window.goonedShuffleAndRestart = shuffleAndRestart;
  window.goonedCurrentPerson = currentPerson;

  // Poll for backend updates
  async function pollPeopleUpdates(){
    try {
      const head = await fetch(DATA_URL, {method:'HEAD', cache:'no-cache'});
      const etag = head.headers.get('ETag') || null;
      if (LAST_ETAG && etag && etag !== LAST_ETAG) {
        await loadPeople({force:true});
        if (typeof window.showToast === 'function') window.showToast('New entries added — shuffled!');
      }
      LAST_ETAG = etag || LAST_ETAG;
    } catch(e){ console.warn('poll error', e); }
  }

  // Listen for admin localStorage signal for instant refresh
  window.addEventListener('storage', (e) => {
    if (e.key === 'people_updated') {
      loadPeople({force:true});
      if (typeof window.showToast === 'function') window.showToast('New entry published — shuffled!');
    }
  });

  // Shuffle button hookup if present
  function hookupShuffleButton(){
    const btn = document.getElementById('shuffleBtn');
    if (btn && !btn.__gooned) {
      btn.__gooned = true;
      btn.addEventListener('click', () => shuffleAndRestart());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    hookupShuffleButton();
    loadPeople({force:true});
    setInterval(pollPeopleUpdates, 60000);
  });

  // Optional: if your original code calls nextRound internally, you can replace its callsites with window.goonedNextRound()
  // or we can try to monkey-patch a known function name if discovered.
})();
/* === END GOONED PATCH === */
