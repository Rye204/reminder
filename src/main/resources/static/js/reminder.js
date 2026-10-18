(() => {
  'use strict';

  const API = '/api/reminders';
  const STATUS_LABEL = { pending: 'Đang chờ', sent: 'Đã gửi', cancelled: 'Đã hủy' };
  const FILTER_LABEL = { all: 'Tất cả', ...STATUS_LABEL };

  const state = { items: [], filter: 'all', taskFilter: null, editingId: null, busy: false };

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $('reminder-form'), taskId: $('task-id'), remindAt: $('remind-at'),
    formTitle: $('form-title'), formHint: $('form-hint'), formError: $('form-error'),
    submit: $('submit-btn'), cancelEdit: $('cancel-edit-btn'),
    list: $('list'), empty: $('empty'), tabs: $('tabs'), taskFilter: $('task-filter'),
    toasts: $('toasts'), conn: $('conn'), connText: $('conn-text'), perm: $('perm-btn'),
  };

  /* ---------- Helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');

  function statusOf(r) {
    if (!r.enabled) return 'cancelled';
    if (r.notified) return 'sent';
    return 'pending';
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toInputValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function humanize(ms) {
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'dưới 1 phút';
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d) return `${d} ngày${h ? ` ${h} giờ` : ''}`;
    if (h) return `${h} giờ${m ? ` ${m} phút` : ''}`;
    return `${m} phút`;
  }

  function relativeText(r) {
    if (statusOf(r) !== 'pending') return '';
    const diff = new Date(r.reminderTime) - new Date();
    return diff > 0 ? `Còn ${humanize(diff)}` : 'Đến giờ, đang gửi';
  }

  async function request(url, options = {}) {
    let res;
    try {
      res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    } catch {
      throw new Error('Không kết nối được máy chủ. Hãy kiểm tra Spring Boot đã chạy chưa.');
    }
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch { /* không có nội dung JSON */ }
    if (!res.ok) {
      const fields = data && data.fields ? ` ${Object.values(data.fields).join('; ')}` : '';
      throw new Error(((data && (data.message || data.error)) || `Lỗi ${res.status}`) + fields);
    }
    return data;
  }

  /* ---------- Toasts ---------- */
  function showToast({ title, body = '', kind = 'ok', sticky = false }) {
    const box = document.createElement('div');
    box.className = `toast ${kind}`;
    const strong = document.createElement('strong');
    strong.textContent = title;
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng thông báo');
    close.textContent = '×';
    close.addEventListener('click', () => box.remove());
    box.append(strong, close);
    if (body) {
      const p = document.createElement('p');
      p.textContent = body;
      box.append(p);
    }
    el.toasts.append(box);
    if (!sticky) setTimeout(() => box.remove(), 4000);
  }

  /* ---------- Rendering ---------- */
  function sortItems(items) {
    const pending = items.filter((r) => statusOf(r) === 'pending')
      .sort((a, b) => new Date(a.reminderTime) - new Date(b.reminderTime));
    const rest = items.filter((r) => statusOf(r) !== 'pending')
      .sort((a, b) => new Date(b.reminderTime) - new Date(a.reminderTime));
    return [...pending, ...rest];
  }

  function actionButton(label, onClick, danger = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = danger ? 'link-btn danger' : 'link-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function buildItem(r) {
    const status = statusOf(r);
    const li = document.createElement('li');
    li.className = `item is-${status}`;

    const when = document.createElement('div');
    when.className = 'when';
    const time = document.createElement('strong');
    time.textContent = formatTime(r.reminderTime);
    when.append(time);
    const rel = relativeText(r);
    if (rel) {
      const s = document.createElement('span');
      s.className = 'rel';
      s.textContent = rel;
      when.append(s);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const badge = document.createElement('span');
    badge.className = `badge ${status}`;
    badge.textContent = STATUS_LABEL[status];
    const task = document.createElement('span');
    task.className = 'task-name';
    task.textContent = `Task ${r.taskId}${r.taskTitle ? `: ${r.taskTitle}` : ''}`;
    meta.append(badge, task);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    if (status === 'pending') {
      actions.append(actionButton('Sửa giờ', () => startEdit(r)));
      actions.append(actionButton('Hủy nhắc', () => cancelReminder(r)));
    } else {
      actions.append(actionButton('Đặt lại giờ', () => startEdit(r)));
    }
    actions.append(actionButton('Xóa', () => deleteReminder(r), true));

    li.append(when, meta, actions);
    return li;
  }

  function render() {
    let items = state.items;
    if (state.taskFilter) items = items.filter((r) => r.taskId === state.taskFilter);

    const counts = { all: items.length, pending: 0, sent: 0, cancelled: 0 };
    items.forEach((r) => { counts[statusOf(r)] += 1; });
    el.tabs.querySelectorAll('button').forEach((b) => {
      const f = b.dataset.filter;
      b.textContent = `${FILTER_LABEL[f]} (${counts[f]})`;
      b.setAttribute('aria-pressed', String(f === state.filter));
    });

    const shown = sortItems(state.filter === 'all' ? items : items.filter((r) => statusOf(r) === state.filter));
    el.list.replaceChildren(...shown.map(buildItem));

    if (shown.length === 0) {
      el.empty.hidden = false;
      el.empty.textContent = state.items.length === 0
        ? 'Chưa có nhắc nhở nào. Nhập ID task và chọn giờ để đặt nhắc đầu tiên.'
        : 'Không có nhắc nhở nào khớp với bộ lọc này.';
    } else {
      el.empty.hidden = true;
    }
  }

  /* ---------- Data ---------- */
  async function loadAll() {
    try {
      state.items = await request(API);
      render();
    } catch (err) {
      showToast({ title: 'Không tải được danh sách', body: err.message, kind: 'error' });
    }
  }

  /* ---------- Form ---------- */
  function refreshMin() {
    el.remindAt.min = toInputValue(new Date());
  }

  function setError(msg) { el.formError.textContent = msg || ''; }

  function resetForm() {
    state.editingId = null;
    el.form.reset();
    el.taskId.readOnly = false;
    el.formTitle.textContent = 'Đặt nhắc mới';
    el.formHint.textContent = 'Chọn một thời điểm trong tương lai.';
    el.submit.textContent = 'Đặt nhắc';
    el.cancelEdit.hidden = true;
    setError('');
    refreshMin();
  }

  function startEdit(r) {
    state.editingId = r.id;
    const status = statusOf(r);
    el.taskId.value = r.taskId;
    el.taskId.readOnly = true;
    const current = new Date(r.reminderTime);
    el.remindAt.value = current > new Date() ? r.reminderTime.slice(0, 16) : '';
    el.formTitle.textContent = status === 'pending' ? 'Sửa giờ nhắc' : 'Đặt lại giờ nhắc';
    el.formHint.textContent = status === 'pending'
      ? 'Đổi sang thời điểm khác trong tương lai.'
      : 'Chọn giờ mới, nhắc nhở sẽ được bật lại.';
    el.submit.textContent = 'Lưu giờ nhắc';
    el.cancelEdit.hidden = false;
    setError('');
    refreshMin();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.remindAt.focus();
  }

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.busy) return;
    setError('');

    const taskId = Number(el.taskId.value);
    if (!Number.isInteger(taskId) || taskId < 1) { setError('Nhập ID task là một số nguyên dương.'); el.taskId.focus(); return; }
    if (!el.remindAt.value) { setError('Chọn giờ nhắc.'); el.remindAt.focus(); return; }
    if (new Date(el.remindAt.value) <= new Date()) { setError('Giờ nhắc phải ở tương lai.'); el.remindAt.focus(); return; }

    const body = JSON.stringify({ taskId, reminderTime: `${el.remindAt.value}:00`, enabled: true });
    const editing = state.editingId !== null;

    state.busy = true;
    el.submit.disabled = true;
    try {
      await request(editing ? `${API}/${state.editingId}` : API, { method: editing ? 'PUT' : 'POST', body });
      showToast({ title: editing ? 'Đã lưu giờ nhắc' : 'Đã đặt nhắc', kind: 'ok' });
      resetForm();
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      state.busy = false;
      el.submit.disabled = false;
    }
  });

  el.cancelEdit.addEventListener('click', resetForm);

  /* ---------- Actions ---------- */
  async function cancelReminder(r) {
    try {
      await request(`${API}/${r.id}/cancel`, { method: 'PUT' });
      showToast({ title: 'Đã hủy nhắc' });
      if (state.editingId === r.id) resetForm();
      await loadAll();
    } catch (err) {
      showToast({ title: 'Không hủy được', body: err.message, kind: 'error' });
    }
  }

  async function deleteReminder(r) {
    if (!window.confirm(`Xóa hẳn nhắc lúc ${formatTime(r.reminderTime)}? Không thể hoàn tác.`)) return;
    try {
      await request(`${API}/${r.id}`, { method: 'DELETE' });
      showToast({ title: 'Đã xóa nhắc' });
      if (state.editingId === r.id) resetForm();
      await loadAll();
    } catch (err) {
      showToast({ title: 'Không xóa được', body: err.message, kind: 'error' });
    }
  }

  /* ---------- Filters ---------- */
  el.tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    render();
  });

  el.taskFilter.addEventListener('input', () => {
    const n = Number(el.taskFilter.value);
    state.taskFilter = Number.isInteger(n) && n > 0 ? n : null;
    render();
  });

  /* ---------- Notifications ---------- */
  function updatePermButton() {
    if (!('Notification' in window)) { el.perm.hidden = true; return; }
    el.perm.hidden = Notification.permission === 'granted';
    el.perm.textContent = Notification.permission === 'denied'
      ? 'Thông báo bị chặn: bật lại trong cài đặt trình duyệt'
      : 'Bật thông báo trình duyệt';
    el.perm.disabled = Notification.permission === 'denied';
  }

  el.perm.addEventListener('click', async () => {
    await Notification.requestPermission();
    updatePermButton();
  });

  function notifyDue(r) {
    const title = `Đến giờ: ${r.taskTitle || `Task ${r.taskId}`}`;
    const body = `Nhắc lúc ${formatTime(r.reminderTime)}`;
    showToast({ title, body, kind: 'alarm', sticky: true });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  function setConn(stateName, text) {
    el.conn.dataset.state = stateName;
    el.connText.textContent = text;
  }

  function connectStream() {
    const source = new EventSource(`${API}/stream`);
    source.onopen = () => setConn('online', 'Đang nhận thông báo');
    source.onerror = () => setConn('offline', 'Mất kết nối, đang thử lại');
    source.addEventListener('reminder', (e) => {
      notifyDue(JSON.parse(e.data));
      loadAll();
    });
  }

  /* ---------- Start ---------- */
  refreshMin();
  updatePermButton();
  loadAll();
  connectStream();
  setInterval(() => { refreshMin(); render(); }, 30000); // cập nhật đếm ngược
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadAll(); });
})();
