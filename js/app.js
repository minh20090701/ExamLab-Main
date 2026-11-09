
/* ExamLab - Thi thu & dong bo Supabase, IndexedDB dung cho luu ban nhap. */
'use strict';
const SUBJECTS={toan:{label:'Toán học',short:'Toán',icon:'∑',accent:'#7561ed',tint:'#f0edff'},ly:{label:'Vật lý',short:'Lý',icon:'⚛',accent:'#307ecb',tint:'#ecf5ff'},hoa:{label:'Hóa học',short:'Hóa',icon:'⚗',accent:'#17a18d',tint:'#e9faf5'},sinh:{label:'Sinh học',short:'Sinh',icon:'❀',accent:'#da8290',tint:'#fff1f4'}};
const FORMAT='examlab.quiz.v1';
/* EXAMLAB_V17_CATALOG */
// Chỉ một nguồn xác định loại đề, ưu tiên lựa chọn lưu bởi Admin.
function examlabDeckKind(deck){
 if(deck?.kind==='practice'||deck?.kind==='mock')return deck.kind;
 const name=String(deck?.title||'').toLocaleLowerCase('vi').normalize('NFC');
 if(/ôn tập|luyện tập|chuyên đề|bài tập|100 câu|200 câu/.test(name))return 'practice';
 return /thi thử|đề thi|mô phỏng|giữa kì|giữa kỳ|cuối kì|cuối kỳ|giữa học kì|giữa học kỳ|tốt nghiệp|thpt|khảo sát/.test(name)?'mock':'practice';
}

const $=(sel,base=document)=>base.querySelector(sel);
const $$=(sel,base=document)=>Array.from(base.querySelectorAll(sel));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subj=id=>SUBJECTS[id]||SUBJECTS.hoa;
const dateTime=iso=>new Date(iso).toLocaleString('vi-VN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const fmtTime=s=>`${String(Math.floor(Math.max(s,0)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(s,0)%60)).padStart(2,'0')}`;
const makeId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
let db=null,hasStorage=true;
const ram={banks:new Map(),attempts:new Map(),drafts:new Map(),meta:new Map()};
const openDB=()=>new Promise((resolve,reject)=>{if(!('indexedDB' in window))return reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));let req=indexedDB.open('examlab-db',1);req.onupgradeneeded=()=>{const d=req.result;for(const name of ['banks','attempts','drafts','meta'])if(!d.objectStoreNames.contains(name))d.createObjectStore(name,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
function dbCall(store,op,record){if(!hasStorage){if(op==='getAll')return Promise.resolve([...ram[store].values()]);if(op==='get')return Promise.resolve(ram[store].get(record));if(op==='put')ram[store].set(record.id,record);if(op==='delete')ram[store].delete(record);return Promise.resolve()};return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');const os=tx.objectStore(store);const req=op==='getAll'?os.getAll():op==='get'?os.get(record):op==='put'?os.put(record):os.delete(record);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});}
const getAll=s=>dbCall(s,'getAll'),getOne=(s,id)=>dbCall(s,'get',id),put=(s,value)=>dbCall(s,'put',value),del=(s,id)=>dbCall(s,'delete',id);
const initialExamlabPage=(()=>{try{const p=new URLSearchParams(location.search).get('view');return ['history','guide','library'].includes(p)?p:'library'}catch(_){return 'library'}})();
const app={loadingCloud:true,userId:null,banks:[],attempts:[],draft:null,page:initialExamlabPage,catalog:'practice',subject:'all',search:'',exam:null,examBank:null,result:null,reviewFilter:'all',timerId:null,draftTimer:null,busy:false};
const examDraftKey=()=>`active:${app.userId||'guest'}`;
async function storeAttempt(attempt){
 const db=window.ExamLabSupabase;
 if(app.userId&&db){const {error}=await db.from('examlab_attempts').insert({id:attempt.id,owner_id:app.userId,payload:attempt,completed_at:attempt.completedAt});if(error)throw error}
 else await put('attempts',attempt);
}
async function fetchAttempts(){
 const db=window.ExamLabSupabase;
 if(app.userId&&db){const {data,error}=await db.from('examlab_attempts').select('payload').order('completed_at',{ascending:false}).limit(500);if(error)throw error;return (data||[]).map(x=>x.payload)}
 return getAll('attempts');
}
async function fetchPublishedBanks(){
 const remote=window.ExamLabSupabase;if(!remote)throw Error('Không kết nối được Supabase');
 const {data,error}=await remote.rpc('examlab_public_deck_catalog');
 if(error)throw Error('Chưa cài docs/SETUP_LAZY_LOAD_V19.sql hoặc thiếu quyền: '+error.message);
 app.banks=(data||[]).map(compactDeck);
 try{await put('meta',{id:'examlab-catalog-v19',banks:app.banks})}catch(e){console.warn('Không lưu được danh mục tạm',e)}
 return {loaded:app.banks.length,invalid:0,persistFailures:0};
}
/* EXAMLAB_V19_LAZY_STUDENT: danh mục nhẹ, chỉ tải payload khi cần */
const deckCount=bank=>Number.isFinite(Number(bank?.questionCount))?Number(bank.questionCount):(bank?.questions?.length||0);
function compactDeck(row){
 return {format:FORMAT,id:String(row.deck_id),title:String(row.title||'Đề chưa đặt tên'),subject:String(row.subject||'hoa'),
 description:String(row.description||''),durationMinutes:Number(row.duration_minutes)||60,kind:row.kind==='mock'?'mock':'practice',
 questions:[],questionCount:Number(row.question_count)||0,firstQuestionType:row.first_type||'single',
 _examlabLazy:true,_examlabUpdatedAt:String(row.updated_at||'')};
}
const v19LibrarySize=24;
function v19LibraryPager(total){
 const page=Math.min(app.libraryPage||0,Math.max(0,Math.ceil(total/v19LibrarySize)-1));
 app.libraryPage=page;
 if(total<=v19LibrarySize)return '';
 const pages=Math.ceil(total/v19LibrarySize);
 return '<div class="v19-catalog-pager"><button class="btn btn-ghost btn-sm" data-catalog-page="prev" '+(page===0?'disabled':'')+'>← Trang trước</button><span>Trang '+(page+1)+'/'+pages+' · '+total+' bộ đề</span><button class="btn btn-ghost btn-sm" data-catalog-page="next" '+(page>=pages-1?'disabled':'')+'>Trang sau →</button></div>';
}
const loadingDecks=new Map();
async function ensureBankLoaded(id,options={}){
 const index=app.banks.findIndex(b=>String(b.id)===String(id));
 if(index<0){if(options.allowMissing)return null;throw Error('Đề đã bị ẩn hoặc xóa khỏi danh mục. Hãy tải lại trang.');}
 const stub=app.banks[index];
 if(!stub._examlabLazy&&Array.isArray(stub.questions)&&stub.questions.length)return stub;
 if(loadingDecks.has(String(id)))return loadingDecks.get(String(id));
 const task=(async()=>{
  let full=null;
  try{
   const cached=await getOne('banks',id);
   if(cached?.questions?.length&&cached._examlabUpdatedAt===stub._examlabUpdatedAt)full=validateBank(cached);
  }catch(e){console.warn('Không đọc được cache đề',e)}
  if(!full){
   const db=window.ExamLabSupabase;
   if(!db){if(options.allowMissing)return null;throw Error('Cần kết nối Internet để tải bộ đề này.');}
   const {data,error}=await db.from('examlab_decks').select('payload,updated_at').eq('id',id).eq('published',true).maybeSingle();
   if(error){if(options.allowMissing)return null;throw Error('Không tải được đề: '+error.message)}
   if(!data?.payload){if(options.allowMissing)return null;throw Error('Đề không còn công khai hoặc đã bị xóa.');}
   full=validateBank(data.payload);
   full._examlabUpdatedAt=String(data.updated_at||stub._examlabUpdatedAt);
   try{await put('banks',full)}catch(e){console.warn('Bộ nhớ cache đầy, vẫn cho phép làm bài',e)}
  }
  full.questionCount=full.questions.length;
  full.kind=examlabDeckKind(stub);
  full.firstQuestionType=full.questions[0]?.type||stub.firstQuestionType;
  full._examlabLazy=false;
  app.banks[index]=full;
  return full;
 })();
 loadingDecks.set(String(id),task);
 try{return await task}finally{loadingDecks.delete(String(id))}
}

function toast(message,error=false){const root=$('#toastRoot');root.innerHTML=`<div class="toast ${error?'err':''}" role="status">${safe(message)}</div>`;setTimeout(()=>{root.innerHTML=''},4200)}
function modal(html){$('#modalRoot').innerHTML=`<div class="modal-mask" id="modalMask"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;$('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal()});}
function closeModal(){$('#modalRoot').innerHTML=''}
// Popup xác nhận nộp bài – giữ nguyên chấm điểm và tự nộp khi hết giờ.
let pendingExamSubmitDecision=null;
function askToSubmitExam(missing){
 if(pendingExamSubmitDecision)return Promise.resolve(false);
 return new Promise(resolve=>{
  const previousFocus=document.activeElement;
  const questionText=missing>0
   ?`Bạn còn ${missing} câu chưa trả lời. Bạn vẫn muốn nộp bài và xem kết quả?`
   :'Bạn đã hoàn thành toàn bộ câu hỏi. Nộp bài và xem kết quả?';
  const reminder=missing>0?'<span class="submit-exam-warning">Các câu chưa trả lời sẽ được tính là chưa làm.</span>':'';
  const mask=document.createElement('div');
  mask.id='submitExamMask';mask.className='modal-mask';
  mask.innerHTML=`<section class="modal submit-exam-dialog" role="alertdialog" aria-modal="true" aria-labelledby="submitExamTitle" aria-describedby="submitExamMessage"><div class="submit-exam-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2.8 19a1.7 1.7 0 0 0 1.5 2.5h15.4a1.7 1.7 0 0 0 1.5-2.5L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg></div><h2 id="submitExamTitle">Xác nhận nộp bài</h2><p id="submitExamMessage" class="submit-exam-message">${questionText}</p>${reminder}<div class="submit-exam-actions"><button type="button" class="btn btn-ghost" data-submit-choice="cancel">Tiếp tục làm</button><button type="button" class="btn btn-primary" data-submit-choice="confirm">Nộp bài</button></div></section>`;
  document.getElementById('modalRoot').appendChild(mask);
  const buttons=[...mask.querySelectorAll('[data-submit-choice]')];
  function finish(yes){
   if(pendingExamSubmitDecision!==finish)return;
   pendingExamSubmitDecision=null;
   document.removeEventListener('keydown',onKey);
   mask.remove();
   if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
   resolve(yes);
  }
  function onKey(evt){
   if(evt.key==='Escape'){evt.preventDefault();finish(false)}
   if(evt.key==='Tab'&&document.activeElement===buttons[1]&&!evt.shiftKey){evt.preventDefault();buttons[0].focus()}
   else if(evt.key==='Tab'&&document.activeElement===buttons[0]&&evt.shiftKey){evt.preventDefault();buttons[1].focus()}
  }
  pendingExamSubmitDecision=finish;
  mask.addEventListener('click',evt=>{
   if(evt.target===mask)finish(false);
   else if(evt.target.closest('[data-submit-choice]'))finish(evt.target.closest('[data-submit-choice]').dataset.submitChoice==='confirm');
  });
  document.addEventListener('keydown',onKey);
  buttons[0].focus({preventScroll:true});
 });
}

function setHeader(){
 const taking=app.page==='exam';
 $('#topbar').style.display=taking?'none':'';
 $('#footer').style.display=taking?'none':'';
 // Moi lan doi tab chi duoc mot muc menu duoc chon.
 $$('.site-nav-v10 > .nav-link').forEach(x=>{
   const active=!!x.dataset.page && x.dataset.page===app.page;
   x.classList.toggle('is-active',active);
   if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
 });
}
async function setPage(p){if(app.page==='exam'&&p!=='exam'){if(!(await window.ExamLabDialog.confirm('Tiến độ làm bài hiện tại sẽ được lưu để bạn có thể tiếp tục sau. Bạn muốn rời phòng thi?',{title:'Rời phòng thi',confirmText:'Lưu & rời phòng'})))return;saveDraft();stopTimer()}app.page=p;setHeader();render();window.scrollTo(0,0)}
function updateStats(){return{exams:app.banks.length,total:app.banks.reduce((a,b)=>a+deckCount(b),0),attempts:app.attempts.length}}
function render(){const main=$('#view');if(app.page==='library')renderLibrary(main);else if(app.page==='history')renderHistory(main);else if(app.page==='guide')renderGuide(main);else if(app.page==='exam')renderExam(main);else if(app.page==='result')renderResult(main);}
function renderLibrary(root){root.className='view';const st=updateStats();const filter=app.banks.filter(b=>examlabDeckKind(b)===app.catalog&&(app.subject==='all'||b.subject===app.subject)&&(`${b.title} ${b.description}`.toLowerCase().includes(app.search.toLowerCase())));
 root.innerHTML=`<section class="hero"><div class="hero-copy"><span class="hero-kicker"><span aria-hidden="true">❖</span> TỦ SÁCH KHOA BẢNG · ÔN TẬP VÀ THI THỬ</span><div class="hero-heading-accent">HỌC VẤN · CHÍ KHÍ · THÀNH TÀI</div><h1>Ôn luyện mỗi ngày.<br><em>Tự tin bước vào kỳ thi.</em></h1><p>Gom từng trang tri thức, rèn từng bài kiểm tra. Chọn môn, trộn 40 câu hoặc thi trọn bộ đề, rồi đối chiếu điểm và lời giải sau khi nộp.</p><div class="hero-pills"><span>✦ 4 môn học</span><span>◇ Thi thử có giờ</span><span>▤ Lưu dấu hành trình</span></div></div><div class="hero-art" aria-hidden="true"><div class="hero-art-illustration"></div><div class="hero-stamp">VĂN<br>HIẾN</div><div class="hero-art-label"><small>THƯ PHÒNG LUYỆN ĐỀ</small><strong>${st.exams} bộ đề trong tủ sách</strong></div></div></section>
 <div class="stat-row"><div class="stat-card"><span class="stat-ico"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h6"/></svg></span><div><strong class="stat-num">${st.exams}</strong><span class="stat-caption">Tổng bộ đề</span></div></div><div class="stat-card"><span class="stat-ico"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16.5 3.5 4 4M4 20l4.3-.9L20 7.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z"/></svg></span><div><strong class="stat-num">${st.total}</strong><span class="stat-caption">Câu hỏi</span></div></div><div class="stat-card"><span class="stat-ico"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></span><div><strong class="stat-num">${st.attempts}</strong><span class="stat-caption">Lượt đã nộp</span></div></div></div>
 ${app.draft?`<div class="notice-banner row-between"><div>📝 <b>Bạn có bài làm dang dở:</b> ${safe(app.banks.find(b=>b.id===app.draft.bankId)?.title||'Đề đã nhập')} · ${Object.keys(app.draft.answers||{}).length}/${app.draft.questionIds.length} câu đã điền</div><div><button class="btn btn-sm btn-primary" data-action="resume">Tiếp tục làm</button><button class="btn btn-sm btn-ghost" data-action="discard">Bỏ bài lưu</button></div></div>`:''}
 <div class="catalog-modes" role="tablist" aria-label="Phân loại bộ đề">
 <button type="button" role="tab" aria-selected="${app.catalog==='practice'}" class="catalog-mode ${app.catalog==='practice'?'is-current':''}" data-catalog="practice"><span>▤ Đề luyện tập</span><small>${app.banks.filter(b=>examlabDeckKind(b)==='practice').length} bộ đề · Chuyên đề & ôn tập</small></button>
 <button type="button" role="tab" aria-selected="${app.catalog==='mock'}" class="catalog-mode ${app.catalog==='mock'?'is-current':''}" data-catalog="mock"><span>◷ Đề thi mô phỏng</span><small>${app.banks.filter(b=>examlabDeckKind(b)==='mock').length} bộ đề · Thi thử có giờ</small></button>
 </div>
 <div class="section-heading"><div><span class="eyebrow">${app.catalog==='mock'?'PHÒNG THI MÔ PHỎNG':'THƯ VIỆN LUYỆN TẬP'}</span><h2>${app.catalog==='mock'?'Đề thi mô phỏng':'Đề luyện tập'}</h2><p>${app.catalog==='mock'?'Làm đề theo thời gian và cấu trúc do Admin thiết lập.':'Luyện từng chuyên đề, chọn làm toàn bộ hoặc trộn câu.'}</p></div></div>
 <div class="toolbar"><div class="subjects">${[{id:'all',label:'Tất cả',icon:'◈'},{id:'toan',label:'Toán',icon:'∑'},{id:'ly',label:'Lý',icon:'⚛'},{id:'hoa',label:'Hóa',icon:'⚗'},{id:'sinh',label:'Sinh',icon:'❀'}].map(item=>`<button class="subject-tab ${app.subject===item.id?'is-selected':''}" data-subject="${item.id}"><span class="ui-ico" aria-hidden="true">${item.icon}</span><span>${item.label}</span></button>`).join('')}</div><input id="searchDecks" class="search-field" placeholder="Tìm kiếm bộ đề..." value="${safe(app.search)}" aria-label="Tìm bộ đề"></div>
 <div class="deck-grid" id="deckGrid">${filter.length?filter.slice((app.libraryPage||0)*v19LibrarySize,((app.libraryPage||0)+1)*v19LibrarySize).map(deckCard).join(''):`<div class="empty" style="grid-column:1/-1"><span class="huge">⌕</span><strong>${app.loadingCloud?'Đang tải đề…':'Chưa tìm thấy bộ đề'}</strong><p>${app.loadingCloud?'Các bộ đề đã lưu trên máy vẫn sử dụng được.':'Thử chọn môn khác hoặc liên hệ quản trị viên để bổ sung bộ đề.'}</p></div>`}</div>`;root.insertAdjacentHTML('beforeend',v19LibraryPager(filter.length));}function deckCard(b){const s=subj(b.subject);return `<article class="deck-card" style="--accent:${s.accent};--tint:${s.tint}"><div class="deck-top"><span class="subject-badge"><span class="ui-ico" aria-hidden="true">${s.icon}</span><span>${s.label}</span></span></div><div class="catalog-kind-badge ${examlabDeckKind(b)==='mock'?'is-mock':''}">${examlabDeckKind(b)==='mock'?'◷ ĐỀ THI MÔ PHỎNG':'▤ ĐỀ LUYỆN TẬP'}</div><h3>${safe(b.title)}</h3><p>${safe(b.description||'Bộ đề luyện tập')}</p><div class="deck-meta"><span><span class="meta-ico" aria-hidden="true">▤</span>${deckCount(b)} câu</span><span><span class="meta-ico" aria-hidden="true">◷</span>${b.durationMinutes||60} phút</span><span><span class="meta-ico" aria-hidden="true">◈</span>${(b.firstQuestionType||b.questions[0]?.type)==='short'?'Trả lời ngắn':'Nhiều loại câu'}</span></div><div class="deck-actions"><button class="btn btn-primary" data-action="config" data-id="${safe(b.id)}">Bắt đầu thi →</button>${deckCount(b)>=40&&examlabDeckKind(b)==='practice'?`<button class="btn btn-ghost" data-action="quick40" data-id="${safe(b.id)}">Trộn 40 câu</button>`:''}</div></article>`}
function renderHistory(root){root.className='view';const list=[...app.attempts].sort((a,b)=>b.completedAt.localeCompare(a.completedAt));root.innerHTML=`<div class="inner-header"><span class="eyebrow">HỒ SƠ LUYỆN THI</span><h1>Lịch sử làm bài</h1><p>Lịch sử đồng bộ khi đăng nhập; khách chỉ lưu trên trình duyệt.</p></div><div class="row-between" style="margin-bottom:16px"><span class="small-muted">${list.length} lượt đã nộp</span></div><div class="history-list">${list.length?list.map(a=>`<article class="history-card"><div class="history-main"><b>${safe(a.bankTitle)}</b><div class="history-meta">${safe(dateTime(a.completedAt))} · ${a.mode==='random40'?'Trộn 40 câu':'Toàn bộ đề'} · ${a.questionIds.length} câu · ${Math.floor(a.timeUsedSec/60)} phút làm bài</div><div class="small-muted">✓ ${a.correct} đúng · ✕ ${a.wrong} sai · ◌ ${a.unanswered} bỏ trống</div></div><div class="history-end"><span class="score-pill">${a.score.toFixed(2)}/10</span><button class="btn btn-ghost btn-sm" data-action="review" data-id="${safe(a.id)}">Xem bài</button></div></article>`).join(''):`<div class="empty"><span class="huge">◷</span><strong>Chưa có bài đã nộp</strong><p>Điểm số và đáp án của mỗi lần thi sẽ xuất hiện ở đây.</p><button class="btn btn-primary" data-page="library">Đi làm đề đầu tiên</button></div>`}</div>`;}
function renderGuide(root){root.className='view';root.innerHTML=`<div class="inner-header"><span class="eyebrow">HƯỚNG DẪN SỬ DỤNG</span><h1>Chinh phục từng bài kiểm tra</h1><p>Chọn đề theo môn học, làm bài trong thời gian quy định, sau đó nhận kết quả và lời giải.</p></div><div class="how-steps"><div class="step-card"><span class="step-num">01</span><b>Chọn bộ đề</b><p>Vào Tủ đề ôn tập và tìm đề theo môn Toán, Lý, Hóa hoặc Sinh.</p></div><div class="step-card"><span class="step-num">02</span><b>Vào phòng thi</b><p>Làm toàn bộ câu hỏi hoặc chọn trộn 40 câu đối với bộ đề đủ dài. Bài dở có thể lưu để làm tiếp.</p></div><div class="step-card"><span class="step-num">03</span><b>Nộp bài và xem lại</b><p>Nhấn Nộp bài để chấm điểm. Lịch sử lưu các lần đã thi; bạn có thể xem lại câu đúng và sai.</p></div></div><div class="panel" style="margin-top:18px"><h2>Lời giải và tài liệu</h2><p>Đáp án và lời giải chỉ xuất hiện sau khi nộp bài. Các tài liệu học tập có thể xem tại <a href="documents.html">Thư viện tài liệu</a>.</p><p class="note">Nếu câu hỏi thiếu hình hoặc có lỗi công thức, hãy báo quản trị viên để chỉnh lại đề.</p></div>`;}
async function openConfig(id,quick=false){const b=await ensureBankLoaded(id);if(!b)return toast('Không tìm thấy bộ đề',true);if(app.draft){if(!(await window.ExamLabDialog.confirm('Bạn đang có bài làm chưa nộp. Nếu bắt đầu bài mới, bản lưu cũ sẽ được thay thế.',{title:'Bắt đầu bài mới?',confirmText:'Bắt đầu mới',danger:true})))return;}if(examlabDeckKind(b)==='mock')quick=false;const d40=b.questions.length>=40&&examlabDeckKind(b)==='practice';modal(`<span class="eyebrow">THIẾT LẬP BÀI THI</span><h2>${safe(b.title)}</h2><p>${safe(subj(b.subject).label)} · ${b.questions.length} câu hỏi</p><div class="mode-list"><label class="mode-card"><input type="radio" name="examMode" value="full" ${quick?'':'checked'}><span><b>Làm toàn bộ đề</b><small>${b.questions.length} câu · Theo thứ tự của bộ đề</small></span></label><label class="mode-card" style="${d40?'':'opacity:.45'}"><input type="radio" name="examMode" value="random40" ${quick?'checked':''} ${d40?'':'disabled'}><span><b>Trộn ngẫu nhiên 40 câu</b><small>${d40?'Mỗi lần thi lấy 40 câu bất kỳ, không trùng nhau':'Cần ít nhất 40 câu để bật chế độ này'}</small></span></label></div><label class="field-label" for="examMinutes">Thời gian làm bài (phút)</label><input id="examMinutes" type="number" min="1" max="300" value="${quick?50:(b.durationMinutes||60)}" ${examlabDeckKind(b)==='mock'?'readonly':''}><p class="note" style="margin-top:10px">Đồng hồ đếm ngược sẽ tự nộp khi hết giờ. Có thể quay lại bài đang làm nếu lỡ đóng trang.</p><div class="modal-footer"><button class="btn btn-ghost" data-action="close-modal">Hủy</button><button class="btn btn-primary" data-action="start" data-id="${safe(id)}">Bắt đầu thi →</button></div>`);$$('input[name=examMode]').forEach(el=>el.addEventListener('change',()=>{$('#examMinutes').value=el.value==='random40'?50:(b.durationMinutes||60)}));}
function shuffleUnique(arr,n){const copy=arr.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy.slice(0,n)}
async function startExam(id){const b=await ensureBankLoaded(id);if(!b)return;const mode=examlabDeckKind(b)==='mock'?'full':($('input[name=examMode]:checked')?.value||'full');const minutes=examlabDeckKind(b)==='mock'?Number(b.durationMinutes):Number($('#examMinutes')?.value);if(!Number.isFinite(minutes)||minutes<1||minutes>300)return toast('Thời gian phải từ 1 đến 300 phút',true);let ids=mode==='random40'?shuffleUnique(b.questions.map(q=>q.id),40):b.questions.map(q=>q.id);app.exam={id:makeId(),bankId:id,questionIds:ids,mode,answers:{},flagged:{},startedAt:new Date().toISOString(),deadline:Date.now()+minutes*60000,durationMinutes:minutes};app.draft=app.exam;app.examBank=b;await put('drafts',{id:examDraftKey(),exam:app.exam});closeModal();app.page='exam';setHeader();render();startTimer();window.scrollTo(0,0)}
function questionsFor(exam,bank){const byId=new Map(bank.questions.map(q=>[q.id,q]));return exam.questionIds.map(id=>byId.get(id)).filter(Boolean)}
function getSecondsLeft(exam){return Math.max(0,Math.ceil((exam.deadline-Date.now())/1000))}
function startTimer(){stopTimer();updateClock();app.timerId=setInterval(()=>{updateClock();if(app.page==='exam'&&app.exam&&getSecondsLeft(app.exam)<=0)submitExam(true)},1000)}
function stopTimer(){if(app.timerId){clearInterval(app.timerId);app.timerId=null}}
function updateClock(){if(!app.exam)return;const left=getSecondsLeft(app.exam);const el=$('#examClock');if(el){el.textContent='◷ '+fmtTime(left);el.classList.toggle('urgent',left<300)}}
async function saveDraft(){if(!app.exam)return;app.draft=app.exam;try{await put('drafts',{id:examDraftKey(),exam:app.exam})}catch(e){toast('Không lưu được tiến độ: '+e.message,true)}}
function scheduleDraft(){clearTimeout(app.draftTimer);app.draftTimer=setTimeout(saveDraft,280)}
async function resumeExam(){if(!app.draft)return;await ensureBankLoaded(app.draft.bankId);if(getSecondsLeft(app.draft)<=0){app.exam=app.draft;app.examBank=app.banks.find(b=>b.id===app.draft.bankId);if(!app.examBank){await del('drafts',examDraftKey());app.draft=null;return toast('Bộ đề lưu đã bị xóa',true)}return submitExam(true)}const b=app.banks.find(x=>x.id===app.draft.bankId);if(!b)return toast('Bộ đề này đã bị xóa',true);app.exam=app.draft;app.examBank=b;app.page='exam';setHeader();render();startTimer();window.scrollTo(0,0)}
async function discardExam(){if(!(await window.ExamLabDialog.confirm('Câu trả lời và tiến độ chưa nộp sẽ bị xóa khỏi thiết bị.',{title:'Bỏ bài làm dở',confirmText:'Xóa bài lưu',danger:true})))return;app.draft=null;app.exam=null;stopTimer();await del('drafts',examDraftKey());render();toast('Đã bỏ bài đang lưu')}
function tfValue(v){if(v===true||v==='true')return true;if(v===false||v==='false')return false;return null}
function tfAnswerState(q,answer){
 const n=q.statements?.length||0,values=answer&&typeof answer==='object'&&!Array.isArray(answer)?answer:{};
 let done=0,correct=0;
 for(let i=0;i<n;i++){
  const got=tfValue(values[String(i)]);if(got===null)continue;
  done++;if(got===q.answer[i])correct++;
 }
 return {done,correct,total:n,complete:done===n};
}
function isFullyAnswered(q,answer){return q?.type==='truefalse'?tfAnswerState(q,answer).complete:hasAnswer(answer)}
function questionFraction(q,answer,grading){
 if(q.type!=='truefalse')return isCorrect(q,answer)?1:0;
 const st=tfAnswerState(q,answer);if(!st.total||st.correct<=0)return 0;
 if(st.complete&&st.correct===st.total)return 1;
 if(grading.tfMode==='all')return 0;
 if(grading.tfMode==='custom')return Math.max(0,Math.min(1,Number(grading.tfPartial[Math.min(st.correct-1,3)])||0));
 return st.correct/st.total;
}
function questionWeight(q,g){return q.type==='truefalse'?g.points.truefalse:q.type==='short'?g.points.short:g.points.choice}
function gradeExamQuestions(qs,answers,grading){
 const g=normalizeGrading(grading),details={};let earned=0,max=0;
 for(const q of qs){
  const w=questionWeight(q,g),ratio=questionFraction(q,answers[q.id],g),points=w*ratio;
  earned+=points;max+=w;
  details[q.id]={earned:Number(points.toFixed(6)),max:w,ratio:Number(ratio.toFixed(6))};
 }
 return {earned,max,score:max>0?Math.round(earned/max*1000)/100:0,details,grading:g};
}
function tfAnswerHtml(q,e){
 const saved=e.answers[q.id]&&typeof e.answers[q.id]==='object'?e.answers[q.id]:{},letters='ABCDE';
 return `<div class="tf-answer-list">${q.statements.map((line,i)=>{const key=String(i),current=tfValue(saved[key]);return `<div class="tf-answer-row"><div class="tf-answer-statement"><b>${letters[i]}.</b><span>${safe(line)}</span></div><div class="tf-answer-controls"><label><input type="radio" name="tf_${safe(q.id)}_${i}" data-tf-qid="${safe(q.id)}" data-tf-index="${i}" value="true" ${current===true?'checked':''}><span>Đúng</span></label><label><input type="radio" name="tf_${safe(q.id)}_${i}" data-tf-qid="${safe(q.id)}" data-tf-index="${i}" value="false" ${current===false?'checked':''}><span>Sai</span></label></div></div>`}).join('')}</div>`;
}
function tfFormatAnswer(q,val){
 const letters='abcde',a=Array.isArray(val)?val:(val&&typeof val==='object'?val:{});
 return q.statements.map((_,i)=>{
  const value=Array.isArray(a)?tfValue(a[i]):tfValue(a[String(i)]);
  return `${letters[i]}) ${value===null?'Chưa trả lời':value?'Đúng':'Sai'}`;
 }).join(' · ');
}
function hasAnswer(v){
 if(Array.isArray(v))return v.length>0;
 if(v&&typeof v==='object')return Object.values(v).some(x=>tfValue(x)!==null);
 return String(v??'').trim().length>0;
}
function countAnswered(e){
 const b=app.examBank;if(!b)return e.questionIds.filter(id=>hasAnswer(e.answers[id])).length;
 return questionsFor(e,b).filter(q=>isFullyAnswered(q,e.answers[q.id])).length;
}
function examlabPart(q){return q.type==='truefalse'?'tf':q.type==='short'?'short':'choice'}
function renderExam(root){root.className='view exam-view';const e=app.exam,b=app.examBank;if(!e||!b){app.page='library';return renderLibrary(root)}const qs=questionsFor(e,b);root.innerHTML=`<div class="exam-head"><div class="exam-heading"><small>PHÒNG THI · ${safe(subj(b.subject).label)} · ${e.mode==='random40'?'40 câu trộn ngẫu nhiên':'Toàn bộ đề'}</small><b>${safe(b.title)}</b></div><div class="exam-actions"><div class="exam-left-actions"><button class="btn btn-ghost btn-sm" data-action="leave">← Thoát & lưu</button><button type="button" class="mode-switch-v7 exam-mode-switch-v7" data-mode-v7 onclick="var r=document.documentElement;var t=r.dataset.theme==='dark'?'light':'dark';r.dataset.theme=t;try{localStorage.setItem('examlab.theme',t)}catch(e){};this.setAttribute('aria-pressed',String(t==='dark'));var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='dark'?'#201b19':'#542821';" aria-label="Bật hoặc tắt chế độ tối" title="Bấm để đổi chế độ Sáng/Tối"><span class="mode-indicator-v7" aria-hidden="true"></span><span class="mode-label-light-v7" aria-hidden="true">SÁNG</span><span class="mode-label-dark-v7" aria-hidden="true">TỐI</span></button></div><span id="examClock" class="timer">◷ ${fmtTime(getSecondsLeft(e))}</span><button class="btn btn-primary btn-sm" data-action="submit">Nộp bài</button></div></div><div class="exam-grid"><section class="exam-questions">${qs.map((q,i)=>`${examlabDeckKind(b)==='mock'&&(i===0||examlabPart(q)!==examlabPart(qs[i-1]))?`<div class="exam-part-heading"><b>${examlabPart(q)==='choice'?'PHẦN I. TRẮC NGHIỆM':examlabPart(q)==='tf'?'PHẦN II. ĐÚNG / SAI':'PHẦN III. TRẢ LỜI NGẮN'}</b><small>Trả lời theo cấu trúc của bộ đề</small></div>`:''}${renderQuestion(q,i,e)}`).join('')}</section><aside class="exam-sidebar" id="examSidebar">${paletteHtml(e)}</aside></div><button class="floating-palette" data-action="palette-modal">▦ Danh sách câu · <span id="floatDone">${countAnswered(e)}</span>/${e.questionIds.length}</button>`;updateClock();}
function allowedContentHtml(raw){const tree=new DOMParser().parseFromString(String(raw||''),'text/html');const allowed=new Set(['P','BR','B','STRONG','I','EM','U','SUB','SUP','H4','TABLE','THEAD','TBODY','TR','TH','TD','DIV','FIGURE','SPAN','IMG','CODE','UL','OL','LI']);const clean=document.createElement('div');function take(node,parent){if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.nodeValue));return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName;if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','FORM','INPUT','BUTTON'].includes(tag))return;if(!allowed.has(tag)){node.childNodes.forEach(ch=>take(ch,parent));return}const el=document.createElement(tag.toLowerCase());if(tag==='IMG'){const src=node.getAttribute('src')||'';if(!/^data:image\/(?:webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/i.test(src)||src.length>2800000)return;el.setAttribute('src',src);el.setAttribute('alt','Hình minh họa đề bài');el.setAttribute('loading','lazy')}else{const classes=['figurebox','figuretag','table-scroll','chem-table','figure-caption','chem-structures','chem-structure','chem-struct-lines','chem-branch','chem-equation-wrap','chem-equation','reaction-step','reaction-cond','reaction-arrow','reaction-list','reaction-row','ir-table','qbullet'];const keep=(node.getAttribute('class')||'').split(/\s+/).filter(x=>classes.includes(x));if(keep.length)el.className=keep.join(' ');if((tag==='TD'||tag==='TH')){for(const attr of ['rowspan','colspan']){const val=Number(node.getAttribute(attr));if(Number.isInteger(val)&&val>1&&val<=10)el.setAttribute(attr,String(val))}}node.childNodes.forEach(ch=>take(ch,el))}parent.appendChild(el)}tree.body.childNodes.forEach(n=>take(n,clean));return clean.innerHTML}
function questionContent(q){if(q.contentHtml)return allowedContentHtml(q.contentHtml);const text=`<p>${safe(q.text).replace(/\n/g,'<br>')}</p>`;const images=(q.images||[]).filter(x=>typeof x==='string'&&/^data:image\/(?:png|webp|jpeg|gif);base64,[a-zA-Z0-9+/=]+$/.test(x)).map(src=>`<figure><img src="${src}" alt="Hình minh họa" loading="lazy"></figure>`).join('');return text+images}
function optionsHtml(q,e){const cur=e.answers[q.id];return `<div class="option-list">${Object.entries(q.options||{}).map(([key,label])=>{const checked=q.type==='multiple'?Array.isArray(cur)&&cur.includes(key):cur===key;return `<label class="option-item"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="answer_${safe(q.id)}" data-qid="${safe(q.id)}" value="${safe(key)}" ${checked?'checked':''}><span class="option-key">${safe(key)}.</span><span>${safe(label)}</span></label>`}).join('')}</div>`}
function renderQuestion(q,i,e){
 const current=e.answers[q.id];
 return `<article id="q-${i+1}" class="question-card" data-index="${i+1}"><div class="q-top"><span class="q-num">CÂU ${String(i+1).padStart(2,'0')} / ${e.questionIds.length}</span><button type="button" class="q-mark ${e.flagged[q.id]?'is-marked':''}" data-action="flag" data-id="${safe(q.id)}">${e.flagged[q.id]?'⚑ Đã đánh dấu':'⚐ Đánh dấu xem lại'}</button></div><div class="q-content">${questionContent(q)}</div><div class="answer-area"><label class="answer-label">Câu trả lời của bạn</label>${q.type==='short'?`<input type="text" class="answer-field" aria-label="Đáp án câu ${i+1}" data-qid="${safe(q.id)}" placeholder="Nhập đáp án tại đây..." autocomplete="off" value="${safe(current||'')}">`:q.type==='truefalse'?tfAnswerHtml(q,e):optionsHtml(q,e)}</div></article>`;
}
function isQuestionCompleted(e,id){const q=app.examBank?.questions?.find(item=>String(item.id)===String(id));return q?isFullyAnswered(q,e.answers[id]):hasAnswer(e.answers[id])}
function paletteHtml(e){const done=countAnswered(e);return `<div class="pal-top"><b>Phiếu trả lời</b><span id="palDone">${done}/${e.questionIds.length}</span></div><div class="small-muted">${done===e.questionIds.length?'Bạn đã làm tất cả câu hỏi':'Chọn số câu để di chuyển nhanh'}</div><div class="progress-track"><div id="palProgress" class="progress-bar" style="width:${done/e.questionIds.length*100}%"></div></div><div class="pal-grid">${e.questionIds.map((id,i)=>`<button class="pal-btn ${isQuestionCompleted(e,id)?'is-answered':''} ${e.flagged[id]?'is-flagged':''}" data-action="goto" data-index="${i+1}">${i+1}</button>`).join('')}</div><div class="legend"><span><i class="answered"></i> Đã làm</span><span><i></i> Chưa làm</span><span><i class="marked"></i> Đánh dấu</span></div><div class="sidebar-actions"><button class="btn btn-primary btn-wide" data-action="submit">Nộp bài & chấm điểm</button><button class="btn btn-ghost btn-wide" data-action="leave">Lưu để làm sau</button></div>`}
function updatePalette(){if(!app.exam||app.page!=='exam')return;const e=app.exam;const done=countAnswered(e);const pal=$('#palDone');if(pal)pal.textContent=`${done}/${e.questionIds.length}`;const prog=$('#palProgress');if(prog)prog.style.width=`${done/e.questionIds.length*100}%`;const flo=$('#floatDone');if(flo)flo.textContent=done;$$('.pal-btn').forEach((btn,i)=>{const id=e.questionIds[i];btn.classList.toggle('is-answered',isQuestionCompleted(e,id));btn.classList.toggle('is-flagged',!!e.flagged[id])});}
function gotoQuestion(index){closeModal();const el=document.getElementById('q-'+index);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('is-focused');setTimeout(()=>el.classList.remove('is-focused'),1700)}}
function normAns(v){let str=String(v??'').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'').replace(/−/g,'-');if(/^[+-]?(?:\d+[.,]?\d*|[.,]\d+)%?$/.test(str)){const percent=str.endsWith('%');const num=Number(str.replace(',','.').replace('%',''));return Number.isFinite(num)?String(num)+(percent?'%':''):str}return str.replace(',','.');}
function isCorrect(q,answer){if(q.type==='truefalse'){const s=tfAnswerState(q,answer);return s.total>=2&&s.complete&&s.correct===s.total}if(!hasAnswer(answer))return false;if(q.type==='multiple'){return Array.isArray(answer)&&JSON.stringify([...answer].sort())===JSON.stringify([...q.answer].sort())}return [q.answer,...(q.aliases||[])].some(a=>normAns(a)===normAns(answer))}
async function submitExam(auto=false){if(app.busy||!app.exam||!app.examBank)return;const e=app.exam,b=app.examBank;if(auto&&pendingExamSubmitDecision)pendingExamSubmitDecision(false);if(!auto){const missing=e.questionIds.length-countAnswered(e);if(!await askToSubmitExam(missing))return;if(app.busy||app.exam!==e)return;if(getSecondsLeft(e)<=0)return submitExam(true)}app.busy=true;stopTimer();const qs=questionsFor(e,b);const grade=gradeExamQuestions(qs,e.answers,b.grading);const correct=qs.filter(q=>isCorrect(q,e.answers[q.id])).length;const unanswered=qs.filter(q=>!hasAnswer(e.answers[q.id])).length;const attempt={id:e.id,bankId:b.id,bankTitle:b.title,subject:b.subject,mode:e.mode,questionIds:e.questionIds,answers:JSON.parse(JSON.stringify(e.answers)),startedAt:e.startedAt,completedAt:new Date().toISOString(),timeUsedSec:Math.min(e.durationMinutes*60,Math.round((Date.now()-Date.parse(e.startedAt))/1000)),correct,wrong:qs.length-correct-unanswered,unanswered,score:grade.score,earnedPoints:Number(grade.earned.toFixed(4)),maxPoints:Number(grade.max.toFixed(4)),questionScores:grade.details,gradingSnapshot:grade.grading,autoSubmitted:auto};try{await storeAttempt(attempt);await del('drafts',examDraftKey());app.draft=null;app.exam=null;app.attempts.push(attempt);app.result=attempt;app.reviewFilter='all';app.page='result';closeModal();setHeader();render();window.scrollTo({top:0,left:0,behavior:'instant'});toast(auto?'Hết giờ! Hệ thống đã tự nộp bài.':'Đã nộp bài thành công!')}catch(err){toast('Không lưu được bài: '+err.message,true);app.exam=e;startTimer()}finally{app.busy=false}}
function verdict(q,a,partialRatio=0){return !hasAnswer(a)?'blank':isCorrect(q,a)?'correct':partialRatio>0?'partial':'wrong'}
function formatAnswer(q,val){if(q.type==='truefalse')return tfFormatAnswer(q,val);if(!hasAnswer(val))return 'Chưa trả lời';if(q.type==='short')return safe(val);const arr=Array.isArray(val)?val:[val];return arr.map(k=>`${safe(k)}. ${safe(q.options?.[k]||'')}`).join(' · ')}
function renderResult(root){root.className='view';const a=app.result;if(!a)return setPage('history');const b=app.banks.find(x=>x.id===a.bankId);const qs=b?.questions?.length?questionsFor(a,b):[];const modeLabel=a.mode==='random40'?'40 câu ngẫu nhiên':'Toàn bộ đề';root.innerHTML=`<div class="result-hero"><div><span class="hero-kicker">${a.autoSubmitted?'HẾT GIỜ · TỰ ĐỘNG NỘP BÀI':'ĐÃ HOÀN THÀNH BÀI THI'}</span><h1>Kết quả của bạn</h1><p>${safe(a.bankTitle)} · ${modeLabel}</p><div class="result-breakdown"><span>✓ ${a.correct} đúng</span><span>✕ ${a.wrong} sai</span><span>◌ ${a.unanswered} bỏ trống</span><span>◷ ${Math.floor(a.timeUsedSec/60)} phút</span></div></div><div class="grade-circle"><strong>${a.score.toFixed(2)}</strong><small>THANG ĐIỂM 10</small></div></div><div class="review-toolbar"><div><h2 style="margin:0;font-size:22px">Xem lại bài làm</h2><div class="small-muted">Đáp án chính xác và lời giải được hiển thị sau khi nộp bài</div></div><button class="btn btn-primary btn-sm" data-page="library">← Về thư viện</button></div>${b?.questions?.length?`<div class="review-filters" style="margin-bottom:20px">${[['all','Tất cả'],['wrong','Câu sai'],['partial','Một phần đúng'],['blank','Chưa làm'],['correct','Câu đúng']].map(([id,label])=>`<button class="filter-btn ${app.reviewFilter===id?'on':''}" data-review-filter="${id}">${label}</button>`).join('')}</div><div class="exam-questions">${qs.map((q,i)=>{const point=a.questionScores?.[q.id];const v=verdict(q,a.answers[q.id],point?.ratio||0);if(app.reviewFilter!=='all'&&app.reviewFilter!==v)return '';return `<article class="question-card review-card ${v}"><div class="q-top"><span class="q-num">CÂU ${String(i+1).padStart(2,'0')}</span><span class="small-muted">${v==='correct'?'✓ Chính xác':v==='blank'?'◌ Bỏ trống':v==='partial'?'◐ Đúng một phần':'✕ Chưa đúng'}</span></div><div class="q-content">${questionContent(q)}</div>${point?`<div class="grading-score-note">Điểm câu này: <b>${Number(point.earned.toFixed(3))} / ${point.max}</b> điểm thô</div>`:''}<div class="answer-review"><strong>Đáp án của bạn</strong><p class="user-answer">${formatAnswer(q,a.answers[q.id])}</p><strong>Đáp án đúng</strong><p class="key-answer">${formatAnswer(q,q.answer)}</p></div><div class="explain"><strong>✦ Lời giải chi tiết</strong>${safe(q.explanation)}</div></article>`}).join('')||'<div class="empty">Không có câu nào trong bộ lọc này.</div>'}</div>`:`<div class="notice-banner">Bộ đề gốc đã bị xóa khỏi thư viện. Vẫn xem được điểm tổng kết, nhưng không thể tải lại nội dung câu hỏi và lời giải. Hãy import lại bộ đề nếu muốn xem chi tiết.</div>`}`;}
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
 return {id:String(q.id??i+1),type:'truefalse',text:String(q.text||''),contentHtml:String(q.contentHtml||''),images,statements,answer,explanation:String(q.explanation||''),aliases:[]};
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
function validateBank(raw){const bank=normalizedLegacyWithTF(raw,validateLegacyBank);bank.kind=examlabDeckKind(raw);return bank;}
function validateLegacyBank(raw){if(!raw||raw.format!==FORMAT)throw new Error('Sai định dạng: format phải là "'+FORMAT+'"');if(typeof raw.title!=='string'||!raw.title.trim())throw new Error('Thiếu tên bộ đề (title)');if(!SUBJECTS[raw.subject])throw new Error('subject chỉ được: toan, ly, hoa, sinh');if(!Array.isArray(raw.questions)||raw.questions.length<1||raw.questions.length>1500)throw new Error('questions cần có từ 1 đến 1500 câu');const seen=new Set();const items=raw.questions.map((q,i)=>{if(!q||typeof q!=='object')throw new Error(`Câu ${i+1} không hợp lệ`);const id=String(q.id??i+1);if(seen.has(id))throw new Error('Trùng id câu hỏi: '+id);seen.add(id);const type=q.type||'short';if(!['short','single','multiple'].includes(type))throw new Error(`Câu ${i+1}: type không hợp lệ`);if((typeof q.text!=='string'||!q.text.trim())&&(!q.contentHtml||typeof q.contentHtml!=='string'))throw new Error(`Câu ${i+1} thiếu nội dung`);if(!q.explanation||typeof q.explanation!=='string'||!q.explanation.trim())throw new Error(`Câu ${i+1} thiếu giải thích chi tiết`);if(type==='multiple'){if(!Array.isArray(q.answer)||!q.answer.length)throw new Error(`Câu ${i+1} thiếu đáp án nhiều lựa chọn`)}else if((typeof q.answer!=='string'&&typeof q.answer!=='number')||!String(q.answer).trim())throw new Error(`Câu ${i+1} thiếu đáp án`);let opts;if(type!=='short'){if(!q.options||typeof q.options!=='object'||Array.isArray(q.options)||Object.keys(q.options).length<2)throw new Error(`Câu ${i+1} cần ít nhất hai lựa chọn`);opts=Object.fromEntries(Object.entries(q.options).map(([k,v])=>[String(k),String(v)]));const answers=type==='multiple'?q.answer:[String(q.answer)];if(answers.some(k=>!(String(k) in opts)))throw new Error(`Câu ${i+1} có đáp án không khớp options`)}if(q.contentHtml&&q.contentHtml.length>4000000)throw new Error(`Câu ${i+1} quá dài`);return{id,type,text:String(q.text||''),contentHtml:q.contentHtml||'',images:Array.isArray(q.images)?q.images:[],options:opts,answer:type==='multiple'?q.answer.map(String):String(q.answer),aliases:type==='short'&&Array.isArray(q.aliases)?q.aliases.map(String):[],explanation:String(q.explanation)}});return{format:FORMAT,id:String(raw.id||makeId()),title:raw.title.trim().slice(0,150),subject:raw.subject,description:String(raw.description||'').slice(0,700),durationMinutes:Math.max(1,Math.min(300,Math.round(Number(raw.durationMinutes)||60))),questions:items};}
async function init(){
 try{db=await openDB()}catch(e){hasStorage=false;console.warn('Không mở được IndexedDB',e)}
 // Giữ nguyên các bộ đề cũ trong máy; không tự xóa khi thay phiên bản website.
 const seedEl=null;let seed=null;
 try{seed=JSON.parse(seedEl?.textContent||'null')}catch(e){console.warn('Không đọc được đề tích hợp',e)}
 if(seed){
  try{const bank=validateBank(seed);if(!await getOne('banks',bank.id))await put('banks',bank)}
  catch(e){console.warn('Không khôi phục được đề tích hợp',e)}
 }
 const published=window.EXAMLAB_PUBLISHED_BANKS;
 if(Array.isArray(published)){
  const ids=[];
  for(const item of published){
   try{const bank=validateBank(item);if(ids.includes(bank.id))continue;ids.push(bank.id);if(!await getOne('banks',bank.id))await put('banks',bank)}
   catch(e){console.warn('Đề đóng gói không hợp lệ',e)}
  }
  // Không xóa ID cũ ở đây: đề có thể là bản do Admin tải lên hoặc vẫn còn trong Supabase.
  try{await put('meta',{id:'published-ids',ids})}catch(e){console.warn(e)}
 }
 // Vẽ thư viện từ bản lưu cục bộ trước, không bắt người dùng chạm lần hai để hiển thị.
 try{app.banks=(await getOne('meta','examlab-catalog-v19'))?.banks||[]}catch(e){app.banks=[];console.warn(e)}
 const cachedBanks=app.banks.slice();
 app.banks=[]; // Không hiển thị đề cũ trước khi kiểm tra danh sách đề ẩn trên Supabase.
 try{app.attempts=await getAll('attempts')}catch(e){app.attempts=[]}
 app.loadingCloud=true;
 setHeader();render();
 // Tiếp tục tải từ Supabase; khi tải xong tự cập nhật mà không cần đổi tab hay bấm lại.
 try{
  const session=await window.ExamLabAuth?.getSession?.();
  app.userId=session?.kind==='supabase-account'?session.id:null;
 }catch(e){console.warn('Không đọc được phiên đăng nhập',e)}
 try{
  app.banks=cachedBanks.slice();
  const result=await fetchPublishedBanks();
  if(result.invalid)toast(`${result.invalid} đề trên máy chủ có định dạng lỗi; các đề khác vẫn giữ nguyên.`,true);
  if(result.persistFailures)console.warn('Một số đề không thể lưu offline do bộ nhớ trình duyệt không đủ');
 }catch(e){app.banks=cachedBanks; if(!app.banks.length){try{app.banks=await getAll('banks')}catch(x){console.warn(x)}}console.warn('Tải danh mục Supabase thất bại; dùng cache nếu có',e);toast('Không kiểm tra được đề ẩn trên Supabase; đang dùng bản lưu offline, có thể chưa cập nhật.',true)}
 finally{app.loadingCloud=false;app.banks.sort((a,b)=>a.title.localeCompare(b.title,'vi'));if(app.page==='library')render()}
 try{const attempts=await fetchAttempts();app.attempts=attempts; if(app.page==='history')render()}
 catch(e){console.warn('Lấy lịch sử thất bại; giữ bản cục bộ',e);toast('Chưa tải được lịch sử trên máy chủ.',true)}
 try{app.draft=(await getOne('drafts',examDraftKey()))?.exam||null;
  // Không tự xóa bài đang làm khi đề tạm thời chưa tải được từ máy chủ.
  if(app.draft&&app.draft.questionIds&&!app.banks.some(b=>b.id===app.draft.bankId))console.warn('Bài dở đang được giữ, chưa tải thấy bộ đề');
 }catch(e){console.warn(e)}
 if(app.page==='library')render();
}
document.addEventListener('click',async e=>{const node=e.target.closest('button,a');if(!node)return;const action=node.dataset.action;if(node.dataset.page){await setPage(node.dataset.page);return}if(node.dataset.catalog){app.catalog=node.dataset.catalog;app.subject='all';app.search='';app.libraryPage=0;render();return}if(node.dataset.subject){app.subject=node.dataset.subject;app.libraryPage=0;render();return}if(node.dataset.catalogPage){app.libraryPage=Math.max(0,(app.libraryPage||0)+(node.dataset.catalogPage==='next'?1:-1));render();return}if(node.dataset.reviewFilter){app.reviewFilter=node.dataset.reviewFilter;render();return}if(!action)return;const id=node.dataset.id;try{switch(action){case'import':case'pick-file':throw Error('Chức năng nhập đề chỉ có trong trang quản trị.');case'close-modal':closeModal();break;case'config':await openConfig(id);break;case'quick40':await openConfig(id,true);break;case'start':await startExam(id);break;case'leave':await setPage('library');break;case'submit':await submitExam();break;case'goto':gotoQuestion(Number(node.dataset.index));break;case'flag':{const q=app.exam;if(!q)return;q.flagged[id]=!q.flagged[id];node.classList.toggle('is-marked',q.flagged[id]);node.textContent=q.flagged[id]?'⚑ Đã đánh dấu':'⚐ Đánh dấu xem lại';updatePalette();scheduleDraft();break}case'palette-modal':modal(`<div class="row-between"><h2>Danh sách câu</h2><button class="btn btn-ghost btn-sm" data-action="close-modal">✕</button></div>${paletteHtml(app.exam)}`);break;case'resume':await resumeExam();break;case'discard':await discardExam();break;case'deck-menu':case'delete-bank':case'export-bank':throw Error('Quản lý đề chỉ dành cho Admin.');case'review':{const a=app.attempts.find(x=>x.id===id);if(a){await ensureBankLoaded(a.bankId,{allowMissing:true});app.result=a;app.reviewFilter='all';app.page='result';setHeader();render();window.scrollTo(0,0)}break}}}catch(err){console.error(err);toast(err.message||'Có lỗi xảy ra',true)}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='searchDecks'){app.search=t.value;app.libraryPage=0;const filter=app.banks.filter(b=>examlabDeckKind(b)===app.catalog&&(app.subject==='all'||b.subject===app.subject)&&(`${b.title} ${b.description}`.toLowerCase().includes(app.search.toLowerCase())));$('#deckGrid').innerHTML=filter.length?filter.slice(0,v19LibrarySize).map(deckCard).join(''):'<div class="empty" style="grid-column:1/-1">Không có bộ đề phù hợp.</div>';const oldPager=$('.v19-catalog-pager');if(oldPager)oldPager.remove();$('#deckGrid').insertAdjacentHTML('afterend',v19LibraryPager(filter.length));return}if(t.matches('input.answer-field[data-qid]')&&app.exam){app.exam.answers[t.dataset.qid]=t.value;updatePalette();scheduleDraft()}});
document.addEventListener('change',e=>{const t=e.target;if(t.matches('input[data-tf-qid]')&&app.exam){const id=t.dataset.tfQid,i=String(t.dataset.tfIndex);const values=app.exam.answers[id]&&typeof app.exam.answers[id]==='object'&&!Array.isArray(app.exam.answers[id])?app.exam.answers[id]:{};values[i]=t.value;app.exam.answers[id]=values;updatePalette();scheduleDraft();return;}if(t.matches('input[data-qid]')&&app.exam&&t.type!=='text'){const id=t.dataset.qid;if(t.type==='radio'){app.exam.answers[id]=t.value}else if(t.type==='checkbox'){const val=new Set(app.exam.answers[id]||[]);t.checked?val.add(t.value):val.delete(t.value);app.exam.answers[id]=[...val].sort()}updatePalette();scheduleDraft()}});
$('#brandHome').addEventListener('click',()=>setPage('library'));

window.addEventListener('beforeunload',()=>{if(app.exam)saveDraft()});
init();

