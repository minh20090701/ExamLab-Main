
/* ExamLab Khoa Bảng - local-first question bank administration (no pretend admin authentication). */
(()=>{
 'use strict';
 const FORMAT='examlab.quiz.v1';
/* EXAMLAB_V17_CATALOG */
// Chỉ một nguồn xác định loại đề, ưu tiên lựa chọn lưu bởi Admin.
function examlabDeckKind(deck){
 if(deck?.kind==='practice'||deck?.kind==='mock')return deck.kind;
 const name=String(deck?.title||'').toLocaleLowerCase('vi').normalize('NFC');
 if(/ôn tập|luyện tập|chuyên đề|bài tập|100 câu|200 câu/.test(name))return 'practice';
 return /thi thử|đề thi|mô phỏng|giữa kì|giữa kỳ|cuối kì|cuối kỳ|giữa học kì|giữa học kỳ|tốt nghiệp|thpt|khảo sát/.test(name)?'mock':'practice';
}

 const SUBJECTS={toan:'Toán học',ly:'Vật lý',hoa:'Hóa học',sinh:'Sinh học'};
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
 const state={banks:[],selected:null,draft:null,selectedQ:-1,dirty:false,filter:'all',kindFilter:'all',search:'',db:null,visibility:new Map()};
 let toastTimer;
 function toast(msg,error=false){const e=$('#adminToast');e.textContent=msg;e.className=error?'show error':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{e.className=''},4200)}
 function dbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('examlab-db',1);r.onupgradeneeded=()=>{for(const name of ['banks','attempts','drafts','meta'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
 function dbAction(op,value){return new Promise((res,rej)=>{const tx=state.db.transaction('banks','readwrite'),store=tx.objectStore('banks');let r=op==='all'?store.getAll():op==='get'?store.get(value):op==='save'?store.put(value):store.delete(value);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
 function normalizeLegacy(raw){
  if(!raw||raw.format!==FORMAT)throw Error(`Sai định dạng (format phải là ${FORMAT})`);
  if(typeof raw.title!=='string'||!raw.title.trim())throw Error('Cần nhập tên bộ đề');
  if(!SUBJECTS[raw.subject])throw Error('Môn không hợp lệ');
  if(!Array.isArray(raw.questions)||!raw.questions.length||raw.questions.length>1500)throw Error('Đề cần từ 1 đến 1500 câu');
  const seen=new Set();
  const questions=raw.questions.map((q,i)=>{
   if(!q||typeof q!=='object')throw Error(`Câu ${i+1}: dữ liệu không hợp lệ`);
   const id=String(q.id??i+1),type=q.type||'short';
   if(seen.has(id))throw Error(`Câu ${i+1}: trùng mã câu`);seen.add(id);
   if(!['short','single','multiple'].includes(type))throw Error(`Câu ${i+1}: dạng câu không hợp lệ`);
   if(!String(q.text||'').trim()&&!String(q.contentHtml||'').trim())throw Error(`Câu ${i+1}: thiếu nội dung`);
   if(!String(q.explanation||'').trim())throw Error(`Câu ${i+1}: thiếu lời giải chi tiết`);
   let options;
   if(type!=='short'){
    if(!q.options||typeof q.options!=='object'||Array.isArray(q.options))throw Error(`Câu ${i+1}: thiếu lựa chọn`);
    options=Object.fromEntries(Object.entries(q.options).filter(([k,v])=>String(v||'').trim()).map(([k,v])=>[String(k),String(v)]));
    if(Object.keys(options).length<2)throw Error(`Câu ${i+1}: cần ít nhất 2 phương án`);
   }
   let answer;
   if(type==='multiple'){
    if(!Array.isArray(q.answer)||!q.answer.length)throw Error(`Câu ${i+1}: chọn ít nhất một đáp án`);
    answer=[...new Set(q.answer.map(String))];
    if(answer.some(k=>!(k in options)))throw Error(`Câu ${i+1}: đáp án không nằm trong lựa chọn`);
   }else{
    answer=String(q.answer??'').trim();
    if(!answer)throw Error(`Câu ${i+1}: thiếu đáp án`);
    if(type==='single'&&!(answer in options))throw Error(`Câu ${i+1}: đáp án không nằm trong lựa chọn`);
   }
   return {id,type,text:String(q.text||''),contentHtml:String(q.contentHtml||''),images:Array.isArray(q.images)?q.images.filter(x=>typeof x==='string'&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(x)&&x.length<=2800000):[],options,answer,aliases:type==='short'&&Array.isArray(q.aliases)?q.aliases.map(String):[],explanation:String(q.explanation||'')};
  });
  const duration=Math.round(Number(raw.durationMinutes)||60);
  if(duration<1||duration>300)throw Error('Thời gian làm bài phải từ 1 đến 300 phút');
  return {format:FORMAT,id:String(raw.id||makeId('de')),title:raw.title.trim().slice(0,150),subject:raw.subject,description:String(raw.description||'').slice(0,700),durationMinutes:duration,questions};
 }
// V16: The original three question types keep their previous default equal weights.
function normalizeGrading(raw){
 const v=raw&&typeof raw==='object'?raw:{};
 const p=v.points&&typeof v.points==='object'?v.points:{};
 const num=(n,fallback,min,max)=>{const x=Number(n);return Number.isFinite(x)&&x>=min&&x<=max?x:fallback};
 const mode=['linear','all','custom'].includes(v.tfMode)?v.tfMode:'linear';
 const defaults=[0.1,0.25,0.5,0.75];
 const tfPartial=defaults.map((d,i)=>num(Array.isArray(v.tfPartial)?v.tfPartial[i]:undefined,d,0,1));
 return {points:{choice:num(p.choice,1,0.01,100),truefalse:num(p.truefalse,1,0.01,100),short:num(p.short,1,0.01,100)},tfMode:mode,tfPartial};
}
function normalizeTFQuestion(q,i){
 if(!q||typeof q!=='object')throw Error(`Câu ${i+1}: nội dung Đúng/Sai không hợp lệ`);
 const lines=Array.isArray(q.statements)?q.statements:[];
 if(lines.length<2||lines.length>5)throw Error(`Câu ${i+1}: Đúng/Sai phải có 2–5 ý`);
 const answers=Array.isArray(q.answer)?q.answer:[];
 if(answers.length!==lines.length)throw Error(`Câu ${i+1}: cần chọn đáp án Đúng/Sai cho đủ ${lines.length} ý`);
 const statements=lines.map((line,k)=>{
  const str=typeof line==='string'?line:(line&&typeof line==='object'?line.text:'');
  if(!String(str||'').trim())throw Error(`Câu ${i+1}, ý ${k+1}: thiếu nội dung`);
  return String(str).trim();
 });
 const answer=answers.map((x,k)=>{
  if(x===true||x==='true'||x==='Đúng'||x==='dung'||x===1||x==='1')return true;
  if(x===false||x==='false'||x==='Sai'||x==='sai'||x===0||x==='0')return false;
  throw Error(`Câu ${i+1}, ý ${k+1}: cần đánh dấu Đúng hoặc Sai`);
 });
 if(!String(q.text||'').trim()&&!String(q.contentHtml||'').trim())throw Error(`Câu ${i+1}: thiếu nội dung câu hỏi`);
 if(!String(q.explanation||'').trim())throw Error(`Câu ${i+1}: thiếu lời giải chi tiết`);
 const images=Array.isArray(q.images)?q.images.filter(x=>typeof x==='string'&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(x)&&x.length<=2800000):[];
 const ownPoints=q.points===undefined||q.points===null||q.points===''?null:Number(q.points);
 if(ownPoints!==null&&(!Number.isFinite(ownPoints)||ownPoints<0.01||ownPoints>100))throw Error(`Câu ${i+1}: điểm riêng Đúng/Sai phải từ 0,01 đến 100`);
 return {id:String(q.id??i+1),type:'truefalse',text:String(q.text||''),contentHtml:String(q.contentHtml||''),images,statements,answer,explanation:String(q.explanation||''),aliases:[],...(ownPoints===null?{}:{points:ownPoints})};
}
function normalizedLegacyWithTF(raw,legacyNormalizer){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.questions))return legacyNormalizer(raw);
 // Validate old question types using the existing validator, without changing its behavior.
 const proxy={...raw,questions:raw.questions.map(q=>q?.type==='truefalse'
   ? {...q,type:'short',answer:'Đúng',options:undefined,aliases:[]} : q)};
 const b=legacyNormalizer(proxy);
 b.questions=raw.questions.map((q,i)=>q?.type==='truefalse'?normalizeTFQuestion(q,i):b.questions[i]);
 b.grading=normalizeGrading(raw.grading);
 return b;
}
 function normalize(raw){const b=normalizedLegacyWithTF(raw,normalizeLegacy);b.kind=examlabDeckKind(raw);return b;}
/* EXAMLAB_V19_LAZY_ADMIN: metadata IndexedDB, no upfront bulk payload */
let v19AdminPage=0;const v19AdminPageSize=30;
function adminDeckCount(b){return Number.isFinite(Number(b?.questionCount))?Number(b.questionCount):(b?.questions?.length||0)}
function adminDescriptor(b,needsPublish=false){
 return {id:String(b.id),format:FORMAT,title:String(b.title||''),subject:String(b.subject||'hoa'),kind:examlabDeckKind(b),
  description:String(b.description||''),durationMinutes:Number(b.durationMinutes)||60,questionCount:adminDeckCount(b),questions:[],
  needsPublish:!!needsPublish,_examlabLazy:true,updatedAt:b.updatedAt||''};
}
function adminMeta(action,value){return new Promise((resolve,reject)=>{
 const tx=state.db.transaction('meta','readwrite'),store=tx.objectStore('meta');
 const req=action==='get'?store.get(value):store.put(value);
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
async function saveAdminIndex(){
 try{await adminMeta('put',{id:'examlab-admin-index-v19',banks:state.banks.map(b=>adminDescriptor(b,b.needsPublish))})}
 catch(e){console.warn('Không thể cập nhật danh mục Admin',e)}
}
async function loadAdminIndex(){
 const prev=await adminMeta('get','examlab-admin-index-v19');
 if(Array.isArray(prev?.banks))return prev.banks.map(b=>adminDescriptor(b,b.needsPublish));
 // Only the first migration loads legacy full banks. All later visits use this tiny metadata record.
 const legacy=await dbAction('all');
 const desc=legacy.map(b=>adminDescriptor(b,true));
 await adminMeta('put',{id:'examlab-admin-index-v19',banks:desc});
 return desc;
}
async function fetchAdminBank(entry){
 let payload=null;
 if(entry.needsPublish){
  payload=await dbAction('get',entry.id);
 }
 if(!payload){
  const db=window.ExamLabSupabase;
  if(db){
   const {data,error}=await db.from('examlab_decks').select('payload').eq('id',entry.id).maybeSingle();
   if(error)throw Error('Không tải được nội dung đề: '+error.message);
   if(data?.payload)payload=data.payload;
  }
 }
 if(!payload)payload=await dbAction('get',entry.id);
 if(!payload)throw Error('Không tìm thấy nội dung đề trên máy hoặc Supabase.');
 return normalize(payload);
}
function adminProgress(value,total,description){
 const bar=$('#v19PublishBar'),label=$('#v19PublishLabel'),holder=$('#v19PublishProgress');
 if(!holder||!bar||!label)return;
 holder.hidden=false;bar.max=Math.max(1,total);bar.value=value;
 label.textContent=description+' · '+value+'/'+total+' ('+(total?Math.round(value*100/total):100)+'%)';
}

 function refresh(){
  const banks=state.banks;
  $('#statBanks').textContent=banks.length;
  $('#statQuestions').textContent=banks.reduce((n,b)=>n+adminDeckCount(b),0);
  $('#statDuration').textContent=banks.reduce((n,b)=>n+(Number(b.durationMinutes)||0),0);
  $('#statSubjects').textContent=new Set(banks.map(b=>b.subject)).size;
  const rows=banks.filter(b=>(state.filter==='all'||state.filter===b.subject)&&(state.kindFilter==='all'||examlabDeckKind(b)===state.kindFilter)&&(`${b.title} ${b.description}`.toLowerCase().includes(state.search))).sort((a,b)=>a.title.localeCompare(b.title,'vi'));v19AdminPage=Math.min(v19AdminPage,Math.max(0,Math.ceil(rows.length/v19AdminPageSize)-1));const pageRows=rows.slice(v19AdminPage*v19AdminPageSize,(v19AdminPage+1)*v19AdminPageSize);
  $('#bankList').innerHTML=rows.length?pageRows.map(b=>`<button type="button" class="admin-bank-row ${state.selected===b.id?'selected':''}" data-bank="${esc(b.id)}"><span class="bank-row-icon">${({toan:'∑',ly:'⚛',hoa:'⚗',sinh:'❀'})[b.subject]}</span><span class="bank-row-main"><b>${esc(b.title)}</b><small>${examlabDeckKind(b)==='mock'?'Đề thi mô phỏng':'Đề luyện tập'} · ${esc(SUBJECTS[b.subject])} · ${adminDeckCount(b)} câu · ${b.durationMinutes} phút · ${state.visibility.get(b.id)===false?'🔒 Đã ẩn':state.visibility.get(b.id)===true?'✓ Công khai':'◌ Chưa xuất bản'}</small></span><span class="bank-row-arrow">›</span></button>`).join(''):'<p class="admin-no-data">Chưa có bộ đề phù hợp. Bấm “Tạo đề” hoặc “Tải bộ đề lên” để bắt đầu.</p>';
  $('#publishNote').textContent=`Có ${banks.filter(b=>b.needsPublish).length} bộ đề cần cập nhật trong ${banks.length} bộ đề. Chỉ gửi đề mới hoặc đã sửa lên Supabase.`; const totalPages=Math.ceil(rows.length/v19AdminPageSize);const pager=$('#v19AdminPager');if(pager){pager.hidden=totalPages<=1;$('#v19AdminPageText').textContent='Trang '+(v19AdminPage+1)+'/'+Math.max(1,totalPages);$('#v19AdminPrev').disabled=v19AdminPage===0;$('#v19AdminNext').disabled=v19AdminPage>=totalPages-1;} } async function ensureLeave(){return !state.dirty||await window.ExamLabDialog.confirm('Bạn có thay đổi chưa lưu trong bộ đề. Nếu tiếp tục, những thay đổi đó sẽ bị bỏ qua.',{title:'Bỏ thay đổi chưa lưu?',confirmText:'Bỏ thay đổi',danger:true})}
 async function selectBank(id){
  if(!(await ensureLeave()))return;
  const entry=state.banks.find(b=>String(b.id)===String(id));if(!entry)return;
  const previous=state.selected;
  state.selected=id;refresh();
  syncMessage('Đang tải nội dung bộ đề “'+entry.title+'”…');
  try{
   const bank=await fetchAdminBank(entry);
   if(state.selected!==id)return;
   state.draft=structuredClone(bank);state.selectedQ=bank.questions.length?0:-1;state.dirty=false;
   renderEditor();refresh();syncMessage('Đã tải bộ đề “'+entry.title+'”.');
  }catch(e){state.selected=previous;refresh();toast(e.message,true);syncMessage(e.message)}
 }

 function markDirty(){state.dirty=true;$('#editStatus').textContent='● Có thay đổi chưa lưu';$('#editStatus').classList.add('unsaved');$('#editorHeadline').textContent=state.draft.title||'Đề chưa đặt tên';}
 function renderEditor(){
  const b=state.draft;
  $('#adminEmpty').hidden=!!b;$('#editorUI').hidden=!b;
  if(!b)return;
  $('#bankTitle').value=b.title;$('#bankSubject').value=b.subject;$('#bankKind').value=examlabDeckKind(b);$('#bankDescription').value=b.description||'';$('#bankDuration').value=b.durationMinutes;
  const visible=state.visibility.get(b.id),toggle=$('#toggleBankVisibility');if(toggle){toggle.disabled=visible===undefined;toggle.textContent=visible===false?'👁 Hiện đề':visible===true?'🔒 Ẩn đề':'◌ Chưa xuất bản';toggle.title=visible===undefined?'Hãy xuất bản đề trước khi ẩn/hiện':'Đổi trạng thái công khai của đề trên Supabase';}
  $('#editorHeadline').textContent=b.title||'Đề mới';$('#editStatus').textContent=state.dirty?'● Có thay đổi chưa lưu':'✓ Đã lưu trên thiết bị';$('#editStatus').classList.toggle('unsaved',state.dirty);
  renderGradingConfig();refreshQuestions();
 }
 function refreshQuestions(){
  const b=state.draft;if(!b)return;
  $('#questionCount').textContent=b.questions.length;renderGradingConfig();
  $('#questionList').innerHTML=b.questions.length?b.questions.map((q,i)=>`<button type="button" class="question-list-row ${state.selectedQ===i?'current':''}" data-selectq="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc((q.text||q.contentHtml?.replace(/<[^>]*>/g,' ')||'Chưa nhập nội dung').slice(0,65))}</b><small>${q.type==='short'?'Trả lời ngắn':q.type==='single'?'Chọn một':q.type==='truefalse'?'Đúng/Sai':'Chọn nhiều'}</small></button>`).join(''):'<p class="admin-no-data">Chưa có câu hỏi.</p>';
  renderQuestion();
 }
function tfEditorHtml(q){
 const letters='ABCDE';
 const lines=Array.isArray(q.statements)?q.statements:[];
 return `<div class="editor-field"><div class="field-heading">Các ý Đúng / Sai <small>Chọn từ 2 đến 5 ý, đánh dấu đáp án từng ý.</small></div>
  <div class="tf-edit-list">${lines.map((line,i)=>`<div class="tf-edit-row"><span class="tf-letter">${letters[i]}</span><input type="text" data-tftext="${i}" placeholder="Nội dung ý ${letters[i]}" value="${esc(typeof line==='string'?line:line?.text||'')}"><select data-tfcorrect="${i}" aria-label="Đáp án ý ${letters[i]}"><option value="true" ${q.answer?.[i]===true?'selected':''}>Đúng</option><option value="false" ${q.answer?.[i]===false?'selected':''}>Sai</option></select><button type="button" class="btn btn-ghost btn-xs" data-tf-op="remove" data-tf-index="${i}" ${lines.length<=2?'disabled':''} title="Xóa ý này">×</button></div>`).join('')}</div>
 <div class="tf-actions"><button type="button" class="btn btn-ghost btn-sm" data-tf-op="add" ${lines.length>=5?'disabled':''}>＋ Thêm ý (${lines.length}/5)</button><span class="small-muted">Đúng/Sai được chấm từng ý theo cấu hình của bộ đề.</span></div></div>`;
}
function renderGradingConfig(){
 const root=$('#gradingConfig'),b=state.draft;if(!root||!b)return;
 const g=normalizeGrading(b.grading);
 // Preserve typed values until saved, but fall back to defaults for old exam banks.
 b.grading=g;
 const count={choice:0,truefalse:0,short:0};
 b.questions.forEach(q=>count[q.type==='truefalse'?'truefalse':q.type==='short'?'short':'choice']++);
 const max=count.choice*g.points.choice+count.short*g.points.short+b.questions.filter(q=>q.type==='truefalse').reduce((sum,q)=>sum+(typeof q.points==='number'&&Number.isFinite(q.points)?q.points:g.points.truefalse),0);
 const kinds=[['choice','Trắc nghiệm (chọn 1/nhiều)'],['truefalse','Đúng/Sai (2–5 ý)'],['short','Trả lời ngắn']];
 root.innerHTML=`<section class="grading-editor"><div class="grading-head"><div><h3>⚖ Cấu hình chấm điểm</h3><p>Admin quyết định điểm tối đa của mỗi câu theo phần; hệ thống cộng điểm rồi quy đổi về thang 10.</p></div><span class="grading-tag">THANG 10</span></div>
  <div class="grading-grid">${kinds.map(([key,label])=>`<label>${label}<input type="number" min="0.01" max="100" step="0.01" data-grade-point="${key}" value="${g.points[key]}"><small>${count[key]} câu × ${g.points[key]} điểm</small></label>`).join('')}</div>
  <div class="grading-tf-box"><label class="editor-field">Chấm Đúng/Sai theo từng ý<select data-grade-mode><option value="linear" ${g.tfMode==='linear'?'selected':''}>Theo tỉ lệ số ý đúng (ví dụ 3/4 = 75%)</option><option value="all" ${g.tfMode==='all'?'selected':''}>Đúng tất cả mới có điểm</option><option value="custom" ${g.tfMode==='custom'?'selected':''}>Điểm một phần tùy chỉnh</option></select></label>
  <div class="grading-partial" ${g.tfMode==='custom'?'':'hidden'}><p>Tỉ lệ điểm khi chưa đúng hết các ý; khi đúng đủ luôn nhận 100%.</p><div class="grading-partial-grid">${[1,2,3,4].map((n,i)=>`<label>Đúng ${n} ý<input type="number" min="0" max="100" step="1" data-grade-partial="${i}" value="${Math.round(g.tfPartial[i]*100)}">%</label>`).join('')}</div></div></div>
  <p class="grading-note">Tổng điểm tối đa hiện tại: <strong>${Number(max.toFixed(2))}</strong> điểm thô cho ${b.questions.length} câu. Bài làm được quy đổi về 10 điểm; chế độ trộn câu cũng tính theo các câu được chọn.</p></section>`;
 if(examlabDeckKind(b)==='mock'){
   const report='Cấu trúc hiện tại: '+count.choice+' trắc nghiệm, '+count.truefalse+' Đúng/Sai, '+count.short+' trả lời ngắn · '+b.durationMinutes+' phút.';
   const reference=b.subject==='ly'?' Ví dụ đề Vật lí 12 trong tài liệu mẫu: 18 / 4 / 6 câu, 50 phút; hãy đối chiếu yêu cầu của kỳ thi cụ thể.':'';
   root.insertAdjacentHTML('beforeend','<p class="admin-warning">'+report+reference+'</p>');
 }
}
function changeGradingField(t){
 const b=state.draft;if(!b)return false;
 if(!b.grading)b.grading=normalizeGrading(null);
 if(t.dataset.gradePoint!==undefined){
  const x=Number(t.value);if(!Number.isFinite(x)||x<0.01||x>100)return true;
  b.grading.points[t.dataset.gradePoint]=x;markDirty();return true;
 }
 if(t.dataset.gradeMode!==undefined){b.grading.tfMode=t.value;markDirty();renderGradingConfig();return true}
 if(t.dataset.gradePartial!==undefined){const x=Number(t.value);if(!Number.isFinite(x)||x<0||x>100)return true;b.grading.tfPartial[Number(t.dataset.gradePartial)]=x/100;markDirty();return true}
 return false;
}
 function renderQuestion(){
  const b=state.draft,q=b?.questions[state.selectedQ],root=$('#questionDetails');
  if(!q){root.innerHTML='<div class="admin-empty inner"><span class="admin-empty-icon">✎</span><b>Chọn một câu bên trái</b><p>Nhập nội dung, đáp án và lời giải tại đây.</p></div>';return}
  const choice=q.type==='single'||q.type==='multiple';
  const opts=['A','B','C','D'].map(k=>`<div class="option-edit-row"><label class="answer-picker" title="Chọn đáp án đúng"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="correctOption" value="${k}" ${q.type==='multiple'?(Array.isArray(q.answer)&&q.answer.includes(k)?'checked':''):(q.answer===k?'checked':'')}></label><span class="option-letter">${k}</span><input type="text" class="option-value" data-option="${k}" placeholder="Phương án ${k}" value="${esc(q.options?.[k]||'')}"></div>`).join('');
  root.innerHTML=`<div class="question-detail-top"><span class="eyebrow">CÂU HỎI SỐ ${state.selectedQ+1}</span><div class="question-tools"><button class="btn btn-ghost btn-xs" data-qtool="up" title="Chuyển lên">↑</button><button class="btn btn-ghost btn-xs" data-qtool="down" title="Chuyển xuống">↓</button><button class="btn btn-ghost btn-xs" data-qtool="duplicate">Nhân bản</button><button class="btn btn-danger btn-xs" data-qtool="remove">Xóa</button></div></div>
   <label class="editor-field">Loại câu hỏi<select id="qType"><option value="short" ${q.type==='short'?'selected':''}>Điền đáp án ngắn</option><option value="single" ${q.type==='single'?'selected':''}>Trắc nghiệm · chọn một</option><option value="multiple" ${q.type==='multiple'?'selected':''}>Trắc nghiệm · chọn nhiều</option><option value="truefalse" ${q.type==='truefalse'?'selected':''}>Đúng / Sai · 2–5 ý</option></select></label>
   <label class="editor-field">Nội dung câu hỏi <b>*</b><textarea id="qText" rows="5" placeholder="Nhập nội dung câu hỏi; có thể xuống dòng...">${esc(q.text)}</textarea></label>
   <details class="advanced-editor"><summary>Nội dung nâng cao: bảng / công thức HTML có sẵn</summary><p>Nếu điền, phần HTML được ưu tiên hiển thị trước văn bản. Hệ thống chỉ cho phép thẻ an toàn, không chạy mã JavaScript.</p><textarea id="qHtml" rows="4" placeholder="Dán phần HTML của công thức/bảng nếu cần">${esc(q.contentHtml||'')}</textarea></details>
   ${q.type==='truefalse'?tfEditorHtml(q)+`<label class="editor-field">Điểm riêng tối đa cho câu Đúng/Sai (để trống = điểm mặc định)<input id="qTfPoints" type="number" min="0.01" max="100" step="0.01" placeholder="Điểm mặc định" value="${esc(q.points??'')}"></label>`:choice?`<div class="editor-field"><div class="field-heading">Các phương án <small>Đánh dấu phương án đúng bằng ô tròn/ô vuông</small></div><div class="options-editor">${opts}</div></div>`:`<label class="editor-field">Đáp án đúng <b>*</b><input id="qShortAnswer" type="text" value="${esc(q.answer||'')}" placeholder="Ví dụ: 42 hoặc 2,5"></label><label class="editor-field">Đáp án khác được chấp nhận (cách nhau bởi dấu chấm phẩy)<input id="qAliases" type="text" value="${esc((q.aliases||[]).join('; '))}" placeholder="Ví dụ: 2.5; 5/2"></label>`}
   <label class="editor-field">Lời giải chi tiết <b>*</b><textarea id="qExplanation" rows="5" placeholder="Giải thích lý do chọn đáp án, trình bày phép tính...">${esc(q.explanation||'')}</textarea></label>
   <div class="image-editor"><div class="field-heading">Hình minh họa <small>PNG/JPG/WebP/GIF, tối đa 1.5 MB mỗi ảnh</small></div><div class="uploaded-images">${(q.images||[]).filter(src=>typeof src==='string'&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(src)).map((src,i)=>`<div class="uploaded-image"><img src="${src}" alt="Hình minh họa ${i+1}"><button type="button" data-remove-image="${i}" aria-label="Xóa ảnh">×</button></div>`).join('')}</div><label class="btn btn-ghost btn-sm upload-image-label">＋ Thêm ảnh<input id="qImageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label></div>
   <div class="question-footnote">✦ Đáp án và lời giải chỉ hiển thị cho người học sau khi nộp bài kiểm tra.</div>`;
 }
 async function addImages(input){const f=input.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)||f.size>1.5*1024*1024) return toast('Chỉ chọn ảnh PNG/JPG/WebP/GIF ≤ 1,5 MB',true);const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(f)});state.draft.questions[state.selectedQ].images.push(src);markDirty();renderQuestion();toast('Đã thêm hình minh họa')}
 function updateQuestionValue(target){const q=state.draft?.questions[state.selectedQ];if(!q)return;
  if(target.id==='qTfPoints'){const raw=target.value.trim();if(!raw){delete q.points;markDirty();renderGradingConfig();return}const n=Number(raw);if(Number.isFinite(n)&&n>=0.01&&n<=100){q.points=n;markDirty();renderGradingConfig()}return}
  if(target.dataset.tftext!==undefined){q.statements[Number(target.dataset.tftext)]=target.value;markDirty();return;}
  if(target.dataset.tfcorrect!==undefined){q.answer[Number(target.dataset.tfcorrect)]=target.value==='true';markDirty();return;}
  switch(target.id){case 'qText':q.text=target.value;break;case 'qHtml':q.contentHtml=target.value;break;case 'qShortAnswer':q.answer=target.value;break;case 'qAliases':q.aliases=target.value.split(';').map(s=>s.trim()).filter(Boolean);break;case 'qExplanation':q.explanation=target.value;break;default:if(target.dataset.option)q.options[target.dataset.option]=target.value;else return}
  markDirty();
 }
function changeQuestionType(type){
 const q=state.draft.questions[state.selectedQ];q.type=type;
 if(type==='truefalse'){
  q.statements=['','','',''];q.answer=[true,true,false,false];q.options=undefined;
 }else{
  q.options=type==='short'?undefined:(q.options||{A:'',B:'',C:'',D:''});
  q.answer=type==='short'?'':type==='multiple'?[]:'';
  delete q.statements;
 }
 q.aliases=[];markDirty();renderGradingConfig();renderQuestion();
}
  async function questionTool(action){let i=state.selectedQ;const arr=state.draft.questions;if(i<0)return;
  if(action==='remove'){if(!(await window.ExamLabDialog.confirm(`Câu ${i+1} sẽ bị xóa khỏi bộ đề đang soạn.`,{title:'Xóa câu hỏi',confirmText:'Xóa câu',danger:true})))return;arr.splice(i,1);state.selectedQ=Math.min(i,arr.length-1)}
  if(action==='duplicate'){const clone=structuredClone(arr[i]);clone.id=makeId('cau');arr.splice(i+1,0,clone);state.selectedQ=i+1}
  if(action==='up'&&i>0){[arr[i],arr[i-1]]=[arr[i-1],arr[i]];state.selectedQ=i-1}
  if(action==='down'&&i<arr.length-1){[arr[i],arr[i+1]]=[arr[i+1],arr[i]];state.selectedQ=i+1}
  markDirty();refreshQuestions();
 }
 function updateBankField(e){const b=state.draft;if(!b)return;const fields={bankTitle:'title',bankSubject:'subject',bankKind:'kind',bankDescription:'description',bankDuration:'durationMinutes'};const key=fields[e.target.id];if(!key)return;b[key]=key==='durationMinutes'?Number(e.target.value):e.target.value;markDirty()}
 async function saveBank(){
  try{
   const b=normalize(state.draft);
   await dbAction('save',b);
   const entry=adminDescriptor(b,true),i=state.banks.findIndex(v=>v.id===b.id);
   if(i<0)state.banks.push(entry);else state.banks[i]=entry;
   await saveAdminIndex();state.draft=structuredClone(b);state.selected=b.id;state.dirty=false;
   renderEditor();refresh();toast('Đã lưu “'+b.title+'” · '+b.questions.length+' câu (chưa xuất bản)');
  }catch(e){toast(e.message,true)}
 }

 async function newBank(){if(!(await ensureLeave()))return;const b={format:FORMAT,id:makeId('de'),title:'',subject:'hoa',description:'',durationMinutes:60,kind:'practice',questions:[],grading:normalizeGrading(null)};state.draft=b;state.selected=b.id;state.selectedQ=-1;state.dirty=true;renderEditor();refresh();$('#bankTitle').focus()}
 let deletingBank=false;
 async function deleteBank(){
  if(deletingBank||!state.draft)return;
  const b=state.draft,bankId=String(b.id);
  const message=`Xóa bộ đề “${b.title||'chưa đặt tên'}” khỏi ExamLab?
Nếu đã xuất bản, đề sẽ bị xóa trên Supabase và không hiện lại khi đồng bộ. Lịch sử điểm đã nộp vẫn được giữ.`;
  const accepted=window.ExamLabDialog?.confirm
   ? await window.ExamLabDialog.confirm(message,{title:'Xóa bộ đề khỏi hệ thống',confirmText:'Xóa đề',danger:true})
   : window.confirm(message);
  if(!accepted)return;
  deletingBank=true;
  const button=$('#deleteBank');if(button)button.disabled=true;
  try{
   const cloud=window.ExamLabSupabase;
   if(!cloud)throw Error(window.ExamLabSupabaseError||'Không kết nối được Supabase. Chưa xóa đề.');
   const {data,error}=await cloud.rpc('examlab_admin_delete_deck',{p_deck_id:bankId});
   if(error)throw Error(error.message||'Máy chủ từ chối xóa đề');
   // Supabase đã xác nhận; lúc này mới xóa bản lưu trong thiết bị.
   let localError=null;
   try{await dbAction('remove',bankId)}catch(e){localError=e}
   state.banks=state.banks.filter(x=>String(x.id)!==bankId);
   state.visibility.delete(bankId);
   await saveAdminIndex();
   state.draft=null;state.selected=null;state.selectedQ=-1;state.dirty=false;
   renderEditor();refresh();
   if(localError)toast('Đã xóa đề trên Supabase, nhưng bộ nhớ máy chưa được dọn: '+localError.message,true);
   else toast(data===true?'Đã xóa đề trên Supabase và thiết bị.':'Đã xóa bản nháp cục bộ (đề chưa tồn tại trên Supabase).');
  }catch(e){
   toast('Không xóa được đề: '+(e?.message||e)+'. Hãy chạy SQL FIX_DELETE_DECK_V15.sql và kiểm tra quyền Admin.',true);
  }finally{
   deletingBank=false;if(button)button.disabled=false;
  }
 }
 function saveFile(text,name,type='application/json;charset=utf-8'){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
 function exportBank(){try{const b=normalize(state.draft);saveFile(JSON.stringify(b,null,2),`de-${b.subject}-${b.id}.json`);toast('Đã tải bộ đề')}catch(e){toast(e.message,true)}}
 async function readVisibilityStatuses(db){
   const {data,error}=await db.rpc('examlab_admin_deck_statuses');
   if(error)throw Error('Chưa cài SQL quản lý ẩn/hiện đề hoặc thiếu quyền Admin: '+error.message);
   return new Map((data||[]).map(r=>[String(r.deck_id),r.published===true]));
 }
 async function readRemovedIds(db){
   const {data,error}=await db.rpc('examlab_admin_deleted_deck_ids');
   if(error)throw Error('Chưa cài chức năng xóa đề trên Supabase: '+error.message);
   return new Set((data||[]).map(row=>String(row.deck_id)));
 }

 // ExamLab V18 — tiến trình phản ánh số bộ đề/tệp đã xử lý thực tế.
 function examlabProgressV18(kind,done,total,label,mode){
   const root=document.getElementById(kind==='publish'?'publishProgressV18':kind==='import'?'importProgressV18':'importSaveProgressV18');
   if(!root)return;
   root.hidden=false;
   const percent=Math.max(0,Math.min(100,Math.round((Number(done)||0)/Math.max(1,Number(total)||1)*100)));
   const meter=root.querySelector('[role="progressbar"]');
   root.dataset.progressState=mode||'active';
   const fill=root.querySelector('[data-progress-fill]');if(fill)fill.style.width=percent+'%';
   if(meter)meter.setAttribute('aria-valuenow',String(percent));
   const pct=root.querySelector('[data-progress-pct]');if(pct)pct.textContent=percent+'%';
   const description=root.querySelector('[data-progress-text]');if(description)description.textContent=label||'Đang xử lý…';
 }
 const examlabProgressFrameV18=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 let examlabPublishBusyV18=false;

 let publishingV19=false;
 async function publish(){
  if(publishingV19)return;
  if(state.dirty){toast('Hãy lưu đề đang chỉnh sửa trước khi xuất bản.',true);return}
  const db=window.ExamLabSupabase;
  if(!db){toast('Chưa kết nối Supabase.',true);return}
  publishingV19=true;const btn=$('#publishBtn');if(btn)btn.disabled=true;
  try{
   state.visibility=await readVisibilityStatuses(db);
   const removedIds=await readRemovedIds(db);
   const changed=state.banks.filter(b=>b.needsPublish);
   if(!changed.length){adminProgress(0,0,'Tất cả đề đã đồng bộ, không cần gửi lại');toast('Không có đề mới hoặc đề đã sửa cần xuất bản.');return}
   const removed=changed.filter(b=>removedIds.has(String(b.id)));
   let approvedRestore=new Set();
   if(removed.length){
    const ok=await window.ExamLabDialog.confirm('Có '+removed.length+' đề đã xóa nhưng đang có bản nháp mới. Khôi phục và xuất bản lại các đề đó?',{title:'Khôi phục đề đã xóa',confirmText:'Khôi phục',danger:false});
    if(ok)approvedRestore=new Set(removed.map(b=>String(b.id)));
   }
   let done=0,okCount=0,skipped=0;
   adminProgress(done,changed.length,'Đang chuẩn bị xuất bản');
   for(const entry of changed){
    if(removedIds.has(String(entry.id))&&!approvedRestore.has(String(entry.id))){skipped++;done++;adminProgress(done,changed.length,'Đã bỏ qua đề từng xóa');continue}
    if(!removedIds.has(String(entry.id))&&state.visibility.get(entry.id)===false){skipped++;done++;adminProgress(done,changed.length,'Giữ nguyên đề đang ẩn');continue}
    const raw=await dbAction('get',entry.id);
    if(!raw)throw Error('Không có bản nháp cục bộ cho đề “'+entry.title+'”. Hãy mở và lưu đề trước khi xuất bản.');
    const bank=normalize(raw);
    const {error}=await db.from('examlab_decks').upsert({id:bank.id,title:bank.title,subject:bank.subject,payload:bank,published:true,updated_at:new Date().toISOString()},{onConflict:'id'});
    if(error)throw Error('Đề “'+bank.title+'”: '+error.message);
    if(removedIds.has(String(entry.id))){
      const {data,error:restError}=await db.rpc('examlab_admin_restore_deleted_deck',{p_deck_id:String(entry.id)});
      if(restError||data!==true)throw Error('Đã tải lại “'+bank.title+'” nhưng chưa bỏ được dấu xóa: '+(restError?.message||'Không xác nhận được'));
    }
    entry.needsPublish=false;entry.questionCount=bank.questions.length;
    state.visibility.set(bank.id,true);
    okCount++;done++;await saveAdminIndex();
    adminProgress(done,changed.length,'Đang xuất bản lên Supabase');
   }
   refresh();renderEditor();adminProgress(changed.length,changed.length,'Đã xử lý xong');
   toast('Đã xuất bản '+okCount+' đề mới/đã sửa.'+(skipped?' Giữ nguyên '+skipped+' đề ẩn hoặc đã xóa.':''));
  }catch(e){toast('Xuất bản chưa hoàn tất: '+(e?.message||e),true)}
  finally{publishingV19=false;if(btn)btn.disabled=false}
 }

 async function toggleBankVisibility(){
  const bank=state.draft;if(!bank)return;
  if(state.dirty){toast('Hãy lưu thay đổi trên máy trước khi ẩn/hiện đề.',true);return}
  const before=state.visibility.get(bank.id);
  if(before===undefined){toast('Đề chưa được xuất bản lên Supabase.',true);return}
  const next=!before,button=$('#toggleBankVisibility');
  if(!(await window.ExamLabDialog.confirm(`${next?'Cho phép học sinh nhìn thấy':'Tạm ẩn với học sinh'} đề “${bank.title}”.\nNội dung đề và kết quả đã có được giữ nguyên.`,{title:next?'Hiện bộ đề':'Ẩn bộ đề',confirmText:next?'Hiện đề':'Ẩn đề'})))return;
  button.disabled=true;
  try{
   const db=window.ExamLabSupabase;if(!db)throw Error('Chưa kết nối Supabase');
   const {data,error}=await db.rpc('examlab_admin_set_deck_visibility',{p_deck_id:bank.id,p_visible:next});
   if(error)throw error;if(data!==true)throw Error('Không tìm thấy đề trên máy chủ');
   state.visibility.set(bank.id,next);refresh();renderEditor();
   toast(next?'Đã hiện đề. Học sinh tải lại trang để xem.':'Đã ẩn đề trên Supabase. Học sinh tải lại trang để đồng bộ.');
  }catch(e){toast('Không đổi được trạng thái: '+e.message,true);renderEditor()}
 }

 // Chế độ nhập hàng loạt: chỉ thao tác cục bộ. KHÔNG phát hành tự động.
 let examlabImportIndexV18=0,examlabImportTotalV18=1;
 const IMPORT_MAX_FILE=50*1024*1024;
 const IMPORT_MAX_UNCOMPRESSED=65*1024*1024;
 const importState={entries:[],errors:[],skipped:[],busy:false};
 function isReviewOnlyName(path){return /(?:^|\/)BAN_NHAP_CAN_KIEM_TRA\//i.test(path)||/(?:^|\/)DANH_MUC(?:_DE)?\.json$/i.test(path)||/(?:^|\/)DANH_SACH_16_DE\.csv$/i.test(path)}
 function reviewFlag(raw){
   const note=String(raw?._reviewStatus||raw?.description||'');
   const pending=(raw?.questions||[]).filter(q=>/(?:chưa có trong tài liệu gốc|cần biên soạn|chưa kiểm chứng)/i.test(String(q?.explanation||''))).length;
   const warns=[];
   if(pending)warns.push(`${pending} câu chưa có lời giải chi tiết đã xác minh`);
   if(/(?:NEEDS_REVIEW|PARTIAL|NEEDS_EXPLANATIONS)/i.test(note))warns.push('Đề cần rà soát hình/công thức/đáp án');
   if(!warns.length && /cần đối chiếu PDF gốc/i.test(note))warns.push('Cần đối chiếu hình với PDF gốc');
   return warns;
 }
 async function scanQuiz(name,raw){
  const arrays=Array.isArray(raw)?raw:raw?.format==='examlab.published.v1'&&Array.isArray(raw.banks)?raw.banks:[raw];
  for(let i=0;i<arrays.length;i++){
   const r=arrays[i];
   try{
    const b=normalize(r);
    // Bảo vệ: không tự cập nhật dữ liệu đã xuất bản.
    const existing=state.banks.find(x=>x.id===b.id);
    importState.entries.push({name:name+(arrays.length>1?` #${i+1}`:''),bank:b,warnings:reviewFlag(r),existing:!!existing});
   }catch(e){importState.errors.push(`${name}${arrays.length>1?` #${i+1}`:''}: ${e.message}`)}
  }
 }
 async function scanFile(file){
   const name=String(file.name||'');
   if(file.size>IMPORT_MAX_FILE){importState.errors.push(`${name}: tệp lớn hơn 50 MB. Hãy dùng tệp đề nhỏ hơn.`);return}
   try{
     if(/\.json$/i.test(name)){
       const obj=JSON.parse(await file.text());await scanQuiz(name,obj);return;
     }
     if(!/\.zip$/i.test(name)){importState.errors.push(`${name}: định dạng tệp chưa được hỗ trợ`);return}
     if(!window.JSZip)throw Error('Không đọc được tệp nén. Vui lòng kiểm tra tệp hoặc tải lại trang');
     const zip=await window.JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:false});
     const entries=Object.values(zip.files).filter(v=>!v.dir && /\.json$/i.test(v.name));
     if(entries.length>250)throw Error('Gói đề có quá nhiều tệp (>250)');
     let sizeTotal=0;
     let zipIndexV18=0;
     for(const item of entries){
       examlabProgressV18('import',examlabImportIndexV18+(zipIndexV18/Math.max(1,entries.length)),examlabImportTotalV18,`Đang giải nén và kiểm tra ${zipIndexV18+1}/${entries.length} tệp JSON trong ${name}`);
       zipIndexV18++;
       const path=item.name.replaceAll('\\','/');
       if(isReviewOnlyName(path)){importState.skipped.push(path+' (bản nháp / danh mục chưa dùng để chấm)');continue}
       const size=Number(item._data?.uncompressedSize)||0;
       if(size>IMPORT_MAX_UNCOMPRESSED){importState.errors.push(`${path}: nội dung quá lớn`);continue}
       sizeTotal+=size;
       if(sizeTotal>IMPORT_MAX_UNCOMPRESSED){importState.errors.push('Dung lượng giải nén vượt quá 65 MB');break}
       try{const jsonTextV18=await item.async('string',metadata=>{examlabProgressV18('import',examlabImportIndexV18+((zipIndexV18-1)+((metadata?.percent||0)/100))/Math.max(1,entries.length),examlabImportTotalV18,`Đang đọc ${zipIndexV18}/${entries.length}: ${path}`)});await scanQuiz(path,JSON.parse(jsonTextV18))}catch(e){importState.errors.push(`${path}: ${e.message}`)}
     }
     if(!entries.length)importState.errors.push(`${name}: không tìm thấy đề hợp lệ trong gói đã chọn`);
   }catch(e){importState.errors.push(`${name}: ${e.message}`)}
 }
 function renderImportModal(){
  const root=$('#adminImportModal');
  const list=importState.entries;
  const available=list.filter(e=>!e.existing).length;
  root.innerHTML=`<div class="admin-mask" data-bulk-mask="1"><div class="admin-dialog bulk-dialog" role="dialog" aria-modal="true" aria-label="Kiểm tra bộ đề trước khi nhập">
    <div class="dialog-head"><div><span class="eyebrow">QUẢN TRỊ · NHẬP ĐỀ</span><h2>Kiểm tra bộ đề trước khi nhập</h2><p>Đã nhận ${list.length} bộ đề hợp lệ. Chưa lưu hoặc xuất bản bất kỳ đề nào.</p></div><button type="button" class="btn btn-ghost btn-sm" id="bulkClose">✕ Đóng</button></div>
    <div class="bulk-info"><strong>ⓘ Lưu ý</strong> Đề được lưu trong trình duyệt của Admin để bạn rà soát. <b>Chỉ công khai khi bạn chọn xuất bản.</b> Các lời giải chưa xác minh vẫn cần hoàn thiện trước khi công khai.</div>
    <div class="bulk-actions"><button type="button" class="btn btn-ghost btn-sm" id="bulkAll">Chọn ${available} đề mới</button><label class="bulk-overwrite"><input id="bulkOverwrite" type="checkbox"> Cho phép cập nhật đề trùng mã (cẩn thận)</label></div>
    <div class="bulk-list">${list.map((x,i)=>`<label class="bulk-row"><input type="checkbox" class="bulk-check" data-bulk-index="${i}" ${x.existing?'disabled':'checked'}><span class="bulk-item"><strong>${esc(x.bank.title)}</strong><small>${esc(x.name)} · ${esc(SUBJECTS[x.bank.subject])} · ${x.bank.questions.length} câu · ${x.bank.durationMinutes} phút</small>${x.existing?'<small class="bulk-conflict">Đề đã tồn tại — mặc định không ghi đè</small>':''}${x.warnings.length?`<small class="bulk-warning">⚠ ${esc(x.warnings.join('; '))}</small>`:'<small class="bulk-ok">✓ Có đáp án và dữ liệu hợp lệ; vẫn cần tự kiểm tra PDF</small>'}</span></label>`).join('')||'<p>Không có đề hợp lệ để nhập.</p>'}</div>
    ${importState.skipped.length?`<details class="bulk-issues"><summary>Đã bỏ qua ${importState.skipped.length} tệp nháp / danh mục (không chấm tự động)</summary><p>${esc(importState.skipped.slice(0,20).join(' · '))}</p></details>`:''}
    ${importState.errors.length?`<details class="bulk-issues" open><summary>⚠ ${importState.errors.length} lỗi cấu trúc (chưa nhập)</summary><ul>${importState.errors.slice(0,20).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}
    <div class="bulk-foot"><span id="bulkCount">${available} bộ đề được chọn</span><div><button type="button" class="btn btn-ghost" id="bulkCancel">Hủy</button><button type="button" class="btn btn-primary" id="bulkSave" ${list.length?'':'disabled'}>⇧ Lưu các đề đã chọn</button></div></div>
  </div></div>`;
  root.hidden=false;
  const check=[...root.querySelectorAll('.bulk-check')];
  function selectedCount(){const n=check.filter(x=>x.checked&&!x.disabled).length;root.querySelector('#bulkCount').textContent=`${n} bộ đề được chọn`;root.querySelector('#bulkSave').disabled=n===0}
  root.querySelector('#bulkClose').onclick=root.querySelector('#bulkCancel').onclick=()=>root.hidden=true;
  root.querySelector('#bulkAll').onclick=()=>{const isAll=check.filter(x=>!x.disabled).every(x=>x.checked);check.forEach(x=>{if(!x.disabled)x.checked=!isAll});selectedCount()};
  root.querySelector('#bulkOverwrite').onchange=e=>{check.forEach((el,i)=>{if(list[i].existing){el.disabled=!e.target.checked;el.checked=false}});selectedCount()};
  check.forEach(x=>x.addEventListener('change',selectedCount));
  root.querySelector('#bulkSave').onclick=async()=>{
    if(importState.busy)return;
    const selected=check.filter(x=>x.checked&&!x.disabled).map(x=>list[Number(x.dataset.bulkIndex)]);
    if(!selected.length)return;
    const overwrite=selected.filter(x=>x.existing);
    if(overwrite.length&&!(await window.ExamLabDialog.confirm(`${overwrite.length} bộ đề đang có trên thiết bị sẽ được thay thế bằng bản nhập mới.`,{title:'Ghi đè bộ đề?',confirmText:'Ghi đè',danger:true})))return;
    importState.busy=true;root.querySelector('#bulkSave').disabled=true;let count=0;const errors=[];
    const saveProgressRootV18=document.createElement('div');saveProgressRootV18.innerHTML="<div class=\"examlab-progress-wrap\" id=\"importSaveProgressV18\" role=\"status\" aria-live=\"polite\">\n <div class=\"examlab-progress-head\"><b data-progress-text>Chuẩn bị lưu các đề đã chọn...</b><strong data-progress-pct>0%</strong></div>\n <div class=\"examlab-progress-track\" role=\"progressbar\" aria-label=\"Tiến trình đọc tệp đề\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\"><div class=\"examlab-progress-fill\" data-progress-fill></div></div>\n <small data-progress-sub>Đang kiểm tra nội dung và đáp án. Chưa tải lên Supabase.</small>\n </div>";
    root.querySelector('.bulk-foot').before(saveProgressRootV18.firstElementChild);
    let saveDoneV18=0;
    examlabProgressV18('save',0,selected.length,`Chuẩn bị lưu 0/${selected.length} đề vào thiết bị`);
    for(const x of selected){
      try{await dbAction('save',x.bank);const i=state.banks.findIndex(b=>b.id===x.bank.id);if(i===-1)state.banks.push(adminDescriptor(x.bank,true));else state.banks[i]=adminDescriptor(x.bank,true);count++}
      catch(e){errors.push(`${x.bank.title}: ${e.message}`)}
      finally{saveDoneV18++;examlabProgressV18('save',saveDoneV18,selected.length,`Đã lưu/kiểm tra ${saveDoneV18}/${selected.length} đề`);await examlabProgressFrameV18()}
    }
    await saveAdminIndex();importState.busy=false;root.hidden=true;refresh();
    toast(errors.length?`Đã lưu ${count} đề, ${errors.length} lỗi: ${errors[0]}`:`Đã lưu ${count} đề vào bản nháp Admin. Chưa xuất bản.`,!!errors.length);
    if(count&&!state.dirty){const bank=selected.find(x=>state.banks.some(b=>b.id===x.bank.id))?.bank;if(bank)selectBank(bank.id)}
  };
 }
 async function importFiles(files){
  if(!files?.length)return;
  if(state.dirty){toast('Vui lòng lưu đề đang chỉnh sửa trước khi nhập bộ đề mới.',true);return}
  if(!state.db){toast('Bạn cần đăng nhập Admin và kết nối cơ sở dữ liệu trước.',true);return}
  importState.entries=[];importState.errors=[];importState.skipped=[];
  $('#adminImportModal').hidden=false;
  $('#adminImportModal').innerHTML='<div class="admin-mask"><div class="admin-dialog bulk-dialog"><h2>Đang kiểm tra tệp đề...</h2><p>Đang kiểm tra nội dung và đáp án.</p>'+"<div class=\"examlab-progress-wrap\" id=\"importProgressV18\" role=\"status\" aria-live=\"polite\">\n <div class=\"examlab-progress-head\"><b data-progress-text>Đang kiểm tra tệp đề...</b><strong data-progress-pct>0%</strong></div>\n <div class=\"examlab-progress-track\" role=\"progressbar\" aria-label=\"Tiến trình đọc tệp đề\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\"><div class=\"examlab-progress-fill\" data-progress-fill></div></div>\n <small data-progress-sub>Đang kiểm tra nội dung và đáp án. Chưa tải lên Supabase.</small>\n </div>"+'</div></div>';
  const fileListV18=Array.from(files);
  examlabImportTotalV18=fileListV18.length;
  for(let i=0;i<fileListV18.length;i++){
   const file=fileListV18[i];examlabImportIndexV18=i;
   examlabProgressV18('import',i,fileListV18.length,`Đang đọc tệp ${i+1}/${fileListV18.length}: ${file.name}`);
   await examlabProgressFrameV18();
   await scanFile(file);
   examlabProgressV18('import',i+1,fileListV18.length,`Đã kiểm tra ${i+1}/${fileListV18.length} tệp`, 'active');
   await examlabProgressFrameV18();
  }
  // Mỗi ID xuất hiện tối đa một lần trong một lượt nhập.
  const seen=new Set();importState.entries=importState.entries.filter(x=>{if(seen.has(x.bank.id)){importState.errors.push(`${x.name}: trùng mã bộ đề trong lượt nhập`);return false}seen.add(x.bank.id);return true});
  renderImportModal();
 }
 function previewHtml(raw){
  const doc=new DOMParser().parseFromString(String(raw||''),'text/html'),keep=new Set(['P','BR','B','STRONG','I','EM','U','SUB','SUP','H4','TABLE','THEAD','TBODY','TR','TH','TD','DIV','FIGURE','SPAN','IMG','CODE','UL','OL','LI']);
  const out=document.createElement('div');function add(n,parent){if(n.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(n.nodeValue));return}if(n.nodeType!==Node.ELEMENT_NODE)return;const tag=n.tagName;if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','FORM','INPUT','BUTTON'].includes(tag))return;if(!keep.has(tag)){n.childNodes.forEach(c=>add(c,parent));return}const item=document.createElement(tag.toLowerCase());if(tag==='IMG'){const src=n.getAttribute('src')||'';if(!/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(src))return;item.setAttribute('src',src);item.setAttribute('alt','Hình minh họa')}else{n.childNodes.forEach(c=>add(c,item))}parent.appendChild(item)}doc.body.childNodes.forEach(n=>add(n,out));return out.innerHTML
 }
 function preview(){const b=state.draft;if(!b)return;const questions=b.questions;const html=questions.slice(0,8).map((q,i)=>`<article class="preview-question"><div class="eyebrow">CÂU ${i+1}</div><div class="preview-content">${q.contentHtml?previewHtml(q.contentHtml):`<p>${esc(q.text).replace(/\n/g,'<br>')}</p>${(q.images||[]).filter(src=>typeof src==='string'&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(src)).map(src=>`<img src="${src}" alt="Hình minh họa">`).join('')}`}</div>${q.type==='truefalse'?`<div class="preview-options">${q.statements.map((text,k)=>`<div>${'abcde'[k]}) ${esc(text)} · <b>${q.answer[k]?'Đúng':'Sai'}</b></div>`).join('')}</div>`:q.type!=='short'?`<div class="preview-options">${Object.entries(q.options||{}).filter(([,v])=>String(v).trim()).map(([k,v])=>`<div>${esc(k)}. ${esc(v)}</div>`).join('')}</div>`:''}<div class="preview-key"><b>Đáp án:</b> ${q.type==='truefalse'?'Xem đáp án theo từng ý phía trên':esc(Array.isArray(q.answer)?q.answer.join(', '):q.answer)}<div><b>Lời giải:</b> ${esc(q.explanation)}</div></div></article>`).join('');
  $('#adminModal').innerHTML=`<div class="admin-mask" data-close-modal="true"><div class="admin-dialog" role="dialog" aria-modal="true" aria-label="Xem trước đề" data-dialog="true"><div class="dialog-head"><div><span class="eyebrow">CHẾ ĐỘ BIÊN SOẠN</span><h2>Xem trước: ${esc(b.title||'Đề chưa đặt tên')}</h2><p>${questions.length} câu · ${esc(SUBJECTS[b.subject])} · ${b.durationMinutes} phút</p></div><button class="btn btn-ghost btn-sm" data-close-modal="true">✕ Đóng</button></div><p class="admin-small">Đây là bản xem trước dành cho người soạn, nên có kèm đáp án và lời giải. Bài kiểm tra học sinh chỉ hiện sau khi nộp.</p>${html||'<p>Đề chưa có câu hỏi.</p>'}${questions.length>8?`<div class="admin-warning">Đang xem 8/${questions.length} câu đầu tiên để trang không quá dài.</div>`:''}</div></div>`;$('#adminModal').hidden=false;
 }
 function template(){const a=document.createElement('a');a.href=new URL('data/MAU_DE_HON_HOP_V16.json',window.location.href).href;a.download='MAU_DE_HON_HOP_V16.json';document.body.appendChild(a);a.click();a.remove()}
 let syncingCloud=false;
 function syncMessage(message){const el=$('#cloudSyncStatus');if(el)el.textContent=message}
 async function syncPublishedFromSupabase(){
  if(syncingCloud)return;
  if(!state.db){syncMessage('Chưa mở được bộ nhớ cục bộ');return}
  syncingCloud=true;const reload=$('#reloadPublished');if(reload)reload.disabled=true;
  syncMessage('Đang tải danh mục đề gọn nhẹ từ Supabase…');
  try{
   const db=window.ExamLabSupabase;if(!db)throw Error('Chưa kết nối được Supabase');
   const {data,error}=await db.rpc('examlab_admin_deck_catalog');
   if(error)throw Error('Cần chạy docs/SETUP_LAZY_LOAD_V19.sql: '+error.message);
   state.visibility=await readVisibilityStatuses(db);
   const removedIds=await readRemovedIds(db);
   const previous=new Map(state.banks.map(b=>[String(b.id),b]));
   for(const id of removedIds){if(!previous.get(id)?.needsPublish)previous.delete(id)}
   const fromServer=new Set();
   for(const row of data||[]){
    const id=String(row.deck_id);if(removedIds.has(id))continue;
    fromServer.add(id);
    const old=previous.get(id);
    const meta=adminDescriptor({id,title:row.title,subject:row.subject,description:row.description,durationMinutes:row.duration_minutes,
     questionCount:row.question_count,kind:row.kind,updatedAt:row.updated_at},old?.needsPublish===true);
    previous.set(id,meta);
   }
   state.banks=[...previous.values()];
   if(state.draft&&removedIds.has(String(state.draft.id))){state.draft=null;state.selected=null;state.selectedQ=-1;state.dirty=false}
   await saveAdminIndex();refresh();renderEditor();
   syncMessage('Đã tải '+(data?.length||0)+' bộ đề dạng danh mục; nội dung câu hỏi chỉ tải khi chọn. Có '+state.banks.filter(b=>b.needsPublish).length+' đề chờ xuất bản.');
  }catch(e){console.error(e);syncMessage('Không tải được danh mục: '+e.message);toast(e.message,true)}
  finally{syncingCloud=false;if(reload)reload.disabled=false}
 }

 async function boot(){
  try{
   const access=await window.ExamLabAdminAccess.getAccess();
   if(!access.allowed)throw Error(access.message);
   state.db=await dbOpen();
   state.banks=await loadAdminIndex();
   refresh();renderEditor(); // Không đợi mạng trước khi hiện danh sách đề của máy.
   syncMessage(`Có ${state.banks.length} bộ đề trên máy. Đang cập nhật dữ liệu…`);
   await syncPublishedFromSupabase();
  }catch(e){
   toast('Không vào được Admin: '+e.message,true);
   syncMessage('Không xác minh được quyền quản trị hoặc bộ nhớ trình duyệt.');
   $('#bankList').innerHTML='<p class="admin-no-data">'+esc(e.message)+' · <a href="login.html">Đăng nhập</a></p>';
  }
 }
 $('#newBank').addEventListener('click',newBank);
 $('#saveBank').addEventListener('click',saveBank);
 $('#previewBank').addEventListener('click',preview);
 $('#deleteBank').addEventListener('click',deleteBank);
 $('#exportBank').addEventListener('click',exportBank);
 $('#publishBtn').addEventListener('click',publish);
 $('#toggleBankVisibility')?.addEventListener('click',toggleBankVisibility);
 $('#reloadPublished')?.addEventListener('click',syncPublishedFromSupabase);
 $('#addQuestion').addEventListener('click',()=>{if(!state.draft)return;state.draft.questions.push({id:makeId('cau'),type:'short',text:'',answer:'',explanation:'',aliases:[],images:[],contentHtml:''});state.selectedQ=state.draft.questions.length-1;markDirty();refreshQuestions();$('#qText')?.focus()});
 $('#importTrigger').addEventListener('click',()=>$('#adminFileInput').click());
 $('#adminFileInput').addEventListener('change',async e=>{await importFiles(e.target.files);e.target.value=''});
 $('#templateTrigger').addEventListener('click',template);
 $('#bankSearch').addEventListener('input',e=>{state.search=e.target.value.toLowerCase().trim();v19AdminPage=0;refresh()});
 $('#subjectFilter').addEventListener('change',e=>{state.filter=e.target.value;v19AdminPage=0;refresh()});
 $('#kindFilter')?.addEventListener('change',e=>{state.kindFilter=e.target.value;v19AdminPage=0;refresh()});
 $('#v19AdminPager').addEventListener('click',e=>{if(e.target.closest('#v19AdminPrev'))v19AdminPage=Math.max(0,v19AdminPage-1);else if(e.target.closest('#v19AdminNext'))v19AdminPage++;else return;refresh()});
 $('#bankList').addEventListener('click',e=>{const row=e.target.closest('[data-bank]');if(row)selectBank(row.dataset.bank)});
 $('#questionList').addEventListener('click',e=>{const row=e.target.closest('[data-selectq]');if(row){state.selectedQ=Number(row.dataset.selectq);refreshQuestions()}});
 $('#gradingConfig')?.addEventListener('input',e=>changeGradingField(e.target));
 $('#gradingConfig')?.addEventListener('change',e=>{if(e.target.matches('[data-grade-point],[data-grade-partial]'))renderGradingConfig();else changeGradingField(e.target)});
 $('#editorUI').addEventListener('input',e=>{if(['bankTitle','bankSubject','bankKind','bankDescription','bankDuration'].includes(e.target.id))updateBankField(e);else updateQuestionValue(e.target)});
 $('#editorUI').addEventListener('change',async e=>{const t=e.target,q=state.draft?.questions[state.selectedQ];if(!q)return;if(t.id==='qType')return changeQuestionType(t.value);if(t.dataset.tfcorrect!==undefined){updateQuestionValue(t);return;}if(t.id==='qImageInput')return addImages(t);if(t.name==='correctOption'){if(q.type==='multiple'){const s=new Set(Array.isArray(q.answer)?q.answer:[]);t.checked?s.add(t.value):s.delete(t.value);q.answer=[...s].sort()}else q.answer=t.value;markDirty()}});
 $('#questionDetails').addEventListener('click',e=>{const tool=e.target.closest('[data-qtool]');if(tool)questionTool(tool.dataset.qtool);const img=e.target.closest('[data-remove-image]');if(img){state.draft.questions[state.selectedQ].images.splice(Number(img.dataset.removeImage),1);markDirty();renderQuestion()}});
 $('#questionDetails').addEventListener('click',e=>{
  const btn=e.target.closest('[data-tf-op]'),q=state.draft?.questions[state.selectedQ];
  if(!btn||!q||q.type!=='truefalse')return;
  if(btn.dataset.tfOp==='add'&&q.statements.length<5){q.statements.push('');q.answer.push(true)}
  else if(btn.dataset.tfOp==='remove'&&q.statements.length>2){const i=Number(btn.dataset.tfIndex);q.statements.splice(i,1);q.answer.splice(i,1)}
  else return;
  markDirty();renderQuestion();
 });
 $('#adminModal').addEventListener('click',e=>{if(e.target.hasAttribute('data-close-modal')&&!e.target.closest('[data-dialog]')){$('#adminModal').hidden=true;return}if(e.target.closest('button[data-close-modal]'))$('#adminModal').hidden=true});
 window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});

/* EXAMLAB_V20_BULK – expose minimal hooks for the Admin-only bulk controller. */
window.ExamLabV20AdminApi={
 state:()=>state,
 kind:examlabDeckKind,
 fetchBank:fetchAdminBank,
 dbAction,
 normalize,
 normalizeGrading,
 descriptor:adminDescriptor,
 saveIndex:saveAdminIndex,
 refresh,
 renderEditor
};
 boot();
})();

