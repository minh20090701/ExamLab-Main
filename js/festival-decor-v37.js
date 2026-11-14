/* V37: local animated artwork; theme, admin preview and motion preference share V32 state. */
(() => {
 'use strict';
 if(window.ExamLabFestivalDecorV37||!window.ExamLabFestival)return;
 const root=document.documentElement,bar=document.getElementById('festivalBar');
 if(!bar)return;
 window.ExamLabFestivalDecorV37=true;
 const base=new URL('../assets/festivals/decor-v37/',document.currentScript.src);
 const themes={
  halloween:{asset:'pumpkin',fallback:'🎃',mark:'✧',caption:'MỘT CHÚT PHÉP MÀU'},
  christmas:{asset:'snowman',fallback:'⛄',mark:'❄',caption:'ẤM ÁP MÙA ĐÈN SÁCH'},
  tet:{asset:'sakura',fallback:'🌸',mark:'✿',caption:'KHAI BÚT · ĐÓN ĐIỀU HAY'},
  midautumn:{asset:'rabbit',fallback:'🐇',mark:'☾',caption:'TRĂNG SÁNG · ƯỚC MƠ XA'},
  sakura:{asset:'sakura',fallback:'🌸',mark:'✿',caption:'MỖI NGÀY MỘT CHỒI NON'},
  night:{asset:'glowing-star',fallback:'🌟',mark:'✦',caption:'GÓP NHẶT NHỮNG VÌ SAO'}
 };
 const ns='http://www.w3.org/2000/svg';
 const star=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z" fill="currentColor"/>`;
 const flower=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" class="fd-flower">${[0,72,144,216,288].map(a=>`<ellipse cy="-5" rx="3.5" ry="5" transform="rotate(${a})"/>`).join('')}<circle r="2" class="fd-flower-heart"/></g>`;
 const snow=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="currentColor" stroke-width="1.4">${[0,60,120].map(a=>`<path transform="rotate(${a})" d="M0-10V10M-3-7 0-4 3-7M-3 7 0 4 3 7"/>`).join('')}</g>`;
 const lantern=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" class="fd-lantern"><path d="M0-45V-22" fill="none" stroke="currentColor"/><ellipse rx="15" ry="21" class="fd-lantern-body"/><ellipse rx="7" ry="21" fill="none" class="fd-lantern-rib"/><path d="M-9-20H9M-9 20H9M0 21V34M-4 29V37M4 29V37" class="fd-lantern-rib" fill="none" stroke-width="2"/></g>`;
 const bat=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M-17-6Q-9-3-6-9L-3-3 0-6 3-3 6-9Q9-3 17-6Q16 2 10 5Q4 1 0 8Q-4 1-10 5Q-16 2-17-6" fill="currentColor" opacity=".7"/>`;
 const scenes={
  halloween:()=>`<path d="M182 18A29 29 0 1 0 211 47A23 23 0 0 1 182 18" class="fd-moon"/>${bat(63,47,.8)}${bat(222,87,.55)}${star(103,30,.55)}${star(230,30,.4)}<path d="M15 135Q38 111 61 135M208 148Q226 124 248 146" class="fd-scene-line"/><path d="M20 0V47M20 6 43 10 43 30 20 47M20 23 31 23 43 30" class="fd-scene-line" opacity=".5"/>`,
  christmas:()=>`<path d="M4 17Q130 64 256 17" class="fd-scene-line"/>${[24,62,102,145,187,228].map((x,i)=>`<circle cx="${x}" cy="${20+Math.sin(i/5*Math.PI)*17}" r="3.5" class="fd-bulb" style="--n:${i}"/>`).join('')}<g class="fd-pine"><path d="m32 77-20 29h12l-20 30h25v16h7v-16h25l-20-30h12Z"/><path d="m222 96-15 22h9l-16 23h19v12h6v-12h19l-16-23h9Z"/></g>${star(32,70,.75)}${snow(202,65,.7)}${snow(72,80,.5)}${snow(250,106,.4)}`,
  tet:()=>`<path d="M6 24Q108 55 250 14M74 38 96 13M170 33 194 62" class="fd-branch"/>${flower(30,30,.8)}${flower(81,37,.65)}${flower(97,14,.8)}${flower(172,32,.9)}${flower(194,62,.75)}${flower(230,22,.65)}${lantern(56,98,1)}${lantern(103,84,.7)}${star(218,119,.5)}<path d="M15 161H244M31 167H228" class="fd-scene-line" opacity=".45"/>`,
  midautumn:()=>`<circle cx="131" cy="72" r="48" class="fd-moon"/><circle cx="120" cy="54" r="10" class="fd-moon-crater"/><circle cx="151" cy="66" r="6" class="fd-moon-crater"/>${lantern(36,73,.6)}${lantern(232,54,.55)}${star(74,42,.5)}${star(201,105,.7)}<path d="M12 134h45q15 0 15-10t-13-10q-4-21-24-16q-14 0-15 15H8M196 143h56q13 0 13-9t-14-9q-5-19-20-15q-13-2-17 11h-17" class="fd-scene-line"/>`,
  sakura:()=>`<path d="M5 7Q54 52 112 47M41 31 64 8M73 44 85 73M256 116Q230 149 196 158" class="fd-branch"/>${flower(20,20,.8)}${flower(47,35,1)}${flower(63,9,.8)}${flower(85,73,.75)}${flower(106,47,.6)}${flower(224,143,.9)}${flower(250,120,.65)}<g class="fd-petal"><ellipse cx="206" cy="39" rx="3" ry="7" transform="rotate(30 206 39)"/><ellipse cx="50" cy="116" rx="3" ry="6" transform="rotate(-35 50 116)"/><ellipse cx="194" cy="105" rx="3" ry="6" transform="rotate(50 194 105)"/></g>`,
  night:()=>`<path d="m23 43 38-20 28 35 39-28M188 52 227 81 206 128" class="fd-scene-line" opacity=".5"/>${[[23,43],[61,23],[89,58],[128,30],[188,52],[227,81],[206,128]].map(([x,y])=>star(x,y,.45)).join('')}<ellipse cx="131" cy="109" rx="88" ry="35" transform="rotate(-18 131 109)" class="fd-scene-line" opacity=".4"/>${star(42,119,.8)}${star(239,36,.6)}<path d="M194 15 222 3" class="fd-scene-line fd-meteor"/>`
 };
 const banner=bar.querySelector('.festival-banner');
 const stage=document.createElement('div');stage.className='festival-stage';stage.setAttribute('aria-hidden','true');
 const backdrop=document.createElementNS(ns,'svg');backdrop.setAttribute('viewBox','0 0 264 190');backdrop.setAttribute('focusable','false');backdrop.classList.add('fd-scene');
 const halo=document.createElement('span');halo.className='fd-halo';
 const fallback=document.createElement('span');fallback.className='fd-fallback';
 const picture=document.createElement('img');picture.className='fd-gif';picture.alt='';picture.width=512;picture.height=512;picture.decoding='async';picture.draggable=false;picture.hidden=true;
 const caption=document.createElement('span');caption.className='fd-caption';
 stage.append(halo,backdrop,fallback,picture,caption);banner.append(stage);
 // Attribution lives next to the existing optional effect controls.
 const credit=document.createElement('p');credit.className='festival-art-credit';
 const creditLink=document.createElement('a');creditLink.href=new URL('../../../docs/NGUON_ANH_DONG_V37.html',base).href;creditLink.textContent='Ảnh động: Google Noto · CC BY 4.0';creditLink.target='_blank';creditLink.rel='noopener';credit.append(creditLink);
 (bar.querySelector('.festival-player')||bar).append(credit);
 let current='',generation=0,imageKey='',failed=new Set();
 const inView=typeof IntersectionObserver==='undefined'?null:{visible:true};
 function enabled(){return !!themes[current]&&root.dataset.festivalEffects==='true'&&root.dataset.festivalFocus!=='true'&&!document.hidden&&(!inView||inView.visible)}
 function stop(){if(picture.hasAttribute('src')){++generation;picture.removeAttribute('src');}picture.hidden=true;fallback.hidden=false;imageKey='';stage.dataset.animated='false'}
 function motion(){
  const theme=themes[current];if(!theme||!enabled()||failed.has(theme.asset)){stop();return}
  const src=new URL(theme.asset+'.gif',base).href;if(imageKey===src)return;
  const ticket=++generation;imageKey=src;picture.hidden=true;fallback.hidden=false;
  picture.onload=()=>{if(ticket!==generation||!enabled()||imageKey!==src)return;picture.hidden=false;fallback.hidden=true;stage.dataset.animated='true'};
  picture.onerror=()=>{if(ticket!==generation)return;failed.add(theme.asset);stop()};
  picture.src=src;
 }
 function render(){
  const next=root.dataset.festival||'classic';if(next===current){motion();return}
  stop();current=next;const theme=themes[current];stage.hidden=!theme;bar.classList.toggle('festival-v37',!!theme);
  if(!theme){credit.hidden=true;root.style.removeProperty('--festival-mark');return}
  credit.hidden=false;root.style.setProperty('--festival-mark',JSON.stringify(theme.mark));
  backdrop.innerHTML=scenes[current]();fallback.textContent=theme.fallback;caption.textContent=theme.caption;stage.dataset.scene=current;motion();
 }
 new MutationObserver(render).observe(root,{attributes:true,attributeFilter:['data-festival','data-festival-effects','data-festival-focus']});
 document.addEventListener('examlab:festival-change',render);
 document.addEventListener('visibilitychange',motion);
 if(inView)new IntersectionObserver(entries=>{inView.visible=entries.some(entry=>entry.isIntersecting);motion()},{rootMargin:'100px'}).observe(stage);
 render();
})();
