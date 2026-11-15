/* V39: animated corner scenes, independent of the collapsed festival banner. */
(() => {
 'use strict';
 if(window.ExamLabFestivalCornersV39||!window.ExamLabFestival)return;
 window.ExamLabFestivalCornersV39=true;
 const root=document.documentElement,base=new URL('../assets/festivals/decor-v37/',document.currentScript.src),key='examlab.festival.hideCorners';
 const themes={halloween:['pumpkin','🎃'],christmas:['snowman','⛄'],tet:['sakura','🌸'],sakura:['sakura','🌸'],midautumn:['rabbit','🐇'],night:['glowing-star','🌟']};
 const flower=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" class="fc-flower">${[0,72,144,216,288].map(a=>`<ellipse cy="-5" rx="3.6" ry="5.4" transform="rotate(${a})"/>`).join('')}<circle r="2.6" class="fc-gold"/></g>`;
 const star=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path class="fc-star fc-glow" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z"/></g>`;
 const pine=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path class="fc-wood" d="M-3 15h6v15h-6Z"/><path class="fc-green" d="m0-48-17 25h9l-18 25h12l-21 27h70L14 2h12L8-23h9Z"/><path d="m-12-24 12 4 12-4M-21 3 21 8M-25 22 25 18" class="fc-thread"/><circle class="fc-red fc-glow" cx="-14" cy="10" r="3"/><circle class="fc-gold fc-glow" cx="9" cy="-11" r="3"/>${star(0,-55,.65)}</g>`;
 const lantern=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><g class="fc-sway"><path d="M0-37V-20" class="fc-thread"/><ellipse rx="16" ry="21" class="fc-red"/><ellipse rx="8" ry="21" class="fc-thread"/><path d="M-10-20H10M-10 20H10M0 21V37M-4 30V41M4 30V41" class="fc-thread" stroke-width="2.5"/><path d="m0-8 6 8-6 8-6-8Z" class="fc-gold" opacity=".8"/></g></g>`;
 const bat=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path class="fc-bat fc-bob" d="M-21-7Q-12-5-8-12L-4-4 0-7 4-4 8-12Q12-5 21-7Q20 3 13 7Q6 1 0 11Q-6 1-13 7Q-20 3-21-7Z"/></g>`;
 const books='<g class="fc-books"><path d="M18 143q25-14 52 1v24q-27-15-52-2Z"/><path d="M70 144q27-15 52-1v23q-25-13-52 2Z"/><path d="M70 144v24M26 150q20-8 35-1M27 158q19-6 34 0M80 150q18-8 34-1M80 158q18-6 34 0" class="fc-page-line"/><path d="M15 169q28-9 55 3 27-12 55-3" class="fc-book-edge"/></g>';
 const branch='<path d="M174 13q-43 28-89 17Q52 22 12 51M109 29l-9-20M49 32l-5 25" class="fc-branch"/>';
 const scenes={
  halloween:{right:()=>`<path d="M142 17a29 29 0 1 0 20 47 24 24 0 0 1-20-47Z" class="fc-moon"/>${bat(31,51,.8)}${bat(150,90,.6)}${star(65,24,.55)}${star(19,113,.4)}<path d="M35 165q55-20 112 0" class="fc-ground"/><path d="M23 150q9-23 18-20-2 14-18 20M153 153q-3-22 10-27 8 18-10 27" class="fc-leaf"/>`,left:()=>`${books}${bat(37,91,.9)}${star(89,58,.6)}<path d="M10 43v47m0-40 28 10-9 26-19 4M10 66h22" class="fc-web"/>`},
  christmas:{right:()=>`${pine(31,131,.8)}<path d="M9 170q74-31 158 0" class="fc-snow-bank"/><path d="M20 20q66 27 140 1" class="fc-thread"/>${[32,58,85,112,141].map((x,i)=>`<circle cx="${x}" cy="${26+(i===2?7:i%2?5:0)}" r="3" class="fc-bulb fc-glow" style="--fc-delay:${i*-.8}s"/>`).join('')}<g transform="translate(130 132)"><rect width="27" height="25" rx="3" class="fc-red"/><path d="M14 0v25M0 7h27M13 0q-18-15-17-4 1 6 17 4 18-14 18-4 0 7-18 4" class="fc-thread"/></g>${star(157,67,.55)}`,left:()=>`${books}${pine(39,116,.8)}<path d="m89 101-7 23 16-10 6 17 9-25Z" class="fc-red"/>${star(104,84,.6)}`},
  tet:{right:()=>`${branch}${flower(18,47,.8)}${flower(50,31,.9)}${flower(99,11,.7)}${flower(126,25,.8)}${lantern(142,75,.85)}${star(22,98,.6)}<g class="fc-bob"><path d="m129 131 24-4 6 31-24 4Z" class="fc-red"/><path d="m143 137 7 7-5 8-7-7Z" class="fc-gold"/></g><path d="M30 166h122" class="fc-ground"/>`,left:()=>`${books}${lantern(41,94,1)}<path d="M-3 48q49 34 93 0" class="fc-branch"/>${flower(12,54,.65)}${flower(82,53,.9)}${star(100,99,.55)}`},
  sakura:{right:()=>`${branch}${flower(17,48,.9)}${flower(47,56,.8)}${flower(69,30,1.15)}${flower(105,11,.8)}${flower(145,24,.9)}<g class="fc-petals fc-bob"><ellipse cx="30" cy="114" rx="4" ry="7" transform="rotate(-30 30 114)"/><ellipse cx="154" cy="100" rx="4" ry="6" transform="rotate(35 154 100)"/></g><path d="M30 161q61 16 123-3" class="fc-ground"/>${flower(141,150,.7)}`,left:()=>`${books}<path d="M8 121q27-8 26-62m-4 27 39-20" class="fc-branch"/>${flower(34,62,1.15)}${flower(69,67,.9)}${flower(22,104,.7)}<g class="fc-petals fc-bob"><ellipse cx="96" cy="110" rx="4" ry="7" transform="rotate(30 96 110)"/></g>`},
  midautumn:{right:()=>`<circle cx="105" cy="62" r="43" class="fc-moon"/><circle cx="94" cy="42" r="7" class="fc-crater"/><circle cx="126" cy="60" r="5" class="fc-crater"/>${lantern(25,79,.55)}${star(158,43,.6)}<path d="M12 156h43q10 0 10-9t-11-9q-3-17-16-12-11-3-15 11H9M119 168h48q11 0 11-9t-12-9q-4-16-16-12-11-1-15 10h-13" class="fc-cloud"/>`,left:()=>`${books}${lantern(43,90,.9)}${star(97,57,.75)}<path d="M84 128h39q10 0 10-8t-10-8q-2-13-14-10-8-1-11 8H83" class="fc-cloud"/>`},
  night:{right:()=>`<path d="M136 20a50 50 0 1 0 27 76 41 41 0 0 1-27-76Z" class="fc-moon"/><path d="m18 62 31-29 27 15M125 139l32-23 8 29" class="fc-constellation"/>${star(18,62,.5)}${star(49,33,.4)}${star(76,48,.45)}${star(157,116,.65)}<ellipse cx="86" cy="116" rx="66" ry="18" transform="rotate(-19 86 116)" class="fc-orbit"/>`,left:()=>`${books}${star(44,87,1.8)}${star(94,58,.65)}${star(104,115,.45)}<path d="m15 62 22-16M18 69l38-27" class="fc-constellation"/>`}
 };
 const host=document.createElement('div');host.id='festivalCorners';host.className='festival-corners';host.setAttribute('aria-hidden','true');host.inert=true;host.hidden=true;
 const left=document.createElement('div');left.className='fc-corner fc-left';
 const right=document.createElement('div');right.className='fc-corner fc-right';
 const svg=()=>{const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 180 180');n.setAttribute('focusable','false');return n};
 const leftArt=svg(),rightArt=svg();left.append(leftArt);right.append(rightArt);
 const fallback=document.createElement('span');fallback.className='fc-fallback';
 const img=document.createElement('img');img.className='fc-gif';img.alt='';img.width=512;img.height=512;img.decoding='async';img.draggable=false;img.hidden=true;
 right.append(fallback,img);host.append(left,right);document.body.append(host);
 const control=document.createElement('label');control.className='festival-corner-control';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='festivalHideCorners';control.append(checkbox,document.createTextNode('Ẩn trang trí góc'));
 document.querySelector('#festivalBar .festival-controls')?.append(control);
 let hidden=false;try{hidden=localStorage.getItem(key)==='1'}catch{}checkbox.checked=hidden;
 let current='',source='',generation=0,failed=new Set();
 function stop(){if(img.hasAttribute('src')){generation++;img.removeAttribute('src')}img.hidden=true;fallback.hidden=false;source='';host.dataset.animated='false'}
 function obstructed(){
  const typing=document.activeElement?.matches('textarea,[contenteditable=true],input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file])');
  if(typing)return true;
  return [...document.querySelectorAll('[role=dialog][aria-modal=true],.modal-mask,#excalcPanel,.el20-reader,.toast,#adminToast.show,.study-toast.show')].some(el=>!el.closest('[hidden],.hidden,[aria-hidden=true]')&&getComputedStyle(el).display!=='none');
 }
 function allowed(){return !!themes[current]&&!hidden&&root.dataset.festivalEffects==='true'&&root.dataset.festivalFocus!=='true'&&!document.hidden&&!obstructed()}
 // V41: let the reading-room hero keep its own clear space on short screens.
 // Visibility (not display) preserves each corner's geometry while it is covered.
 function protectReadingRoom(){
  const hero=document.querySelector('.home-hero-v41'),area=hero?.getBoundingClientRect();
  for(const corner of [left,right]){
   const box=corner.getBoundingClientRect();
   const overlap=!!area&&box.width>0&&box.height>0&&area.width>0&&area.height>0&&box.left<area.right&&box.right>area.left&&box.top<area.bottom&&box.bottom>area.top;
   const value=String(overlap);if(corner.dataset.overlap!==value)corner.dataset.overlap=value;
  }
 }
 function sync(){
  const show=allowed();if(host.hidden===show)host.hidden=!show;
  if(!show){stop();return}
  protectReadingRoom();if(right.dataset.overlap==='true'){stop();return}
  const theme=themes[current];if(failed.has(theme[0])){stop();return}
  const url=new URL(theme[0]+'.gif',base).href;if(source===url)return;
  const ticket=++generation;source=url;img.hidden=true;fallback.hidden=false;
  img.onload=()=>{if(ticket!==generation||source!==url||right.dataset.overlap==='true'||!allowed())return;img.hidden=false;fallback.hidden=true;host.dataset.animated='true'};
  img.onerror=()=>{if(ticket!==generation)return;failed.add(theme[0]);stop()};img.src=url;
 }
 function render(){
  const theme=root.dataset.festival||'classic';
  if(theme!==current){stop();current=theme;host.dataset.scene=theme;if(scenes[theme]){leftArt.innerHTML=scenes[theme].left();rightArt.innerHTML=scenes[theme].right();fallback.textContent=themes[theme][1]}else{leftArt.replaceChildren();rightArt.replaceChildren();fallback.textContent=''}}
  sync();
 }
 checkbox.addEventListener('change',()=>{hidden=checkbox.checked;try{localStorage.setItem(key,hidden?'1':'0')}catch{}sync()});
 window.addEventListener('storage',e=>{if(e.key===key||e.key===null){try{hidden=localStorage.getItem(key)==='1'}catch{}checkbox.checked=hidden;sync()}});
 document.addEventListener('examlab:festival-change',render);document.addEventListener('visibilitychange',sync);
 document.addEventListener('focusin',sync);document.addEventListener('focusout',()=>queueMicrotask(sync));
 let layoutFrame=0;
 function onLayout(){if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;sync()})}
 window.addEventListener('resize',onLayout);
 window.addEventListener('scroll',onLayout,{passive:true});
 document.fonts?.ready.then(onLayout);
 new MutationObserver(render).observe(root,{attributes:true,attributeFilter:['data-festival','data-festival-effects','data-festival-focus']});
 // Ignore our own image/scene updates, avoiding observer loops during GIF load and fallback.
 new MutationObserver(records=>{if(records.some(record=>!host.contains(record.target)))sync()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','aria-hidden','aria-modal']});
 render();
})();
