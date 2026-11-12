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
