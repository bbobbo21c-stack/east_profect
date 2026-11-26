/* 실제 발전소 기록이나 내부 시스템 데이터가 아닌 화면 시연용 가상 데이터입니다. */
window.MockData = {
  users: [
    { id: 'user-min', name: '김민준', team: 'A조' },
    { id: 'user-seo', name: '박서연', team: 'B조' },
    { id: 'user-choi', name: '이도윤', team: 'C조' },
    { id: 'user-choi', name: '최상규', team: 'D조' },
    { id: 'user-choi', name: '문성현', team: 'E조' }
  ],
  records: [
    { id: 'handover-20261125-e-01', date: '2026-11-25', team: 'E조', shiftType: '야간', author: '운전원 가', equipment: '보일러 급수펌프 B', category: '급수계통', summary: '급수펌프 B 진동값 추이를 다음 근무조에서 이어서 확인해 주세요.', notes: '운전 중 진동값이 평소보다 높게 관찰되어 교대 시점까지 추이를 기록했습니다.', actions: '현장 점검 결과를 운전일지에 남기고 담당자에게 전달 예정입니다.', importance: '긴급', order: 1 },
    { id: 'handover-20261125-d-02', date: '2026-11-25', team: 'D조', shiftType: '주간', author: '운전원 나', equipment: '터빈 윤활유 계통', category: '터빈계통', summary: '윤활유 필터 차압을 정기 점검 시 함께 확인 바랍니다.', notes: '차압은 관리 범위 안에서 안정적으로 유지되고 있습니다.', actions: '다음 정기 순찰 때 계기값을 확인합니다.', importance: '중요', order: 2 },
    { id: 'handover-20261124-c-01', date: '2026-11-24', team: 'C조', shiftType: '야간', author: '운전원 다', equipment: '복수기 냉각수', category: '복수계통', summary: '냉각수 입구 온도 변화를 확인했습니다.', notes: '외기 온도 하락과 함께 입구 온도가 완만하게 낮아졌습니다.', actions: '특이 변화가 있으면 교대 기록에 추가합니다.', importance: '일반', order: 3 },
    { id: 'handover-20261124-b-01', date: '2026-11-24', team: 'B조', shiftType: '주간', author: '운전원 라', equipment: '전기실 배전반 2번', category: '환경설비계통', summary: '배전반 주변 정리 상태를 확인하고 케이블 표지를 보완했습니다.', notes: '표지 일부가 흐려져 식별이 어려운 상태였습니다.', actions: '표지 보완 완료. 다음 순찰 때 상태를 확인합니다.', importance: '중요', order: 4 },
    { id: 'handover-20261123-a-01', date: '2026-11-23', team: 'A조', shiftType: '야간', author: '운전원 마', equipment: '보조증기 압력계', category: '터빈계통', summary: '압력계 지시값이 안정적으로 유지되고 있습니다.', notes: '교대 전후 지시값에 눈에 띄는 변화가 없었습니다.', actions: '일상 점검을 계속합니다.', importance: '일반', order: 5 },
    { id: 'handover-20261123-e-02', date: '2026-11-23', team: 'E조', shiftType: '주간', author: '운전원 바', equipment: '연료 이송 펌프 A', category: '환경설비계통', summary: '펌프 A 운전 전환 후 압력 변화를 관찰해 주세요.', notes: '전환 직후 압력이 일시적으로 낮아졌다가 안정됐습니다.', actions: '다음 운전 전환 시 압력 변화를 기록합니다.', importance: '긴급', order: 6 },
    { id: 'handover-20261122-d-01', date: '2026-11-22', team: 'D조', shiftType: '야간', author: '운전원 사', equipment: '탈기기 수위계', category: '급수계통', summary: '수위 지시값과 현장 표시를 비교 확인했습니다.', notes: '두 표시값은 유사한 범위였습니다.', actions: '정기 비교 점검을 유지합니다.', importance: '일반', order: 7 },
    { id: 'handover-20261122-c-02', date: '2026-11-22', team: 'C조', shiftType: '주간', author: '운전원 아', equipment: '터빈 배수 밸브', category: '복수계통', summary: '배수 밸브 주변 누수 흔적이 없는지 재확인 바랍니다.', notes: '점검 시점에 새 누수 흔적은 확인되지 않았습니다.', actions: '다음 순찰에서 주변 상태를 확인합니다.', importance: '중요', order: 8 },
    { id: 'handover-20261121-b-02', date: '2026-11-21', team: 'B조', shiftType: '야간', author: '운전원 자', equipment: '압축공기 헤더', category: '환경설비계통', summary: '헤더 압력은 정상 운전 범위에서 유지 중입니다.', notes: '순찰 중 특이 사항은 없었습니다.', actions: '일상 순찰을 계속합니다.', importance: '일반', order: 9 },
    { id: 'handover-20261121-a-02', date: '2026-11-21', team: 'A조', shiftType: '주간', author: '운전원 차', equipment: '보일러 통풍 계통', category: '환경설비계통', summary: '차압계 주변 상태와 계기 판독을 확인 바랍니다.', notes: '계기 외관은 양호했고 지시값 변화는 작았습니다.', actions: '다음 정기 점검 시 지시값을 기록합니다.', importance: '긴급', order: 10 },
    { id: 'handover-20261120-e-01', date: '2026-11-20', team: 'E조', shiftType: '야간', author: '운전원 카', equipment: '순수 저장 탱크', category: '환경설비계통', summary: '저장 탱크 수위 기록을 정기적으로 확인해 주세요.', notes: '수위는 운전 범위 내에서 유지되고 있습니다.', actions: '교대 점검표에 수위를 기록합니다.', importance: '일반', order: 11 },
    { id: 'handover-20261120-a-01', date: '2026-11-20', team: 'A조', shiftType: '주간', author: '운전원 타', equipment: '환경 설비 계기반', category: '환경설비계통', summary: '계기반 표시등 상태를 점검했습니다.', notes: '표시등 상태는 양호했습니다.', actions: '정기 점검을 이어갑니다.', importance: '일반', order: 12 }
  ],
  laterRecords: [
    { id: 'handover-20261126-a-01', date: '2026-11-26', team: 'A조', shiftType: '주간', author: '운전원 파', equipment: '급수 제어 밸브', category: '급수계통', summary: '제어 밸브 응답 추이를 다음 근무조에서 확인해 주세요.', notes: '가상 데이터 갱신 시연을 위해 추가되는 기록입니다.', actions: '운전 상태를 관찰하고 변화가 있으면 기록합니다.', importance: '중요', order: 13 },
    { id: 'handover-20261126-b-01', date: '2026-11-26', team: 'B조', shiftType: '야간', author: '운전원 하', equipment: '냉각수 펌프 C', category: '복수계통', summary: '펌프 주변 계기 표시를 정기 점검 시 확인 바랍니다.', notes: '가상 데이터 갱신 시연용 기록입니다.', actions: '다음 순찰 때 계기 표시를 확인합니다.', importance: '일반', order: 14 }
  ]
};
