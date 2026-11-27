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

create table if not exists public.record_read_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null references public.handover_records(id) on delete cascade,
  primary key (user_id, record_id)
);

alter table public.handover_records enable row level security;
alter table public.record_read_states enable row level security;

drop policy if exists "Signed-in users can read handover records" on public.handover_records;
create policy "Signed-in users can read handover records"
  on public.handover_records for select to authenticated
  using (true);

drop policy if exists "Signed-in users can add handover records" on public.handover_records;
create policy "Signed-in users can add handover records"
  on public.handover_records for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Users can read their own read states" on public.record_read_states;
create policy "Users can read their own read states"
  on public.record_read_states for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can add their own read states" on public.record_read_states;
create policy "Users can add their own read states"
  on public.record_read_states for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.handover_records to authenticated;
grant select, insert on public.record_read_states to authenticated;
