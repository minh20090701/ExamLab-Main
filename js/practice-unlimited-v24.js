/* ExamLab V24 · Không giới hạn thời gian cho đề luyện tập.
 * Add-on cho js/app.js V19, giữ nguyên V19 lazy loading, V16 grading, V23 calculator.
 * Nạp sau js/app.js bằng script thường (không phải module).
 */
(function(){
 'use strict';
 if(typeof app==='undefined'||typeof openConfig!=='function'||typeof startExam!=='function'||typeof submitExam!=='function'){
  console.warn('[ExamLab V24] Thiếu bộ điều khiển bài thi.');return;
 }
 const original={config:openConfig,start:startExam,left:getSecondsLeft,clock:updateClock,timer:startTimer,submit:submitExam};
 let startingUnlimited=false;
 function unlimited(e){return e?.unlimitedTime===true;}
 function elapsed(e){const started=Date.parse(e.startedAt);return Number.isFinite(started)?Math.max(0,Math.round((Date.now()-started)/1000)):0;}
 function addOption(id){
  const b=app.banks.find(x=>String(x.id)===String(id));
  const minutes=document.getElementById('examMinutes');
  const root=document.getElementById('modalRoot');
  if(!b||examlabDeckKind(b)!=='practice'||!minutes||!root||!root.contains(minutes))return;
  const start=root.querySelector('[data-action="start"]');
  if(!start||String(start.dataset.id)!==String(id)||root.querySelector('#v24UnlimitedTime'))return;
  const opt=document.createElement('label');
  opt.className='v24-time-choice';
  opt.innerHTML='<input type="checkbox" id="v24UnlimitedTime"><span><strong>Không giới hạn thời gian</strong><small>Luyện tập theo tốc độ của bạn, chỉ nộp bài khi bạn chọn.</small></span>';
  const label=root.querySelector('label[for="examMinutes"]');
  if(label)label.before(opt);else minutes.before(opt);
  const toggle=opt.querySelector('input');
  const note=minutes.nextElementSibling;
  const oldNote=note?.textContent||'';
  function sync(){
   minutes.disabled=toggle.checked;
   if(label)label.hidden=toggle.checked;
   minutes.hidden=toggle.checked;
   if(note)note.textContent=toggle.checked?'Không có đồng hồ đếm ngược. Bạn vẫn có thể thoát, lưu và tiếp tục làm bài.':oldNote;
  }
  toggle.addEventListener('change',sync);sync();
 }
 openConfig=async function(id,quick=false){await original.config(id,quick);addOption(id);};
 startExam=async function(id){
  const checked=document.getElementById('v24UnlimitedTime')?.checked===true;
  if(!checked)return original.start(id);
  if(startingUnlimited)return;
  startingUnlimited=true;
  const start=document.querySelector('#modalRoot [data-action="start"]');
  if(start)start.disabled=true;
  try{
   const b=await ensureBankLoaded(id);
   if(!b)return;
   // Thi mô phỏng luôn dùng thời gian Admin, kể cả nếu checkbox bị chèn vào DOM.
   if(examlabDeckKind(b)!=='practice')return await original.start(id);
   if(!document.getElementById('v24UnlimitedTime')?.checked)return;
   const mode=document.querySelector('input[name=examMode]:checked')?.value==='random40'&&b.questions.length>=40?'random40':'full';
   const ids=mode==='random40'?shuffleUnique(b.questions.map(q=>q.id),40):b.questions.map(q=>q.id);
   const e={id:makeId(),bankId:id,questionIds:ids,mode,answers:{},flagged:{},startedAt:new Date().toISOString(),deadline:null,durationMinutes:null,unlimitedTime:true};
   await put('drafts',{id:examDraftKey(),exam:e});
   app.exam=e;app.draft=e;app.examBank=b;
   closeModal();app.page='exam';setHeader();render();startTimer();window.scrollTo(0,0);
  }finally{startingUnlimited=false;if(start?.isConnected)start.disabled=false;}
 };
 getSecondsLeft=function(e){return unlimited(e)?Infinity:original.left(e);};
 updateClock=function(){
  if(!unlimited(app.exam))return original.clock();
  const el=document.getElementById('examClock');
  if(el){el.textContent='∞ Không giới hạn';el.classList.remove('urgent');el.classList.add('v24-clock-unlimited');el.setAttribute('aria-label','Không giới hạn thời gian');}
 };
 startTimer=function(){
  if(!unlimited(app.exam))return original.timer();
  stopTimer();updateClock(); // không tạo interval tự nộp cho chế độ luyện tự do
 };
 submitExam=async function(auto=false){
  if(!unlimited(app.exam))return original.submit(auto);
  // Không cho bất kỳ nhánh hết giờ nào tự nộp đề không giới hạn.
  if(auto||app.busy||!app.exam||!app.examBank)return;
  const e=app.exam,b=app.examBank;
  const missing=e.questionIds.length-countAnswered(e);
  if(!await askToSubmitExam(missing))return;
  if(app.busy||app.exam!==e)return;
  app.busy=true;stopTimer();clearTimeout(app.draftTimer);
  try{
   const qs=questionsFor(e,b),grade=gradeExamQuestions(qs,e.answers,b.grading);
   const correct=qs.filter(q=>isCorrect(q,e.answers[q.id])).length;
   const unanswered=qs.filter(q=>!hasAnswer(e.answers[q.id])).length;
   const attempt={id:e.id,bankId:b.id,bankTitle:b.title,subject:b.subject,mode:e.mode,unlimitedTime:true,questionIds:e.questionIds,answers:JSON.parse(JSON.stringify(e.answers)),startedAt:e.startedAt,completedAt:new Date().toISOString(),timeUsedSec:elapsed(e),correct,wrong:qs.length-correct-unanswered,unanswered,score:grade.score,earnedPoints:Number(grade.earned.toFixed(4)),maxPoints:Number(grade.max.toFixed(4)),questionScores:grade.details,gradingSnapshot:grade.grading,autoSubmitted:false};
   await completeAttempt(attempt);
   closeModal();setHeader();render();window.scrollTo({top:0,left:0,behavior:'instant'});toast('Đã nộp bài thành công!');
  }catch(err){toast('Không lưu được bài: '+err.message,true);app.exam=e;startTimer();}
  finally{app.busy=false;}
 };
 // Mark unlimited attempts in existing history/result without replacing their renderer.
 const oldHistory=renderHistory,oldResult=renderResult;
 renderHistory=function(root){oldHistory(root);const records=new Map(app.attempts.filter(a=>a.unlimitedTime===true).map(a=>[String(a.id),a]));root.querySelectorAll('.history-card').forEach(card=>{const id=card.querySelector('[data-action="review"]')?.dataset.id;if(records.has(String(id))){const meta=card.querySelector('.history-meta');if(meta)meta.append(' · Không giới hạn');}});};
 renderResult=function(root){oldResult(root);if(app.result?.unlimitedTime===true){const p=root.querySelector('.result-hero p');if(p)p.append(' · Không giới hạn thời gian');}};
})();
