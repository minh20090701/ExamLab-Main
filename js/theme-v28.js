(function(){
 'use strict';const root=document.documentElement;
 function apply(theme){const dark=theme==='dark';root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';document.querySelectorAll('[data-mode-v7]').forEach(b=>{b.setAttribute('aria-pressed',String(dark));b.title=dark?'Chuyển sang chế độ sáng':'Chuyển sang chế độ tối'});const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#231d1a':'#532923'}
 function read(){try{return localStorage.getItem('examlab.theme')}catch{return root.dataset.theme}}
 document.querySelectorAll('[data-mode-v7]').forEach(b=>{b.removeAttribute('onclick');b.onclick=null;b.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';apply(next);try{localStorage.setItem('examlab.theme',next)}catch{}})});
 window.addEventListener('storage',e=>{if(e.key==='examlab.theme'||e.key===null)apply(read())});window.addEventListener('pageshow',()=>apply(read()));apply(read());
})();
