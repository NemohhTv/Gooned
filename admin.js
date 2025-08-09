(()=>{
  const ADMIN_KEY = 'GOONED_CUSTOM';
  const SUBMIT_KEY = 'GOONED_SUBMISSIONS';
  const BUILTIN = Array.isArray(window.GOONED_BUILTIN) ? window.GOONED_BUILTIN : [];

  // Helper Storage
  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)||'') ?? fallback; }
    catch { return fallback; }
  }
  function writeJSON(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  // Elements (fallback-create lightweight URL form if markup is missing)
  const adminApp = document.getElementById('adminApp') || document.body;
  let addForm = document.getElementById('addForm');
  let imageUrl = document.getElementById('imageUrl');
  let answerText = document.getElementById('answerText');
  let adminList = document.getElementById('adminList');
  let galleryList = document.getElementById('galleryList');
  let exportBtn = document.getElementById('exportBtn');
  let clearBtn = document.getElementById('clearBtn');

  // If no form exists (because the HTML was redacted), create a minimal one that matches the "same look"
  if (!addForm){
    const card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header"><h2>Add by URL</h2></div>
      <div class="card-body">
        <form id="addForm" class="row" autocomplete="off">
          <label style="flex:2;display:flex;flex-direction:column;gap:6px">
            <span>Image URL (Imgur, etc.)</span>
            <input id="imageUrl" type="url" placeholder="https://i.imgur.com/xyz123.jpg" required />
          </label>
          <label style="flex:1;display:flex;flex-direction:column;gap:6px">
            <span>Answer (Name)</span>
            <input id="answerText" type="text" placeholder="Person / Filename" required />
          </label>
          <button id="addBtn" type="submit">Add</button>
        </form>
        <p class="help">Tip: Use direct image URLs (ending with .jpg, .png, .webp). Imgur: open image → right‑click → "Copy image address".</p>
      </div>
    `;
    adminApp.prepend(card);
    addForm = card.querySelector('#addForm');
    imageUrl = card.querySelector('#imageUrl');
    answerText = card.querySelector('#answerText');
  }

  // Ensure lists exist
  if (!adminList){
    adminList = document.createElement('div');
    adminList.id = 'adminList';
    adminList.className = 'admin-list';
    adminApp.append(adminList);
  }
  if (!galleryList){
    galleryList = document.createElement('div');
    galleryList.id = 'galleryList';
    galleryList.className = 'admin-list';
    adminApp.append(galleryList);
  }

  // Model
  function getAll(){
    const active = readJSON(ADMIN_KEY, []).filter(e => e && (e.active !== false));
    return BUILTIN.concat(active);
  }

  function renderAdminList(){
    const entries = readJSON(ADMIN_KEY, []);
    adminList.innerHTML = '';
    entries.forEach((e, idx)=>{
      const item = document.createElement('div');
      item.className = 'admin-item';
      item.innerHTML = `
        <img src="${e.src || e.url || ''}" alt="" onerror="this.src='assets/placeholder.jpg'"/>
        <div class="row" style="margin-top:6px;gap:6px">
          <input data-answer="${idx}" type="text" value="${e.answer || ''}" placeholder="Answer" style="flex:1"/>
        </div>
        <div class="row" style="margin-top:6px;gap:6px">
          <button data-toggle="${idx}" class="small">${e.active === false ? 'List' : 'Unlist'}</button>
          <button data-delete="${idx}" class="small danger">Delete</button>
        </div>
      `;
      adminList.append(item);
    });

    // Wire events
    adminList.querySelectorAll('input[type="text"][data-answer]').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const i = +inp.dataset.answer;
        const list = readJSON(ADMIN_KEY, []);
        if (!list[i]) return;
        list[i].answer = inp.value.trim();
        writeJSON(ADMIN_KEY, list);
        // trigger storage for other tabs (game) by touching key
        localStorage.setItem('__ping__', String(Date.now()));
      });
    });
    adminList.querySelectorAll('button[data-toggle]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = +btn.dataset.toggle;
        const list = readJSON(ADMIN_KEY, []);
        if (!list[i]) return;
        list[i].active = !(list[i].active !== false); // toggle
        writeJSON(ADMIN_KEY, list);
        renderAdminList();
        localStorage.setItem('__ping__', String(Date.now()));
      });
    });
    adminList.querySelectorAll('button[data-delete]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = +btn.dataset.delete;
        const list = readJSON(ADMIN_KEY, []);
        list.splice(i,1);
        writeJSON(ADMIN_KEY, list);
        renderAdminList();
        localStorage.setItem('__ping__', String(Date.now()));
      });
    });
  }

  function renderGallery(){
    const all = getAll();
    galleryList.innerHTML = '';
    all.forEach(e=>{
      const card = document.createElement('div');
      card.className = 'admin-item';
      card.innerHTML = `
        <img src="${e.src || e.url || ''}" alt="" onerror="this.src='assets/placeholder.jpg'"/>
        <div style="font-weight:700;margin-top:6px">${e.answer || 'Unnamed'}</div>
      `;
      galleryList.append(card);
    });
  }

  function addUrlEntry(url, name){
    const list = readJSON(ADMIN_KEY, []);
    // Normalize to {src, name, active:true}
    const entry = { src: url.trim(), answer: (name||'').trim(), active: true };
    list.push(entry);
    writeJSON(ADMIN_KEY, list);
    // Auto update UI
    renderAdminList();
    renderGallery();
    // Force the game tab to rebuild & shuffle via storage listener
    localStorage.setItem('GOONED_CUSTOM', JSON.stringify(list));
  }

  // Submit handler
  addForm.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const url = imageUrl.value.trim();
    const name = answerText.value.trim();
    if (!url || !/^https?:\/\/.+\.(png|jpe?g|webp|gif)$/i.test(url)){
      alert('Please paste a direct image URL ending in .png, .jpg, .jpeg, .webp, or .gif');
      return;
    }
    if (!name){
      alert('Please enter the answer/name.');
      return;
    }
    // Show quick "publishing" spinner feedback
    const btn = addForm.querySelector('button[type="submit"]');
    const prev = btn.textContent;
    btn.disabled = true; btn.textContent = 'Publishing…';
    // Fake small delay for UX
    setTimeout(()=>{
      addUrlEntry(url, name);
      btn.disabled = false; btn.textContent = prev;
      imageUrl.value = ''; answerText.value = '';
    }, 250);
  });

  // Export / Clear (if present)
  exportBtn?.addEventListener('click', ()=>{
    const list = readJSON(ADMIN_KEY, []);
    const blob = new Blob([JSON.stringify(list, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gooned_admin_entries.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });
  clearBtn?.addEventListener('click', ()=>{
    if (!confirm('Clear all admin entries?')) return;
    writeJSON(ADMIN_KEY, []);
    renderAdminList(); renderGallery();
    localStorage.setItem('GOONED_CUSTOM', JSON.stringify([]));
  });

  // Initial paint
  renderAdminList();
  renderGallery();
})();