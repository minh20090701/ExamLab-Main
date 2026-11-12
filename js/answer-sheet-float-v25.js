
(function(){
  const MIN_WIDTH = 960;
  const SCROLL_TRIGGER = 220;
  const state = { panel:null, anchor:null, fab:null, overlay:null, dialogBody:null, dialogClose:null, headingEl:null, collapsed:false, open:false, backTop:null, view:null, mo:null, raf:0 };

  function qs(sel,root=document){ return root.querySelector(sel); }
  function qsa(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }
  function text(el){ return (el && el.textContent || '').replace(/\s+/g,' ').trim(); }
  function isDesktop(){ return window.innerWidth >= MIN_WIDTH; }
  function inExamView(){
    const v = qs('#view');
    if(!v) return false;
    const t = text(v);
    return /CÂU\s*\d+\s*\/\s*\d+/i.test(t) && /Nộp bài/i.test(document.body.textContent||'');
  }
  function findPanel(){
    const view = qs('#view');
    if(!view) return null;
    const nodes = qsa('#view *');
    for(const node of nodes){
      if(/Phiếu trả lời/i.test(text(node))){
        let el = node;
        while(el && el !== view){
          const btns = el.querySelectorAll('button').length;
          if(btns >= 10) return el;
          el = el.parentElement;
        }
      }
    }
    return null;
  }
  function findLastQuestionCard(){
    const view = qs('#view');
    if(!view) return null;
    const candidates = [];
    qsa('#view *', view).forEach(el=>{
      const t = text(el);
      if(/CÂU\s*\d+\s*\/\s*\d+/i.test(t) && t.length < 80){
        let cur = el;
        while(cur && cur !== view){
          const ct = text(cur);
          if(/CÂU\s*\d+\s*\/\s*\d+/i.test(ct) && ct.length < 4000 && cur.querySelector('input, textarea, button')){
            candidates.push(cur);
            break;
          }
          cur = cur.parentElement;
        }
      }
    });
    const uniq = [...new Set(candidates)];
    if(!uniq.length) return null;
    uniq.sort((a,b)=>a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return uniq[uniq.length-1];
  }
  function ensureUI(){
    if(!state.fab){
      const fab = document.createElement('button');
      fab.type='button';
      fab.className='v25-sheet-fab';
      fab.hidden=true;
      fab.setAttribute('aria-label','Mở phiếu trả lời');
      fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h4"></path></svg>';
      fab.addEventListener('click',()=> state.open ? closeSheet() : openSheet());
      document.body.appendChild(fab);
      state.fab=fab;
    }
    if(!state.overlay){
      const overlay = document.createElement('div');
      overlay.className='v25-sheet-overlay';
      overlay.hidden=true;
      overlay.innerHTML='<div class="v25-sheet-dialog" role="dialog" aria-modal="true" aria-label="Phiếu trả lời nhanh"><div class="v25-sheet-head"><div><b>Phiếu trả lời</b><small>Chọn số câu để di chuyển nhanh</small></div><button type="button" class="v25-sheet-close" aria-label="Đóng">×</button></div><div class="v25-sheet-body"></div></div>';
      overlay.addEventListener('click',e=>{ if(e.target===overlay) closeSheet(); });
      document.body.appendChild(overlay);
      state.overlay=overlay;
      state.dialogBody=qs('.v25-sheet-body',overlay);
      state.dialogClose=qs('.v25-sheet-close',overlay);
      state.dialogClose.addEventListener('click',closeSheet);
      document.addEventListener('keydown',e=>{ if(e.key==='Escape' && state.open) closeSheet(); });
    }
  }
  function mountPanel(){
    const panel = findPanel();
    if(!panel) return false;
    if(state.panel===panel) return true;
    state.panel = panel;
    if(!state.anchor || !document.contains(state.anchor)){
      state.anchor = document.createComment('v25-sheet-anchor');
      panel.parentNode.insertBefore(state.anchor, panel);
    }
    panel.classList.add('v25-sheet-panel-host');
    return true;
  }
  function restoreInline(){
    if(!state.panel || !state.anchor || !state.anchor.parentNode) return;
    if(state.anchor.nextSibling !== state.panel) state.anchor.parentNode.insertBefore(state.panel, state.anchor.nextSibling);
    state.panel.classList.remove('v25-sheet-inline-hidden');
    state.collapsed=false;
    closeSheet(true);
    if(state.fab) state.fab.hidden=true;
  }
  function collapseInline(){
    if(!mountPanel()) return;
    if(!isDesktop()) return restoreInline();
    if(!state.dialogBody.contains(state.panel)) state.dialogBody.appendChild(state.panel);
    state.panel.classList.remove('v25-sheet-inline-hidden');
    state.collapsed=true;
    state.fab.hidden=false;
  }
  function openSheet(){
    if(!mountPanel()) return;
    if(!state.collapsed) return;
    if(!state.dialogBody.contains(state.panel)) state.dialogBody.appendChild(state.panel);
    state.overlay.hidden=false;
    document.body.style.overflow='hidden';
    state.open=true;
  }
  function closeSheet(silent){
    if(state.overlay) state.overlay.hidden=true;
    document.body.style.overflow='';
    state.open=false;
    if(state.collapsed && state.panel && state.dialogBody && !state.dialogBody.contains(state.panel)) state.dialogBody.appendChild(state.panel);
    if(!silent && state.fab) state.fab.focus({preventScroll:true});
  }
  function syncCollapse(){
    if(!inExamView()) { restoreInline(); if(state.fab) state.fab.hidden=true; if(state.overlay) state.overlay.hidden=true; removeBackTop(); return; }
    ensureUI();
    mountPanel();
    syncBackTop();
    if(!state.panel) return;
    if(!isDesktop()){
      restoreInline();
      return;
    }
    if(window.scrollY > SCROLL_TRIGGER) collapseInline();
    else restoreInline();
  }
  function removeBackTop(){ if(state.backTop && state.backTop.parentNode) state.backTop.parentNode.remove(); state.backTop=null; }
  function syncBackTop(){
    const last = findLastQuestionCard();
    if(!last){ removeBackTop(); return; }
    let wrap = qs('#v25BackTopWrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id='v25BackTopWrap';
      wrap.className='v25-sheet-backtop-wrap';
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='v25-sheet-backtop';
      btn.textContent='↑ Lên đầu trang';
      btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
      wrap.appendChild(btn);
      state.backTop=btn;
    }
    if(last.nextSibling !== wrap) last.after(wrap);
  }
  function schedule(){ cancelAnimationFrame(state.raf); state.raf = requestAnimationFrame(syncCollapse); }
  function boot(){
    if(state.mo) state.mo.disconnect();
    const root = qs('#view') || document.body;
    state.mo = new MutationObserver(schedule);
    state.mo.observe(root,{childList:true,subtree:true});
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    schedule();
    setInterval(schedule,1200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
