/* ExamLab V21: account-private study notes. No localStorage for note content. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id), db=window.ExamLabSupabase;
 const table='examlab_study_notes', cols='id,user_id,title,body,pinned,created_at,updated_at';
 const form=$('notesForm'), title=$('notesTitle'), body=$('notesBody'), pin=$('notesPinned');
 let owner=null, epoch=0, rows=[], selected=null, dirty=false, busy=false, loaded=false, activeTab='timer', loading=false;
 const status=(msg,type='info')=>{$('notesStatus').textContent=msg;$('notesStatus').dataset.state=type};
 const fmt=s=>s?new Date(s).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'';
 const ownerFor=s=>s?.user?.id&&!s.user.is_anonymous?s.user.id:null;
 const current=(e,u)=>e===epoch&&u===owner&&!!u;
 const confirmAction=async(message,opts)=>window.ExamLabDialog?.confirm?await window.ExamLabDialog.confirm(message,opts):window.confirm(message);
 const fields=()=>({title:title.value.trim(),body:body.value,pinned:pin.checked});
 function updateControls(){
  const locked=busy||!owner||!loaded;
  $('notesNew').disabled=locked; $('notesSave').disabled=locked;
  $('notesDelete').disabled=locked||!selected;
  title.disabled=locked;body.disabled=locked;pin.disabled=locked;
  $('notesSearch').disabled=!owner; $('notesRefresh').disabled=!owner||busy||loading;
  $('notesChars').textContent=body.value.length.toLocaleString('vi-VN')+' / 20.000 ký tự';
  if(selected){const r=rows.find(x=>x.id===selected);$('notesUpdated').textContent=dirty?'Chưa lưu thay đổi':r?'Cập nhật: '+fmt(r.updated_at):''}
  else $('notesUpdated').textContent=dirty?'Ghi chú mới · chưa lưu':'Ghi chú mới';
 }
 function resetEditor(){selected=null;dirty=false;form.hidden=true;$('notesBlank').hidden=false;title.value='';body.value='';pin.checked=false;updateControls()}
 function sortRows(){rows.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updated_at).localeCompare(String(a.updated_at))||a.id.localeCompare(b.id))}
 function renderList(){
  const q=$('notesSearch').value.trim().toLocaleLowerCase('vi');const list=$('notesList');list.replaceChildren();sortRows();
  const filtered=rows.filter(r=>!q||(`${r.title} ${r.body}`.toLocaleLowerCase('vi').includes(q)));
  for(const r of filtered){const b=document.createElement('button');b.type='button';b.className='notes-item'+(r.id===selected?' active':'');b.dataset.noteId=r.id;b.setAttribute('aria-pressed',String(r.id===selected));
   const t=document.createElement('strong');t.textContent=(r.pinned?'◆ ':'')+r.title;
   const sn=document.createElement('small');sn.className='notes-snippet';sn.textContent=r.body.replace(/\s+/g,' ').trim()||'Chưa có nội dung';
   const dt=document.createElement('small');dt.textContent=fmt(r.updated_at);b.append(t,sn,dt);list.append(b)}
  if(!filtered.length){const empty=document.createElement('p');empty.className='notes-small';empty.textContent=q?'Không tìm thấy ghi chú.':'Chưa có ghi chú. Bấm Ghi chú mới để bắt đầu.';list.append(empty)}
  $('notesCount').textContent=filtered.length+'/'+rows.length+' ghi chú';updateControls();
 }
 function setOwner(next){
  if(next===owner)return;
  epoch++;owner=next;rows=[];busy=false;loading=false;loaded=false;resetEditor();$('notesSearch').value='';renderList();
  $('notesWorkspace').hidden=!owner;$('notesLogin').hidden=!!owner;
  status(owner?'Ghi chú riêng tư · Chưa tải dữ liệu':'Đăng nhập để mở ghi chú của tài khoản.');
  if(owner&&activeTab==='notes')void loadNotes();
 }
 async function loadNotes(){
  if(!owner||loading||busy)return;
  const e=epoch,u=owner;loading=true;updateControls();status('Đang tải ghi chú riêng tư…');
  try{
   const found=[];let from=0;
   while(true){const {data,error}=await db.from(table).select(cols).eq('user_id',u).order('id',{ascending:true}).range(from,from+99);if(!current(e,u))return;if(error)throw error;const page=data||[];found.push(...page);if(page.length<100)break;from+=100;}
   if(!current(e,u))return;rows=found;loaded=true;renderList();status('Đã đồng bộ · Chỉ tài khoản của bạn được truy cập.','ok');
  }catch(err){if(current(e,u))status('Không tải được ghi chú: '+(err.message||err)+'. Kiểm tra mạng hoặc chạy SQL V21.','error')}
  finally{if(current(e,u)){loading=false;updateControls()}}
 }
 function openEditor(r){selected=r?.id||null;title.value=r?.title||'';body.value=r?.body||'';pin.checked=!!r?.pinned;dirty=false;form.hidden=false;$('notesBlank').hidden=true;renderList();title.focus()}
 async function leaveEditor(){return !dirty||await confirmAction('Ghi chú hiện tại có thay đổi chưa lưu. Bạn muốn bỏ thay đổi?',{title:'Bỏ thay đổi?',confirmText:'Bỏ thay đổi',danger:true})}
 async function chooseNote(id){if(busy||!owner||!loaded||selected===id&&!form.hidden)return;const e=epoch,u=owner;if(!await leaveEditor()||!current(e,u))return;const r=rows.find(x=>x.id===id);if(id&&!r)return;openEditor(r)}
 function changeTab(tab){activeTab=tab;const n=tab==='notes';$('studyTimer').hidden=n;document.querySelectorAll('.study-sync-bar,.study-local-note').forEach(x=>x.hidden=n);$('studyNotes').hidden=!n;for(const [id,active] of [['studyTabTimer',!n],['studyTabNotes',n]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',String(active));}if(n&&owner&&!loaded&&!loading)void loadNotes()}
 $('studyTabTimer').addEventListener('click',()=>changeTab('timer'));$('studyTabNotes').addEventListener('click',()=>changeTab('notes'));
 $('notesSearch').addEventListener('input',renderList);$('notesNew').addEventListener('click',async()=>{if(busy||!owner||!loaded)return;const e=epoch,u=owner;if(await leaveEditor()&&current(e,u))openEditor(null)});
 $('notesList').addEventListener('click',event=>{const el=event.target.closest('[data-note-id]');if(el)void chooseNote(el.dataset.noteId)});
 $('notesRefresh').addEventListener('click',async()=>{if(!owner||busy||loading)return;const e=epoch,u=owner;if(!await leaveEditor()||!current(e,u))return;resetEditor();await loadNotes()});
 for(const input of [title,body,pin])input.addEventListener('input',()=>{dirty=true;updateControls()});
 pin.addEventListener('change',()=>{dirty=true;updateControls()});
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();if(busy||!owner||!loaded)return;const data=fields();if(!data.title){status('Nhập tiêu đề ghi chú trước khi lưu.','error');title.focus();return}
  const e=epoch,u=owner,id=selected,old=rows.find(x=>x.id===id);busy=true;updateControls();status('Đang lưu ghi chú…');
  try{let result;
   if(id){result=await db.from(table).update(data).eq('id',id).eq('user_id',u).eq('updated_at',old.updated_at).select(cols).maybeSingle()}
   else result=await db.from(table).insert({...data,user_id:u}).select(cols).single();
   if(!current(e,u))return;if(result.error)throw result.error;if(!result.data)throw Error('Ghi chú đã thay đổi trên thiết bị khác. Sao chép nội dung đang sửa rồi bấm Làm mới để tải bản mới.');
   const r=result.data;rows=rows.filter(x=>x.id!==r.id);rows.push(r);selected=r.id;dirty=false;renderList();status('Đã lưu ghi chú vào tài khoản.','ok');
  }catch(err){if(current(e,u))status('Chưa lưu được: '+(err.message||err)+'. Nội dung vẫn còn trong ô soạn thảo.','error')}
  finally{if(current(e,u)){busy=false;updateControls()}}
 });
 $('notesDelete').addEventListener('click',async()=>{
  if(busy||!owner||!selected)return;const e=epoch,u=owner,id=selected,old=rows.find(x=>x.id===id);
  if(!old||!await confirmAction('Ghi chú này sẽ bị xóa khỏi tài khoản và các thiết bị đã đồng bộ.',{title:'Xóa ghi chú?',confirmText:'Xóa ghi chú',danger:true})||!current(e,u)||busy||selected!==id)return;
  busy=true;updateControls();status('Đang xóa ghi chú…');
  try{const {data,error}=await db.from(table).delete().eq('id',id).eq('user_id',u).eq('updated_at',old.updated_at).select('id').maybeSingle();if(!current(e,u))return;if(error)throw error;if(!data)throw Error('Ghi chú đã thay đổi hoặc bị xóa trên thiết bị khác. Hãy làm mới.');rows=rows.filter(x=>x.id!==id);resetEditor();renderList();status('Đã xóa ghi chú.','ok')}
  catch(err){if(current(e,u))status('Không xóa được: '+(err.message||err),'error')}
  finally{if(current(e,u)){busy=false;updateControls()}}
 });
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
 (async()=>{if(!db){$('notesLogin').hidden=false;status('Chưa kết nối Supabase.','error');return}
  let eventSeen=false;
  db.auth.onAuthStateChange((_event,session)=>{eventSeen=true;const next=ownerFor(session);if(next!==owner){/* Clear previous account immediately; defer DB reads to avoid auth lock. */
    const was=activeTab;activeTab='timer';setOwner(next);activeTab=was;if(next&&was==='notes')setTimeout(()=>{if(owner===next&&!loaded)void loadNotes()},0);
   }else if(!next){$('notesLogin').hidden=false;$('notesWorkspace').hidden=true;status('Đăng nhập để mở ghi chú của tài khoản.');}
  });
  try{const {data,error}=await db.auth.getSession();if(error)throw error;if(!eventSeen)setOwner(ownerFor(data?.session));if(!owner){$('notesLogin').hidden=false;status('Đăng nhập để mở ghi chú của tài khoản.')}}catch(err){status('Không kiểm tra được phiên đăng nhập: '+(err.message||err),'error');$('notesLogin').hidden=false}
 })();
 updateControls();
})();
