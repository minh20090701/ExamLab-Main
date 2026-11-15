/* V38: seasonal falling ornaments and a collapsed-by-default festival panel. */
(() => {
 'use strict';
 if(window.ExamLabFestivalEffectsV38||!window.ExamLabFestival)return;
 const root=document.documentElement,bar=document.getElementById('festivalBar'),particles=document.getElementById('festivalParticles'),play=document.getElementById('festivalPlay');
 if(!bar||!particles||!play)return;
 window.ExamLabFestivalEffectsV38=true;
 root.dataset.festivalPanel='closed';
 const small=window.matchMedia?.('(max-width: 600px)');
 const styles={christmas:{kind:'snow',count:32,mobile:18},sakura:{kind:'petal',count:24,mobile:14},tet:{kind:'firecracker',count:20,mobile:12}};
 const icons={
  snow:'<svg viewBox="0 0 24 24" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/></g></svg>',
  petal:'<svg viewBox="0 0 24 32" focusable="false"><path d="M12 30C-3 20 0 5 8 2l4 5 4-5c9 5 11 18-4 28Z" fill="currentColor"/><path d="M12 8c-2 7-1 14 0 19" fill="none" stroke="white" stroke-opacity=".35"/></svg>',
  firecracker:'<svg viewBox="0 0 20 38" focusable="false"><path d="M10 10C5 5 15 5 11 1" fill="none" stroke="#c59b42" stroke-width="1.5"/><rect x="4" y="10" width="12" height="25" rx="2" fill="currentColor"/><path d="M4 12h12M4 32h12" stroke="#efd081" stroke-width="3"/><path d="M10 17v10m-2-7h4m-4 3h4" stroke="#efd081" stroke-width="1.2"/></svg>'
 };
 function falling(){
  const theme=root.dataset.festival,config=styles[theme];
  if(!config){particles.classList.remove('festival-fall-v38');delete particles.dataset.fallKind;return}
  const count=small?.matches?config.mobile:config.count;
  if(particles.dataset.fallKind===config.kind&&particles.children.length===count&&particles.firstElementChild?.classList.contains('festival-fall'))return;
  particles.classList.add('festival-fall-v38');particles.dataset.fallKind=config.kind;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<count;i++){
   const flake=document.createElement('span');flake.className='festival-fall';
   const piece=document.createElement('i');piece.className='festival-piece';piece.innerHTML=config.kind==='snow'&&i%3!==0?'<b class="festival-snow-dot"></b>':icons[config.kind];
   const size=config.kind==='snow'?(i%3===0?13+i%5:3+i%4):config.kind==='petal'?10+i%8:10+i%5;
   // Deterministic spread avoids bunching after refresh; only transform and opacity animate.
   const x=(i*61.8033988749895+7)%100,duration=(config.kind==='snow'?18:22)+(i*7)%13;
   flake.style.setProperty('--fall-x',x.toFixed(2)+'%');flake.style.setProperty('--fall-size',size+'px');
   flake.style.setProperty('--fall-time',duration+'s');flake.style.setProperty('--fall-delay',(-duration*(i+.5)/count).toFixed(2)+'s');
   flake.style.setProperty('--fall-drift',((i%2?1:-1)*(10+i%25))+'px');flake.style.setProperty('--fall-turn',(i%2?110:-85)+'deg');
   flake.style.setProperty('--fall-opacity',String(config.kind==='snow'?.28+(i%4)*.07:.22+(i%4)*.04));
   flake.style.setProperty('--fall-sway',(4+i%5)+'s');flake.append(piece);fragment.append(flake);
  }
  particles.replaceChildren(fragment);
 }
 const dock=document.createElement('div');dock.id='festivalDock';dock.className='festival-dock';dock.setAttribute('role','group');dock.setAttribute('aria-label','Giao diện và nhạc nền');
 const toggle=document.createElement('button');toggle.id='festivalPanelToggle';toggle.type='button';toggle.setAttribute('aria-controls','festivalBar');
 const quick=document.createElement('button');quick.id='festivalQuickMusic';quick.type='button';quick.className='festival-quick-music';
 dock.append(toggle,quick);document.body.append(dock);
 let previewReturn=null;
 function sync(){
  const open=root.dataset.festivalPanel==='open';
  toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Ẩn giao diện':'Giao diện';toggle.title=open?'Thu gọn thanh giao diện, nhạc và hiệu ứng':'Mở thanh giao diện, nhạc và hiệu ứng';
  dock.hidden=bar.hidden||root.dataset.festivalFocus==='true';
  const playing=play.getAttribute('aria-pressed')==='true',loading=play.textContent.includes('Đang mở');
  quick.hidden=play.disabled;quick.disabled=play.disabled;quick.textContent=playing||loading?'Ⅱ':'♫';
  quick.setAttribute('aria-pressed',String(playing));quick.setAttribute('aria-label',playing||loading?'Dừng nhạc nền':'Bật nhạc nền');quick.title=quick.getAttribute('aria-label');
 }
 function panel(open,scroll=false){
  root.dataset.festivalPanel=open?'open':'closed';bar.inert=!open;sync();
  if(open&&scroll)bar.scrollIntoView?.({block:'start',behavior:'auto'});
 }
 toggle.addEventListener('click',()=>panel(root.dataset.festivalPanel!=='open',root.dataset.festivalPanel!=='open'));
 quick.addEventListener('click',()=>{if(!play.disabled)play.click()});
 document.addEventListener('examlab:festival-change',event=>{
  falling();
  if(event.detail?.preview){if(previewReturn===null)previewReturn=root.dataset.festivalPanel==='open';panel(true)}
  else if(previewReturn!==null){const previous=previewReturn;previewReturn=null;panel(previous)}
  sync();
 });
 new MutationObserver(()=>{falling();sync()}).observe(root,{attributes:true,attributeFilter:['data-festival','data-festival-focus']});
 new MutationObserver(sync).observe(bar,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(sync).observe(play,{attributes:true,attributeFilter:['aria-pressed','disabled'],childList:true,subtree:true,characterData:true});
 const visibility=()=>{root.dataset.festivalPageHidden=String(document.hidden)};
 document.addEventListener('visibilitychange',visibility);small?.addEventListener?.('change',falling);
 falling();visibility();panel(false);
})();
