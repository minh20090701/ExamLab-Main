/* Shared announcement; writes are authorized again by database RLS. */
(function(){
 'use strict';
 const db=window.ExamLabSupabase;
 const text=document.getElementById('announcementText');
 const form=document.getElementById('announcementForm');
 const input=document.getElementById('announcementInput');
 const status=document.getElementById('announcementStatus');
 let loading=false;
 function show(value){if(text){text.textContent=value;text.style.setProperty('--announcement-duration',Math.max(25,value.length/4)+'s')}}
 async function refresh(){
  if(!db||loading)return;
  loading=true;
  try{const {data,error}=await db.from('examlab_announcements').select('content').eq('id',1).maybeSingle();if(error)throw error;if(data){show(data.content);if(input&&document.activeElement!==input)input.value=data.content}}
  catch(e){if(status)status.textContent='Chưa tải được thông báo. Kiểm tra kết nối và cài đặt SQL thông báo V27.'}
  finally{loading=false}
 }
 if(form)form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Đang lưu…';
  try{
   const access=await window.ExamLabAdminAccess.getAccess();if(!access.allowed)throw Error('Chỉ quản trị viên được cập nhật thông báo.');
   const content=input.value.trim();if(!content||content.length>2000)throw Error('Nhập thông báo từ 1 đến 2000 ký tự.');
   const {error}=await db.from('examlab_announcements').upsert({id:1,content,updated_at:new Date().toISOString()});if(error)throw error;
   show(content);status.textContent='Đã cập nhật thông báo cho toàn hệ thống.';
  }catch(e){status.textContent='Không lưu được: '+(e.message||'Kiểm tra kết nối.')}finally{button.disabled=false}
 });
 refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
