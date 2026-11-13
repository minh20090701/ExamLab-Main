-- ExamLab V30: learning streaks. Run in the existing ExamLab Supabase project.
-- No email, notifications or chat messages are sent by this migration.
begin;
create table if not exists public.examlab_streak_credits (
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('study','attempt')),
  source_id text not null,
  study_day date not null,
  seconds integer not null check (seconds between 1 and 600),
  created_at timestamptz not null default now(),
  primary key(user_id,source,source_id)
);
create index if not exists examlab_streak_days_idx on public.examlab_streak_credits(user_id,study_day);
create table if not exists public.examlab_streak_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_with_friends boolean not null default false,
  enabled_since timestamptz not null default now()
);
alter table public.examlab_streak_credits enable row level security;
alter table public.examlab_streak_preferences enable row level security;
revoke all on public.examlab_streak_credits,public.examlab_streak_preferences from public,anon,authenticated;

-- Called only by database triggers / the installation backfill, never by a client.
create or replace function public.examlab_v30_ingest(p_source text,p_row jsonb,p_backfill boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid; sid text; stamp timestamptz; day date; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  secs integer; duration numeric; payload jsonb; qcount integer; unanswered integer;
begin
  begin
    if p_source='study' then
      u := (p_row->>'user_id')::uuid; sid := p_row->>'id'; stamp := (p_row->>'study_at')::timestamptz;
      if coalesce(p_row->>'mode','') not in ('focus','stopwatch') then return; end if;
      duration := (p_row->>'duration_ms')::numeric;
      if duration is null or duration < 1000 or duration > 86400000 then return; end if;
      secs := least(600,floor(duration/1000)::integer);
    elsif p_source='attempt' then
      u := (p_row->>'owner_id')::uuid; sid := p_row->>'id'; stamp := (p_row->>'completed_at')::timestamptz;
      payload := p_row->'payload';
      if jsonb_typeof(payload->'questionIds') is distinct from 'array' then return; end if;
      qcount := jsonb_array_length(payload->'questionIds');
      if coalesce(payload->>'unanswered','') !~ '^[0-9]+$' then return; end if;
      unanswered := (payload->>'unanswered')::integer;
      duration := (payload->>'timeUsedSec')::numeric;
      if unanswered > qcount or qcount-unanswered < 5 or duration is null or duration < 60 or duration > 86400 then return; end if;
      secs := 600;
    else return;
    end if;
    day := (stamp at time zone 'Asia/Ho_Chi_Minh')::date;
  exception when data_exception then return;
  end;
  if u is null or sid is null or length(sid) not between 1 and 160 or stamp is null or not isfinite(stamp) then return; end if;
  if stamp > now()+interval '5 minutes' or day > today then return; end if;
  if p_backfill then
    if day < today-364 then return; end if;
  else
    if day <> today then return; end if;
    if auth.uid() is not null and auth.uid() <> u then return; end if;
  end if;
  insert into public.examlab_streak_credits(user_id,source,source_id,study_day,seconds)
  values(u,p_source,sid,day,secs)
  on conflict(user_id,source,source_id) do update
    set seconds=greatest(examlab_streak_credits.seconds,excluded.seconds)
    where examlab_streak_credits.study_day=excluded.study_day;
end $$;

create or replace function public.examlab_v30_record_study()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.examlab_v30_ingest(case when tg_table_name='examlab_study_sessions' then 'study' else 'attempt' end,to_jsonb(new),false);
  return new;
end $$;

create or replace function public.examlab_v30_days(p_user uuid)
returns date[] language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(study_day order by study_day),'{}'::date[]) from
    (select study_day from public.examlab_streak_credits where user_id=p_user group by study_day having sum(seconds)>=600) d
$$;

create or replace function public.examlab_v30_stats(p_days date[],p_today date)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare d date; prev date; run integer:=0; best integer:=0; total integer:=0; week integer:=0; recent jsonb:='[]';
begin
  for d in select distinct x from unnest(p_days) x where x<=p_today order by x loop
    if d=prev+1 then run:=run+1; else run:=1; end if;
    best:=greatest(best,run); total:=total+1; prev:=d;
    if d>=p_today-6 then week:=week+1; end if;
    if d>=p_today-27 then recent:=recent||to_jsonb(d); end if;
  end loop;
  return jsonb_build_object('current',case when prev>=p_today-1 then run else 0 end,'best',best,'total',total,
    'today_done',coalesce(prev=p_today,false),'last_day',prev,'week',week,'days',recent);
end $$;

create or replace function public.examlab_v30_streak_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
  mine date[]; theirs date[]; common_days date[]; me public.examlab_streak_preferences%rowtype;
  peer public.examlab_streak_preferences%rowtype; f jsonb; overview jsonb; rows jsonb:='[]'; uid uuid;
  own jsonb; item jsonb; since_day date; seconds_today integer;
begin
  if u is null then raise exception 'Cần đăng nhập để xem chuỗi học.'; end if;
  mine:=public.examlab_v30_days(u);
  own:=public.examlab_v30_stats(mine,today);
  select least(600,coalesce(sum(seconds),0))::integer into seconds_today from public.examlab_streak_credits where user_id=u and study_day=today;
  select * into me from public.examlab_streak_preferences where user_id=u;
  overview:=public.examlab_beta_overview();
  for f in select distinct on (value->>'user_id') value from jsonb_array_elements(
    case when jsonb_typeof(overview->'friends')='array' then overview->'friends' else '[]'::jsonb end
  ) where value->>'user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' loop
    uid:=(f->>'user_id')::uuid;
    if uid=u then continue; end if;
    item:=jsonb_build_object('user_id',uid,'name',coalesce(nullif(f->>'name',''),'Bạn bè'),'visible',false);
    select * into peer from public.examlab_streak_preferences where user_id=uid;
    if coalesce(me.share_with_friends,false) and coalesce(peer.share_with_friends,false) then
      theirs:=public.examlab_v30_days(uid);
      since_day:=(greatest(me.enabled_since,peer.enabled_since) at time zone 'Asia/Ho_Chi_Minh')::date;
      select coalesce(array_agg(d order by d),'{}'::date[]) into common_days from unnest(mine) d where d=any(theirs) and d>=since_day;
      item:=item||jsonb_build_object('visible',true,'personal',public.examlab_v30_stats(theirs,today)-'days',
        'duo',public.examlab_v30_stats(common_days,today),'since',since_day);
    end if;
    rows:=rows||jsonb_build_array(item);
  end loop;
  return jsonb_build_object('today',today,'server_now',now(),'next_reset_at',(today+1)::timestamp at time zone 'Asia/Ho_Chi_Minh',
    'my',own||jsonb_build_object('seconds_today',seconds_today),'sharing',coalesce(me.share_with_friends,false),'friends',rows,
    'sources',jsonb_build_object('study',to_regclass('public.examlab_study_sessions') is not null,'attempt',to_regclass('public.examlab_attempts') is not null));
end $$;

create or replace function public.examlab_v30_streak_sharing(p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'Cần đăng nhập.'; end if;
  if p_enabled is null then raise exception 'Thiếu lựa chọn chia sẻ.'; end if;
  insert into public.examlab_streak_preferences(user_id,share_with_friends,enabled_since) values(u,p_enabled,now())
  on conflict(user_id) do update set share_with_friends=excluded.share_with_friends,
    enabled_since=case when excluded.share_with_friends and not examlab_streak_preferences.share_with_friends then now() else examlab_streak_preferences.enabled_since end;
  return p_enabled;
end $$;

-- Triggers only observe the existing sources; they never change scores or history.
do $$ declare r record; begin
  if to_regprocedure('public.examlab_beta_overview()') is null then raise exception 'Cài hệ thống Bạn bè Beta hiện có trước V30.'; end if;
  if to_regclass('public.examlab_study_sessions') is not null then
    execute 'drop trigger if exists examlab_streak_study_v30 on public.examlab_study_sessions';
    execute 'create trigger examlab_streak_study_v30 after insert or update on public.examlab_study_sessions for each row execute function public.examlab_v30_record_study()';
    for r in execute 'select to_jsonb(t) as j from public.examlab_study_sessions t' loop perform public.examlab_v30_ingest('study',r.j,true); end loop;
  end if;
  if to_regclass('public.examlab_attempts') is not null then
    execute 'drop trigger if exists examlab_streak_attempt_v30 on public.examlab_attempts';
    execute 'create trigger examlab_streak_attempt_v30 after insert or update on public.examlab_attempts for each row execute function public.examlab_v30_record_study()';
    for r in execute 'select to_jsonb(t) as j from public.examlab_attempts t' loop perform public.examlab_v30_ingest('attempt',r.j,true); end loop;
  end if;
end $$;

revoke all on function public.examlab_v30_ingest(text,jsonb,boolean),public.examlab_v30_record_study(),public.examlab_v30_days(uuid),public.examlab_v30_stats(date[],date),public.examlab_v30_streak_snapshot(),public.examlab_v30_streak_sharing(boolean) from public,anon,authenticated;
grant execute on function public.examlab_v30_streak_snapshot(),public.examlab_v30_streak_sharing(boolean) to authenticated;
notify pgrst,'reload schema';
commit;
