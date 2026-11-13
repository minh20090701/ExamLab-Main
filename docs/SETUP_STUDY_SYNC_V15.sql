-- Optional recovery script for the study timer's existing cloud-sync contract.
-- Only creates a missing table. Leaves an existing table and its policies intact.
begin;
do $$ begin
  if to_regclass('public.examlab_study_sessions') is null then
    create table public.examlab_study_sessions (
      user_id uuid not null references auth.users(id) on delete cascade,
      id text not null check(length(id) between 1 and 120),
      study_at timestamptz not null,
      started_at timestamptz,
      duration_ms bigint not null check(duration_ms between 1000 and 86400000),
      mode text not null check(mode in ('focus','stopwatch')),
      subject text not null default '' check(length(subject)<=75),
      complete boolean not null default false,
      primary key(user_id,id)
    );
    create index examlab_study_owner_date_idx on public.examlab_study_sessions(user_id,study_at desc);
    alter table public.examlab_study_sessions enable row level security;
    revoke all on public.examlab_study_sessions from public,anon;
    grant select,insert,update,delete on public.examlab_study_sessions to authenticated;
    create policy examlab_study_owner on public.examlab_study_sessions for all to authenticated
      using(user_id=auth.uid()) with check(user_id=auth.uid());
  end if;
end $$;
notify pgrst,'reload schema';
commit;
