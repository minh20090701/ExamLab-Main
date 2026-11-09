/* ExamLab V20 – batch edits/deletion, V19 lazy metadata-compatible. */
(()=>{
 'use strict';
 const api=window.ExamLabV20AdminApi;
 if(!api){console.error('ExamLab V20: chưa có API Admin – kiểm tra js/admin.js?v=20.0');return}
 const $=s=>document.querySelector(s);
 const htmlSafe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[ch]));
 const chosen=new Set();
 let enabled=false,busy=false,modalAction=null;
 const section=document.createElement('section');
 section.className='v20-bulk-panel';section.id='v20BulkPanel';
 section.setAttribute('aria-label','Chỉnh sửa và xóa đề hàng loạt');
 section.innerHTML=`<div class="v20-bulk-heading"><div><strong>QUẢN LÝ HÀNG LOẠT</strong><small>Chọn nhiều bộ đề, chỉnh sửa hoặc xóa cùng lúc</small></div><button id="v20BulkToggle" type="button" class="btn btn-ghost btn-sm">Chọn nhiều đề</button></div>
 <div id="v20BulkTools" hidden><div class="v20-bulk-selection"><span id="v20BulkCount" role="status">0 đề được chọn</span><button id="v20SelectFiltered" type="button" class="btn btn-ghost btn-sm">Chọn tất cả trong bộ lọc</button><button id="v20ClearSelected" type="button" class="btn btn-ghost btn-sm">Bỏ chọn</button></div>
 <div class="v20-bulk-actions"><button type="button" class="btn btn-ghost btn-sm" data-v20-action="minutes">Đổi thời gian</button><button type="button" class="btn btn-ghost btn-sm" data-v20-action="description">Xóa hết giới thiệu</button><button type="button" class="btn btn-ghost btn-sm" data-v20-action="grading">Điểm Đúng/Sai</button><button type="button" class="btn btn-danger btn-sm" data-v20-action="delete">Xóa đề đã chọn</button></div>
 <div id="v20BulkProgress" class="v20-bulk-progress" role="status" aria-live="polite" hidden><div class="v20-progress-label"><span id="v20ProgressText">Đang xử lý…</span><strong id="v20ProgressPct">0%</strong></div><div class="v20-progress-track"><div id="v20ProgressFill"></div></div></div>
 <small class="v20-bulk-tip">Chỉnh sửa được lưu dưới dạng bản nháp Admin. Bấm <b>Xuất bản đề</b> để cập nhật cho học sinh. Xóa đề tác động lên Supabase ngay sau khi xác nhận.</small></div>`;
 const library=$('#adminLibrary');const toolbar=library?.querySelector('.admin-toolbar');
 if(!toolbar){console.error('ExamLab V20: không tìm thấy vùng Admin');return}
 library.insertBefore(section,toolbar);
 const modal=document.createElement('div');modal.id='v20BulkModal';modal.className='v20-bulk-mask';modal.hidden=true;
 modal.innerHTML='<div class="v20-bulk-dialog" role="dialog" aria-modal="true" aria-labelledby="v20ModalTitle"><div class="v20-modal-head"><h2 id="v20ModalTitle">Thao tác hàng loạt</h2><button id="v20ModalClose" type="button" class="btn btn-ghost btn-sm" aria-label="Đóng">✕</button></div><p id="v20ModalIntro"></p><div id="v20ModalFields"></div><p id="v20ModalNotice" class="v20-modal-notice"></p><div class="v20-modal-footer"><button id="v20ModalCancel" type="button" class="btn btn-ghost">Hủy</button><button id="v20ModalApply" type="button" class="btn btn-primary">Lưu thay đổi</button></div></div>';
 document.body.appendChild(modal);
 const list=$('#bankList');
 function setMsg(message,isError=false){const el=$('#v20ProgressText');if(el)el.textContent=message;const p=$('#v20BulkProgress');if(p){p.hidden=false;p.classList.toggle('is-error',isError)}}
 function progress(done,total,label,isError=false){setMsg(label,isError);const p=total?Math.round(done*100/total):100;$('#v20ProgressPct').textContent=p+'%';$('#v20ProgressFill').style.width=p+'%'}
 function state(){return api.state()}
 function filteredEntries(){const s=state();return s.banks.filter(b=>(s.filter==='all'||s.filter===b.subject)&&(s.kindFilter==='all'||api.kind(b)===s.kindFilter)&&(`${b.title} ${b.description}`.toLowerCase().includes(s.search)))}
 function ids(){const current=new Set(state().banks.map(b=>String(b.id)));return [...chosen].filter(id=>current.has(id))}
 function updateCounter(){const n=ids().length;$('#v20BulkCount').textContent=`${n} đề được chọn`;
   section.querySelectorAll('[data-v20-action]').forEach(btn=>btn.disabled=busy||n===0);
   $('#v20SelectFiltered').disabled=busy;$('#v20ClearSelected').disabled=busy||n===0;
   section.querySelector('#v20BulkToggle').disabled=busy;
 }
 function decorate(){
  if(!list)return;
  list.querySelectorAll('button[data-bank]').forEach(row=>{
   if(row.closest('.v20-deck-row'))return;
   const id=String(row.dataset.bank);
   const wrap=document.createElement('div');wrap.className='v20-deck-row';
   const select=document.createElement('label');select.className='v20-select-label';select.hidden=!enabled;
   const box=document.createElement('input');box.type='checkbox';box.dataset.v20Id=id;box.checked=chosen.has(id);
   box.setAttribute('aria-label','Chọn đề '+(state().banks.find(b=>String(b.id)===id)?.title||id));
   box.addEventListener('change',()=>{box.checked?chosen.add(id):chosen.delete(id);updateCounter()});
   select.appendChild(box);row.parentNode.insertBefore(wrap,row);wrap.append(select,row);
   wrap.classList.toggle('v20-selecting',enabled);
  });
  list.querySelectorAll('.v20-deck-row').forEach(w=>{
   w.classList.toggle('v20-selecting',enabled);
   const label=w.querySelector('.v20-select-label');if(label)label.hidden=!enabled;
   const input=w.querySelector('input[data-v20-id]');if(input)input.checked=chosen.has(input.dataset.v20Id);
  });
  updateCounter();
 }
 new MutationObserver(()=>decorate()).observe(list,{childList:true});decorate();
 $('#v20BulkToggle').addEventListener('click',()=>{if(busy)return;enabled=!enabled;$('#v20BulkTools').hidden=!enabled;$('#v20BulkToggle').textContent=enabled?'Thoát chọn nhiều':'Chọn nhiều đề';decorate()});
 $('#v20SelectFiltered').addEventListener('click',()=>{for(const b of filteredEntries())chosen.add(String(b.id));decorate()});
 $('#v20ClearSelected').addEventListener('click',()=>{chosen.clear();decorate()});
 function closeModal(){if(busy)return;modal.hidden=true;modalAction=null}
 $('#v20ModalClose').onclick=closeModal;$('#v20ModalCancel').onclick=closeModal;
 modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
 const namesOf=selection=>selection.slice(0,5).map(id=>state().banks.find(b=>String(b.id)===id)?.title||id);
 function openModal(action){
  if(busy)return;
  const selection=ids();if(!selection.length)return;
  if(state().dirty){alert('Bạn đang chỉnh sửa một đề chưa lưu. Hãy bấm “Lưu đề” trước khi thao tác hàng loạt.');return}
  if($('#publishBtn')?.disabled){alert('Đang xuất bản đề. Hãy hoàn tất trước khi chỉnh sửa hàng loạt.');return}
  modalAction=action;const title=$('#v20ModalTitle'),intro=$('#v20ModalIntro'),fields=$('#v20ModalFields'),tip=$('#v20ModalNotice'),button=$('#v20ModalApply');
  const count=selection.length;
  fields.innerHTML='';tip.textContent='';button.disabled=false;button.className='btn btn-primary';
  if(action==='minutes'){
   title.textContent='Đổi thời gian hàng loạt';intro.textContent=`Áp dụng cho ${count} đề được chọn.`;
   fields.innerHTML='<label class="v20-modal-label">Thời gian mới (phút)<input id="v20Minutes" type="number" min="1" max="300" step="1" required value="50"></label>';
   tip.textContent='Chỉ thay thời gian làm bài, không thay câu hỏi. Sau khi lưu nháp, cần bấm Xuất bản đề.';button.textContent='Lưu thời gian';
  }else if(action==='description'){
   title.textContent='Xóa giới thiệu hàng loạt';intro.textContent=`Xóa trường “Giới thiệu / ghi chú” của ${count} đề được chọn.`;
   fields.innerHTML='<p class="v20-modal-examples">'+namesOf(selection).map(htmlSafe).join(' · ')+'</p>';
   tip.textContent='Không xóa nội dung câu hỏi, đáp án hoặc lời giải chi tiết. Cần bấm Xuất bản đề sau khi lưu nháp.';button.textContent='Xóa giới thiệu';
  }else if(action==='grading'){
   title.textContent='Chỉnh điểm Đúng/Sai hàng loạt';intro.textContent=`Áp dụng cho những đề có câu Đúng/Sai trong ${count} đề đã chọn.`;
   fields.innerHTML=`<label class="v20-modal-label">Điểm tối đa cho <b>mỗi câu Đúng/Sai</b><input id="v20TFPoints" type="number" min="0.01" max="100" step="0.01" required value="1"></label>
   <label class="v20-modal-label">Cơ chế tính điểm từng ý<select id="v20TFMode"><option value="keep">Giữ cơ chế hiện tại của từng đề</option><option value="linear">Theo tỉ lệ số ý đúng</option><option value="all">Đúng tất cả mới được điểm</option><option value="custom">Tùy chỉnh điểm một phần</option></select></label>
   <div id="v20TFPartial" class="v20-partial-grid" hidden>${[1,2,3,4].map((v,i)=>`<label>Đúng ${v} ý (% điểm tối đa)<input type="number" data-partial="${i}" min="0" max="100" step="1" value="${[10,25,50,75][i]}"></label>`).join('')}</div>`;
   $('#v20TFMode').addEventListener('change',e=>{$('#v20TFPartial').hidden=e.target.value!=='custom'});
   tip.textContent='Đặt cùng điểm cho mỗi câu Đ/S trong các đề được chọn. Có thể sửa điểm từng câu riêng trong trang biên soạn. Thang điểm cuối vẫn quy đổi về 10.';button.textContent='Lưu thang điểm';
  }else if(action==='delete'){
   title.textContent='Xóa đề hàng loạt trên Supabase';intro.textContent=`Bạn sắp xóa ${count} đề. Đây là thao tác nguy hiểm và sẽ gỡ đề khỏi thư viện học sinh.`;
   fields.innerHTML='<p class="v20-modal-examples">'+namesOf(selection).map(htmlSafe).join(' · ')+'</p>'+
    `<label class="v20-modal-label">Nhập chính xác <strong>XOA ${count}</strong> để xác nhận<input id="v20ConfirmDelete" type="text" autocomplete="off" spellcheck="false" placeholder="XOA ${count}"></label>`;
   tip.textContent='Đề đã xuất bản sẽ bị xóa trên Supabase và đánh dấu đã xóa; không xóa lịch sử điểm thi. Sao lưu trước khi thực hiện.';
   button.textContent=`Xóa ${count} đề`;button.className='btn btn-danger';button.disabled=true;
   $('#v20ConfirmDelete').addEventListener('input',e=>button.disabled=e.target.value.trim()!==`XOA ${count}`);
  }
  modal.hidden=false;const first=fields.querySelector('input,select');if(first)first.focus();
 }
 section.querySelectorAll('[data-v20-action]').forEach(el=>el.addEventListener('click',()=>openModal(el.dataset.v20Action)));
 function configFor(action){
  if(action==='minutes'){const input=$('#v20Minutes');const n=Number(input.value);if(!/^\d+$/.test(input.value.trim())||n<1||n>300)throw Error('Thời gian phải là số nguyên từ 1 đến 300 phút.');return {minutes:n}}
  if(action==='grading'){
   const input=$('#v20TFPoints');const n=Number(input.value);if(!input.value.trim()||!Number.isFinite(n)||n<0.01||n>100)throw Error('Điểm mỗi câu phải từ 0,01 đến 100.');
   const mode=$('#v20TFMode').value;let partial=null;
   if(mode==='custom')partial=[...modal.querySelectorAll('[data-partial]')].map(el=>{const num=Number(el.value);if(!el.value.trim()||!Number.isFinite(num)||num<0||num>100)throw Error('Phần trăm điểm đúng từng ý phải từ 0 đến 100.');return num/100});
   return {points:n,mode,partial};
  }
  if(action==='delete'){const required=`XOA ${ids().length}`;if($('#v20ConfirmDelete').value.trim()!==required)throw Error('Chưa xác nhận xóa đúng số đề.');return {}}
  return {};
 }
 $('#v20ModalApply').addEventListener('click',async()=>{
  if(busy||!modalAction)return;const action=modalAction;let cfg;
  try{cfg=configFor(action)}catch(e){alert(e.message);return}
  const selected=ids(),s=state();if(s.dirty){alert('Có đề chưa lưu; hãy lưu trước khi tiếp tục.');return}
  busy=true;$('#v20ModalApply').disabled=true;$('#v20ModalCancel').disabled=true;$('#v20ModalClose').disabled=true;modal.hidden=true;
  const failures=[],completed=[],skipped=[];let done=0;
  try{
   progress(0,selected.length,`Bắt đầu xử lý ${selected.length} đề`);
   for(const id of selected){
    const entry=s.banks.find(b=>String(b.id)===id);if(!entry){skipped.push(id);done++;continue}
    try{
     if(action==='delete'){
      const cloud=window.ExamLabSupabase;if(!cloud)throw Error('Không có kết nối Supabase');
      const {error}=await cloud.rpc('examlab_admin_delete_deck',{p_deck_id:id});
      if(error)throw Error(error.message||'Máy chủ từ chối xóa');
      // Delete cloud first; only then remove the local IndexedDB copy.
      try{await api.dbAction('remove',id)}catch(e){console.warn('Đã xóa trên Supabase nhưng chưa dọn cache',id,e)}
      const index=s.banks.findIndex(x=>String(x.id)===id);if(index!==-1)s.banks.splice(index,1);
      s.visibility.delete(id);
      if(String(s.draft?.id)===id){s.draft=null;s.selected=null;s.selectedQ=-1;s.dirty=false}
     }else{
      const full=await api.fetchBank(entry);
      if(action==='minutes'){if(full.durationMinutes===cfg.minutes){skipped.push(id);continue}full.durationMinutes=cfg.minutes}
      else if(action==='description'){if(!full.description){skipped.push(id);continue}full.description=''}
      else if(action==='grading'){
       const tf=full.questions.filter(q=>q.type==='truefalse');if(!tf.length){skipped.push(id);continue}
       if(!full.grading)full.grading=api.normalizeGrading(null);
       full.grading.points.truefalse=cfg.points;
       if(cfg.mode!=='keep'){full.grading.tfMode=cfg.mode;if(cfg.mode==='custom')full.grading.tfPartial=cfg.partial}
       tf.forEach(q=>{q.points=cfg.points});
      }
      const valid=api.normalize(full);
      await api.dbAction('save',valid);
      const index=s.banks.findIndex(x=>String(x.id)===id);
      if(index!==-1)s.banks[index]=api.descriptor(valid,true);
      if(String(s.draft?.id)===id&&!s.dirty){s.draft=structuredClone(valid);s.selectedQ=Math.min(s.selectedQ,valid.questions.length-1)}
     }
     completed.push(id);chosen.delete(id);
    }catch(e){failures.push({id,title:entry.title,error:String(e?.message||e)})}
    finally{
     done++;progress(done,selected.length,`Đã xử lý ${done}/${selected.length} · thành công ${completed.length} · bỏ qua ${skipped.length} · lỗi ${failures.length}`,failures.length>0);
     try{await api.saveIndex()}catch(e){console.warn('Lỗi ghi chỉ mục, đang thử lại',e)}
     // Yield a frame for the progress UI to paint on slow devices.
     await new Promise(resolve=>requestAnimationFrame(resolve));
    }
   }
   await api.saveIndex();api.renderEditor();api.refresh();
   const summary= action==='delete'?'Xóa đề':'Chỉnh sửa đề';
   if(failures.length){
    setMsg(`${summary}: thành công ${completed.length}, bỏ qua ${skipped.length}, lỗi ${failures.length}. ${failures[0].title}: ${failures[0].error}`,true);
    alert(`Đã xử lý ${done} đề. Thành công: ${completed.length}. Bỏ qua: ${skipped.length}. Lỗi: ${failures.length}.\nLỗi đầu tiên: ${failures[0].title} – ${failures[0].error}\nNhững đề lỗi vẫn được giữ chọn để thử lại.`);
   }else setMsg(action==='delete'?`Đã xóa ${completed.length} đề. Lịch sử thi được giữ.`:`Đã lưu nháp ${completed.length} đề. Bấm “Xuất bản đề” để cập nhật lên Supabase.`);
  }finally{
   busy=false;$('#v20ModalCancel').disabled=false;$('#v20ModalClose').disabled=false;
   modalAction=null;decorate();
  }
 });
 window.ExamLabV20Bulk={decorate};
})();
