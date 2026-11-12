/* V25.2 - No automatic scrolling. Use native ExamLab answer sheet dialog. */
(function(){
 'use strict';
 const view=document.getElementById('view');
 if(!view)return;
 const desktop=window.matchMedia('(min-width:761px)');
 const enter=260, leave=180;
 let sidebar=null,launcher=null,collapsed=false,frame=0;
 function setCollapsed(value){
   if(!sidebar||!launcher||value===collapsed)return;
   collapsed=value;
   sidebar.dataset.v252Collapsed=String(value);
   launcher.dataset.v252Visible=String(value);
   // No DOM moves, page classes, focus, or scrollTo during scrolling.
 }
 function sync(){
   frame=0;
   if(!sidebar||!launcher||!sidebar.isConnected||!launcher.isConnected)return;
   if(!desktop.matches){setCollapsed(false);return;}
   const y=window.scrollY;
   setCollapsed(collapsed?y>leave:y>=enter);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 function bind(){
   const active=view.classList.contains('exam-view');
   document.documentElement.classList.toggle('examlab-v252-exam',active);
   if(!active){sidebar=null;launcher=null;collapsed=false;return;}
   const nextSidebar=view.querySelector('#examSidebar');
   const nextLauncher=view.querySelector('.floating-palette[data-action="palette-modal"]');
   if(nextSidebar!==sidebar||nextLauncher!==launcher){
     sidebar=nextSidebar;launcher=nextLauncher;collapsed=false;
     if(sidebar)sidebar.dataset.v252Collapsed='false';
     if(launcher){launcher.dataset.v252Visible='false';launcher.setAttribute('aria-label','Mở phiếu trả lời');launcher.title='Mở phiếu trả lời';}
   }
   const questions=view.querySelector('.exam-questions');
   if(questions&&questions.querySelector('.question-card')&&!questions.querySelector('.v252-backtop-wrap')){
     const wrap=document.createElement('div');wrap.className='v252-backtop-wrap';
     const button=document.createElement('button');button.type='button';button.className='v252-backtop';button.textContent='↑ Lên đầu trang';
     button.addEventListener('click',()=>window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
     wrap.appendChild(button);questions.appendChild(wrap);
   }
   schedule();
 }
 new MutationObserver(bind).observe(view,{childList:true});
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 if(desktop.addEventListener)desktop.addEventListener('change',schedule);else desktop.addListener(schedule);
 bind();
})();

/* V25.4 — reuse the native actions; close ONLY the answer sheet before save/submit. */
(function(){
 'use strict';
 const view=document.getElementById('view'),modalRoot=document.getElementById('modalRoot');
 if(!view||!modalRoot)return;
 const svg='<svg class="v254-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 8 1 1 2-2m2 1h3M8 12h2m3 0h3m-8 4h2m3 0h3"/></svg>';
 function decorateLauncher(){
  const b=view.querySelector('.floating-palette[data-action="palette-modal"]');
  if(!b||b.querySelector('.v254-icon'))return;
  const count=b.querySelector('#floatDone');
  const total=b.textContent.match(/\/\s*(\d+)\s*$/)?.[1]||'';
  const label=document.createElement('span');label.className='v254-label';label.append('Danh sách câu · ');
  if(count)label.append(count);if(total)label.append('/'+total);
  b.innerHTML=svg;b.append(label);b.setAttribute('aria-label','Mở phiếu trả lời');b.title='Mở phiếu trả lời';
 }
 function enhance(){
  const mask=modalRoot.querySelector('#modalMask');
  const dialog=mask?.querySelector('.modal');
  if(!dialog||!dialog.querySelector('.pal-grid')||mask.classList.contains('v254-palette-mask'))return;
  const header=dialog.querySelector('.row-between'),top=dialog.querySelector('.pal-top'),hint=dialog.querySelector('.small-muted');
  if(!header||!top||!hint)return;
  mask.classList.add('v254-palette-mask');header.classList.add('v254-heading');
  const title=header.querySelector('h2');if(title){title.textContent='Phiếu trả lời';title.id='v254-palette-title';dialog.setAttribute('aria-labelledby',title.id);}
  const close=header.querySelector('[data-action="close-modal"]');if(close)close.setAttribute('aria-label','Đóng phiếu trả lời');
  const status=document.createElement('div');status.className='v254-status';
  const count=top.querySelector('span');if(count){count.removeAttribute('id');count.className='v254-count';}
  status.append(hint);if(count)status.append(count);top.replaceWith(status);
  // Avoid duplicate IDs with the still-mounted desktop sidebar.
  dialog.querySelector('#palProgress')?.removeAttribute('id');
 }
 function closePalette(){
  const mask=modalRoot.querySelector('#modalMask.v254-palette-mask');if(!mask)return;
  mask.remove();
  const launcher=view.querySelector('.floating-palette[data-action="palette-modal"]');
  if(launcher&&launcher.getClientRects().length&&getComputedStyle(launcher).visibility!=='hidden')launcher.focus({preventScroll:true});
 }
 // This bubbles through modalRoot BEFORE the app's existing document click listener.
 // No synthetic click, no timeout, no interruption of the real save/submit action.
 modalRoot.addEventListener('click',function(e){
  const button=e.target.closest('button[data-action="leave"],button[data-action="submit"]');
  if(button?.closest('#modalMask.v254-palette-mask'))closePalette();
 });
 new MutationObserver(enhance).observe(modalRoot,{childList:true});
 new MutationObserver(()=>{decorateLauncher();if(!view.classList.contains('exam-view'))closePalette();}).observe(view,{childList:true});
 decorateLauncher();enhance();
})();
