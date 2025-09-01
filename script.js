
(function(){
  const KEY = 'minimal-goals-v1';
  const THEME_KEY = 'minimal-goals-theme';
  const SETTINGS_KEY = 'minimal-goals-settings-v1';
  const qs = sel=>document.querySelector(sel);

  let goals = [];
  let searchTerm = '';
  let settings = {
    imageResize: true,
    imageMax: 800,
    playSound: true,
    sort: 'newest',
    confirmDelete: true,
    compact: false,
    transparent: false
  };

  // utils
  const uid = ()=> Math.random().toString(36).slice(2,9);
  const fmtMoney = n=> new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const pct = g => g.target ? Math.min(100, Math.round((g.saved / g.target)*100)) : 0;
  const fmtDate = iso => { try { const d = new Date(iso); return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch(e){return ''} }

  function save(){ localStorage.setItem(KEY, JSON.stringify(goals)); render(); }
  function load(){ try{ const raw = localStorage.getItem(KEY); if(raw) goals = JSON.parse(raw) }catch(e){console.error(e); goals=[]} }
  function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); applySettings(); }
  function loadSettings(){ try{ const raw = localStorage.getItem(SETTINGS_KEY); if(raw) settings = Object.assign(settings, JSON.parse(raw)); }catch(e){console.error(e)} }

  // image resize helper
  function resizeImageDataURL(dataURL, maxSize){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        let {width, height} = img;
        const ratio = width/height;
        if(width > maxSize || height > maxSize){
          if(width > height){ width = maxSize; height = Math.round(maxSize/ratio); } else { height = maxSize; width = Math.round(maxSize*ratio); }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height);
        ctx.drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = ()=> resolve(dataURL);
      img.src = dataURL;
    });
  }

  async function fileToDataURLResized(file){
    const reader = new FileReader();
    return new Promise((resolve,reject)=>{
      reader.onload = async ()=>{
        let data = reader.result;
        try{
          if(settings.imageResize){ data = await resizeImageDataURL(data, settings.imageMax); }
        }catch(e){ console.warn('resize failed', e); }
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // play simple tone using WebAudio
  function playTone(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.02;
      o.connect(g); g.connect(ctx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35); o.stop(ctx.currentTime + 0.36);
    }catch(e){console.warn('audio fail', e)}
  }

  // apply visual settings
  function applySettings(){
    if(settings.compact) document.body.classList.add('compact'); else document.body.classList.remove('compact');
    if(settings.transparent) document.body.classList.add('transparent'); else document.body.classList.remove('transparent');
    render();
    // populate sort dropdown
    const dd = qs('#sortDropdown'); const sel = qs('#sortSelected'); const opts = qs('#sortOptions');
    if(dd && sel && opts){
      sel.textContent = opts.querySelector('.option[data-value="'+settings.sort+'"]')?.textContent || 'Newest first';
    }
    const elResize = qs('#setImageResize'); if(elResize) elResize.checked = !!settings.imageResize;
    const elImageMax = qs('#setImageMax'); if(elImageMax) elImageMax.value = settings.imageMax;
    const elPlay = qs('#setPlaySound'); if(elPlay) elPlay.checked = !!settings.playSound;
    const elConfirm = qs('#setConfirmDelete'); if(elConfirm) elConfirm.checked = !!settings.confirmDelete;
    const elCompact = qs('#setCompact'); if(elCompact) elCompact.checked = !!settings.compact;
    const elTransparent = qs('#setTransparent'); if(elTransparent) elTransparent.checked = !!settings.transparent;
  }

  // sorting
  function sortedGoals(list){
    const copy = list.slice();
    if(settings.sort === 'newest') return copy.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    if(settings.sort === 'oldest') return copy.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
    if(settings.sort === 'progress') return copy.sort((a,b)=> (b.saved/b.target || 0) - (a.saved/a.target || 0));
    if(settings.sort === 'title') return copy.sort((a,b)=> a.title.localeCompare(b.title));
    return copy;
  }

  // validate and normalize URL (add https:// if missing)
  function normalizeUrl(u){
    if(!u) return '';
    u = u.trim();
    if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try{ const url = new URL(u); return url.href; }catch(e){ return ''; }
  }

  // render (filter by search) with index preserved after sorting
  function render(){
    const list = qs('#goalsList');
    const empty = qs('#emptyMsg');
    const filtered = goals.filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const sorted = sortedGoals(filtered);

    qs('#count').textContent = goals.length + (goals.length===1? ' goal':' goals');
    const totalSaved = goals.reduce((s,g)=> s + (Number(g.saved)||0), 0);
    qs('#totalSaved').textContent = fmtMoney(totalSaved);

    list.innerHTML = '';
    if(sorted.length===0){ empty.style.display='block'; list.style.display='none'; return; }
    empty.style.display='none'; list.style.display='flex';

    sorted.forEach((g, idx)=>{
      const item = document.createElement('div'); item.className='goal card' + (g.saved >= g.target ? ' completed' : '');

      const thumb = document.createElement('img'); thumb.className='thumb'; thumb.alt = g.title || 'thumb';
      if(g.image) thumb.src = g.image; else thumb.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#e6eef6"/></svg>`);
      thumb.style.flex = '0 0 auto';

      const meta = document.createElement('div'); meta.className='meta';
      const h3 = document.createElement('h3');
      // title with optional link icon
      const titleSpan = document.createElement('span'); titleSpan.textContent = `${idx+1}. ${g.title || 'Untitled'}`;
      h3.appendChild(titleSpan);
      if(g.link){
        const a = document.createElement('a'); a.className='link-icon'; a.href = g.link; a.target = '_blank'; a.rel='noreferrer noopener';
        a.title = 'Open product link';
        a.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 14L21 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21H3V3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0"/></svg>';
        h3.appendChild(a);
      }

      const small = document.createElement('div'); small.className='small';
      small.innerHTML = `<strong>${fmtMoney(g.saved)}</strong> / ${fmtMoney(g.target)} <span class="muted-kv">• Added ${fmtDate(g.createdAt)}</span>`;

      const progressWrap = document.createElement('div'); progressWrap.className='progress-wrap';
      const bar = document.createElement('div'); bar.className='progress';
      requestAnimationFrame(()=>{ bar.style.width = pct(g) + '%'; });

      progressWrap.appendChild(bar);
      meta.appendChild(h3); meta.appendChild(small); meta.appendChild(progressWrap);

      const actions = document.createElement('div'); actions.style.minWidth='220px'; actions.style.display='flex'; actions.style.flexDirection='column';

      const controls = document.createElement('div'); controls.className='controls';
      const input = document.createElement('input'); input.type='number'; input.min='0'; input.placeholder='amount'; input.className='tiny'; input.style.padding='8px';
      const addBtn = document.createElement('button'); addBtn.className='tiny success'; addBtn.textContent='Add';
      addBtn.onclick = ()=>{
        const val = Number(input.value);
        if(!val || val<=0) return; const prev = Number(g.saved)||0; g.saved = Number((g.saved + val).toFixed(2)); save(); input.value='';
        item.classList.remove('pulse'); void item.offsetWidth; item.classList.add('pulse');
        if(prev < g.target && g.saved >= g.target){ if(settings.playSound) playTone(); item.animate([{boxShadow:'0 6px 16px rgba(20,160,80,0.06)'},{boxShadow:'0 18px 40px rgba(20,160,80,0.12)'},{boxShadow:'0 6px 16px rgba(20,160,80,0.06)'}], {duration:700}); }
      }

      const linkBtn = document.createElement('button'); linkBtn.className='tiny ghost'; linkBtn.textContent = g.link ? 'Change link' : 'Set link';
      linkBtn.onclick = ()=>{
        let cur = g.link || '';
        const inputUrl = prompt('Paste product link (full URL):', cur);
        if(inputUrl === null) return; // cancelled
        const normalized = normalizeUrl(inputUrl);
        if(inputUrl && !normalized){ alert('Invalid URL'); return; }
        g.link = normalized || null; save();
      };

      const imageChangeBtn = document.createElement('button'); imageChangeBtn.className='tiny ghost'; imageChangeBtn.textContent='Change image';
      imageChangeBtn.onclick = ()=>{
        const f = document.createElement('input'); f.type='file'; f.accept='image/*'; f.onchange = async ()=>{
          const file = f.files[0]; if(!file) return; try{ const data = await fileToDataURLResized(file); g.image = data; save(); }catch(e){ alert('Failed to load image'); }
        }; f.click();
      };

      const resetBtn = document.createElement('button'); resetBtn.className='tiny ghost'; resetBtn.textContent='Reset';
      resetBtn.onclick = ()=>{ if(settings.confirmDelete && !confirm('Reset saved to 0?')) return; g.saved = 0; save(); }
      const delBtn = document.createElement('button'); delBtn.className='tiny danger'; delBtn.textContent='Delete';
      delBtn.onclick = ()=>{ if(settings.confirmDelete && !confirm('Delete this goal?')) return; goals = goals.filter(x=>x.id!==g.id); save(); }

      controls.appendChild(input); controls.appendChild(addBtn);
      actions.appendChild(controls);
      const row2 = document.createElement('div'); row2.style.display='flex'; row2.style.gap='8px'; row2.style.marginTop='8px';
      row2.appendChild(linkBtn); row2.appendChild(imageChangeBtn); row2.appendChild(resetBtn); row2.appendChild(delBtn);
      actions.appendChild(row2);

      thumb.style.cursor = 'pointer'; thumb.addEventListener('click', ()=> imageChangeBtn.click());

      item.appendChild(thumb); item.appendChild(meta); item.appendChild(actions);
      list.appendChild(item);
    });
  }

  // wire form
  qs('#goalForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const title = qs('#title').value.trim();
    const target = Number(qs('#target').value) || 0;
    if(!title || !target || target<=0){ alert('Please enter title and a target amount > 0'); return; }

    const fileInput = qs('#image');
    let imageData = null;
    if(fileInput && fileInput.files && fileInput.files[0]){
      try{ imageData = await fileToDataURLResized(fileInput.files[0]); }catch(e){ console.warn('image failed', e); }
    }

    const g = { id: uid(), title, target, saved: 0, createdAt: new Date().toISOString(), image: imageData, link: null };
    goals.unshift(g); save();
    qs('#title').value=''; qs('#target').value=''; if(fileInput) fileInput.value = '';
  });

  // export / import
  qs('#exportBtn').addEventListener('click', ()=>{
    const txt = JSON.stringify(goals, null, 2);
    navigator.clipboard && navigator.clipboard.writeText(txt).then(()=>{ alert('Copied JSON to clipboard'); }, ()=>{ prompt('Copy this JSON', txt); });
  });

  qs('#exportJsonBtn').addEventListener('click', ()=>{
    const payload = JSON.stringify(goals, null, 2);
    const blob = new Blob([payload],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'minimal-goals.json'; a.click(); URL.revokeObjectURL(url);
  });

  qs('#clearLocalBtn').addEventListener('click', ()=>{
    if(!confirm('Delete local data? This cannot be undone.')) return; goals = []; save(); localStorage.removeItem(KEY); render();
  });

  qs('#clearAllBtn').addEventListener('click', ()=>{
    if(!confirm('Delete ALL goals locally?')) return; goals = goals.filter(()=>false); save(); localStorage.removeItem(KEY); render();
  });

  qs('#importToggle').addEventListener('click', ()=>{ const area = qs('#importArea'); area.style.display = area.style.display==='none'?'block':'none'; });
  qs('#importBtn').addEventListener('click', ()=>{
    const raw = qs('#importJson').value.trim(); if(!raw) return alert('Paste JSON into the box');
    try{ const parsed = JSON.parse(raw); if(!Array.isArray(parsed)) throw new Error('Expecting JSON array');
      goals = parsed.map(g=>({ id: g.id||uid(), title: g.title||'Untitled', target: Number(g.target)||0, saved: Number(g.saved)||0, createdAt: g.createdAt||new Date().toISOString(), image: g.image||null, link: g.link||null })); save(); qs('#importJson').value=''; qs('#importArea').style.display='none';
    }catch(e){ alert('Invalid JSON: '+e.message); }
  });

  qs('#importFileBtn').addEventListener('click', ()=>{ const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange = ()=>{ const f = inp.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = e=>{ try{ const parsed = JSON.parse(e.target.result); if(!Array.isArray(parsed)) throw new Error('Expecting JSON array');
          goals = parsed.map(g=>({ id: g.id||uid(), title: g.title||'Untitled', target: Number(g.target)||0, saved: Number(g.saved)||0, createdAt: g.createdAt||new Date().toISOString(), image: g.image||null, link: g.link||null })); save(); qs('#importArea').style.display='none'; }catch(err){ alert('Invalid file: '+err.message); } }; reader.readAsText(f); }; inp.click();
  });

  // search
  qs('#search').addEventListener('input', (e)=>{ searchTerm = e.target.value || ''; render(); });

  // settings modal wiring
  const overlay = qs('#overlay');
  qs('#settingsBtn').addEventListener('click', ()=>{ overlay.classList.add('open'); // focus dropdown for keyboard
    const dd = qs('#sortDropdown'); if(dd) dd.focus(); });
  qs('#closeSettings').addEventListener('click', ()=>{ overlay.classList.remove('open'); });
  qs('#overlay').addEventListener('click', (e)=>{ if(e.target === overlay) overlay.classList.remove('open'); });

  // custom dropdown behavior
  (function initDropdown(){
    const dd = qs('#sortDropdown'); if(!dd) return;
    const sel = qs('#sortSelected'); const opts = qs('#sortOptions');
    dd.addEventListener('click', ()=>{ const open = dd.classList.toggle('open'); opts.style.display = open ? 'block' : 'none'; dd.setAttribute('aria-expanded', open?'true':'false'); });
    dd.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dd.click(); }
      if(e.key === 'Escape') { dd.classList.remove('open'); opts.style.display='none'; dd.setAttribute('aria-expanded','false'); }
    });
    opts.addEventListener('click', (ev)=>{ const option = ev.target.closest('.option'); if(!option) return; const val = option.getAttribute('data-value'); settings.sort = val; sel.textContent = option.textContent; // mark active
      opts.querySelectorAll('.option').forEach(o=>o.classList.remove('active')); option.classList.add('active'); opts.style.display='none'; dd.classList.remove('open'); dd.setAttribute('aria-expanded','false'); render(); });
    // keyboard nav: left as-is for simplicity
  })();

  qs('#saveSettings').addEventListener('click', ()=>{
    // settings from controls
    // sort already updated via dropdown, but ensure we read current displayed
    const sel = qs('#sortSelected'); const activeOption = qs('#sortOptions .option.active');
    if(activeOption) settings.sort = activeOption.getAttribute('data-value');
    settings.imageResize = !!qs('#setImageResize').checked;
    settings.imageMax = Math.max(200, Number(qs('#setImageMax').value)||800);
    settings.playSound = !!qs('#setPlaySound').checked;
    settings.confirmDelete = !!qs('#setConfirmDelete').checked;
    settings.compact = !!qs('#setCompact').checked;
    settings.transparent = !!qs('#setTransparent').checked;
    saveSettings(); overlay.classList.remove('open');
  });
  
  function applyTheme(theme){ if(theme === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark'); localStorage.setItem(THEME_KEY, theme); qs('#themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙'; }
  function toggleTheme(){ const cur = localStorage.getItem(THEME_KEY) || 'light'; const next = cur === 'dark' ? 'light' : 'dark'; applyTheme(next); }
  qs('#themeToggle').addEventListener('click', toggleTheme);

  (function init(){ loadSettings(); applySettings(); const theme = localStorage.getItem(THEME_KEY) || 'light'; applyTheme(theme); load(); render();
    qs('#setImageResize').checked = !!settings.imageResize;
    qs('#setImageMax').value = settings.imageMax;
    qs('#setPlaySound').checked = !!settings.playSound;
    qs('#setConfirmDelete').checked = !!settings.confirmDelete;
    qs('#setCompact').checked = !!settings.compact;
    qs('#setTransparent').checked = !!settings.transparent;
    const opts = qs('#sortOptions'); opts.querySelectorAll('.option').forEach(o=>o.classList.remove('active'));
    const cur = opts.querySelector('.option[data-value="'+settings.sort+'"]'); if(cur) cur.classList.add('active'); qs('#sortSelected').textContent = cur ? cur.textContent : 'Newest first';
  })();

})();
