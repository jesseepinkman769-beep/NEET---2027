/* NEET 2027 — LIVE SYNC + SHARE VIEW
   Owner data stays in localStorage and is mirrored to Supabase.
   Viewer links are read-only.
*/
(() => {
  const SUPABASE_URL = 'https://bjrcapxhgiakjwnzredm.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_zOw1vQMzTOshcST1e1YnyA_uANcitFJ';
  const CONFIG_KEY = 'neet_live_sync_v1';
  const TABLE = 'neet_tracker_cloud';
  const qs = new URLSearchParams(location.search);
  const shareId = qs.get('share');
  const shareToken = qs.get('token');

  const api = (path, options={}) => fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      ...(options.headers || {})
    }
  });

  const bytesToHex = b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
  async function sha256(s) {
    return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  }
  function rand(n=24) {
    const a = new Uint8Array(n); crypto.getRandomValues(a);
    return bytesToHex(a);
  }
  function localData() {
    const storage = {};
    for (let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if (k && k.startsWith('neet')) storage[k]=localStorage.getItem(k);
    }
    return storage;
  }
  function applyData(data) {
    if (!data || typeof data !== 'object') return;
    Object.entries(data).forEach(([k,v]) => {
      if (k.startsWith('neet')) {
        if (v === null || v === undefined) localStorage.removeItem(k);
        else localStorage.setItem(k, String(v));
      }
    });
    window.dispatchEvent(new StorageEvent('storage'));
    try { if (typeof window.updateDashboard === 'function') window.updateDashboard(); } catch(e){}
  }

  function status(textValue, ok=false) {
    let el=document.getElementById('liveSyncStatus');
    if (!el) {
      el=document.createElement('div');
      el.id='liveSyncStatus';
      el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99999;padding:8px 12px;border-radius:999px;background:rgba(15,23,42,.92);color:#fff;font:600 12px system-ui;box-shadow:0 6px 24px rgba(0,0,0,.18);cursor:pointer';
      document.body.appendChild(el);
    }
    el.textContent=(ok?'● ':'○ ')+textValue;
    el.title=location.href; el.onclick=async()=>{ if(window.__neetShareLink){ try{await navigator.clipboard.writeText(window.__neetShareLink); el.textContent='● LIVE LINK COPIED'; setTimeout(()=>{el.textContent='● LIVE SYNC • connected'},1400); }catch(e){ prompt('Copy this LIVE VIEW link:',window.__neetShareLink); } } };
  }

  async function createOwner() {
    const ownerToken=rand(32), viewerToken=rand(32), id=rand(12);
    const row={
      share_id:id,
      owner_token_hash:await sha256(ownerToken),
      viewer_token_hash:await sha256(viewerToken),
      data:localData(),
      updated_at:new Date().toISOString()
    };
    const r=await api(TABLE,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal','x-share-token':ownerToken},body:JSON.stringify(row)});
    if(!r.ok) throw new Error(await r.text());
    const cfg={shareId:id,ownerToken,viewerToken,createdAt:Date.now()};
    localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));
    return cfg;
  }

  async function ownerConfig() {
    let cfg=null;
    try { cfg=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null'); } catch(e){}
    if (cfg?.shareId && cfg?.ownerToken) {
      const r=await api(TABLE+'?select=share_id&share_id=eq.'+encodeURIComponent(cfg.shareId),{headers:{'x-share-token':cfg.ownerToken}});
      if (r.ok) return cfg;
    }
    return await createOwner();
  }

  async function ownerPush(cfg) {
    const body={data:localData(),updated_at:new Date().toISOString()};
    const r=await api(TABLE+'?share_id=eq.'+encodeURIComponent(cfg.shareId),{
      method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal','x-share-token':cfg.ownerToken},
      body:JSON.stringify(body)
    });
    if(!r.ok) throw new Error(await r.text());
    status('LIVE SYNC • saved',true);
  }

  async function ownerStart() {
    try {
      const cfg=await ownerConfig();
      status('LIVE SYNC • connected',true);
      let last='';
      const push=async()=>{try{
        const snap=JSON.stringify(localData());
        if(snap!==last){last=snap;await ownerPush(cfg);}
      }catch(e){status('LIVE SYNC • offline',false);}};
      await push();
      setInterval(push,2500);
      window.addEventListener('storage',push);
      const link=location.origin+location.pathname+'?share='+cfg.shareId+'&token='+cfg.viewerToken;
      window.__neetShareLink=link;
      const btn=document.getElementById('liveSyncStatus');
      if(btn){ btn.title='Tap to copy your LIVE VIEW link'; btn.onclick=async()=>{try{await navigator.clipboard.writeText(link);btn.textContent='● LIVE LINK COPIED';setTimeout(()=>btn.textContent='● LIVE SYNC • connected',1600);}catch(e){prompt('Copy this LIVE VIEW link:',link);}}; }
    } catch(e) {
      status('LIVE SYNC • setup failed',false);
      console.error(e);
    }
  }

  async function viewerStart() {
    status('LIVE VIEW • connecting',false);
    const path=TABLE+'?select=data,updated_at&share_id=eq.'+encodeURIComponent(shareId);
    let last='';
    const pull=async()=>{
      try{
        const r=await api(path,{headers:{'x-share-token':shareToken}});
        if(!r.ok) throw new Error(await r.text());
        const rows=await r.json();
        if(!rows[0]) throw new Error('Share not found');
        const stamp=rows[0].updated_at||'';
        if(stamp!==last){last=stamp;applyData(rows[0].data||{});}
        status('LIVE VIEW • updated',true);
      }catch(e){status('LIVE VIEW • waiting',false);}
    };
    await pull(); setInterval(pull,2500);
  }

  function start(){
    if(!document.body) return setTimeout(start,50);
    if(shareId && shareToken) viewerStart(); else ownerStart();
  }
  start();
})();