(function () {
  'use strict';

  const REFRESH_INTERVAL_MS = 60 * 1000;
  const KEYS = { user: 'handover.currentUser', reads: 'handover.readStates', lastSync: 'handover.lastSync', listState: 'handover.listState', created: 'handover.createdRecords' };
  const supabaseClient = window.handoverSupabaseClient;
  const allUsers = window.MockData.users;
  const categories = ['급수계통', '복수계통', '터빈계통', '환경설비계통'];
  const positions = ['SBO', 'BTG1', 'BTG2', 'TO1', 'TO2', 'BO1', 'BO2'];
  let records = [];
  const page = document.body.dataset.page;
  const root = document.getElementById('app');

  function storageGet(key, fallback) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
    catch (error) { return fallback; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast('이 브라우저에서는 저장 공간을 사용할 수 없습니다.'); return false; }
  }
  function currentUserId() {
    const chosen = storageGet(KEYS.user, allUsers[0].id);
    return allUsers.some(user => user.id === chosen) ? chosen : allUsers[0].id;
  }
  function currentUser() { return allUsers.find(user => user.id === currentUserId()) || allUsers[0]; }
  function readStates() { return storageGet(KEYS.reads, {}); }
  function isRead(recordId, userId) { return Boolean(readStates()[userId || currentUserId()] && readStates()[userId || currentUserId()][recordId]); }
  function sorted(list) { return list.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '') || a.order - b.order); }
  function recordFromDatabase(row) {
    return {
      id: row.id, date: row.date, team: row.team, position: row.position, shiftType: row.shift_type,
      author: row.author, equipment: row.equipment, category: row.category, summary: row.summary,
      noIssue: row.no_issue, weeklyInspection: row.weekly_inspection,
      weeklyInspectionNotDone: row.weekly_inspection_not_done, notes: row.notes, actions: row.actions,
      actionStatus: row.action_status, actionDate: row.action_date, importance: row.importance,
      createdAt: row.created_at, order: row.sort_order || 0
    };
  }
  function recordForDatabase(record) {
    return {
      id: record.id, date: record.date, team: record.team, position: record.position || null,
      shift_type: record.shiftType, author: record.author, equipment: record.equipment || null,
      category: record.category || null, summary: record.summary || null, no_issue: Boolean(record.noIssue),
      weekly_inspection: record.weeklyInspection || null,
      weekly_inspection_not_done: Boolean(record.weeklyInspectionNotDone), notes: record.notes || null,
      actions: record.actions || null, action_status: record.actionStatus || null,
      action_date: record.actionDate || null, importance: record.importance,
      created_at: record.createdAt || null, sort_order: Number(record.order) || 0
    };
  }
  async function migrateLocalRecords() {
    const pending = storageGet(KEYS.created, []);
    if (!Array.isArray(pending) || !pending.length) return;
    const { error } = await supabaseClient.from('handover_records')
      .upsert(pending.map(recordForDatabase), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
    try { localStorage.removeItem(KEYS.created); } catch (error) { /* 기존 로컬 기록은 다음 로그인 때 다시 동기화합니다. */ }
  }
  async function loadServiceData() {
    const recordsResult = await supabaseClient.from('handover_records').select('*');
    if (recordsResult.error) throw recordsResult.error;
    records = sorted((recordsResult.data || []).map(recordFromDatabase));
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function importanceClass(value) { return value === '긴급' ? 'urgent' : value === '중요' ? 'important' : ''; }
  function actionStatusClass(value) { return value === '작업완료' ? 'read' : value === '조치 중' || value === '작업 중' ? 'important' : value === '조치예정' || value === '추후예정' ? 'unread' : ''; }
  function badge(label, className) { return '<span class="badge ' + (className || '') + '">' + escapeHtml(label) + '</span>'; }
  function recordHref(record, from) { return 'detail.html?id=' + encodeURIComponent(record.id) + '&from=' + encodeURIComponent(from || page); }
  function recordRow(record, from) {
    const userRead = isRead(record.id);
    return '<article class="record-row"><div class="record-main"><div class="record-meta"><span>' + escapeHtml(record.position || '보직 미지정') + '</span><span>·</span><span class="date">' + escapeHtml(record.date) + '</span><span>·</span><span>' + escapeHtml(record.team) + '</span><span>·</span><span>' + escapeHtml(record.shiftType) + '</span><span>·</span><span>' + escapeHtml(record.category || '카테고리 미지정') + '</span></div><a class="record-title" href="' + recordHref(record, from) + '">' + escapeHtml(record.equipment) + '</a><p class="record-summary">' + escapeHtml(record.summary) + '</p></div><div class="record-side">' + badge(record.importance, importanceClass(record.importance)) + (record.actionStatus ? badge(record.actionStatus + (record.actionStatus === '추후예정' && record.actionDate ? ' · ' + record.actionDate : ''), actionStatusClass(record.actionStatus)) : '') + badge(userRead ? '읽음' : '미열람', userRead ? 'read' : 'unread') + '</div></article>';
  }
  function navLink(href, label, target) { return '<a href="' + href + '"' + (page === target ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>'; }
  function shell(content) {
    root.innerHTML = '<div class="shell"><header class="topbar"><a class="brand" href="index.html"><span class="brand-mark">SP</span><span class="brand-copy"><strong>남부발전 스마트 인수인계</strong><span>SHIFT HANDOVER · SERVICE</span></span></a><nav class="nav" aria-label="주 메뉴">' + navLink('index.html', '대시보드', 'dashboard') + navLink('list.html', '기록 검색', 'list') + navLink('unread.html', '내 미열람', 'unread') + '</nav></header><main class="main">' + content + '<p class="footer-note">서비스에 저장된 인계 기록 · 실제 사내 시스템과 연결되어 있지 않습니다. 열람 완료는 공식 인수인계 완료를 의미하지 않습니다.</p></main></div>';
  }
  function counts() {
    return { all: records.length, urgent: records.filter(item => item.importance === '긴급').length, important: records.filter(item => item.importance === '중요').length, unread: records.filter(item => !isRead(item.id)).length, read: records.filter(item => isRead(item.id)).length };
  }
  function statCard(label, value, icon, href, hint) {
    const body = '<span class="stat-top">' + label + '<span class="stat-icon">' + icon + '</span></span><strong>' + value + '<small>' + hint + '</small></strong>';
    return href ? '<a class="stat" href="' + href + '">' + body + '</a>' : '<div class="stat">' + body + '</div>';
  }
  function dashboard() {
    const c = counts();
    const lastSync = storageGet(KEYS.lastSync, null);
    const syncText = lastSync ? formatTime(lastSync) : '아직 갱신하지 않았습니다';
    const recent = records.slice(0, 5);
    const positionCards = positions.map(position => '<a class="team-link" href="list.html?position=' + encodeURIComponent(position) + '"><strong>' + escapeHtml(position) + '</strong><span>' + records.filter(record => record.position === position).length + '개 기록 보기 →</span></a>').join('');
    return '<div class="page-heading"><div class="heading-actions"><div class="updated">마지막 갱신<strong id="last-updated">' + escapeHtml(syncText) + '</strong></div><button class="button" id="refresh-button" type="button"><span class="icon">↻</span>새로고침</button><a class="button primary compose-cta" href="list.html?compose=1">＋ 인계 기록 작성</a></div></div><div class="dashboard-banner"><a href="list.html?compose=1" aria-label="인계일지 작성"><img src="assets/banner.png" alt="교대근무 인계일지"></a></div><div class="notice"><span class="notice-mark">i</span><div><strong>실습용 화면입니다.</strong> 인계 기록은 로그인한 사용자와 공유되며, 실제 사내 시스템과는 연결되어 있지 않습니다.</div></div><section class="stats" aria-label="기록 요약">' + statCard('전체 기록', c.all, '▤', 'list.html', '건') + statCard('긴급 기록', c.urgent, '!', 'list.html?importance=' + encodeURIComponent('긴급'), '건') + statCard('중요 기록', c.important, '◆', 'list.html?importance=' + encodeURIComponent('중요'), '건') + statCard('내 미열람', c.unread, '◷', 'unread.html', '건') + '</section><section class="panel"><div class="panel-head"><div><h2>보직별 인계 기록</h2><p>보직을 선택해 해당 보직의 인계 기록을 확인합니다.</p></div></div><div class="team-grid">' + positionCards + '</div></section><div class="dashboard-grid"><div class="panel"><div class="panel-head"><div><h2>최근 인수인계 기록</h2><p>근무 날짜 기준 최신순입니다.</p></div><a class="text-link" href="list.html">전체 기록 보기 ↗</a></div><div class="record-list">' + (recent.length ? recent.map(item => recordRow(item, 'dashboard')).join('') : empty('표시할 기록이 없습니다.', '기록을 새로고침해 주세요.')) + '</div><div class="panel-head"><div><h2>근무조별 기록</h2><p>근무조를 선택해 해당 기록을 조회합니다.</p></div></div><div class="team-grid">' + ['A','B','C','D','E'].map(team => '<a class="team-link" href="list.html?team=' + team + '%EC%A1%B0"><strong>' + team + '조</strong><span>' + records.filter(item => item.team === team + '조').length + '개 기록 보기 →</span></a>').join('') + '</div></div><aside class="side-stack"><section class="panel"><div class="panel-head"><div><h2>빠른 이동</h2><p>필요한 기록을 바로 찾아보세요.</p></div></div><div class="quick-links"><a class="quick-link" href="list.html"><span>기록 검색 및 필터</span><span>→</span></a><a class="quick-link" href="list.html?importance=%EA%B8%B4%EA%B8%89"><span>긴급 기록 모아보기</span><span>→</span></a><a class="quick-link" href="list.html?importance=%EC%A4%91%EC%9A%94"><span>중요 기록 모아보기</span><span>→</span></a><a class="quick-link" href="unread.html"><span>내 미열람 기록</span><span>→</span></a></div></section><section class="panel"><div class="panel-head"><div><h2>데이터 갱신</h2><p>저장된 인계 기록을 다시 불러옵니다.</p></div></div><div class="sync-body"><div class="sync-status"><span class="sync-dot"></span><span id="sync-message">자동 갱신 · 60초 간격</span></div><p>다른 사용자가 추가한 기록도 갱신 후 반영됩니다. 자동 갱신은 이 대시보드를 열어 둔 동안 동작합니다.</p></div></section></aside></div>';
  }
  function readListState() {
    const saved = storageGet(KEYS.listState, {});
    const query = new URLSearchParams(location.search);
    return { keyword: query.get('keyword') ?? saved.keyword ?? '', start: query.get('start') ?? saved.start ?? '', end: query.get('end') ?? saved.end ?? '', equipment: query.get('equipment') ?? saved.equipment ?? '', team: query.get('team') ?? saved.team ?? '', importance: query.get('importance') ?? saved.importance ?? '', category: query.get('category') ?? saved.category ?? '', position: query.get('position') ?? saved.position ?? '' };
  }
  function listResults(state) {
    const keyword = state.keyword.trim().toLocaleLowerCase();
    return records.filter(record => {
      const textMatches = !keyword || [record.equipment, record.summary, record.notes, record.actions, record.weeklyInspection].some(value => String(value || '').toLocaleLowerCase().includes(keyword));
      return textMatches && (!state.start || record.date >= state.start) && (!state.end || record.date <= state.end) && (!state.equipment || record.equipment === state.equipment) && (!state.position || record.position === state.position) && (!state.team || record.team === state.team) && (!state.importance || record.importance === state.importance) && (!state.category || record.category === state.category);
    });
  }
  function listPage() {
    const state = readListState();
    const results = listResults(state);
    const equipmentOptions = Array.from(new Set(records.map(item => item.equipment))).sort();
    const compose = new URLSearchParams(location.search).get('compose') === '1';
    if (compose) {
      return '<div class="page-heading"><div><p class="eyebrow">HANDOVER ARCHIVE</p><h1>인계일지 작성</h1><p class="subtitle">근무 인수인계 내용을 작성합니다.</p></div><a class="button" href="list.html">기록 검색</a></div>' + composeForm();
    }
    return '<div class="page-heading"><div><p class="eyebrow">HANDOVER ARCHIVE</p><h1>기록 검색</h1><p class="subtitle">키워드와 조건을 조합해 과거 인수인계 기록을 찾습니다.</p></div><a class="button primary compose-cta" href="list.html?compose=1">＋ 인계 기록 작성</a></div>' + (compose ? composeForm() : '') + '<form class="panel filter-panel" id="search-form"><div class="filter-grid"><div class="field"><label for="position">보직</label><select id="position" name="position"><option value="">전체 보직</option>' + positions.map(item => '<option value="' + escapeHtml(item) + '"' + (state.position === item ? ' selected' : '') + '>' + escapeHtml(item) + '</option>').join('') + '</select></div><div class="field"><label for="keyword">키워드</label><input id="keyword" name="keyword" type="search" placeholder="설비명, 주간점검, 전달사항, 특이사항, 조치사항" value="' + escapeHtml(state.keyword) + '"></div><div class="field"><label for="start">시작일</label><input id="start" name="start" type="date" value="' + escapeHtml(state.start) + '"></div><div class="field"><label for="end">종료일</label><input id="end" name="end" type="date" value="' + escapeHtml(state.end) + '"></div><div class="field"><label for="equipment">설비명</label><select id="equipment" name="equipment"><option value="">전체 설비</option>' + equipmentOptions.map(item => '<option value="' + escapeHtml(item) + '"' + (state.equipment === item ? ' selected' : '') + '>' + escapeHtml(item) + '</option>').join('') + '</select></div><div class="field"><label for="team">근무조</label><select id="team" name="team"><option value="">전체 근무조</option>' + ['A','B','C','D','E'].map(t => '<option value="' + t + '조"' + (state.team === t + '조' ? ' selected' : '') + '>' + t + '조</option>').join('') + '</select></div><div class="field"><label for="importance">중요도</label><select id="importance" name="importance"><option value="">전체 중요도</option>' + ['긴급','중요','일반'].map(item => '<option value="' + item + '"' + (state.importance === item ? ' selected' : '') + '>' + item + '</option>').join('') + '</select></div><div class="field"><label for="category">카테고리</label><select id="category" name="category"><option value="">전체 카테고리</option>' + categories.map(item => '<option value="' + item + '"' + (state.category === item ? ' selected' : '') + '>' + item + '</option>').join('') + '</select></div></div><div class="filter-actions"><button class="button" id="reset-search" type="button">초기화</button><button class="button primary" type="submit"><span class="icon">⌕</span>검색</button></div><p id="date-error" role="alert" style="display:none;margin:12px 0 0;color:#b64343;font-size:12px"></p></form><section class="panel"><div class="results-head"><h2>검색 결과</h2><span>' + results.length + '건</span></div><div class="record-list">' + (results.length ? results.map(item => recordRow(item, 'list')).join('') : empty('조건에 맞는 기록이 없습니다.', '검색 조건을 바꾸거나 초기화해 주세요.')) + '</div></section>';
  }
  function localDate() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }
  function composeForm() {
    return '<section class="panel compose-panel"><div class="panel-head"><div><h2>보직별 인계 기록 작성</h2><p>작성한 내용은 서비스에 저장되어 로그인한 사용자와 공유됩니다.</p></div><a class="text-link" href="list.html">닫기 ×</a></div><form id="compose-form" class="compose-form"><div class="filter-grid"><div class="field"><label for="record-position">보직</label><select id="record-position" name="position" required><option value="">보직 선택</option>' + positions.map(item => '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>').join('') + '</select></div><div class="field"><label for="record-date">근무 날짜</label><input id="record-date" name="date" type="date" value="' + localDate() + '" required></div><div class="field"><label for="record-team">근무조</label><select id="record-team" name="team" required>' + ['A','B','C','D','E'].map(team => '<option value="' + team + '조"' + (currentUser().team === team + '조' ? ' selected' : '') + '>' + team + '조</option>').join('') + '</select></div><div class="field"><label for="record-shift">근무 형태</label><select id="record-shift" name="shiftType" required><option>주간</option><option>야간</option></select></div><div class="field"><label for="record-author">작성자</label><input id="record-author" name="author" value="" placeholder="이름을 입력하세요" maxlength="80" required></div><div class="field full"><label for="record-no-issue">설비 상태</label><label><input id="record-no-issue" name="noIssue" type="checkbox" value="yes" style="width:16px;height:16px;padding:0;vertical-align:middle"> 이상없음</label></div><div class="field" id="record-category-field"><label for="record-category">카테고리</label><select id="record-category" name="category" required><option value="">카테고리 선택</option>' + categories.map(item => '<option value="' + item + '">' + item + '</option>').join('') + '</select></div><div class="field" id="record-equipment-field"><label for="record-equipment">설비명</label><input id="record-equipment" name="equipment" maxlength="80" placeholder="예: 보일러 급수펌프 A" required></div><div class="field"><label for="record-importance">중요도</label><select id="record-importance" name="importance" required><option>일반</option><option>중요</option><option>긴급</option></select></div><div class="field full"><label for="record-summary">주요 전달사항</label><textarea id="record-summary" name="summary" rows="2" maxlength="500" required placeholder="다음 근무조에 전달할 핵심 내용을 입력하세요."></textarea></div><div class="field full" id="weekly-inspection-status-field"><label for="record-weekly-not-done">주간점검</label><label><input id="record-weekly-not-done" name="weeklyInspectionNotDone" type="checkbox" value="yes" style="width:16px;height:16px;padding:0;vertical-align:middle"> 미시행</label></div><div class="field full" id="weekly-inspection-field"><label for="record-weekly-inspection">주간점검 사항</label><textarea id="record-weekly-inspection" name="weeklyInspection" rows="2" maxlength="500" required placeholder="어떤 항목을 주간점검했는지 입력하세요."></textarea></div><div class="field full"><label for="record-notes">특이사항</label><textarea id="record-notes" name="notes" rows="3" maxlength="1000" placeholder="확인한 특이사항을 입력하세요."></textarea></div><div class="field full"><label for="record-action-status">조치 상태</label><select id="record-action-status" name="actionStatus" required><option value="">조치 상태 선택</option><option>작업완료</option><option>작업 중</option><option>조치 중</option><option>조치예정</option><option>추후예정</option></select></div><div class="field" id="action-date-field" hidden><label for="record-action-date-mode">추후 조치 예정일</label><select id="record-action-date-mode" name="actionDateMode"><option value="date">날짜 선택</option><option value="undecided">미정</option></select><input id="record-action-date" name="actionDate" type="date" aria-label="추후 조치 날짜"></div><div class="field full"><label for="record-actions">조치사항 내용</label><textarea id="record-actions" name="actions" rows="3" maxlength="1000" placeholder="진행한 조치 또는 후속 확인 사항을 입력하세요."></textarea></div></div><div class="compose-footer"><span>실제 시스템에 전송되지 않으며 열람 완료는 공식 인수인계를 의미하지 않습니다.</span><button class="button primary" type="submit">기록 저장</button></div></form></section>';
  }
  function empty(title, description) { return '<div class="empty"><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(description) + '</p></div>'; }
  function detailPage() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const record = records.find(item => item.id === id);
    const from = ['dashboard','list','unread'].includes(params.get('from')) ? params.get('from') : 'dashboard';
    const backUrl = from === 'list' ? 'list.html' : from === 'unread' ? 'unread.html' : 'index.html';
    if (!record) return '<section class="error-card"><div class="empty-symbol">?</div><p class="eyebrow">RECORD NOT FOUND</p><h1>기록을 찾을 수 없습니다</h1><p>요청한 ID에 해당하는 기록이 없습니다.<br>목록으로 돌아가 다른 기록을 선택해 주세요.</p><a class="button primary" href="' + backUrl + '">목록으로 돌아가기</a></section>';
    const userRead = isRead(record.id);
    const actionDetails = record.actionStatus === '추후예정' && record.actionDate ? record.actionStatus + ' (' + record.actionDate + ')' : (record.actionStatus || '미지정');
    const fields = [['보직',record.position || '미지정'],['근무 형태',record.shiftType],['작성자',record.author],['설비명',record.equipment],['카테고리',record.category || '미지정'],['중요도',record.importance],['주요 전달사항',record.summary],['특이사항',record.notes],['주간점검',record.weeklyInspectionNotDone ? '미시행' : (record.weeklyInspection || '미기록')],['조치 상태',actionDetails],['조치사항',record.actions]];
    return '<div class="page-heading"><div><p class="eyebrow">HANDOVER RECORD</p><h1>인수인계 기록 상세</h1><p class="subtitle">기록의 세부 내용을 확인하고 개인 열람 상태를 관리합니다.</p></div></div><section class="panel detail-panel"><div class="detail-hero"><p class="eyebrow">' + escapeHtml(record.team) + ' · ' + escapeHtml(record.shiftType) + '근무</p><h1>' + escapeHtml(record.equipment) + '</h1><div class="record-meta"><span class="date">' + escapeHtml(record.date) + '</span><span>·</span><span>작성 ' + escapeHtml(record.author) + '</span><span>·</span>' + badge(record.importance, importanceClass(record.importance)) + '</div></div><div class="detail-content"><div class="detail-fields"><div class="detail-field"><span class="detail-label">근무 날짜</span><p class="detail-value">' + escapeHtml(record.date) + '</p></div><div class="detail-field"><span class="detail-label">근무조</span><p class="detail-value">' + escapeHtml(record.team) + '</p></div>' + fields.map((field,index) => '<div class="detail-field' + (index > 3 ? ' full' : '') + '"><span class="detail-label">' + escapeHtml(field[0]) + '</span><p class="detail-value">' + escapeHtml(field[1]) + '</p></div>').join('') + '</div><div class="detail-footer"><div class="read-state"><span class="badge ' + (userRead ? 'read' : 'unread') + '">' + (userRead ? '읽음' : '미열람') + '</span><span>열람 상태</span></div><div class="detail-actions">' + (!userRead ? '<button class="button primary" id="mark-read" type="button">열람 완료</button>' : '<button class="button" type="button" disabled>열람 완료됨</button>') + '<a class="button" href="' + backUrl + '" id="back-to-list">목록으로</a></div></div></div></section>';
  }
  function unreadPage() {
    const params = new URLSearchParams(location.search);
    const filter = ['read','unread'].includes(params.get('filter')) ? params.get('filter') : 'unread';
    const c = counts();
    const filtered = records.filter(record => filter === 'read' ? isRead(record.id) : !isRead(record.id));
    return '<div class="page-heading"><div><p class="eyebrow">PERSONAL READING STATUS</p><h1>내 미열람 기록</h1><p class="subtitle">읽음 처리한 기록과 아직 확인하지 않은 기록을 모아봅니다.</p></div></div><div class="user-summary"><div><strong>열람 현황</strong><span>열람 상태는 로그인 계정별로 저장됩니다.</span></div><div class="user-counts"><div class="user-count"><strong>' + c.unread + '</strong><span>미열람</span></div><div class="user-count"><strong>' + c.read + '</strong><span>읽음</span></div></div></div><section class="panel"><div class="tabs"><a href="unread.html?filter=unread"' + (filter === 'unread' ? ' class="active" aria-current="page"' : '') + '>안 읽음 ' + c.unread + '</a><a href="unread.html?filter=read"' + (filter === 'read' ? ' class="active" aria-current="page"' : '') + '>읽음 ' + c.read + '</a></div><div class="record-list">' + (filtered.length ? filtered.map(item => recordRow(item, 'unread')).join('') : empty(filter === 'read' ? '읽음 처리한 기록이 없습니다.' : '모든 기록을 확인했습니다.', filter === 'read' ? '상세 화면에서 열람 완료를 누르면 여기에 표시됩니다.' : '새 기록이 갱신되면 이 목록에서 확인할 수 있습니다.')) + '</div></section>';
  }
  function formatTime(value) {
    try { return new Intl.DateTimeFormat('ko-KR', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); }
    catch (error) { return '시간 정보 없음'; }
  }
  function showToast(message) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role','status'); toast.textContent = message; document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }
  function renderPage() {
    if (page === 'dashboard') shell(dashboard());
    if (page === 'list') shell(listPage());
    if (page === 'detail') shell(detailPage());
    if (page === 'unread') shell(unreadPage());
    bindPageEvents();
  }
  function bindPageEvents() {
    const refresh = document.getElementById('refresh-button');
    if (refresh) refresh.addEventListener('click', () => refreshData('manual'));
    const form = document.getElementById('search-form');
    if (form) {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(form);
        const state = Object.fromEntries(data.entries());
        const error = document.getElementById('date-error');
        if (state.start && state.end && state.start > state.end) { error.textContent = '시작일은 종료일보다 늦을 수 없습니다. 날짜 범위를 다시 확인해 주세요.'; error.style.display = 'block'; return; }
        storageSet(KEYS.listState, state);
        const query = new URLSearchParams(Object.entries(state).filter(([,value]) => value));
        history.replaceState(null, '', 'list.html' + (query.size ? '?' + query.toString() : ''));
        renderPage();
      });
      document.getElementById('reset-search').addEventListener('click', () => {
        form.reset(); storageSet(KEYS.listState, {}); history.replaceState(null, '', 'list.html'); renderPage();
      });
    }
    const composeFormElement = document.getElementById('compose-form');
    if (composeFormElement) {
      const noIssueInput = document.getElementById('record-no-issue');
      const categoryInput = document.getElementById('record-category');
      const equipmentInput = document.getElementById('record-equipment');
      const categoryField = document.getElementById('record-category-field');
      const equipmentField = document.getElementById('record-equipment-field');
      const weeklyNotDoneInput = document.getElementById('record-weekly-not-done');
      const weeklyInspectionField = document.getElementById('weekly-inspection-field');
      const weeklyInspectionInput = document.getElementById('record-weekly-inspection');
      const updateNoIssueFields = () => {
        const noIssue = noIssueInput.checked;
        const summaryInput = document.getElementById('record-summary');
        const actionStatusInput = document.getElementById('record-action-status');
        const actionDateField = document.getElementById('action-date-field');
        const actionDateInput = document.getElementById('record-action-date');
        const actionDateModeInput = document.getElementById('record-action-date-mode');
        const needsActionDate = actionStatusInput.value === '추후예정';
        categoryField.hidden = noIssue;
        equipmentField.hidden = noIssue;
        categoryInput.disabled = noIssue;
        equipmentInput.disabled = noIssue;
        categoryInput.required = !noIssue;
        equipmentInput.required = !noIssue;
        summaryInput.required = !noIssue;
        actionStatusInput.required = !noIssue;
        actionDateField.hidden = noIssue || !needsActionDate;
        actionDateInput.required = !noIssue && needsActionDate && actionDateModeInput.value === 'date';


        weeklyInspectionField.hidden = weeklyNotDoneInput.checked;
        weeklyInspectionInput.disabled = weeklyNotDoneInput.checked;
        weeklyInspectionInput.required = !weeklyNotDoneInput.checked;
      };
      noIssueInput.addEventListener('change', updateNoIssueFields);
      weeklyNotDoneInput.addEventListener('change', updateNoIssueFields);
      updateNoIssueFields();
      const actionStatusSelect = document.getElementById('record-action-status');
      const actionDateField = document.getElementById('action-date-field');
      const actionDateInput = document.getElementById('record-action-date');
      const actionDateModeSelect = document.getElementById('record-action-date-mode');
      actionStatusSelect.addEventListener('change', () => {
        const needsDate = actionStatusSelect.value === '추후예정';
        actionDateField.hidden = noIssueInput.checked || !needsDate;
        if (!needsDate) {
          actionDateModeSelect.value = 'date';
          actionDateInput.value = '';
        }
        const hasDate = actionDateModeSelect.value === 'date';
        actionDateInput.hidden = !hasDate;
        actionDateInput.required = !noIssueInput.checked && needsDate && hasDate;
      });
      actionDateModeSelect.addEventListener('change', () => {
        const hasDate = actionDateModeSelect.value === 'date';
        actionDateInput.hidden = !hasDate;
        actionDateInput.required = !noIssueInput.checked && actionStatusSelect.value === '추후예정' && hasDate;
        if (!hasDate) actionDateInput.value = '';
      });
      composeFormElement.addEventListener('submit', async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(composeFormElement).entries());
        const order = records.reduce((highest, record) => Math.max(highest, Number(record.order) || 0), 0) + 1;
        const newRecord = {
          id: 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
          date: values.date, team: values.team, position: values.position, shiftType: values.shiftType, author: values.author.trim(), createdAt: new Date().toISOString(),
          equipment: values.noIssue ? '이상없음' : values.equipment.trim(), category: values.noIssue ? '이상없음' : values.category, noIssue: Boolean(values.noIssue), summary: values.summary.trim(), weeklyInspection: values.weeklyInspection || '', weeklyInspectionNotDone: Boolean(values.weeklyInspectionNotDone), notes: (values.notes || '').trim(),
          actions: (values.actions || '').trim(), actionStatus: values.actionStatus, actionDate: values.actionDateMode === 'undecided' ? '미정' : (values.actionDate || ''), importance: values.importance, order
        };
        if (!newRecord.author || !newRecord.position || (!newRecord.noIssue && (!newRecord.equipment || !newRecord.category || !newRecord.summary || !newRecord.actionStatus)) || (!newRecord.weeklyInspectionNotDone && !newRecord.weeklyInspection)) return;
        const submitButton = composeFormElement.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
          const { error } = await supabaseClient.from('handover_records').insert(recordForDatabase(newRecord));
          if (error) throw error;
          storageSet(KEYS.listState, {});
          await loadServiceData();
          history.replaceState(null, '', 'list.html');
          renderPage();
          showToast('인계 기록을 저장했습니다.');
        } catch (error) {
          submitButton.disabled = false;
          showToast('인계 기록을 저장하지 못했습니다. 연결 상태와 데이터베이스 설정을 확인해 주세요.');
          console.error('인계 기록 저장 실패:', error);
        }
      });
    }
    const markRead = document.getElementById('mark-read');
    if (markRead) markRead.addEventListener('click', () => {
      const id = new URLSearchParams(location.search).get('id');
      const states = readStates(); const userId = currentUserId();
      if (!states[userId]) states[userId] = {};
      states[userId][id] = true;
      storageSet(KEYS.reads, states);
      renderPage();
      showToast('이 기록을 읽음으로 표시했습니다.');
    });
  }
  function refreshData(source) {
    const button = document.getElementById('refresh-button');
    const message = document.getElementById('sync-message');
    if (button) { button.disabled = true; button.innerHTML = '<span class="icon">↻</span>갱신 중'; }
    if (message) message.textContent = source === 'manual' ? '데이터 갱신 중…' : '자동 갱신 중…';
    window.setTimeout(async () => {
      try {
        await loadServiceData();
        storageSet(KEYS.lastSync, new Date().toISOString());
        renderPage();
        showToast('인계 기록 ' + records.length + '건을 불러왔습니다.');
      } catch (error) {
        if (message) message.textContent = '갱신에 실패했습니다. 기존 데이터를 표시합니다.';
        if (button) { button.disabled = false; button.innerHTML = '<span class="icon">↻</span>새로고침'; }
        console.error('인계 기록 갱신 실패:', error);
      }
    }, 350);
  }

  async function initializePage() {
    try {
      await migrateLocalRecords();
      await loadServiceData();
      renderPage();
    } catch (error) {
      console.error('Supabase 데이터 로드 실패:', error);
      root.innerHTML = '<main class="main"><section class="error-card"><div class="empty-symbol">!</div><h1>인계 기록을 불러오지 못했습니다</h1><p>Supabase 데이터베이스 설정을 확인한 뒤 새로고침해 주세요. 필요한 테이블은 프로젝트의 <strong>supabase/schema.sql</strong>에 있습니다.</p></section></main>';
    }
  }

  initializePage();
  if (page === 'dashboard') window.setInterval(() => refreshData('auto'), REFRESH_INTERVAL_MS);
})();

