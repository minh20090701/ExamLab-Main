-- Run after the existing Friends Beta setup. Safe to rerun; no existing data deleted.
begin;
do $$ begin
 if to_regprocedure('public.examlab_beta_overview()') is null then
  raise exception 'Cần cài Friends Beta trước bản nâng cấp V28 (thiếu examlab_beta_overview).';
 end if;
end $$;
-- Reuse the server's existing friendship resolver; never trust client friend IDs.
create or replace function public.examlab_v28_are_friends(p_users uuid[])
returns boolean language sql stable security invoker set search_path = public
as $$
 select auth.uid() is not null and cardinality(p_users) between 1 and 100
 and not exists (
  select 1 from unnest(p_users) target
  where target is null or not exists (
   select 1 from jsonb_array_elements(coalesce(public.examlab_beta_overview()::jsonb->'friends','[]'::jsonb)) f
   where f->>'user_id'=target::text
  )
 );
$$;
revoke all on function public.examlab_v28_are_friends(uuid[]) from public;
grant execute on function public.examlab_v28_are_friends(uuid[]) to authenticated;
create table if not exists public.examlab_friend_notes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 140),
 body text not null check(char_length(btrim(body)) between 1 and 10000),
 pinned boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.examlab_friend_notes enable row level security;
grant select,insert,update,delete on public.examlab_friend_notes to authenticated;
drop policy if exists notes_owner on public.examlab_friend_notes;
create policy notes_owner on public.examlab_friend_notes for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create index if not exists friend_notes_owner on public.examlab_friend_notes(owner_id,updated_at desc);
create table if not exists public.examlab_friend_shares (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 recipients uuid[] not null check(cardinality(recipients) between 1 and 100),
 kind text not null check(kind in ('note','link')),
 title text not null check(char_length(btrim(title)) between 1 and 140),
 body text not null default '' check(char_length(body)<=10000),
 url text not null default '' check(char_length(url)<=2048),
 created_at timestamptz not null default now(),
 check((kind='note' and char_length(btrim(body))>0 and url='') or (kind='link' and url ~ '^https://[^[:space:]]+$'))
);
alter table public.examlab_friend_shares enable row level security;
grant select,insert,delete on public.examlab_friend_shares to authenticated;
-- No UPDATE grant: shared snapshots cannot silently change after delivery.
revoke update on public.examlab_friend_shares from authenticated;
drop policy if exists shares_read on public.examlab_friend_shares;
create policy shares_read on public.examlab_friend_shares for select to authenticated using (
 sender_id=auth.uid() or (auth.uid()=any(recipients) and public.examlab_v28_are_friends(array[sender_id]))
);
drop policy if exists shares_send on public.examlab_friend_shares;
create policy shares_send on public.examlab_friend_shares for insert to authenticated with check (
 sender_id=auth.uid() and public.examlab_v28_are_friends(recipients)
);
drop policy if exists shares_retract on public.examlab_friend_shares;
create policy shares_retract on public.examlab_friend_shares for delete to authenticated using(sender_id=auth.uid());
create index if not exists friend_shares_sender on public.examlab_friend_shares(sender_id,created_at desc);
create index if not exists friend_shares_recipients on public.examlab_friend_shares using gin(recipients);
commit;
