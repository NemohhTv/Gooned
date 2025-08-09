
// Netlify rebuild (debounced) after save
let __rebuildTimer;
async function __triggerSiteRebuild() {
  try {
    await fetch('/.netlify/functions/trigger-build', { method: 'POST' });
    console.log('[Netlify] rebuild triggered');
  } catch (e) {
    console.error('[Netlify] rebuild failed', e);
  }
}
function __queueRebuild() {
  clearTimeout(__rebuildTimer);
  __rebuildTimer = setTimeout(__triggerSiteRebuild, 1200);
}


(()=>{
  const ADMIN_KEY = 'GOONED_CUSTOM';
  const SUBMIT_KEY = 'GOONED_SUBMISSIONS';
  const BUILTIN = Array.isArray(window.GOONED_BUILTIN) ? window.GOONED_BUILTIN : [];

  // Elements
  const addForm = document.getElementById('addForm');
  const imageUrls = document.getElementById('imageUrls');
  const answerText = document.getElementById('answerText');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const adminList = document.getElementById('adminList');
  const dropZone = document.getElementById('dropZone');
  const galleryList = document.getElementById('galleryList');

// === Imgur URL helpers ===
function normalizeImgurUrl(u){
  if (!u) return '';
  u = String(u).trim();
  if (/^https?:\/\/i\.imgur\.com\//i.test(u)) return u; // direct
  let m = u.match(/^https?:\/\/imgur\.com\/([A-Za-z0-9]+)(?:\.(jpg|png|webp|jpeg|gif))?$/i);
  if (m){
    const ext = (m[2] || 'jpg').toLowerCase();
    return `https://i.imgur.com/${m[1]}.${ext}`;
  }
  m = u.match(/^([A-Za-z0-9]+)$/);
  if (m){
    return `https://i.imgur.com/${m[1]}.jpg`;
  }
  if (/imgur\.com\/(a|gallery)\//i.test(u)){
    return '';
  }
  return u;
}

function addByUrls(multiline, caption){
  const lines = (multiline || '').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!lines.length){ alert('Paste one or more Imgur URLs.'); return; }
  const entries = readEntries();
  const useCaption = (caption || '').trim();
  let added = 0;
  lines.forEach((line, idx)=>{
    const url = normalizeImgurUrl(line);
    if (!url){ console.warn('Skipping non-direct Imgur link:', line); return; }
    const base = useCaption ? (lines.length>1 ? `${useCaption} ${idx+1}` : useCaption) : url.split('/').pop().split('.')[0];
    entries.push({ src: url, answer: base, active: true });
    added++;
  });
  if (!added){ alert('No valid Imgur direct links found.'); return; }
  writeEntries(entries);
  refreshAdminList();
  renderGallery();
  alert('Added! The game will reshuffle.');
}


// Upload removed in Imgur URL mode)();
  }

    const useCaption = (caption || '').trim();
    let i = 0;
    const next = () => {
      const f = imgs[i++];
      if (!f) { refreshAdminList(); renderGallery(); alert('Added! The game tab will reshuffle.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const arr = readEntries();
        const base = (useCaption ? (imgs.length > 1 ? `${useCaption} ${i}` : useCaption) : (f.name || 'image').replace(/\.[^.]+$/, ''));
        arr.push({ src: reader.result, answer: base, active: true });
        writeEntries(arr);
        next();
      };
      reader.onerror = () => next();
      reader.readAsDataURL(f);
    };
    next();
  }



  // Bulk bar
  const bulkBar = document.getElementById('bulkBar');
  const selectAll = document.getElementById('selectAllAdmin');
  const clearSelBtn = document.getElementById('clearSelBtn');
  const bulkListBtn = document.getElementById('bulkListBtn');
  const bulkUnlistBtn = document.getElementById('bulkUnlistBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

  // Submissions
  const submissionsCard = document.getElementById('submissionsCard');
  const submissionsList = document.getElementById('submissionsList');

  // State
  const selectedAdminIdxs = new Set();

  // Storage helpers
  function readEntries(){ try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || '[]'); } catch { return []; } }
  function writeEntries(arr){ localStorage.setItem(ADMIN_KEY, JSON.stringify(arr));
__queueRebuild(); }
  function normalizeEntry(e){ return { src: e.src, answer: e.answer, active: (e.active !== false) }; }

  function readSubmissions(){ try { return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '[]'); } catch { return []; } }
  function writeSubmissions(arr){ localStorage.setItem(SUBMIT_KEY, JSON.stringify(arr));
__queueRebuild(); }

  // UI helpers
  function clearSelection(){ selectedAdminIdxs.clear(); updateBulkBar(); }
  function toggleSelect(idx, on){ if (on) selectedAdminIdxs.add(idx); else selectedAdminIdxs.delete(idx); updateBulkBar(); }
  function updateBulkBar(){ if (!bulkBar) return; bulkBar.style.display = selectedAdminIdxs.size ? 'block' : 'none'; }

  // Admin list (plain table-style cards)
  function refreshAdminList(){
    const arr = readEntries().map(normalizeEntry);
    adminList.innerHTML = '';
    arr.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'admin-item';
      const img = document.createElement('img'); img.src = it.src;
      const nameRow = document.createElement('div'); nameRow.style.display='flex'; nameRow.style.justifyContent='space-between'; nameRow.style.alignItems='center'; nameRow.style.gap='8px';
      const p = document.createElement('p'); p.textContent = it.answer; p.className = 'editable'; p.style.margin='0';
      const controls = document.createElement('div'); controls.className = 'row';

      const sel = document.createElement('input'); sel.type='checkbox'; sel.className='selbox'; sel.checked = selectedAdminIdxs.has(idx);
      sel.addEventListener('change',(e)=>{ toggleSelect(idx, e.target.checked); renderGallery(); });

      const toggleBtn = document.createElement('button'); toggleBtn.textContent = (it.active !== false) ? 'Unlist' : 'List';
      const del = document.createElement('button'); del.textContent = 'Delete';

      toggleBtn.addEventListener('click', () => {
        const next = readEntries().map(normalizeEntry);
        next[idx].active = !(next[idx].active !== false);
        writeEntries(next); refreshAdminList(); renderGallery();
      });
      del.addEventListener('click', () => {
        const next = readEntries();
        next.splice(idx,1); writeEntries(next); refreshAdminList(); renderGallery();
      });

      nameRow.appendChild(p); nameRow.appendChild(controls);
      controls.appendChild(toggleBtn); controls.appendChild(del);

      div.appendChild(sel);
      div.appendChild(img); div.appendChild(nameRow);
      adminList.appendChild(div);

      // inline rename
      makeEditableCaption(p, () => idx);
    });
  }

  // Gallery (built-in + admin)
  function renderGallery(){
    const adminEntries = readEntries().map(normalizeEntry);
    const full = BUILTIN.concat(adminEntries);
    galleryList.innerHTML = '';
    full.forEach((it, idx) => {
      const isBuiltin = idx < BUILTIN.length;
      const adminIdx = isBuiltin ? -1 : (idx - BUILTIN.length);

      const div = document.createElement('div');
      div.className = 'gallery-item';
      if (isBuiltin) div.classList.add('builtin');

      const sel = document.createElement('input'); sel.type='checkbox'; sel.className='selbox';
      if (isBuiltin){ sel.disabled = true; sel.title = 'Built-in (view-only)'; }
      else {
        sel.checked = selectedAdminIdxs.has(adminIdx);
        sel.addEventListener('change', (e)=>{ toggleSelect(adminIdx, e.target.checked); div.classList.toggle('selected', e.target.checked); refreshAdminList(); });
        div.classList.toggle('selected', selectedAdminIdxs.has(adminIdx));
      }
      div.appendChild(sel);

      const img = document.createElement('img'); img.src = it.src;
      const cap = document.createElement('div'); cap.className='caption editable'; cap.textContent = it.answer;
      div.appendChild(img); div.appendChild(cap);

      if (!isBuiltin){
        const actions = document.createElement('div'); actions.className = 'quick-actions';
        const toggleBtn = document.createElement('button'); toggleBtn.textContent = (adminEntries[adminIdx].active !== false) ? 'Unlist' : 'List';
        const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
        toggleBtn.addEventListener('click', () => {
          const arr = readEntries().map(normalizeEntry);
          arr[adminIdx].active = !(arr[adminIdx].active !== false);
          writeEntries(arr); renderGallery(); refreshAdminList();
        });
        delBtn.addEventListener('click', () => {
          const arr = readEntries();
          arr.splice(adminIdx,1); writeEntries(arr); renderGallery(); refreshAdminList();
        });
        actions.appendChild(toggleBtn); actions.appendChild(delBtn);
        div.appendChild(actions);

        // Double-click item to toggle selection
        div.addEventListener('dblclick', () => {
          const currently = selectedAdminIdxs.has(adminIdx);
          toggleSelect(adminIdx, !currently);
          sel.checked = !currently;
          div.classList.toggle('selected', !currently);
          if (bulkBar) bulkBar.scrollIntoView({behavior:'smooth', block:'nearest'});
        });

        makeEditableCaption(cap, () => adminIdx);
      }

      galleryList.appendChild(div);
    });
  }

  // Inline rename helper
  function makeEditableCaption(el, getIndex){
    el.classList.add('editable'); el.title = 'Double-click to rename';
    el.addEventListener('dblclick', () => {
      const current = el.textContent;
      const input = document.createElement('input');
      input.type = 'text'; input.value = current; input.style.width='100%';
      el.replaceWith(input); input.focus();
      function commit(){
        const val = input.value.trim();
        const arr = readEntries();
        const idx = getIndex();
        if (idx != null && arr[idx]){
          arr[idx] = normalizeEntry(arr[idx]);
          arr[idx].answer = val || arr[idx].answer;
          writeEntries(arr);
        }
        refreshAdminList(); renderGallery();
      }
      input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') commit(); if (e.key==='Escape'){ refreshAdminList(); renderGallery(); } });
      input.addEventListener('blur', commit);
    });
  }

  // Bulk bar setup
  function setupBulkBar(){
    if (!selectAll) return;
    selectAll.addEventListener('change', () => {
      const arr = readEntries();
      clearSelection();
      if (selectAll.checked){ for (let i=0;i<arr.length;i++){ selectedAdminIdxs.add(i); } }
      updateBulkBar(); refreshAdminList(); renderGallery();
    });
    clearSelBtn?.addEventListener('click', () => { clearSelection(); selectAll.checked = false; refreshAdminList(); renderGallery(); });
    bulkListBtn?.addEventListener('click', () => {
      const arr = readEntries();
      selectedAdminIdxs.forEach(i => { if (arr[i]) arr[i].active = true; });
      writeEntries(arr); clearSelection(); selectAll.checked = false; refreshAdminList(); renderGallery();
    });
    bulkUnlistBtn?.addEventListener('click', () => {
      const arr = readEntries();
      selectedAdminIdxs.forEach(i => { if (arr[i]) arr[i].active = false; });
      writeEntries(arr); clearSelection(); selectAll.checked = false; refreshAdminList(); renderGallery();
    });
    bulkDeleteBtn?.addEventListener('click', () => {
      let arr = readEntries();
      const list = Array.from(selectedAdminIdxs).sort((a,b)=>b-a);
      for (const i of list){ if (arr[i]) arr.splice(i,1); }
      writeEntries(arr); clearSelection(); selectAll.checked = false; refreshAdminList(); renderGallery();
    });
  }

  // Submissions (approve / reject)
  function renderSubmissions(){
    submissionsCard.style.display = 'block';
    const arr = readSubmissions();
    submissionsList.innerHTML = '';
    arr.forEach((it, idx) => {
      const div = document.createElement('div'); div.className='admin-item';
      const img = document.createElement('img'); img.src = it.src;
      const nameRow = document.createElement('div'); nameRow.style.display='flex'; nameRow.style.justifyContent='space-between'; nameRow.style.alignItems='center'; nameRow.style.gap='8px';
      const p = document.createElement('p'); p.textContent = it.answer; p.style.margin='0';
      const controls = document.createElement('div'); controls.className='row';
      const approveBtn = document.createElement('button'); approveBtn.textContent='Approve';
      const rejectBtn = document.createElement('button'); rejectBtn.textContent='Reject';
      approveBtn.addEventListener('click', () => {
        const adminArr = readEntries();
        adminArr.push({ src: it.src, answer: it.answer, active: true });
        writeEntries(adminArr);
        const next = readSubmissions(); next.splice(idx,1); writeSubmissions(next);
        refreshAdminList(); renderGallery(); renderSubmissions();
      });
      rejectBtn.addEventListener('click', () => {
        const next = readSubmissions(); next.splice(idx,1); writeSubmissions(next); renderSubmissions();
      });
      controls.appendChild(approveBtn); controls.appendChild(rejectBtn);
      nameRow.appendChild(p); nameRow.appendChild(controls);
      div.appendChild(img); div.appendChild(nameRow);
      submissionsList.appendChild(div);
    });
  }

  
  // Upload removed in Imgur URL mode
  // Add form
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const urls = imageUrls ? imageUrls.value : '';
    const answer = (answerText.value || '').trim();
    addByUrls(urls, answer);
    if (imageUrls) imageUrls.value = '';
    answerText.value = '';
  });
const files = imageFile.files;
    const answer = (answerText.value || '').trim();
    if (!files || !files.length){ alert('Please select one or more images.'); return; }
    addFiles(files, answer);
    imageFile.value = ''; answerText.value = '';
  });
exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(readEntries(), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'gooned_admin_entries.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Remove all admin entries?')){ localStorage.setItem(ADMIN_KEY, '[]');
__queueRebuild(); refreshAdminList(); renderGallery(); }
  });

  // Init
  setupBulkBar();
  refreshAdminList();
  renderGallery();
  renderSubmissions();
})();


// === Moderation: approve submission -> moves into GOONED_CUSTOM (active: true) ===
(function(){
  const ADMIN_KEY = 'GOONED_CUSTOM';
  const SUBMIT_KEY = 'GOONED_SUBMISSIONS';

  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)||'') || fallback; } catch { return fallback; }
  }
  function writeJSON(key, v){ localStorage.setItem(key, JSON.stringify(v));
__queueRebuild(); }

  function approveSubmission(idx){
    const subs = readJSON(SUBMIT_KEY, []);
    const item = subs[idx];
    if (!item){ alert('Missing submission'); return; }
    const entries = readJSON(ADMIN_KEY, []);
    entries.push({ src: item.src, answer: item.answer || '', active: true, approved: true });
    writeJSON(ADMIN_KEY, entries);
    subs.splice(idx, 1);
    writeJSON(SUBMIT_KEY, subs);
    alert('Approved and added to rotation.');
    if (window.refreshAdminList) window.refreshAdminList();
    if (window.renderSubmissions) window.renderSubmissions();
    if (window.renderGallery) window.renderGallery();
  }

  // Patch the existing renderSubmissions UI (if present) to include Approve buttons
  const origRenderSubs = window.renderSubmissions;
  window.renderSubmissions = function(){
    if (origRenderSubs) origRenderSubs();
    const wrap = document.getElementById('submissionsList') || document.getElementById('submissions');
    if (!wrap) return;
    const cards = wrap.querySelectorAll('[data-sub-index]');
    if (cards.length === 0){
      // Try to construct simple cards if not present
      const subs = readJSON(SUBMIT_KEY, []);
      wrap.innerHTML = '';
      subs.forEach((s, i)=>{
        const div = document.createElement('div');
        div.className = 'card row';
        div.dataset.subIndex = i;
        div.innerHTML = `
          <div class="row" style="gap:10px;align-items:center;">
            <img src="${s.src}" alt="" style="width:100px;border-radius:8px" />
            <div class="col" style="flex:1;">
              <strong>${(s.answer||'').replace(/</g,'&lt;')}</strong>
              <div class="muted">${new Date(s.time||Date.now()).toLocaleString()}</div>
            </div>
            <div class="row" style="gap:8px;">
              <button data-approve="${i}">Approve</button>
              <button data-delete="${i}">Delete</button>
            </div>
          </div>`;
        wrap.appendChild(div);
      });
    }
    wrap.querySelectorAll('button[data-approve]').forEach(btn=>{
      btn.addEventListener('click', ()=>approveSubmission(parseInt(btn.dataset.approve,10)));
    });
    wrap.querySelectorAll('button[data-delete]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.dataset.delete,10);
        const subs = readJSON(SUBMIT_KEY, []);
        subs.splice(idx,1);
        writeJSON(SUBMIT_KEY, subs);
        window.renderSubmissions && window.renderSubmissions();
      });
    });
  };
})();


// Bulk remove all entries (Imgur URL mode)
(() => {
  const bulkRemoveBtn = document.getElementById('bulkRemoveBtn');
  if (!bulkRemoveBtn) return;
  bulkRemoveBtn.addEventListener('click', () => {
    if (!confirm('Remove ALL entries? This cannot be undone.')) return;
    writeEntries([]);
    refreshAdminList();
    renderGallery();
    alert('All entries removed. The game will reshuffle.');
  });
})();
