/* One public festival setting; every write is authorized by the server RPC. */
(() => {
  'use strict';
  if(window.ExamLabFestival)return;
  const base=new URL('../',document.currentScript.src),db=window.ExamLabSupabase,root=document.documentElement;
  const themes={
    classic:{name:'Cổ điển',icon:'文',title:'Góc học ExamLab',desc:'Giữ nhịp học, theo cách của bạn.',song:''},
    halloween:{name:'Halloween',icon:'🎃',title:'Một đêm bí ngô',desc:'Thêm chút huyền bí cho những trang sách.',song:'Bí ngô dưới trăng'},
    christmas:{name:'Giáng sinh',icon:'❄',title:'Mùa an lành',desc:'Một giai điệu ấm, một điều mới mỗi ngày.',song:'Chuông mùa đông'},
    tet:{name:'Tết',icon:'🏮',title:'Xuân sum vầy',desc:'Khai bút đầu xuân, đón một hành trình mới.',song:'Nắng xuân trên hiên'},
    midautumn:{name:'Trung thu',icon:'☾',title:'Trăng đoàn viên',desc:'Dưới ánh trăng, cùng nhau nuôi lớn ước mơ.',song:'Đèn lồng bên trăng'},
    sakura:{name:'Anh đào',icon:'✿',title:'Mùa hoa anh đào',desc:'Chậm lại một chút, học thêm một điều hay.',song:'Cánh hoa đầu mùa'},
    night:{name:'Đêm sao',icon:'✦',title:'Dưới bầu trời sao',desc:'Một khoảng yên tĩnh dành cho việc học.',song:'Khoảng trời tĩnh lặng'}
  };
  const keys=Object.keys(themes),musicKeys=['auto','off',...keys.filter(x=>x!=='classic'),'custom'];
  const cacheKey='examlab.festival.v32',volumeKey='examlab.festival.volume',motionKey='examlab.festival.reduceMotion';
  const defaults={theme_id:'classic',music_id:'auto',music_url:'',music_label:'',effects:true,revision:1};
  const state={settings:defaults,displayed:defaults,serverReady:false,request:0,preview:false,dirty:false,admin:false,adminEpoch:0,formRevision:null,track:'',wantMusic:false,playTicket:0,focus:false,saving:false};
  const get=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
  const put=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  function musicUrl(value){
    const text=String(value||'').trim();if(text.length>2048||!/\S/.test(text)||/\s/.test(text))throw Error('Kiểm tra đường dẫn nhạc.');
    const u=new URL(text);if(u.protocol!=='https:'||u.username||u.password||u.hash||!/^\/(.*)\.(mp3|ogg|wav|m4a)$/i.test(u.pathname))throw Error('Dùng đường dẫn HTTPS trực tiếp tới file MP3, OGG, WAV hoặc M4A.');
    return u.href;
  }
  function sanitize(data){
    if(!data||!keys.includes(data.theme_id)||!musicKeys.includes(data.music_id)||typeof data.effects!=='boolean'||!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<1)throw Error('Cấu hình không hợp lệ.');
    const label=String(data.music_label||'').trim();if(label.length>80)throw Error('Tên nhạc tối đa 80 ký tự.');
    return{theme_id:data.theme_id,music_id:data.music_id,music_url:data.music_id==='custom'?musicUrl(data.music_url):'',music_label:data.music_id==='custom'?label:'',effects:data.effects,revision:Number(data.revision),updated_at:data.updated_at||null};
  }
  const bar=document.createElement('section');bar.id='festivalBar';bar.className='festival-bar';bar.hidden=true;bar.setAttribute('aria-label','Giao diện lễ hội và nhạc nền');
  bar.innerHTML=`<div class="festival-banner"><div class="festival-copy"><small id="festivalScope">GIAO DIỆN CHUNG</small><h2 id="festivalTitle"></h2><p id="festivalSubtitle"></p></div><span id="festivalEmblem" class="festival-emblem" aria-hidden="true"></span></div><div class="festival-player"><div class="festival-track"><span aria-hidden="true">♫</span><span id="festivalTrackLabel"></span></div><div class="festival-controls"><button id="festivalPlay" type="button" aria-pressed="false">▶ Bật nhạc</button><label class="festival-volume">Âm lượng<input id="festivalVolume" type="range" min="0" max="100" step="1" aria-label="Âm lượng nhạc nền"><output id="festivalVolumeValue"></output></label><label class="festival-motion"><input id="festivalReduce" type="checkbox"> Giảm chuyển động</label></div><p id="festivalAudioStatus" role="status"></p></div>`;
  const anchor=document.querySelector('.site-announcement')||document.querySelector('header');if(anchor)anchor.after(bar);else document.body.prepend(bar);
  const particles=document.createElement('div');particles.id='festivalParticles';particles.className='festival-particles';particles.setAttribute('aria-hidden','true');document.body.append(particles);
  const audio=document.createElement('audio');audio.loop=true;audio.preload='none';audio.setAttribute('aria-hidden','true');bar.append(audio);
  const $=id=>document.getElementById(id);
  let volume=Number(get(volumeKey,'25'));if(!Number.isFinite(volume))volume=25;volume=Math.min(100,Math.max(0,volume));
  $('festivalVolume').value=String(volume);audio.volume=volume/100;$('festivalVolumeValue').textContent=volume+'%';$('festivalReduce').checked=get(motionKey,'0')==='1';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function effectState(){root.dataset.festivalEffects=String(state.displayed.effects&&!$('festivalReduce').checked&&!reduced?.matches&&!state.focus&&state.displayed.theme_id!=='classic')}
  function stopMusic(message=''){
    ++state.playTicket;state.wantMusic=false;audio.pause();$('festivalPlay').textContent='▶ Bật nhạc';$('festivalPlay').setAttribute('aria-pressed','false');if(message)$('festivalAudioStatus').textContent=message;
  }
  function getTrack(settings){const id=settings.music_id==='auto'?settings.theme_id:settings.music_id;if(id==='off'||id==='classic')return{url:'',label:'Nhạc nền đang tắt'};if(id==='custom')return{url:settings.music_url,label:settings.music_label||'Nhạc do quản trị viên chọn'};return{url:new URL('assets/festivals/'+id+'.mp3',base).href,label:themes[id].song}}
  function apply(settings,preview=false){
    state.displayed=settings;const theme=themes[settings.theme_id],track=getTrack(settings);root.dataset.festival=settings.theme_id;
    $('festivalTitle').textContent=theme.title;$('festivalSubtitle').textContent=theme.desc;$('festivalEmblem').textContent=theme.icon;
    $('festivalScope').textContent=preview?'ĐANG XEM THỬ · CHỈ TRÊN MÁY NÀY':'GIAO DIỆN CHUNG · '+theme.name.toLocaleUpperCase('vi');
    $('festivalTrackLabel').textContent=track.label;$('festivalPlay').disabled=!track.url;$('festivalVolume').disabled=!track.url;
    bar.hidden=settings.theme_id==='classic'&&!track.url&&!preview;
    if(track.url!==state.track){stopMusic();audio.removeAttribute('src');audio.load();state.track=track.url;$('festivalAudioStatus').textContent=track.url?'Nhấn Bật nhạc khi bạn muốn nghe.':''}
    particles.replaceChildren();if(settings.theme_id!=='classic')for(let i=0;i<6;i++){const p=document.createElement('span');p.textContent={halloween:'✦',christmas:'❄',tet:'✿',midautumn:'✧',sakura:'✿',night:'✦'}[settings.theme_id];p.style.setProperty('--i',i);particles.append(p)}
    effectState();if($('festivalCancelPreview'))$('festivalCancelPreview').hidden=!preview;
    document.dispatchEvent(new CustomEvent('examlab:festival-change',{detail:{theme:settings.theme_id,preview}}));
  }
  $('festivalPlay').onclick=async()=>{
    if(state.wantMusic){stopMusic('Nhạc đã tắt trên thiết bị này.');return}
    if(!state.track||state.focus)return;const ticket=++state.playTicket;state.wantMusic=true;audio.src=state.track;
    $('festivalPlay').textContent='Đang mở…';$('festivalAudioStatus').textContent='';
    try{await audio.play();if(ticket!==state.playTicket)return;$('festivalPlay').textContent='Ⅱ Tắt nhạc';$('festivalPlay').setAttribute('aria-pressed','true')}
    catch(e){if(ticket===state.playTicket)stopMusic(e?.name==='NotAllowedError'?'Trình duyệt chưa cho phát nhạc. Nhấn Bật nhạc để thử lại.':'Chưa phát được nhạc. Kiểm tra kết nối hoặc đường dẫn file âm thanh.')}
  };
  audio.addEventListener('play',()=>{if(!state.wantMusic||state.focus)audio.pause()});
  audio.addEventListener('error',()=>{if(state.wantMusic)stopMusic('Không tải được bản nhạc. Kiểm tra kết nối hoặc báo quản trị viên kiểm tra đường dẫn.')});
  $('festivalVolume').oninput=()=>{const value=Number($('festivalVolume').value);audio.volume=Math.min(1,Math.max(0,value/100));$('festivalVolumeValue').textContent=value+'%';put(volumeKey,String(value))};
  $('festivalReduce').onchange=()=>{put(motionKey,$('festivalReduce').checked?'1':'0');effectState()};reduced?.addEventListener?.('change',effectState);
  function updateFocus(){const focus=root.classList.contains('examlab-v252-exam')||document.getElementById('view')?.classList.contains('exam-view')||!!($('quizLayer')&&!$('quizLayer').hidden);if(focus&&!state.focus)stopMusic('Nhạc tạm dừng khi làm bài. Ra ngoài bài thi rồi bật lại nếu muốn.');state.focus=!!focus;root.dataset.festivalFocus=String(state.focus);effectState()}
  new MutationObserver(updateFocus).observe(root,{attributes:true,attributeFilter:['class']});
  if($('quizLayer'))new MutationObserver(updateFocus).observe($('quizLayer'),{attributes:true,attributeFilter:['hidden']});
  if($('view'))new MutationObserver(updateFocus).observe($('view'),{attributes:true,attributeFilter:['class']});
  updateFocus();

  const adminHost=$('profileAdmin');let form=null;
  function adminStatus(text,error=false){const p=$('festivalAdminStatus');if(p){p.textContent=text;p.classList.toggle('error',error)}}
  function customField(){if($('festivalCustomFields'))$('festivalCustomFields').hidden=$('festivalMusic').value!=='custom'}
  function fillForm(settings){
    if(!form)return;form.querySelector('input[name=festivalTheme][value="'+settings.theme_id+'"]').checked=true;
    $('festivalMusic').value=settings.music_id;$('festivalUrl').value=settings.music_url;$('festivalLabel').value=settings.music_label;$('festivalEffects').checked=settings.effects;state.formRevision=settings.revision;state.dirty=false;customField();
  }
  function readForm(){return sanitize({theme_id:form.querySelector('input[name=festivalTheme]:checked')?.value,music_id:$('festivalMusic').value,music_url:$('festivalUrl').value,music_label:$('festivalLabel').value,effects:$('festivalEffects').checked,revision:state.formRevision})}
  function adminControls(){if(!form)return;$('festivalSave').disabled=!state.admin||!state.serverReady||state.saving;$('festivalTry').disabled=!state.admin||!state.serverReady||state.saving;$('festivalReload').disabled=state.saving}
  if(adminHost){
    const panel=document.createElement('section');panel.id='festivalAdmin';panel.className='festival-admin';panel.hidden=true;
    panel.innerHTML=`<h3>Giao diện lễ hội & nhạc nền</h3><p>Chọn phong cách chung cho toàn website. Mỗi người vẫn tự chọn sáng/tối, âm lượng và bật/tắt nhạc.</p><form id="festivalForm"><fieldset><legend>Chọn giao diện</legend><div id="festivalChoices" class="festival-choices"></div></fieldset><label for="festivalMusic">Nhạc nền chung</label><select id="festivalMusic"><option value="auto">Theo giao diện đang chọn</option><option value="off">Tắt nhạc nền</option></select><div id="festivalCustomFields" hidden><label for="festivalUrl">Link file nhạc HTTPS công khai</label><input id="festivalUrl" type="url" maxlength="2048" placeholder="https://.../ban-nhac.mp3"><label for="festivalLabel">Tên bản nhạc (tùy chọn)</label><input id="festivalLabel" type="text" maxlength="80"><p class="festival-help">Dùng link trực tiếp MP3/OGG/WAV/M4A, không dùng link trang YouTube. Chỉ dùng nhạc bạn có quyền chia sẻ.</p></div><label class="festival-effect-label"><input id="festivalEffects" type="checkbox"> Cho phép hiệu ứng chuyển động nhẹ</label><div class="festival-admin-actions"><button id="festivalTry" type="button">Xem thử trên máy này</button><button id="festivalCancelPreview" type="button" hidden>Hủy xem thử</button><button id="festivalSave" type="submit">Áp dụng cho toàn website</button><button id="festivalReload" type="button">Tải lại cài đặt</button></div></form><p id="festivalAdminStatus" role="status"></p>`;
    adminHost.append(panel);form=$('festivalForm');
    for(const id of keys){const label=document.createElement('label');label.className='festival-choice';const input=document.createElement('input');input.type='radio';input.name='festivalTheme';input.value=id;const thumb=document.createElement('span');thumb.className='festival-thumb';thumb.dataset.festivalThumb=id;thumb.setAttribute('aria-hidden','true');thumb.textContent=themes[id].icon;const name=document.createElement('strong');name.textContent=themes[id].name;label.append(input,thumb,name);$('festivalChoices').append(label)}
    for(const id of keys.filter(x=>x!=='classic'))$('festivalMusic').add(new Option(themes[id].song,id));$('festivalMusic').add(new Option('Dùng link nhạc riêng','custom'));
    fillForm(defaults);adminControls();
    form.addEventListener('input',()=>{state.dirty=true});form.addEventListener('change',()=>{state.dirty=true;customField()});
    $('festivalTry').onclick=()=>{try{if(!state.admin||state.saving)return;const data=readForm();state.preview=true;apply(data,true);adminStatus('Đang xem thử trên máy này. Chưa thay đổi giao diện của người khác.');bar.scrollIntoView({behavior:reduced?.matches||$('festivalReduce').checked?'auto':'smooth',block:'start'})}catch(e){adminStatus(e.message,true)}};
    $('festivalCancelPreview').onclick=()=>{state.preview=false;apply(state.settings);adminStatus('Đã trở về giao diện đang dùng chung. Lựa chọn trong biểu mẫu vẫn được giữ.')};
    $('festivalReload').onclick=async()=>{const epoch=state.adminEpoch;if(state.dirty&&!await window.ExamLabDialog.confirm('Tải lại cài đặt chung và bỏ các lựa chọn chưa lưu?',{title:'Tải lại cài đặt'}))return;if(epoch!==state.adminEpoch)return;state.dirty=false;state.preview=false;apply(state.settings);await refresh();if(state.admin&&state.serverReady)fillForm(state.settings)};
    form.onsubmit=async e=>{
      e.preventDefault();if(!state.admin||!state.serverReady||state.saving)return;const epoch=state.adminEpoch;
      try{const data=readForm();state.saving=true;adminControls();adminStatus('Đang áp dụng…');++state.request;
        const result=await db.rpc('examlab_v32_set_festival',{p_theme:data.theme_id,p_music:data.music_id,p_url:data.music_url,p_label:data.music_label,p_effects:data.effects,p_revision:data.revision});
        if(epoch!==state.adminEpoch)return;if(result.error)throw result.error;++state.request;state.settings=sanitize(result.data);state.serverReady=true;state.preview=false;fillForm(state.settings);cache();apply(state.settings);
        adminStatus('Đã áp dụng cho toàn website. Các trang đang mở cập nhật trong khoảng 60 giây hoặc khi được mở lại.');
      }catch(err){if(epoch===state.adminEpoch)adminStatus(String(err?.message||'Chưa lưu được cài đặt. Hãy thử lại.'),true)}finally{state.saving=false;adminControls()}
    };
  }
  function cache(){put(cacheKey,JSON.stringify({saved:Date.now(),settings:state.settings}))}
  function readCache(){try{const c=JSON.parse(get(cacheKey,'null'));if(c&&Number.isFinite(c.saved)&&Date.now()-c.saved>=0&&Date.now()-c.saved<86400000)return sanitize(c.settings)}catch{}return null}
  async function refresh(){
    if(!db)return;const request=++state.request;
    try{const result=await db.rpc('examlab_v32_get_festival');if(request!==state.request)return;if(result.error)throw result.error;state.settings=sanitize(result.data);state.serverReady=true;cache();if(!state.preview)apply(state.settings);if(state.admin&&!state.dirty)fillForm(state.settings);adminControls();
      if(state.admin&&!state.dirty&&!state.preview)adminStatus('Đang dùng: '+themes[state.settings.theme_id].name+'. Xem thử rồi áp dụng khi sẵn sàng.');
    }catch(e){if(request!==state.request)return;adminControls();if(state.admin)adminStatus(/schema cache|does not exist|function|PGRST/i.test(String(e?.message||e))?'Chưa cài giao diện lễ hội. Chạy docs/SETUP_FESTIVALS_V32.sql rồi Tải lại cài đặt.':'Chưa tải được cài đặt chung. Kiểm tra mạng rồi Tải lại cài đặt.',true)}
  }
  async function checkAdmin(){
    if(!form)return;const epoch=++state.adminEpoch;state.admin=false;$('festivalAdmin').hidden=true;adminControls();
    try{const access=await window.ExamLabAdminAccess?.getAccess();if(epoch!==state.adminEpoch)return;state.admin=access?.allowed===true;$('festivalAdmin').hidden=!state.admin;
      if(state.admin){if(state.serverReady&&!state.dirty)fillForm(state.settings);adminControls();if(!state.serverReady)await refresh()}
      else if(state.preview){state.preview=false;apply(state.settings)}
    }catch{if(epoch===state.adminEpoch){state.preview=false;apply(state.settings)}}
  }
  function revokeAdmin(){++state.adminEpoch;state.admin=false;state.dirty=false;state.formRevision=null;if(form){$('festivalAdmin').hidden=true;fillForm(defaults)}if(state.preview){state.preview=false;apply(state.settings)}adminControls()}
  db?.auth?.onAuthStateChange((event)=>{if(form){revokeAdmin();if(event!=='SIGNED_OUT')setTimeout(checkAdmin,0)}});
  document.addEventListener('examlab-role-change',e=>{if(e.detail?.admin)checkAdmin();else revokeAdmin()});
  window.addEventListener('storage',e=>{if(e.key===cacheKey){const c=readCache();if(c&&!state.preview&&!state.serverReady){state.settings=c;apply(c)}else refresh()}if(e.key===motionKey){$('festivalReduce').checked=get(motionKey,'0')==='1';effectState()}if(e.key===volumeKey){const v=Number(get(volumeKey,'25'));if(Number.isFinite(v)){$('festivalVolume').value=String(Math.min(100,Math.max(0,v)));audio.volume=Number($('festivalVolume').value)/100;$('festivalVolumeValue').textContent=$('festivalVolume').value+'%'}}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(()=>{if(!document.hidden||state.wantMusic)refresh()},60000);
  window.ExamLabFestival={refresh,getSettings:()=>({...state.settings})};
  state.settings=readCache()||defaults;apply(state.settings);refresh();checkAdmin();
})();
