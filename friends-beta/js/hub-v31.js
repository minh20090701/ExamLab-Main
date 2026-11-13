/* Friends hub: navigation and summaries reuse the existing authenticated features. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), app = $('app');
  if (!app || !$('friendChat') || !$('friendWorkspace') || !$('studyStreak')) return;
  const sections = [['home','⌂','Tổng quan'],['friends','♧','Bạn bè'],['chat','☏','Tin nhắn'],['library','▤','Tài liệu & ghi chú'],['compete','⚔','Thi đua'],['profile','✦','Hồ sơ Hội bạn']];
  const aliases = {studyStreak:'home',socialArea:'friends',incoming:'friends',outgoing:'friends',friendChat:'chat',friendWorkspace:'library',duelArea:'compete',boardArea:'compete',progressArea:'compete'};
  const state = {userId:null,overview:null,unread:null,duels:null,streak:null,workspace:null,active:'home'};
  const node = (tag,text,cls='') => { const e=document.createElement(tag);e.textContent=text;e.className=cls;return e; };
  const emit = (name,detail) => document.dispatchEvent(new CustomEvent(name,{detail}));
  const num = n => Math.max(0,Number.isFinite(Number(n))?Math.floor(Number(n)):0);
  const hub = node('div','','friends-hub'); hub.id='friendsHub';
  hub.innerHTML=`<aside class="hub-sidebar"><div class="hub-identity"><span id="hubAvatar" aria-hidden="true">友</span><div><small>HỘI BẠN ĐỒNG MÔN</small><strong id="hubName">Góc học cùng bạn</strong></div></div><div id="hubTabs" class="hub-tabs" role="tablist" aria-label="Các mục Hội bạn"></div><p class="hub-sidebar-note">Mỗi ngày một chút.<br>Có bạn, thêm động lực.</p></aside><div id="hubMain" class="hub-main"></div>`;
  const panels = new Map();
  for(const [id,icon,label] of sections){
    const b=node('button','','hub-tab');b.type='button';b.id='hubTab-'+id;b.dataset.hubTab=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','hubPanel-'+id);
    const mark=node('span',icon,'hub-tab-icon');mark.setAttribute('aria-hidden','true');b.append(mark,node('span',label));
    if(['friends','chat','compete'].includes(id)){const badge=node('span','','hub-count');badge.id='hubBadge-'+id;badge.hidden=true;b.append(badge)}
    hub.querySelector('#hubTabs').append(b);
    const panel=node('section','','hub-panel');panel.id='hubPanel-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);panel.tabIndex=0;panel.hidden=true;panels.set(id,panel);
  }
  app.append(hub);for(const panel of panels.values())$('hubMain').append(panel);
  const intro=node('section','','hub-dashboard');
  intro.innerHTML=`<div class="hub-welcome"><div><small class="eyebrow">GÓC HẸN MỖI NGÀY</small><h2 id="hubGreeting">Hôm nay mình học gì?</h2><p>Giữ nhịp của bạn, cùng bạn bè tiến bộ.</p></div><button id="hubRefresh" class="btn subtle" type="button">↻ Cập nhật</button></div><div class="hub-metrics"><button type="button" data-go="friends"><span>BẰNG HỮU</span><strong id="hubFriendCount">—</strong><small>Xem danh sách →</small></button><button type="button" data-go="chat"><span>TIN CHƯA ĐỌC</span><strong id="hubUnread">—</strong><small>Mở trò chuyện →</small></button><button type="button" data-go="home" data-anchor="studyStreak"><span>CHUỖI CÁ NHÂN</span><strong id="hubStreak">—</strong><small id="hubStudyStatus">Đang cập nhật…</small></button></div><div class="hub-action-grid"><div class="hub-attention"><h3>Cần bạn xem</h3><div id="hubInbox"></div></div><div class="hub-tools"><h3>Bắt đầu từ đây</h3><a href="../study.html"><span aria-hidden="true">◷</span><div><strong>Học một phiên ngắn</strong><small>Mở đồng hồ và giữ chuỗi hôm nay</small></div><span aria-hidden="true">↗</span></a><button type="button" id="hubNewNote"><span aria-hidden="true">✎</span><span><strong>Ghi lại một điều hay</strong><small id="hubNotesCount">Ghi chú riêng, chia sẻ khi bạn muốn</small></span><span aria-hidden="true">→</span></button><button type="button" data-go="friends"><span aria-hidden="true">＋</span><span><strong>Tìm người đồng hành</strong><small>Kết nối bằng Gmail đã cho phép tìm kiếm</small></span><span aria-hidden="true">→</span></button></div></div>`;
  panels.get('home').append(intro,$('statStrip'),$('studyStreak'));$('statStrip').hidden=true;
  panels.get('chat').append($('friendChat'));panels.get('library').append($('friendWorkspace'));
  panels.get('profile').append($('joinCard'),app.querySelector('.my-panel'));
  const social=$('socialArea'), stacks=[...social.children], friends=[...stacks[0].children], competition=[...stacks[1].children];
  social.replaceChildren(...friends);social.className='hub-friends-grid';friends[2].classList.add('hub-directory');
  panels.get('friends').append(social);
  const compete=node('div','','hub-competition-grid');compete.append(...competition,$('progressArea'));panels.get('compete').append(compete,app.querySelector('.beta-safety'));
  const participation=$('participationArea'), legacy=participation.querySelector('.beta-jump');legacy.hidden=true;
  participation.replaceChildren(legacy,panels.get('friends'),panels.get('compete'));
  hub.querySelector('#hubMain').append(panels.get('home'),participation,panels.get('chat'),panels.get('library'),panels.get('profile'));
  app.append(hub);document.body.classList.add('hub-ready');

  // Received/sent requests keep the original action buttons and server handlers.
  const requests=$('incoming').parentElement, received=node('div',''), sent=node('div','');received.id='hubReceived';sent.id='hubSent';
  received.append($('incoming').previousElementSibling,$('incoming'));sent.append($('outgoing').previousElementSibling,$('outgoing'));
  const requestTabs=node('div','','hub-request-tabs');requestTabs.setAttribute('role','group');requestTabs.setAttribute('aria-label','Loại lời mời kết bạn');
  function requestView(which){received.hidden=which!=='received';sent.hidden=which!=='sent';for(const b of requestTabs.children)b.setAttribute('aria-pressed',String(b.dataset.request===which))}
  for(const [id,label,target] of [['received','Đã nhận',received.id],['sent','Đã gửi',sent.id]]){const b=node('button',label,'btn subtle');b.type='button';b.id='hubRequest-'+id;b.dataset.request=id;b.setAttribute('aria-controls',target);b.onclick=()=>requestView(id);requestTabs.append(b)}
  requests.append(requestTabs,received,sent);requestView('received');

  function navigate(id,{history=true,focus=false,anchor=null}={}){
    if(!panels.has(id))id='home';
    if(state.overview && !state.overview.joined && ['friends','compete'].includes(id))id='profile';
    state.active=id;
    for(const [name,p] of panels)p.hidden=name!==id;
    for(const b of hub.querySelectorAll('[data-hub-tab]')){const active=b.dataset.hubTab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1}
    if(history && location.hash!=='#'+id)window.history.pushState(null,'','#'+id);
    if(focus)$('hubTab-'+id).focus();
    if(anchor)requestAnimationFrame(()=>{if(panels.get(id).contains($(anchor)))$(anchor)?.scrollIntoView({behavior:'smooth',block:'start'})});
  }
  function route(){let hash='';try{hash=decodeURIComponent(location.hash.slice(1))}catch{}navigate(aliases[hash]||hash|| (new URLSearchParams(location.search).has('shareDoc')?'library':'home'),{history:false,anchor:aliases[hash]?hash:null});if(hash==='outgoing')requestView('sent')}
  const mobile=window.matchMedia?.('(max-width:760px)');function orientation(){$('hubTabs').setAttribute('aria-orientation',mobile?.matches?'horizontal':'vertical')}orientation();mobile?.addEventListener?.('change',orientation);
  for(const b of hub.querySelectorAll('[data-hub-tab]'))b.onclick=()=>navigate(b.dataset.hubTab);
  $('hubTabs').addEventListener('keydown',e=>{
    const buttons=[...hub.querySelectorAll('[data-hub-tab]')],index=buttons.indexOf(document.activeElement);if(index<0)return;
    let next;if(['ArrowDown','ArrowRight'].includes(e.key))next=(index+1)%buttons.length;if(['ArrowUp','ArrowLeft'].includes(e.key))next=(index+buttons.length-1)%buttons.length;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;
    if(next!==undefined){e.preventDefault();navigate(buttons[next].dataset.hubTab,{focus:true})}
  });
  hub.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)navigate(b.dataset.go,{anchor:b.dataset.anchor})});
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const key=a.getAttribute('href').slice(1);if(aliases[key]){e.preventDefault();navigate(aliases[key],{anchor:key})}});
  for(const [event,section] of [['examlab:share-to','library'],['examlab:workspace-open','library'],['examlab:chat-compose','chat'],['examlab:chat-open','chat'],['examlab:beta-duel-invite','compete']])document.addEventListener(event,()=>navigate(section),true);
  document.addEventListener('examlab:hub-navigate',e=>navigate(e.detail?.section||'home',{anchor:e.detail?.anchor}));
  $('hubNewNote').onclick=()=>{navigate('library');emit('examlab:workspace-open',{tab:'notes'});$('wsNewNote').click()};
  $('hubRefresh').onclick=()=>emit('examlab:beta-refresh');
  document.addEventListener('examlab:hub-refresh-state',e=>{if(e.detail?.userId===state.userId)$('hubRefresh').disabled=e.detail.busy===true});

  function badge(section,value){const b=$('hubBadge-'+section);b.hidden=!value;b.textContent=value>99?'99+':String(value)}
  function render(){
    const o=state.overview, incoming=o?.incoming?.length||0, name=String(o?.name||'');
    $('hubName').textContent=name||'Góc học cùng bạn';$('hubAvatar').textContent=name.trim().charAt(0).toLocaleUpperCase('vi')||'友';
    $('hubGreeting').textContent=name?'Chào '+name+', cùng học nhé!':'Hôm nay mình học gì?';
    $('hubFriendCount').textContent=o?num(o.friends?.length):'—';$('hubUnread').textContent=state.unread===null?'—':state.unread;
    $('hubStreak').textContent=state.streak?num(state.streak.current)+' 🔥':'—';
    $('hubStudyStatus').textContent=state.streak?(state.streak.today_done?'Hôm nay đã giữ lửa ✓':'Xem mục tiêu hôm nay →'):'Xem chuỗi học →';
    $('hubNotesCount').textContent=state.workspace?`${state.workspace.notes}${state.workspace.moreNotes?'+':''} ghi chú đã tải · chỉ bạn xem`:'Ghi chú riêng, chia sẻ khi bạn muốn';
    $('hubRequest-received').textContent='Đã nhận ('+incoming+')';$('hubRequest-sent').textContent='Đã gửi ('+(o?.outgoing?.length||0)+')';
    badge('friends',incoming);badge('chat',state.unread||0);badge('compete',state.duels||0);
    const items=$('hubInbox');items.replaceChildren();
    for(const [count,text,section,anchor] of [[incoming,'lời mời kết bạn','friends','incoming'],[state.unread,'tin nhắn chưa đọc','chat',null],[state.duels,'lời thách đấu hôm nay','compete','duelArea']])if(count){
      const b=node('button','','hub-inbox-item');b.type='button';b.append(node('strong',String(count)),node('span',text),node('span','→'));b.onclick=()=>{if(anchor==='incoming')requestView('received');navigate(section,{anchor})};items.append(b);
    }
    if(!items.children.length)items.append(node('p',o&&state.unread!==null&&state.duels!==null?'Bạn đã xem hết các mục đang chờ. Rủ một người bạn học cùng nhé!':'Các lời mời và tin chưa đọc sẽ xuất hiện tại đây khi tải xong.','hub-muted'));
    const total=incoming+(state.unread||0)+(state.duels||0);document.title=(total?'('+total+') ':'')+'Hội bạn đồng môn · ExamLab';
  }
  function session(e){
    const id=e.detail?.user?.id||null;if(id===state.userId)return;
    state.userId=id;state.overview=null;state.unread=null;state.duels=null;state.streak=null;state.workspace=null;$('hubRefresh').disabled=false;render();
    if(!id){navigate('home',{history:false});requestView('received')}
    else setTimeout(()=>emit('examlab:hub-sync',{skipSession:true}),0);
  }
  document.addEventListener('examlab:beta-session',session);
  function overview(e){if(!state.userId||e.detail?.userId!==state.userId)return;state.overview=e.detail.overview;render();if(state.overview&&!state.overview.joined)navigate('profile',{history:false})}
  document.addEventListener('examlab:beta-updated',overview);document.addEventListener('examlab:hub-overview',overview);
  for(const [event,apply] of [
    ['examlab:chat-summary',d=>state.unread=d.ready?num(d.unread):null],
    ['examlab:duel-summary',d=>state.duels=d.ready?num(d.pending):null],
    ['examlab:streak-updated',d=>state.streak=d.summary||null],
    ['examlab:workspace-summary',d=>state.workspace=d.summary||null]
  ])document.addEventListener(event,e=>{if(state.userId&&e.detail?.userId===state.userId){apply(e.detail);render()}});
  render();route();emit('examlab:hub-sync');
})();
