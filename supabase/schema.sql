-- 인계 기록과 로그인 사용자별 열람 상태
create table if not exists public.handover_records (
  id text primary key,
  date date not null,
  team text not null,
  position text,
  shift_type text not null,
  author text not null,
  equipment text,
  category text,
  summary text,
  no_issue boolean not null default false,
  weekly_inspection text,
  weekly_inspection_not_done boolean not null default false,
  notes text,
  actions text,
  action_status text,
  action_date text,
  importance text not null,
  created_at timestamptz default now(),
  sort_order integer not null default 0
);

-- 이번 단계에서는 사용자별 정책을 적용하지 않습니다.
alter table public.handover_records disable row level security;
drop policy if exists "Signed-in users can read handover records" on public.handover_records;
drop policy if exists "Signed-in users can add handover records" on public.handover_records;

revoke all on public.handover_records from public, anon;
grant select, insert on public.handover_records to authenticated;
