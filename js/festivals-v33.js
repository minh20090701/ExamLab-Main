/* V33: festival details, delayed music, and admin audio uploads. */
(()=>{
 'use strict';if(window.ExamLabFestivalV33||!window.ExamLabFestival)return;window.ExamLabFestivalV33=true;
 const $=id=>document.getElementById(id),db=window.ExamLabSupabase,root=document.documentElement,bar=$('festivalBar'),button=$('festivalPlay');
 bar.classList.add('festival-v33');
 const started=performance.now(),originalPlay=button.onclick;let timer=null,waiting=false,attempting=false,lastTrack='',uploading=false,uploadEpoch=0;
 let stopped=false;try{stopped=sessionStorage.getItem('examlab.music.stopped')==='1'}catch{}
 const remember=value=>{stopped=value;try{sessionStorage.setItem('examlab.music.stopped',value?'1':'0')}catch{}};
 const cancel=()=>{clearTimeout(timer);timer=null;waiting=false};
 function eligible(){return !stopped&&!button.disabled&&root.dataset.festivalFocus!=='true'&&!document.hidden}
 async function attempt(){
  if(!eligible()||attempting||button.getAttribute('aria-pressed')==='true')return;
  attempting=true;waiting=false;
  try{await originalPlay();waiting=eligible()&&/chưa cho phát/.test($('festivalAudioStatus').textContent)}finally{attempting=false}
 }
 button.onclick=async()=>{cancel();const playing=button.getAttribute('aria-pressed')==='true'||button.textContent.includes('Đang mở');remember(playing);await originalPlay()};
 function schedule(){cancel();if(eligible())timer=setTimeout(()=>{timer=null;attempt()},Math.max(0,5000-(performance.now()-started)))}
 const resume=e=>{if(e.isTrusted&&waiting&&eligible()&&!e.target.closest?.('#festivalPlay'))attempt()};
 document.addEventListener('pointerdown',resume);document.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey)resume(e)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&performance.now()-started>=5000&&!stopped&&button.getAttribute('aria-pressed')!=='true')schedule()});
 new MutationObserver(()=>{if(root.dataset.festivalFocus==='true'){cancel();remember(true)}}).observe(root,{attributes:true,attributeFilter:['data-festival-focus']});
 // Keep controls discoverable but quiet, within the banner rather than over the page.
 const player=bar.querySelector('.festival-player'),details=document.createElement('details');details.className='festival-audio-details';
 const summary=document.createElement('summary');summary.textContent='♫ Âm thanh & hiệu ứng';details.append(summary);
 player.before(details);details.append(player);details.before(button);button.classList.add('festival-quiet-toggle');button.title='Bật hoặc dừng nhạc nền';
 const motifs={classic:['文','◆','✧','◆','文'],halloween:['🕸','🦇','🎃','✦','👻','🦇','🕯'],christmas:['❄','🎀','🔔','✧','🎄','❄','🎁'],tet:['🌸','🏮','✧','🧧','🌼','🏮','🌸'],midautumn:['✧','🏮','☾','🐇','✦','🏮','☁'],sakura:['✿','❀','🌸','❧','✿','🌸','❀'],night:['✦','⋆','☾','✧','🪐','⋆','✦']};
 const ribbon=document.createElement('div');ribbon.className='festival-ribbon';ribbon.setAttribute('aria-hidden','true');bar.querySelector('.festival-banner').append(ribbon);
 let decorated='';function decorate(theme){if(decorated===theme)return;decorated=theme;ribbon.replaceChildren();for(const [i,glyph] of (motifs[theme]||motifs.classic).entries()){const s=document.createElement('span');s.textContent=glyph;s.style.setProperty('--ornament',i);ribbon.append(s)}}
 function change(e){decorate(e?.detail?.theme||root.dataset.festival);if(e?.detail?.preview){cancel();return}const s=window.ExamLabFestival.getSettings(),track=s.music_id==='auto'?s.theme_id:s.music_id==='custom'?s.music_url:s.music_id;if(track!==lastTrack){lastTrack=track;schedule()}}
 document.addEventListener('examlab:festival-change',change);change();
 const form=$('festivalForm');if(!form)return;
 const upload=document.createElement('div');upload.className='festival-upload';
 upload.innerHTML='<label for="festivalFile">Tải nhạc từ thiết bị</label><input id="festivalFile" type="file" accept=".mp3,.ogg,.wav,.m4a,audio/*"><p>MP3, OGG, WAV hoặc M4A · tối đa 20 MB. File được lưu công khai để mọi người nghe.</p><button id="festivalUpload" type="button">Tải file nhạc lên</button><p id="festivalUploadStatus" role="status"></p>';
 $('festivalCustomFields').before(upload);
 const status=(message)=>{$('festivalUploadStatus').textContent=message};
 const invalidate=()=>{uploadEpoch++;$('festivalFile').value='';status('')};
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN')invalidate()});document.addEventListener('examlab-role-change',e=>{if(!e.detail?.admin)invalidate()});
 form.addEventListener('submit',e=>{if(uploading){e.preventDefault();e.stopImmediatePropagation();status('Đợi tải file xong rồi áp dụng.')}},true);
 $('festivalUpload').onclick=async()=>{
  if(uploading)return;const file=$('festivalFile').files?.[0];if(!file){status('Chọn một file nhạc trước.');return}
  const ext=file.name.split('.').pop().toLowerCase(),types={mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4'};
  if(!types[ext]||!file.size||file.size>20*1024*1024){status('Chọn MP3/OGG/WAV/M4A, dung lượng từ 1 byte đến 20 MB.');return}
  const epoch=uploadEpoch;uploading=true;$('festivalUpload').disabled=true;status('Đang tải nhạc lên…');
  try{
   const access=await window.ExamLabAdminAccess.getAccess();if(!access?.allowed)throw Error('Chỉ admin được tải nhạc.');
   const {data,error}=await db.auth.getUser();if(error||!data?.user)throw Error('Đăng nhập lại để tải nhạc.');
   if(epoch!==uploadEpoch)return;
   const name=data.user.id+'/'+crypto.randomUUID()+'.'+ext,bucket=db.storage.from('examlab-festival-music');
   const result=await bucket.upload(name,file,{contentType:types[ext],upsert:false,cacheControl:'3600'});if(result.error)throw result.error;
   if(epoch!==uploadEpoch)return;
   const url=bucket.getPublicUrl(name)?.data?.publicUrl;if(!url)throw Error('Không lấy được đường dẫn nhạc.');
   $('festivalMusic').value='custom';$('festivalMusic').dispatchEvent(new Event('change',{bubbles:true}));$('festivalUrl').value=url;$('festivalLabel').value=file.name.replace(/\.[^.]+$/,'').slice(0,80);$('festivalUrl').dispatchEvent(new Event('input',{bubbles:true}));
   status('Đã tải lên. Bấm Xem thử để nghe, rồi Áp dụng cho toàn website để dùng chung.');
  }catch(e){if(epoch===uploadEpoch)status('Chưa tải được: '+(e.message||'Kiểm tra mạng.')+' Nếu chưa cài upload, chạy SQL V33.')}finally{uploading=false;$('festivalUpload').disabled=false}
 };
})();
