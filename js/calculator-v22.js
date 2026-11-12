/* ExamLab V23: V22 arithmetic + accessible draggable calculator on desktop/mobile. */
(function(){
'use strict';
const KEY='examlab.calculator.enabled.v22';
const read=()=>{try{return localStorage.getItem(KEY)==='1'}catch(_){return false}};
let enabled=read(),persisted=true,root=null,fab=null,panel=null,display=null,history=null,settings=null,settingsOpen=null;
let expression='',last='',hasResult=false,hasError=false;
const POSITION_KEY='examlab.calculator.position.v23';
let savedPosition=null,drag=null,layoutFrame=0;
try{const p=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))savedPosition={x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))};}catch(_){}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function viewport(){const v=window.visualViewport;return {x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||window.innerWidth,h:v?.height||window.innerHeight};}
function limits(){const v=viewport(),r=root.getBoundingClientRect(),m=12;return {minX:v.x+m,minY:v.y+m,maxX:Math.max(v.x+m,v.x+v.w-r.width-m),maxY:Math.max(v.y+m,v.y+v.h-r.height-m)};}
function place(x,y){const l=limits();const a=clamp(x,l.minX,l.maxX),b=clamp(y,l.minY,l.maxY);root.style.left=a+'px';root.style.top=b+'px';root.style.right='auto';root.style.bottom='auto';return {x:a,y:b};}
function rememberPosition(){const l=limits(),r=root.getBoundingClientRect();savedPosition={x:l.maxX===l.minX?0:clamp((r.left-l.minX)/(l.maxX-l.minX),0,1),y:l.maxY===l.minY?0:clamp((r.top-l.minY)/(l.maxY-l.minY),0,1)};try{localStorage.setItem(POSITION_KEY,JSON.stringify(savedPosition))}catch(_){};}
function resetDock(){if(!root)return;root.style.left='';root.style.top='';root.style.right='';root.style.bottom='';root.style.removeProperty('--excalc-panel-limit');root.style.removeProperty('--excalc-panel-width');}
function layoutCalc(){if(!root||!panel||panel.hidden||root.hidden)return;
 const v=viewport(),m=12,buttonHeight=fab.getBoundingClientRect().height,gap=10;
 const dockBottom=!savedPosition&&root.classList.contains('in-exam')&&window.innerWidth<=760?72:m;
 root.style.setProperty('--excalc-panel-limit',Math.max(70,Math.floor(v.h-m-dockBottom-buttonHeight-gap))+'px');
 root.style.setProperty('--excalc-panel-width',Math.max(100,Math.floor(v.w-m*2))+'px');
 if(savedPosition){const l=limits();place(l.minX+savedPosition.x*(l.maxX-l.minX),l.minY+savedPosition.y*(l.maxY-l.minY));}
 else{const r=root.getBoundingClientRect();place(v.x+v.w-r.width-m,v.y+v.h-r.height-dockBottom);}
}
function queueLayout(){if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(!drag)layoutCalc()});}
function bindDrag(){const handle=panel.querySelector('.excalc-drag-handle');
 handle.addEventListener('pointerdown',e=>{if(panel.hidden||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;const r=root.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<3)return;drag.moved=true;root.classList.add('excalc-dragging');place(drag.left+dx,drag.top+dy);e.preventDefault();});
 function end(e){if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;root.classList.remove('excalc-dragging');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);if(moved)rememberPosition();queueLayout();}
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);
 handle.addEventListener('keydown',e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const d=moves[e.key];if(!d)return;e.preventDefault();e.stopPropagation();const r=root.getBoundingClientRect(),step=e.shiftKey?48:16;place(r.left+d[0]*step,r.top+d[1]*step);rememberPosition();queueLayout();});
 window.addEventListener('resize',queueLayout);window.visualViewport?.addEventListener('resize',queueLayout);window.visualViewport?.addEventListener('scroll',queueLayout);
}

// Recursive-descent arithmetic parser; no eval, Function or execution of user input.
function calculate(source){
 const s=String(source).replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replace(/\s+/g,'');
 if(!s||s.length>160)throw Error('Nhập phép tính hợp lệ');
 let i=0,depth=0;
 const fail=()=>{throw Error('Phép tính chưa hợp lệ')};
 const finite=n=>{if(!Number.isFinite(n))throw Error('Kết quả ngoài phạm vi');return n};
 function primary(){if(s[i]==='('){if(++depth>60)fail();i++;const n=sum();if(s[i++]!==')')fail();depth--;return n}const m=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);if(!m)fail();i+=m[0].length;return finite(Number(m[0]));}
 function unary(){if(s[i]==='+'||s[i]==='-'){const neg=s[i++]==='-';const n=unary();return neg?-n:n}return primary()}
 function product(){let n=unary();while(s[i]==='*'||s[i]==='/'){const op=s[i++],v=unary();if(op==='/'&&v===0)throw Error('Không thể chia cho 0');n=finite(op==='*'?n*v:n/v)}return n}
 function sum(){let n=product();while(s[i]==='+'||s[i]==='-'){const op=s[i++],v=product();n=finite(op==='+'?n+v:n-v)}return n}
 const n=sum();if(i!==s.length)fail();return Object.is(n,-0)?0:n;
}
const pretty=s=>String(s).replaceAll('*','×').replaceAll('/','÷').replaceAll('-','−');
const resultText=n=>String(Number(n.toPrecision(14)));
function sync(){
 document.querySelectorAll('[data-excalc-toggle]').forEach(el=>{el.setAttribute('aria-checked',String(enabled));el.setAttribute('aria-label','Máy tính bỏ túi');});
 document.querySelectorAll('[data-excalc-status]').forEach(el=>{el.textContent=(enabled?'Đang bật':'Đang tắt')+(persisted?' · Lưu trên thiết bị':' · Chỉ dùng trong phiên này');});
 if(root){root.hidden=!enabled;if(!enabled)closeCalc(false);}
}
function setEnabled(next){enabled=!!next;try{localStorage.setItem(KEY,enabled?'1':'0');persisted=true}catch(_){persisted=false}sync();}
function render(){if(!display)return;display.textContent=hasError?last:pretty(expression||'0');display.classList.toggle('is-error',hasError);history.textContent=hasError?'Kiểm tra lại phép tính':last;}
function reset(){expression='';last='';hasResult=false;hasError=false;render()}
function operate(k){
 if(k==='AC'){reset();return}
 if(k==='BACK'){if(hasError){hasError=false;last='';}expression=expression.slice(0,-1);hasResult=false;last='';render();return}
 if(k==='='){
  if(!expression)return;
  try{const n=calculate(expression);last=pretty(expression)+' =';expression=resultText(n);hasResult=true;hasError=false;}
  catch(e){last=e.message;hasError=true;hasResult=false;}render();return;
 }
 if(!/^[0-9.+*/()\-]$/.test(k))return;
 if(hasError){hasError=false;last='';}
 if(hasResult){if(/[0-9.(]/.test(k))expression='';hasResult=false;last='';}
 if(expression.length>=160)return;
 // Insert multiplication automatically before an opening bracket or following a closing bracket.
 const prev=expression.slice(-1);if((k==='('&&/[0-9.)]/.test(prev))||(prev===')'&&/[0-9.]/.test(k)))expression+='*';
 expression+=k;render();
}
function closeCalc(focus=true){if(!panel)return;drag=null;root.classList.remove('excalc-dragging');panel.hidden=true;resetDock();fab.setAttribute('aria-expanded','false');if(focus&&!root.hidden)fab.focus({preventScroll:true});}
function toggleCalc(){if(!enabled)return;if(!panel.hidden){closeCalc();return}panel.hidden=false;fab.setAttribute('aria-expanded','true');layoutCalc();panel.focus({preventScroll:true});}
function closeSettings(focus=true){if(!settings)return;settings.hidden=true;settingsOpen.setAttribute('aria-expanded','false');if(focus&&settingsOpen.offsetParent!==null)settingsOpen.focus({preventScroll:true});}
function openSettings(){if(!settings)return;if(!settings.hidden){closeSettings();return}settings.hidden=false;settingsOpen.setAttribute('aria-expanded','true');settings.querySelector('[data-excalc-toggle]').focus({preventScroll:true});}
function makeUI(){
 settingsOpen=document.getElementById('excalcSettingsOpen');
 const view=document.getElementById('view');
 if(!view||!settingsOpen)return;
 const calcIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M9 11h1m4 0h1m-6 3h1m4 0h1m-6 3h1m4 0h1"/></svg>';
 root=document.createElement('div');root.className='excalc-root';root.hidden=true;
 root.innerHTML='<button class="excalc-fab" type="button" aria-label="Mở hoặc đóng máy tính" aria-expanded="false" aria-controls="excalcPanel" title="Máy tính bỏ túi">'+calcIcon+'</button><section class="excalc-panel" id="excalcPanel" hidden role="region" aria-label="Máy tính bỏ túi" tabindex="-1"><div class="excalc-head excalc-move-head"><div class="excalc-drag-handle" tabindex="0" aria-label="Kéo máy tính để di chuyển, hoặc dùng phím mũi tên" title="Kéo để di chuyển"><span>EXAMLAB · CÔNG CỤ HỌC TẬP</span><strong>Máy tính bỏ túi</strong><small>⠿ Kéo để di chuyển</small></div><button class="excalc-close" type="button" aria-label="Đóng máy tính">×</button></div><div class="excalc-screen"><div class="excalc-history"></div><output class="excalc-display" aria-live="polite">0</output></div><div class="excalc-keys"></div><p class="excalc-tip">Hỗ trợ bàn phím khi đang chọn máy tính.</p></section>';
 document.body.append(root);fab=root.querySelector('.excalc-fab');panel=root.querySelector('.excalc-panel');display=root.querySelector('.excalc-display');history=root.querySelector('.excalc-history');
 const keys=[['AC','AC','clear'],['(', '('],[')', ')'],['⌫','BACK','clear'],['7','7'],['8','8'],['9','9'],['÷','/','op'],['4','4'],['5','5'],['6','6'],['×','*','op'],['1','1'],['2','2'],['3','3'],['−','-','op'],['0','0'],['.','.'],['=','=','equals'],['+','+','op']];
 keys.forEach(([label,key,cls])=>{const b=document.createElement('button');b.type='button';b.className='excalc-key'+(cls?' '+cls:'');b.textContent=label;b.dataset.calcKey=key;if(key==='BACK')b.setAttribute('aria-label','Xóa ký tự');if(key==='AC')b.setAttribute('aria-label','Xóa tất cả');if(key==='=')b.setAttribute('aria-label','Bằng');root.querySelector('.excalc-keys').append(b)});
 fab.addEventListener('click',toggleCalc);panel.querySelector('.excalc-close').addEventListener('click',()=>closeCalc());
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-calc-key]');if(b){operate(b.dataset.calcKey);panel.focus({preventScroll:true});}});
 panel.addEventListener('keydown',e=>{const map={Enter:'=',Backspace:'BACK',Delete:'AC',Escape:'CLOSE',',':'.','×':'*','÷':'/','−':'-'};const k=map[e.key]||e.key;if(k==='CLOSE'){e.preventDefault();e.stopPropagation();closeCalc();return}if(k==='AC'||k==='BACK'||k==='='||/^[0-9.+*/()\-]$/.test(k)){if(e.key==='Enter'&&e.target.matches('button'))return;e.preventDefault();e.stopPropagation();operate(k)}});
 bindDrag();const updatePosition=()=>{root.classList.toggle('in-exam',view.classList.contains('exam-view'));if(!panel.hidden)queueLayout();};new MutationObserver(updatePosition).observe(view,{attributes:true,attributeFilter:['class']});updatePosition();
 settings=document.createElement('div');settings.className='excalc-settings-overlay';settings.hidden=true;
 settings.innerHTML='<section class="excalc-settings-panel" role="dialog" aria-modal="true" aria-labelledby="excalcSettingsTitle"><div class="excalc-head"><div><span>EXAMLAB</span><strong id="excalcSettingsTitle">Cài đặt</strong></div><button class="excalc-close" type="button" aria-label="Đóng cài đặt">×</button></div><div class="excalc-setting"><div><strong>Máy tính bỏ túi</strong><p>Hiện biểu tượng máy tính ở góc dưới bên phải. Bấm một lần để mở, bấm lại để đóng. Kéo phần tiêu đề để di chuyển máy tính.</p></div><button type="button" role="switch" class="excalc-switch" data-excalc-toggle aria-checked="false" aria-label="Máy tính bỏ túi"><span></span></button></div><p class="excalc-pref-status" data-excalc-status role="status"></p><p class="excalc-pref-note">Chỉ lưu trên trình duyệt hoặc ứng dụng hiện tại; không thay đổi tài khoản hay bài thi.</p></section>';
 document.body.append(settings);settingsOpen.addEventListener('click',openSettings);settings.querySelector('.excalc-close').addEventListener('click',()=>closeSettings());settings.addEventListener('click',e=>{if(e.target===settings)closeSettings()});settings.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSettings()}if(e.key==='Tab'){const buttons=[...settings.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus()}}});
}
function init(){makeUI();document.querySelectorAll('[data-excalc-toggle]').forEach(el=>el.addEventListener('click',()=>setEnabled(!enabled)));sync();window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){enabled=read();persisted=true;sync()}});window.addEventListener('pageshow',()=>{if(persisted){enabled=read();sync()}});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
