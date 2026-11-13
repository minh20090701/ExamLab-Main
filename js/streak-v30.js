/* Server-derived study streaks. No client-side check-in or automatic messages. */
(() => {
  'use strict';
  const mount = document.querySelector('[data-streak-view]');
  if (!mount) return;
  const full = mount.dataset.streakView === 'full';
  if (full) document.getElementById('notice')?.after(mount);
  const script = document.currentScript;
  const base = new URL('../', script.src);
  const link = path => new URL(path, base).href;
  const db = window.ExamLabSupabase;
  const state = { user: null, snapshot: null, epoch: 0, request: 0, boot: 0, busy: false, offset: 0 };
  mount.id = 'studyStreak'; mount.classList.add('streak-v30');
  mount.setAttribute('aria-labelledby', 'streakTitle');
  mount.innerHTML = `
    <div class="streak-heading"><div><small class="streak-kicker">MỖI NGÀY MỘT CHÚT TIẾN BỘ</small><h2 id="streakTitle">🔥 Chuỗi học tập</h2></div><button id="streakRefresh" type="button" class="streak-button">Làm mới</button></div>
    <p id="streakStatus" class="streak-status" role="status">Đang tải chuỗi học…</p>
    <p id="streakGuest" hidden>Đăng nhập để lưu chuỗi học trên các thiết bị. <a id="streakLogin">Đăng nhập</a></p>
    <div id="streakContent" hidden>
      <div class="streak-overview"><div class="streak-number"><span aria-hidden="true">🔥</span><strong id="streakCurrent">0</strong><span>ngày liên tiếp</span></div><div class="streak-today"><h3 id="streakToday"></h3><p id="streakProgressText"></p><progress id="streakProgress" max="600" value="0" aria-label="Tiến độ học hôm nay"></progress><small id="streakReset"></small></div></div>
      <div class="streak-stats"><span>Kỷ lục <b id="streakBest">0</b> ngày</span><span>7 ngày qua <b id="streakWeek">0</b>/7</span><span>Tổng cộng <b id="streakTotal">0</b> ngày học</span></div>
      <div class="streak-actions"><a id="streakStudy" class="streak-button">Bấm giờ học</a><a id="streakExam" class="streak-button">Luyện đề</a>${full ? '' : '<a id="streakFriendsLink" class="streak-button">Xem chuỗi cùng bạn →</a>'}</div>
      ${full ? `<h3>Nhịp học 28 ngày qua</h3><p class="streak-muted">✓ Đã đạt mục tiêu · ○ Chưa đạt · Ngày mới bắt đầu lúc 00:00 Việt Nam.</p><div id="streakCalendar" class="streak-calendar" role="list" aria-label="28 ngày học gần nhất"></div><div id="streakMilestones" class="streak-milestones" aria-label="Mốc chuỗi học cá nhân"></div>
      <div class="streak-friends-heading"><div><h3>Học cùng bạn, giữ lửa cùng nhau</h3><p class="streak-muted">Cả hai đạt mục tiêu trong cùng ngày thì chuỗi chung tăng. Hai người cần bật chia sẻ để xem chuỗi của nhau.</p></div></div>
      <label class="streak-sharing"><input id="streakSharing" type="checkbox"> Cho bạn bè xem chuỗi và tham gia chuỗi chung</label><p class="streak-muted">Mặc định riêng tư. Chuỗi chung tính từ ngày cả hai bật chia sẻ. Tắt rồi bật lại sẽ bắt đầu giai đoạn chung mới; chuỗi cá nhân vẫn giữ.</p>
      <div class="streak-filters"><label for="streakSearch">Tìm bạn<input id="streakSearch" type="search" maxlength="100" placeholder="Tên bạn bè…"></label><label for="streakFilter">Hiển thị<select id="streakFilter"><option value="all">Tất cả bạn bè</option><option value="waiting">Còn mục tiêu hôm nay</option><option value="done">Cả hai đã hoàn thành</option><option value="visible">Đã bật chia sẻ cùng nhau</option></select></label></div><p class="streak-muted">Sắp xếp theo chuỗi chung, rồi chuỗi cá nhân. Nút Rủ học chỉ soạn tin nhắn để bạn xem và gửi.</p><div id="streakFriends" class="streak-friends"></div>` : ''}
      <details class="streak-rules"><summary>Cách tính chuỗi học</summary><p>Mỗi ngày: lưu và đồng bộ tổng cộng ít nhất 10 phút bấm giờ/Pomodoro, hoặc nộp một bài ở Tủ đề ôn tập có ít nhất 5 câu đã trả lời và thời gian làm từ 1 phút. Một ngày chỉ tăng chuỗi một lần. Điểm danh, trò chuyện và bài thi ở khu vực Beta chưa được tính.</p><p>Ngày tính theo Việt Nam (UTC+7). Hãy đồng bộ trước 00:00; phiên cũ đồng bộ sang ngày khác không được cộng mới. Bỏ trọn một ngày thì chuỗi hiện tại về 0, kỷ lục vẫn giữ. Xóa lịch sử học không xóa thành tích đã ghi nhận.</p></details>
    </div>`;
  const $ = id => mount.querySelector('#' + id);
  $('streakLogin').href = link('login.html');
  $('streakStudy').href = link('study.html'); $('streakExam').href = link('index.html');
  if (!full) $('streakFriendsLink').href = link('friends-beta/index.html#studyStreak');
  const node = (tag, text, cls = '') => { const e = document.createElement(tag); e.textContent = text; e.className = cls; return e; };
  const n = v => Math.max(0, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0);
  const status = (text, error = false) => { $('streakStatus').textContent = text; $('streakStatus').classList.toggle('error', error); };
  function errorText(e) {
    return /schema cache|does not exist|Could not find the function/i.test(String(e?.message || e))
      ? 'Chuỗi học chưa được cài trên máy chủ. Quản trị viên cần chạy SQL V30 trong hướng dẫn đi kèm source.'
      : 'Chưa tải được chuỗi học. Kiểm tra kết nối rồi bấm Làm mới.';
  }
  async function rpc(name, args = {}) { const r = await db.rpc(name, args); if (r.error) throw r.error; return r.data; }
  function publish(){document.dispatchEvent(new CustomEvent('examlab:streak-updated',{detail:{userId:state.user?.id,summary:state.snapshot?.my||null}}))}
  document.addEventListener('examlab:hub-sync',publish);
  function resetClock() {
    if (!state.snapshot) return;
    const remaining = Math.max(0, Date.parse(state.snapshot.next_reset_at) - (Date.now() + state.offset));
    const minutes = Math.ceil(remaining / 60000);
    $('streakReset').textContent = `Ngày mới sau ${Math.floor(minutes / 60)} giờ ${minutes % 60} phút · Giờ Việt Nam`;
  }
  function calendar() {
    const list = $('streakCalendar'); list.replaceChildren();
    const end = new Date(state.snapshot.today + 'T12:00:00Z');
    const days = new Set(state.snapshot.my.days || []);
    for (let i = 27; i >= 0; i--) {
      const date = new Date(end); date.setUTCDate(date.getUTCDate() - i);
      const iso = date.toISOString().slice(0, 10), done = days.has(iso), label = `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
      const cell = node('div', '', 'streak-day' + (done ? ' done' : '') + (i === 0 ? ' today' : ''));
      cell.setAttribute('role', 'listitem'); cell.setAttribute('aria-label', label + (i === 0 ? ' hôm nay' : '') + (done ? ': đã đạt mục tiêu' : ': chưa đạt mục tiêu'));
      cell.append(node('span', done ? '✓' : '○'), node('small', label)); list.append(cell);
    }
    const badges = $('streakMilestones'); badges.replaceChildren();
    for (const [target, title] of [[3, 'Khởi động'], [7, 'Bền bỉ'], [30, 'Vững vàng'], [100, 'Trăm ngày tiến bộ']]) {
      const earned = n(state.snapshot.my.best) >= target;
      badges.append(node('span', `${earned ? '✓' : '○'} ${target} ngày · ${title}`, 'streak-badge' + (earned ? ' earned' : '')));
    }
  }
  function renderFriends() {
    if (!full || !state.snapshot) return;
    const container = $('streakFriends'), query = $('streakSearch').value.trim().toLocaleLowerCase('vi'), filter = $('streakFilter').value;
    container.replaceChildren();
    const friends = (state.snapshot.friends || []).filter(f => String(f.name).toLocaleLowerCase('vi').includes(query))
      .filter(f => filter === 'all' || (f.visible && (filter === 'visible' || (filter === 'done' ? f.duo?.today_done : !f.duo?.today_done))))
      .sort((a, b) => Number(b.visible) - Number(a.visible) || n(b.duo?.current) - n(a.duo?.current) || n(b.personal?.current) - n(a.personal?.current) || String(a.name).localeCompare(String(b.name), 'vi'));
    for (const f of friends) {
      const card = node('article', '', 'streak-friend');
      card.append(node('h4', f.name));
      if (f.visible) {
        card.append(node('strong', `🔥 ${n(f.duo.current)} ngày cùng nhau`, 'streak-duo'));
        card.append(node('p', `Kỷ lục chung ${n(f.duo.best)} ngày · Chuỗi của bạn ấy ${n(f.personal.current)} ngày`, 'streak-muted'));
        const message = f.duo.today_done ? '✓ Cả hai đã đạt mục tiêu hôm nay!' : state.snapshot.my.today_done ? 'Bạn đã học xong · Còn bạn ấy' : f.personal.today_done ? 'Bạn ấy đã học xong · Đến lượt bạn' : 'Cả hai cùng bắt đầu một phiên học nhé';
        card.append(node('p', message, 'streak-duo-status'));
      } else card.append(node('p', 'Chuỗi đang riêng tư. Cả hai cần bật chia sẻ để xem chuỗi chung.', 'streak-muted'));
      const row = node('div', '', 'streak-actions');
      const chat = node('button', 'Rủ học', 'streak-button'); chat.type = 'button';
      chat.onclick = () => document.dispatchEvent(new CustomEvent('examlab:chat-compose', { detail: { userId: f.user_id, text: 'Cùng học 10 phút hôm nay nhé 🔥 Xong nhớ lưu phiên học để giữ chuỗi!' } }));
      const share = node('button', 'Chia sẻ tài liệu', 'streak-button'); share.type = 'button';
      share.onclick = () => { document.dispatchEvent(new CustomEvent('examlab:share-to', { detail: { userId: f.user_id } })); document.getElementById('friendWorkspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      row.append(chat, share); card.append(row); container.append(card);
    }
    if (!friends.length) container.append(node('p', state.snapshot.friends?.length ? 'Không có bạn phù hợp bộ lọc.' : 'Kết bạn ở phần bên dưới để bắt đầu chuỗi học cùng nhau.', 'streak-muted'));
  }
  function render() {
    const data = state.snapshot, mine = data.my, seconds = Math.min(600, n(mine.seconds_today));
    $('streakContent').hidden = false; $('streakGuest').hidden = true;
    $('streakCurrent').textContent = n(mine.current); $('streakBest').textContent = n(mine.best);
    $('streakWeek').textContent = n(mine.week); $('streakTotal').textContent = n(mine.total);
    $('streakToday').textContent = mine.today_done ? 'Hôm nay đã giữ lửa ✓' : 'Thêm một chút học cho hôm nay';
    $('streakProgress').value = seconds;
    $('streakProgressText').textContent = mine.today_done ? 'Mục tiêu hôm nay đã hoàn thành. Hẹn bạn ngày mai!' : `${Math.floor(seconds / 60)} phút đã ghi nhận · Còn ${Math.ceil((600 - seconds) / 60)} phút, hoặc hoàn thành một bài đủ điều kiện.`;
    if (full) { $('streakSharing').checked = data.sharing === true; calendar(); renderFriends(); }
    resetClock(); publish();
    const available = data.sources?.study || data.sources?.attempt;
    status(available ? 'Đã cập nhật từ lịch sử học được đồng bộ.' : 'Máy chủ chưa có bảng lịch sử học/bài làm. Quản trị viên cần hoàn tất phần cài đặt.', !available);
  }
  async function refresh() {
    if (!state.user || !db) return;
    const epoch = state.epoch, request = ++state.request;
    $('streakRefresh').disabled = true;
    if (full) { $('streakSharing').disabled = true; $('streakFriends').replaceChildren(); }
    try {
      const data = await rpc('examlab_v30_streak_snapshot');
      if (epoch !== state.epoch || request !== state.request) return;
      if (!data?.my || !/^\d{4}-\d{2}-\d{2}$/.test(data.today) || !Number.isFinite(Date.parse(data.server_now)) || !Number.isFinite(Date.parse(data.next_reset_at))) throw Error('Invalid snapshot');
      state.snapshot = data; state.offset = Date.parse(data.server_now) - Date.now(); render();
    } catch (e) {
      if (epoch === state.epoch && request === state.request) { state.snapshot = null; $('streakContent').hidden = true; status(errorText(e), true); }
    } finally {
      if (epoch === state.epoch && request === state.request) { $('streakRefresh').disabled = false; if (full) $('streakSharing').disabled = state.busy || !state.snapshot; }
    }
  }
  function reset() {
    ++state.epoch; ++state.request; ++state.boot; state.user = null; state.snapshot = null; state.busy = false;
    $('streakContent').hidden = true; $('streakGuest').hidden = false; $('streakRefresh').disabled = false;
    if (full) { $('streakFriends').replaceChildren(); $('streakCalendar').replaceChildren(); $('streakSearch').value = ''; $('streakSharing').checked = false; }
    status('Chuỗi học được lưu riêng theo tài khoản.');
  }
  async function boot() {
    const request = ++state.boot;
    if (!db?.auth) { reset(); return; }
    try {
      const r = await db.auth.getUser(); if (request !== state.boot) return; if (r.error) throw r.error;
      if (!r.data?.user) { reset(); return; }
      state.user = r.data.user; await refresh();
    } catch (e) { if (request === state.boot) status(errorText(e), true); }
  }
  if (full) {
    $('streakSearch').oninput = renderFriends; $('streakFilter').onchange = renderFriends;
    $('streakSharing').onchange = async () => {
      if (state.busy || !state.user || !state.snapshot) return;
      const epoch = state.epoch, enabled = $('streakSharing').checked;
      state.busy = true; $('streakSharing').disabled = true;
      try { await rpc('examlab_v30_streak_sharing', { p_enabled: enabled }); if (epoch === state.epoch) await refresh(); }
      catch (e) { if (epoch === state.epoch) { $('streakSharing').checked = state.snapshot?.sharing === true; status('Chưa lưu được lựa chọn chia sẻ. Hãy thử lại.', true); } }
      finally { if (epoch === state.epoch) { state.busy = false; $('streakSharing').disabled = !state.snapshot; } }
    };
  }
  $('streakRefresh').onclick = () => state.user ? refresh() : boot();
  for (const event of ['examlab:study-synced', 'examlab:attempt-saved', 'examlab:beta-updated']) document.addEventListener(event, () => refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  db?.auth?.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (state.user && state.user.id !== session?.user?.id)) reset();
    if (event === 'SIGNED_IN' && !state.user) { ++state.boot; setTimeout(boot, 0); }
  });
  setInterval(() => { if (!document.hidden && state.user) refresh(); }, 60000);
  boot();
})();
