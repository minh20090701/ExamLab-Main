/* V35: shared account label, safe on root and nested GitHub Pages routes. */
(function(){
 'use strict';
 if(window.ExamLabHeaderAccount)return;
 const base=new URL('../',document.currentScript.src),db=window.ExamLabSupabase;
 const link=document.getElementById('accountLink'),label=link?.querySelector('#accountLabel'),badge=link?.querySelector('.account-mark');
 let generation=0;
 function setLink(page,title){if(!link)return;link.href=new URL(page,base).href;link.title=title;link.setAttribute('aria-label',title)}
 function render(user){
  const name=String(user?.user_metadata?.display_name||'').trim()||String(user?.email||'').split('@')[0].trim()||'Sĩ tử';
  if(label)label.textContent=user?name:'Đăng nhập';
  if(badge)badge.textContent=user?(Array.from(name)[0]||'H').toLocaleUpperCase('vi-VN'):'✦';
  setLink(user?'profile.html':'login.html',user?'Hồ sơ: '+name:'Đăng nhập hoặc đăng ký');
 }
 async function refresh(){const ticket=++generation;try{if(!db)throw Error();const {data,error}=await db.auth.getSession();if(error)throw error;if(ticket===generation)render(data?.session?.user)}catch{if(ticket!==generation)return;if(label)label.textContent='Tài khoản';if(badge)badge.textContent='✦';setLink('profile.html','Mở hồ sơ để kiểm tra phiên đăng nhập')}}
 window.ExamLabHeaderAccount={refresh};
 if(db?.auth?.onAuthStateChange)db.auth.onAuthStateChange((_event,session)=>{++generation;render(session?.user)});
 window.addEventListener('pageshow',refresh);document.addEventListener('examlab-profile-updated',refresh);refresh();
})();
