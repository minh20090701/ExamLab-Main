/* ExamLab V25.1 — fix scroll jumps without moving any existing exam elements. */
(function(){
 'use strict';
 const DESKTOP=window.matchMedia('(min-width: 761px)');
 const TRIGGER=220;
 const root=document.getElementById('view');
 if(!root)return;
 let frame=0;
 function isExam(){return root.classList.contains('exam-view') && !!root.querySelector('#examSidebar') && !!root.querySelector('.exam-questions');}
 function syncVisibility(){
  frame=0;
  // This class changes visibility only: the sidebar keeps its original grid slot.
  root.classList.toggle('v25-sheet-collapsed',isExam()&&DESKTOP.matches&&window.scrollY>=TRIGGER);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(syncVisibility);}
 function bindExam(){
  if(!isExam()){
   root.classList.remove('v25-sheet-collapsed');
   // Only close the native answer-sheet modal if a navigation left the exam.
   const mask=document.querySelector('#modalRoot #modalMask');
   if(mask?.querySelector('.pal-grid') && mask.querySelector('[data-action="close-modal"]'))mask.remove();
   return;
  }
  const launcher=root.querySelector('.floating-palette[data-action="palette-modal"]');
  if(launcher){launcher.setAttribute('aria-label','Mở phiếu trả lời');launcher.title='Mở phiếu trả lời';}
  const questions=root.querySelector('.exam-questions');
  if(!questions.querySelector('.question-card')||questions.querySelector('.v25-backtop-wrap')){schedule();return;}
  const wrap=document.createElement('div');wrap.className='v25-backtop-wrap';
  const button=document.createElement('button');button.className='v25-backtop';button.type='button';button.textContent='↑ Lên đầu trang';
  button.addEventListener('click',()=>window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  wrap.appendChild(button);questions.appendChild(wrap);
  schedule();
 }
 // The existing app replaces direct children of #view when it renders a page.
 // Do not observe all question/answer mutations or run a polling loop.
 new MutationObserver(bindExam).observe(root,{childList:true});
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 if(DESKTOP.addEventListener)DESKTOP.addEventListener('change',schedule);
 else if(DESKTOP.addListener)DESKTOP.addListener(schedule);
 bindExam();
})();
