/* V28: one account renderer, safe on root and nested GitHub Pages routes. */
(function(){
 'use strict';
 if(window.ExamLabHeaderAccount)return;
 const base=new URL('../',document.currentScript.src),db=window.ExamLabSupabase;
 const label=document.getElementById('accountLabel'),link=document.getElementById('accountLink'),badge=document.querySelector('.account-mark');
 let generation=0;
 function render(user){
  const name=String(user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Sĩ tử').trim();
  if(label)label.textContent=user?name:'Đăng nhập';
  if(badge)badge.textContent=user?(Array.from(name)[0]||'H').toLocaleUpperCase('vi-VN'):'✦';
  if(link){link.href=new URL(user?'profile.html':'login.html',base).href;link.title=user?'Hồ sơ: '+name:'Đăng nhập hoặc đăng ký';link.setAttribute('aria-label',link.title)}
 }
 async function refresh(){const ticket=++generation;try{if(!db)throw Error();const {data,error}=await db.auth.getSession();if(error)throw error;if(ticket===generation)render(data?.session?.user)}catch{if(ticket!==generation)return;if(label)label.textContent='Tài khoản';if(link){link.href=new URL('profile.html',base).href;link.title='Mở hồ sơ để kiểm tra phiên đăng nhập'}}}
 window.ExamLabHeaderAccount={refresh};
 if(db?.auth?.onAuthStateChange)db.auth.onAuthStateChange((_event,session)=>{++generation;render(session?.user)});
 window.addEventListener('pageshow',refresh);document.addEventListener('examlab-profile-updated',refresh);refresh();
})();
