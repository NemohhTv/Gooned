/* Local-only Admin (Imgur URLs, stored in localStorage) */
(function(){
  'use strict';

  const KEY = 'GOONED_CUSTOM';
  const gallery = document.getElementById('gallery');
  const imageUrls = document.getElementById('imageUrls');
  const answerText = document.getElementById('answerText');
  const addForm = document.getElementById('addForm');
  const clearBtn = document.getElementById('clearBtn');
  const counts = document.getElementById('counts');
  const urlValidation = document.getElementById('urlValidation');
  const urlPreview = document.getElementById('urlPreview');

  function readEntries(){
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : { entries: [], version: 0 };
      return Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch { return []; }
  }
  function writeEntries(arr){
    const payload = { entries: arr, version: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  }

  // Imgur helpers + validation
  function classifyImgurLine(line){
    const raw = (line||'').trim();
    if (!raw) return { valid:false, reason:'empty' };
    if (/imgur\.com\/(a|gallery)\//i.test(raw)) return { valid:false, reason:'album_or_gallery' };
    if (/^https?:\/\/i\.imgur\.com\/[A-Za-z0-9]+\.(jpg|jpeg|png|webp|gif)$/i.test(raw)) return { valid:true, url: raw };
    let m = raw.match(/^https?:\/\/imgur\.com\/([A-Za-z0-9]+)(?:\.(jpg|jpeg|png|webp|gif))?$/i);
    if (m) return { valid:true, url: `https://i.imgur.com/${m[1]}.${(m[2]||'jpg').toLowerCase()}` };
    m = raw.match(/^([A-Za-z0-9]+)$/);
    if (m) return { valid:true, url: `https://i.imgur.com/${m[1]}.jpg` };
    if (/^https?:\/\//i.test(raw)) return { valid:false, reason:'non_imgur_or_not_direct' };
    return { valid:false, reason:'unrecognized' };
  }
  function validateImgurList(multiline){
    const lines = (multiline||'').split(/\r?\n/).map(s=>s.trim());
    const valid = []; const invalid = [];
    lines.forEach((ln, idx)=>{
      if (!ln) return;
      const res = classifyImgurLine(ln);
      if (res.valid) valid.push({ line: idx+1, url: res.url, input: ln });
      else invalid.push({ line: idx+1, input: ln, reason: res.reason });
    });
    return { valid, invalid };
  }
  function renderValidation(){
    if (!urlValidation) return;
    const { valid, invalid } = validateImgurList(imageUrls.value);
    const msgs = [];
    if (valid.length) msgs.push(`<div>✅ Valid: <strong>${valid.length}</strong></div>`);
    if (invalid.length){
      const list = invalid.slice(0,6).map(it=>{
        let reason = it.reason;
        if (reason==='album_or_gallery') reason = 'album/gallery not supported';
        if (reason==='non_imgur_or_not_direct') reason = 'not a direct Imgur URL';
        if (reason==='unrecognized') reason = 'unrecognized format';
        if (reason==='empty') reason = 'empty line';
        return `<li>Line ${it.line}: <code>${it.input.replace(/</g,'&lt;')}</code> — ${reason}</li>`;
      }).join('');
      msgs.push(`<div>⚠️ Invalid: <strong>${invalid.length}</strong></div><ul style="margin:.25em 0 0 .75em">${list}${invalid.length>6?'<li>…</li>':''}</ul>`);
    }
    urlValidation.innerHTML = msgs.join('');
    renderPreview();
  }
  function renderPreview(){
    if (!urlPreview) return;
    const { valid } = validateImgurList(imageUrls.value);
    const urls = valid.slice(0,3).map(v=>v.url);
    urlPreview.innerHTML = urls.map(u=>`<img src="${u}" alt="preview" width="56" height="56" loading="lazy">`).join('');
  }

  // Add by URLs
  function addByUrls(multiline, caption){
    const { valid } = validateImgurList(multiline);
    if (!valid.length){ alert('No valid Imgur links detected.'); return; }
    const arr = readEntries();
    const useCaption = (caption||'').trim();
    valid.forEach((v, i)=>{
      const base = useCaption ? (valid.length>1 ? `${useCaption} ${i+1}` : useCaption) : v.url.split('/').pop().split('.')[0];
      arr.push({ src: v.url, answer: base, active: true });
    });
    writeEntries(arr);
    imageUrls.value = ''; answerText.value = '';
    renderValidation();
    renderGallery();
  }

  // Inline caption editor
  function makeEditableCaption(el, getIndex){
    if (!el) return;
    el.contentEditable = 'true'; el.spellcheck = false;
    el.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); el.blur(); } });
    el.addEventListener('blur', ()=>{
      const idx = typeof getIndex==='function' ? getIndex() : -1;
      const arr = readEntries();
      if (idx<0 || idx>=arr.length) return;
      const next = (el.textContent||'').trim();
      if (next && next !== arr[idx].answer){
        arr[idx].answer = next;
        writeEntries(arr);
        renderCounts();
      }
    });
  }

  function renderCounts(){
    const n = readEntries().length;
    if (counts) counts.textContent = n + (n===1 ? ' item' : ' items');
  }

  // Gallery render
  function renderGallery(){
    const arr = readEntries();
    renderCounts();
    if (!gallery) return;
    gallery.innerHTML = '';
    arr.forEach((p, idx)=>{
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <img class="thumb" alt="image ${idx+1}" loading="lazy" src="${p.src}">
        <div class="meta">
          <div class="caption editable" tabindex="0">${(p.answer||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>
          <div class="controls">
            <label class="help"><input type="checkbox" ${p.active?'checked':''} /> Active</label>
            <div class="row" style="gap:6px">
              <button type="button" data-act="up">↑</button>
              <button type="button" data-act="down">↓</button>
              <button type="button" data-act="delete">Delete</button>
            </div>
          </div>
        </div>
      `;
      const cap = div.querySelector('.caption');
      makeEditableCaption(cap, ()=> idx);

      // Active toggle
      div.querySelector('input[type=checkbox]').addEventListener('change', (e)=>{
        const arr2 = readEntries();
        if (!arr2[idx]) return;
        arr2[idx].active = !!e.target.checked;
        writeEntries(arr2);
      });

      // Reorder/Delete
      div.querySelectorAll('button[data-act]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const act = btn.getAttribute('data-act');
          const arr2 = readEntries();
          if (act==='delete'){
            arr2.splice(idx,1);
          } else if (act==='up' && idx>0){
            [arr2[idx-1], arr2[idx]] = [arr2[idx], arr2[idx-1]];
          } else if (act==='down' && idx < arr2.length-1){
            [arr2[idx+1], arr2[idx]] = [arr2[idx], arr2[idx+1]];
          }
          writeEntries(arr2);
          renderGallery();
        });
      });

      gallery.appendChild(div);
    });
  }

  // Wire form
  addForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    addByUrls(imageUrls.value, answerText.value);
  });
  clearBtn.addEventListener('click', ()=>{
    if (!confirm('Remove ALL entries?')) return;
    writeEntries([]);
    renderGallery();
  });

  // Init
  if (imageUrls){
    imageUrls.addEventListener('input', renderValidation);
    if (imageUrls.value) renderValidation();
  }
  renderGallery();

  // Let the game tab rebuild + shuffle immediately via storage event
  // (nothing to do here; writing localStorage is enough across same-origin tabs)
})();