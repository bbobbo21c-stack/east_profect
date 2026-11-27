(function (window, document) {
  'use strict';

  const client = window.handoverSupabaseClient;
  const adminUserId = window.HANDOVER_ADMIN_USER_ID || '';
  const root = document.getElementById('app');
  let records = [];
  let editingId = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function notify(message, isError) {
    const notice = document.createElement('div');
    notice.className = 'toast';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    if (isError) notice.classList.add('toast-error');
    document.body.appendChild(notice);
    window.setTimeout(() => notice.remove(), 3000);
  }

  function shell(content) {
    root.innerHTML = '<div class="shell"><header class="topbar"><a class="brand" href="index.html"><span class="brand-mark">SP</span><span class="brand-copy"><strong>남부발전 스마트 인수인계</strong><span>SHIFT HANDOVER · ADMIN</span></span></a><nav class="nav" aria-label="주 메뉴"><a href="index.html">대시보드</a><a href="list.html">기록 검색</a><a href="unread.html">내 미열람</a><a class="active" href="admin.html" aria-current="page">관리자</a></nav></header><main class="main">' + content + '<p class="footer-note">공용 인계 기록 관리</p></main></div>';
  }

  function recordList() {
    if (!records.length) return '<div class="empty"><strong>등록된 인계 기록이 없습니다.</strong><p>새 기록을 작성해 주세요.</p></div>';
    return '<div class="admin-record-list">' + records.map(record => '<article class="admin-record"><div class="admin-record-main"><div class="record-meta"><span>' + escapeHtml(record.date) + '</span><span>·</span><span>' + escapeHtml(record.team) + '</span><span>·</span><span>' + escapeHtml(record.author) + '</span></div><strong>' + escapeHtml(record.equipment || '이상없음') + '</strong><p>' + escapeHtml(record.summary || '') + '</p></div><div class="admin-record-actions"><button class="button" type="button" data-edit="' + escapeHtml(record.id) + '">수정</button><button class="button danger" type="button" data-delete="' + escapeHtml(record.id) + '">삭제</button></div></article>').join('') + '</div>';
  }

  function formHtml(record) {
    const databaseFields = { shiftType: 'shift_type', noIssue: 'no_issue', weeklyInspection: 'weekly_inspection', weeklyInspectionNotDone: 'weekly_inspection_not_done', actionStatus: 'action_status', actionDate: 'action_date' };
    const value = (key, fallback) => escapeHtml(record ? record[databaseFields[key] || key] : (fallback || ''));
    const selected = (key, option, fallback) => (record ? record[databaseFields[key] || key] : fallback) === option ? ' selected' : '';
    return '<section class="panel admin-form-panel"><div class="panel-head"><div><h2>' + (editingId ? '인계 기록 수정' : '인계 기록 등록') + '</h2><p>저장된 기록은 서비스 사용자에게 공유됩니다.</p></div>' + (editingId ? '<button class="button" id="cancel-edit" type="button">수정 취소</button>' : '') + '</div><form id="admin-record-form" class="compose-form"><div class="filter-grid"><div class="field"><label for="admin-position">보직</label><select id="admin-position" name="position" required><option value="">보직 선택</option>' + ['SBO','BTG1','BTG2','TO1','TO2','BO1','BO2'].map(item => '<option' + selected('position', item, '') + '>' + item + '</option>').join('') + '</select></div><div class="field"><label for="admin-date">근무 날짜</label><input id="admin-date" name="date" type="date" value="' + value('date', new Date().toISOString().slice(0, 10)) + '" required></div><div class="field"><label for="admin-team">근무조</label><select id="admin-team" name="team" required>' + ['A','B','C','D','E'].map(team => '<option value="' + team + '조"' + selected('team', team + '조', 'A조') + '>' + team + '조</option>').join('') + '</select></div><div class="field"><label for="admin-shift">근무 형태</label><select id="admin-shift" name="shift_type"><option' + selected('shiftType', '주간', '주간') + '>주간</option><option' + selected('shiftType', '야간', '주간') + '>야간</option></select></div><div class="field"><label for="admin-author">작성자</label><input id="admin-author" name="author" value="' + value('author') + '" maxlength="80" required></div><div class="field"><label for="admin-equipment">설비명</label><input id="admin-equipment" name="equipment" value="' + value('equipment') + '" maxlength="80"></div><div class="field"><label for="admin-category">카테고리</label><select id="admin-category" name="category"><option value="">선택</option>' + ['급수계통','복수계통','터빈계통','환경설비계통'].map(item => '<option' + selected('category', item, '') + '>' + item + '</option>').join('') + '</select></div><div class="field"><label for="admin-importance">중요도</label><select id="admin-importance" name="importance" required>' + ['일반','중요','긴급'].map(item => '<option' + selected('importance', item, '일반') + '>' + item + '</option>').join('') + '</select></div><div class="field full"><label for="admin-summary">주요 전달사항</label><textarea id="admin-summary" name="summary" rows="2" maxlength="500">' + value('summary') + '</textarea></div><div class="field full"><label for="admin-weekly">주간점검 사항</label><textarea id="admin-weekly" name="weekly_inspection" rows="2" maxlength="500">' + value('weeklyInspection') + '</textarea></div><div class="field full"><label for="admin-notes">특이사항</label><textarea id="admin-notes" name="notes" rows="2" maxlength="1000">' + value('notes') + '</textarea></div><div class="field"><label for="admin-status">조치 상태</label><select id="admin-status" name="action_status"><option value="">선택</option>' + ['작업완료','작업 중','조치 중','조치예정','추후예정'].map(item => '<option' + selected('actionStatus', item, '') + '>' + item + '</option>').join('') + '</select></div><div class="field"><label for="admin-action-date">조치 예정일 또는 상태</label><input id="admin-action-date" name="action_date" value="' + value('actionDate') + '" placeholder="날짜 또는 미정"></div><div class="field full"><label for="admin-actions">조치사항</label><textarea id="admin-actions" name="actions" rows="2" maxlength="1000">' + value('actions') + '</textarea></div><div class="field full"><label><input type="checkbox" name="no_issue"' + ((record && record.noIssue) ? ' checked' : '') + '> 설비 이상 없음</label><label><input type="checkbox" name="weekly_inspection_not_done"' + ((record && record.weeklyInspectionNotDone) ? ' checked' : '') + '> 주간점검 미시행</label></div></div><div class="filter-actions"><button class="button primary" type="submit">' + (editingId ? '변경 내용 저장' : '기록 등록') + '</button></div></form></section>';
  }

  function render() {
    shell('<div class="page-heading"><div><p class="eyebrow">ADMINISTRATION</p><h1>인계 기록 관리</h1><p class="subtitle">서비스에 공유되는 인계 기록을 관리합니다.</p></div></div>' + formHtml(editingId ? records.find(item => item.id === editingId) : null) + '<section class="panel"><div class="results-head"><h2>전체 인계 기록</h2><span>' + records.length + '건</span></div>' + recordList() + '</section>');
    bindEvents();
  }

  async function loadRecords() {
    const { data, error } = await client.from('handover_records').select('*');
    if (error) throw error;
    records = (data || []).sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || '') || (b.sort_order || 0) - (a.sort_order || 0));
  }

  function bindEvents() {
    const form = document.getElementById('admin-record-form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const existing = records.find(item => item.id === editingId);
      const row = {
        date: values.date, team: values.team, position: values.position, shift_type: values.shift_type,
        author: values.author.trim(), equipment: values.equipment.trim() || null, category: values.category || null,
        summary: values.summary.trim() || null, importance: values.importance,
        no_issue: form.elements.namedItem('no_issue').checked, weekly_inspection: values.weekly_inspection.trim() || null,
        weekly_inspection_not_done: form.elements.namedItem('weekly_inspection_not_done').checked,
        notes: values.notes.trim() || null, action_status: values.action_status || null,
        action_date: values.action_date.trim() || null, actions: values.actions.trim() || null,
        sort_order: existing ? existing.sort_order : Math.max(0, ...records.map(item => item.sort_order || 0)) + 1
      };
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        let result;
        if (editingId) result = await client.from('handover_records').update(row).eq('id', editingId);
        else result = await client.from('handover_records').insert({ ...row, id: 'admin-' + Date.now().toString(36), created_at: new Date().toISOString() });
        if (result.error) throw result.error;
        editingId = null;
        await loadRecords();
        render();
        notify('인계 기록을 저장했습니다.');
      } catch (error) {
        submit.disabled = false;
        notify('저장하지 못했습니다. Supabase 정책과 연결을 확인해 주세요.', true);
        console.error(error);
      }
    });

    const cancel = document.getElementById('cancel-edit');
    if (cancel) cancel.addEventListener('click', () => { editingId = null; render(); });
    document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => {
      editingId = button.dataset.edit;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
      const record = records.find(item => item.id === button.dataset.delete);
      if (!record || !window.confirm('“' + (record.equipment || '이 인계 기록') + '”을 삭제할까요?')) return;
      button.disabled = true;
      const { error } = await client.from('handover_records').delete().eq('id', record.id);
      if (error) {
        button.disabled = false;
        notify('삭제하지 못했습니다. Supabase 정책과 연결을 확인해 주세요.', true);
        console.error(error);
        return;
      }
      await loadRecords();
      render();
      notify('인계 기록을 삭제했습니다.');
    }));
  }

  async function initialize() {
    try {
      if (!adminUserId) throw new Error('관리자 UUID가 설정되지 않았습니다.');
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user || data.user.id !== adminUserId) throw new Error('관리자 권한이 없습니다.');
      await loadRecords();
      render();
    } catch (error) {
      shell('<section class="error-card"><div class="empty-symbol">!</div><h1>관리자 화면에 접근할 수 없습니다</h1><p>' + escapeHtml(error.message === '관리자 UUID가 설정되지 않았습니다.' ? '관리자 Auth UUID 설정이 필요합니다.' : '관리자 계정으로 로그인했는지 확인해 주세요.') + '</p><a class="button" href="index.html">대시보드로</a></section>');
      console.error('관리자 화면 초기화 실패:', error);
    }
  }

  initialize();
})(window, document);
