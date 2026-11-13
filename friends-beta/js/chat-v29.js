/* Friends chat: no message bodies in localStorage; authenticated RPCs enforce access. */
(() => {
  'use strict';
  const db = window.ExamLabSupabase;
  const mount = document.getElementById('notice');
  if (!mount) return;
  const box = document.createElement('section');
  box.id = 'friendChat'; box.className = 'panel friend-chat'; box.hidden = true;
  box.innerHTML = `
    <div class="chat-heading"><div><small class="eyebrow">CÙNG NHAU HỌC TỐT</small><h2>Tin nhắn bạn bè <span id="chatTotal" class="chat-count" hidden></span></h2></div><button id="chatRefresh" type="button" class="btn subtle">Làm mới</button></div>
    <p class="chat-hint">Trò chuyện riêng với bạn bè. Tự cập nhật mỗi 30 giây khi mở trang; không hiển thị trạng thái online.</p>
    <p id="chatStatus" class="chat-status" role="status"></p>
    <div class="chat-grid">
      <aside class="chat-sidebar"><label for="chatSearch">Tìm người trò chuyện</label><input id="chatSearch" type="search" placeholder="Nhập tên bạn bè"><p class="chat-hint">★ Ghim bạn thường liên hệ trên thiết bị này.</p><div id="chatFriends" class="chat-friends"></div></aside>
      <div class="chat-conversation">
        <div class="chat-peer"><h3 id="chatPeerName">Chọn một người bạn</h3><div class="chat-actions"><button id="chatShare" class="btn subtle small" type="button" disabled>Tài liệu / ghi chú</button><button id="chatDuel" class="btn subtle small" type="button" disabled>Thách đấu</button></div></div>
        <button id="chatOlder" class="btn subtle small" type="button" hidden>Tải tin cũ hơn</button>
        <p id="chatHistoryHint" class="chat-hint" hidden>Đang xem lịch sử. Bấm Làm mới để quay về các tin mới nhất.</p>
        <div id="chatMessages" class="chat-messages" role="region" aria-label="Nội dung trò chuyện" tabindex="0"><p class="empty">Chọn bạn bè bên trái để bắt đầu.</p></div>
        <button id="chatRead" class="btn subtle small" type="button" disabled>Đánh dấu các tin đã tải là đã đọc</button>
        <form id="chatForm"><label for="chatText">Tin nhắn</label><textarea id="chatText" maxlength="3000" rows="3" placeholder="Viết lời nhắn…" disabled></textarea><div class="chat-compose-bottom"><small id="chatCounter">0/3000 · Enter gửi, Shift+Enter xuống dòng</small><button id="chatSend" class="btn primary" type="submit" disabled>Gửi tin nhắn</button></div></form>
      </div>
    </div>`;
  mount.after(box);
  const $ = id => document.getElementById(id);
  const state = { user: null, friends: [], summary: [], peer: null, messages: [], more: false, history: false, epoch: 0, threadRequest: 0, bootRequest: 0, drafts: new Map(), pending: new Map(), pinned: new Set() };
  const node = (tag, text, cls = '') => { const e = document.createElement(tag); e.textContent = text; e.className = cls; return e; };
  function status(text, error = false) { $('chatStatus').textContent = text; $('chatStatus').classList.toggle('error', error); }
  function errorText(e) { const m = String(e?.message || e); return /schema cache|does not exist|Could not find the function/i.test(m) ? 'Chưa cài nhắn tin V29. Chạy docs/SETUP_FRIEND_CHAT_V29.sql rồi nhấn Làm mới.' : m; }
  async function rpc(name, args = {}) { if (!db || !state.user) throw Error('Cần đăng nhập để nhắn tin.'); const r = await db.rpc(name, args); if (r.error) throw r.error; return r.data; }
  async function busy(button, fn) { if (button.disabled) return; button.disabled = true; const epoch = state.epoch; try { await fn(); } catch (e) { if (epoch === state.epoch) status(errorText(e), true); } finally { button.disabled = false; controls(); } }
  function controls() { const active = !!state.peer && !!state.user; for (const id of ['chatShare', 'chatDuel', 'chatText']) $(id).disabled = !active; if (!active) $('chatSend').disabled = true; $('chatRead').disabled = !state.messages.some(m => m.recipient_id === state.user?.id && !m.read_at && !m.revoked_at); }
  function pinKey() { return 'examlab.chat.pins.v29.' + state.user.id; }
  function loadPins() { try { const ids = JSON.parse(localStorage.getItem(pinKey()) || '[]'); state.pinned = new Set(Array.isArray(ids) ? ids.filter(v => typeof v === 'string') : []); } catch { state.pinned = new Set(); } }
  function totalUnread() { const count = state.summary.reduce((n, r) => n + Number(r.unread || 0), 0); $('chatTotal').textContent = count > 99 ? '99+' : String(count); $('chatTotal').hidden = !count; const jump = document.querySelector('[data-chat-jump]'); if (jump) jump.textContent = 'Tin nhắn' + (count ? ' (' + (count > 99 ? '99+' : count) + ')' : ''); }
  function renderFriends() {
    const list = $('chatFriends'), search = $('chatSearch').value.trim().toLocaleLowerCase('vi'); list.replaceChildren();
    const summaries = new Map(state.summary.map(r => [r.peer_id, r]));
    const friends = state.friends.filter(f => f.name.toLocaleLowerCase('vi').includes(search)).sort((a, b) => Number(state.pinned.has(b.user_id)) - Number(state.pinned.has(a.user_id)) || Number(summaries.get(b.user_id)?.unread || 0) - Number(summaries.get(a.user_id)?.unread || 0) || String(summaries.get(b.user_id)?.latest_at || '').localeCompare(String(summaries.get(a.user_id)?.latest_at || '')) || a.name.localeCompare(b.name, 'vi'));
    for (const f of friends) {
      const row = node('div', '', 'chat-friend-row');
      const open = node('button', '', 'chat-friend'); open.type = 'button'; open.setAttribute('aria-pressed', String(state.peer === f.user_id));
      open.append(node('span', f.name, 'chat-friend-name'));
      const unread = Number(summaries.get(f.user_id)?.unread || 0); if (unread) open.append(node('span', unread > 99 ? '99+' : unread, 'chat-count'));
      open.onclick = () => selectPeer(f.user_id);
      const pin = node('button', state.pinned.has(f.user_id) ? '★' : '☆', 'chat-pin'); pin.type = 'button'; pin.setAttribute('aria-label', (state.pinned.has(f.user_id) ? 'Bỏ ghim ' : 'Ghim ') + f.name); pin.setAttribute('aria-pressed', String(state.pinned.has(f.user_id)));
      pin.onclick = () => { state.pinned.has(f.user_id) ? state.pinned.delete(f.user_id) : state.pinned.add(f.user_id); try { localStorage.setItem(pinKey(), JSON.stringify([...state.pinned])); } catch { status('Không lưu được ghim trên thiết bị. Ghim chỉ giữ trong lần mở trang này.', true); } renderFriends(); };
      row.append(open, pin); list.append(row);
    }
    if (!list.children.length) list.append(node('p', search ? 'Không có tên phù hợp.' : 'Chưa có bạn bè. Kết bạn ở phần bên dưới để nhắn tin.', 'empty'));
    totalUnread();
  }
  function renderMessages(scrollBottom = false) {
    const list = $('chatMessages'), top = list.scrollTop, oldHeight = list.scrollHeight, nearBottom = oldHeight - top - list.clientHeight < 60;
    list.replaceChildren();
    for (const m of state.messages) {
      const mine = m.sender_id === state.user?.id;
      const item = node('article', '', 'chat-message' + (mine ? ' mine' : ''));
      item.append(node('p', m.revoked_at ? 'Tin nhắn đã được thu hồi' : m.body, m.revoked_at ? 'chat-revoked' : ''));
      const meta = node('div', '', 'chat-message-meta');
      meta.append(node('time', new Date(m.created_at).toLocaleString('vi-VN')));
      if (mine && !m.revoked_at) {
        meta.append(node('span', m.read_at ? 'Đã đọc' : 'Đã gửi'));
        const retract = node('button', 'Thu hồi', 'chat-revoke'); retract.type = 'button';
        retract.onclick = () => busy(retract, async () => {
          const epoch = state.epoch, peer = state.peer;
          if (!await window.ExamLabDialog.confirm('Thu hồi tin này? Người nhận có thể đã đọc hoặc sao chép nội dung.', { title: 'Thu hồi tin nhắn', confirmText: 'Thu hồi' })) return;
          if (epoch !== state.epoch) return;
          await rpc('examlab_v29_chat_revoke', { p_id: m.id });
          if (epoch !== state.epoch || peer !== state.peer) return;
          m.body = ''; m.revoked_at = new Date().toISOString(); renderMessages(); await summary();
        }); meta.append(retract);
      }
      item.append(meta); list.append(item);
    }
    if (!list.children.length) list.append(node('p', state.peer ? 'Chưa có tin nhắn. Gửi lời chào đầu tiên nhé.' : 'Chọn một người bạn để mở trò chuyện.', 'empty'));
    $('chatOlder').hidden = !state.more; $('chatHistoryHint').hidden = !state.history;
    if (scrollBottom || nearBottom) list.scrollTop = list.scrollHeight; else list.scrollTop = top;
    controls();
  }
  async function summary() { const epoch = state.epoch; const rows = await rpc('examlab_v29_chat_summary'); if (epoch !== state.epoch) return; state.summary = (rows || []).filter(r => state.friends.some(f => f.user_id === r.peer_id)); renderFriends(); }
  async function thread(older = false) {
    if (!state.peer) return;
    const peer = state.peer, epoch = state.epoch, request = ++state.threadRequest;
    const args = { p_peer: peer };
    if (older && state.messages.length) { const first = state.messages[0]; args.p_before = first.created_at; args.p_before_id = first.id; }
    const rows = await rpc('examlab_v29_chat_thread', args);
    if (epoch !== state.epoch || peer !== state.peer || request !== state.threadRequest) return;
    state.more = rows.length > 40;
    const page = rows.slice(0, 40).reverse();
    const list = $('chatMessages'), oldHeight = list.scrollHeight, top = list.scrollTop;
    state.messages = older ? [...page, ...state.messages].filter((m, i, all) => all.findIndex(x => x.id === m.id) === i) : page;
    if (older) state.history = true;
    renderMessages();
    if (older) list.scrollTop = top + list.scrollHeight - oldHeight;
  }
  async function selectPeer(id) {
    if (!state.friends.some(f => f.user_id === id) || state.peer === id) return;
    if (state.peer) state.drafts.set(state.peer, $('chatText').value);
    ++state.threadRequest; state.peer = id; state.messages = []; state.more = false; state.history = false;
    $('chatPeerName').textContent = state.friends.find(f => f.user_id === id).name;
    $('chatText').value = state.drafts.get(id) || ''; $('chatSend').disabled = false; count(); renderFriends(); renderMessages(true); status('Đang tải trò chuyện…');
    const epoch = state.epoch;
    try { await thread(); if (epoch === state.epoch && state.peer === id) { status('Tin chưa đọc chỉ chuyển sang Đã đọc khi bạn bấm nút đánh dấu.'); $('chatMessages').scrollTop = $('chatMessages').scrollHeight; } } catch (e) { if (epoch === state.epoch && state.peer === id) status(errorText(e), true); }
  }
  function applyFriends(rows) {
    state.friends = (rows || []).map(f => ({ user_id: f.user_id, name: String(f.name || 'Bạn bè') }));
    if (state.peer && !state.friends.some(f => f.user_id === state.peer)) { ++state.threadRequest; state.drafts.delete(state.peer); state.pending.delete(state.peer); state.peer = null; state.messages = []; state.more = false; state.history = false; $('chatText').value = ''; $('chatPeerName').textContent = 'Chọn một người bạn'; renderMessages(); status('Không còn kết bạn với người đang trò chuyện.', true); }
    renderFriends(); controls();
  }
  function count() { $('chatCounter').textContent = $('chatText').value.length + '/3000 · Enter gửi, Shift+Enter xuống dòng'; }
  $('chatText').oninput = () => { if (state.peer) state.drafts.set(state.peer, $('chatText').value); count(); };
  $('chatText').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('chatForm').requestSubmit(); } };
  $('chatForm').onsubmit = e => {
    e.preventDefault(); if (!state.peer || !state.user) return;
    busy($('chatSend'), async () => {
      const peer = state.peer, epoch = state.epoch, raw = $('chatText').value, body = raw.trim();
      if (!body || body.length > 3000) throw Error('Nhập tin nhắn từ 1 đến 3000 ký tự.');
      let pending = state.pending.get(peer); if (!pending || pending.body !== body) { pending = { id: crypto.randomUUID(), body }; state.pending.set(peer, pending); }
      await rpc('examlab_v29_chat_send', { p_peer: peer, p_id: pending.id, p_body: body });
      if (epoch !== state.epoch) return;
      state.pending.delete(peer);
      if (state.drafts.get(peer) === raw) state.drafts.delete(peer);
      if (state.peer === peer && $('chatText').value === raw) { $('chatText').value = ''; count(); }
      try {
        if (state.peer === peer) { state.history = false; await thread(); $('chatMessages').scrollTop = $('chatMessages').scrollHeight; }
        await summary();
        if (epoch === state.epoch) status('Đã gửi tin nhắn.');
      } catch (e) {
        if (epoch === state.epoch) status('Tin nhắn đã gửi thành công, nhưng chưa tải lại được cuộc trò chuyện. Bấm Làm mới.', true);
      }
    });
  };
  $('chatSearch').oninput = renderFriends;
  $('chatOlder').onclick = () => busy($('chatOlder'), () => thread(true));
  $('chatRead').onclick = () => busy($('chatRead'), async () => {
    const peer = state.peer, epoch = state.epoch, ids = state.messages.filter(m => m.recipient_id === state.user.id && !m.read_at && !m.revoked_at).slice(-200).map(m => m.id);
    await rpc('examlab_v29_chat_read', { p_peer: peer, p_ids: ids });
    if (epoch !== state.epoch || peer !== state.peer) return;
    for (const m of state.messages) if (ids.includes(m.id)) m.read_at = new Date().toISOString();
    renderMessages(); await summary(); status('Đã đánh dấu các tin được tải là đã đọc.');
  });
  $('chatShare').onclick = () => { if (!state.peer) return; document.dispatchEvent(new CustomEvent('examlab:share-to', { detail: { userId: state.peer } })); document.getElementById('friendWorkspace')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  $('chatDuel').onclick = () => { const friend = state.friends.find(f => f.user_id === state.peer); if (friend) document.dispatchEvent(new CustomEvent('examlab:beta-duel-invite', { detail: { userId: friend.user_id, name: friend.name } })); };
  let composeRequest = 0;
  document.addEventListener('examlab:chat-compose', async e => {
    const peer = e.detail?.userId, text = String(e.detail?.text || '').trim().slice(0, 3000);
    if (!state.user || !text || !state.friends.some(f => f.user_id === peer)) return;
    const epoch = state.epoch, request = ++composeRequest;
    await selectPeer(peer);
    if (epoch !== state.epoch || request !== composeRequest || state.peer !== peer) return;
    if (!$('chatText').value.trim()) {
      $('chatText').value = text; state.drafts.set(peer, text); count();
      status('Đã soạn lời rủ học. Xem lại nội dung rồi bấm Gửi tin nhắn khi sẵn sàng.');
    } else status('Đã mở trò chuyện. Bản nháp đang viết của bạn được giữ nguyên.');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('chatText').focus({ preventScroll: true });
  });
  let polling = false, pollEpoch = -1;
  async function refresh(manual = false) {
    if ((polling && pollEpoch === state.epoch) || !state.user) return; polling = true; const epoch = state.epoch; pollEpoch = epoch;
    try { const overview = await rpc('examlab_beta_overview'); if (epoch !== state.epoch) return; applyFriends(overview?.friends); await summary(); if (manual) state.history = false; if (state.peer && !state.history) await thread(); if (manual && epoch === state.epoch) status('Đã cập nhật trò chuyện.'); } catch (e) { if (epoch === state.epoch) status(errorText(e), true); } finally { if (pollEpoch === epoch) polling = false; }
  }
  $('chatRefresh').onclick = () => busy($('chatRefresh'), () => state.user ? refresh(true) : boot());
  document.addEventListener('examlab:beta-updated', e => { if (state.user) { applyFriends(e.detail?.overview?.friends); summary().catch(err => status(errorText(err), true)); } });
  function reset() { ++state.epoch; ++state.bootRequest; ++state.threadRequest; state.user = null; state.peer = null; state.friends = []; state.messages = []; state.summary = []; state.more = false; state.history = false; state.drafts.clear(); state.pending.clear(); state.pinned.clear(); $('chatText').value = ''; $('chatPeerName').textContent = 'Chọn một người bạn'; box.hidden = true; renderFriends(); renderMessages(); count(); }
  async function boot() {
    const request = ++state.bootRequest;
    try { if (!db) return; const r = await db.auth.getUser(); if (r.error) throw r.error; if (request !== state.bootRequest) return; if (!r.data?.user) { reset(); return; } state.user = r.data.user; box.hidden = false; loadPins(); await refresh(true); } catch (e) { if (request === state.bootRequest) status(errorText(e), true); }
  }
  db?.auth?.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT' || (state.user && state.user.id !== session?.user?.id)) reset(); if (event === 'SIGNED_IN' && !state.user) setTimeout(boot, 0); });
  setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  boot();
})();
