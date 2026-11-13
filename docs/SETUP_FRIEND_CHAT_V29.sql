-- V29: private text chat. Existing Friends Beta is required; repeatable migration.
begin;
do $$ begin
 if to_regprocedure('public.examlab_beta_overview()') is null then
  raise exception 'Cần cài Friends Beta trước V29 (thiếu examlab_beta_overview).';
 end if;
end $$;
create table if not exists public.examlab_friend_messages (
 id uuid primary key,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body)<=3000),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 revoked_at timestamptz,
 check(sender_id<>recipient_id),
 check(revoked_at is not null or char_length(btrim(body))>0)
);
alter table public.examlab_friend_messages enable row level security;
-- RPCs below are the only client access; no direct read/write grants or policies.
revoke all on public.examlab_friend_messages from anon,authenticated;
create index if not exists friend_messages_pair on public.examlab_friend_messages(sender_id,recipient_id,created_at desc,id desc);
create index if not exists friend_messages_unread on public.examlab_friend_messages(recipient_id,sender_id) where read_at is null and revoked_at is null;
create or replace function public.examlab_v29_is_friend(p_peer uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select auth.uid() is not null and auth.uid()<>p_peer and exists (
 select 1 from jsonb_array_elements(case when jsonb_typeof(public.examlab_beta_overview()::jsonb->'friends')='array' then public.examlab_beta_overview()::jsonb->'friends' else '[]'::jsonb end) f
 where f->>'user_id'=p_peer::text);
$$;
create or replace function public.examlab_v29_chat_send(p_peer uuid,p_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); item public.examlab_friend_messages; content text:=btrim(p_body);
begin
 if me is null or not coalesce(public.examlab_v29_is_friend(p_peer),false) then raise exception 'Chỉ nhắn tin với người đang là bạn bè.';end if;
 if p_id is null or content is null or char_length(content) not between 1 and 3000 then raise exception 'Tin nhắn cần từ 1 đến 3000 ký tự.';end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,29));
 select * into item from public.examlab_friend_messages where id=p_id;
 if found then
  if item.sender_id=me and item.recipient_id=p_peer and item.body=content and item.revoked_at is null then return to_jsonb(item);end if;
  raise exception 'Mã tin nhắn đã được sử dụng.';
 end if;
 if (select count(*) from public.examlab_friend_messages where sender_id=me and created_at>clock_timestamp()-interval '1 minute')>=10 then raise exception 'Bạn gửi quá nhanh. Chờ một phút rồi thử lại.';end if;
 insert into public.examlab_friend_messages(id,sender_id,recipient_id,body) values(p_id,me,p_peer,content) returning * into item;
 return to_jsonb(item);
end $$;
create or replace function public.examlab_v29_chat_thread(p_peer uuid,p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not coalesce(public.examlab_v29_is_friend(p_peer),false) then raise exception 'Không thể mở trò chuyện: hai tài khoản cần đang là bạn bè.';end if;
 if (p_before is null)<>(p_before_id is null) then raise exception 'Mốc tải tin nhắn không hợp lệ.';end if;
 return (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id desc),'[]'::jsonb) from (
 select * from public.examlab_friend_messages where ((sender_id=auth.uid() and recipient_id=p_peer) or (sender_id=p_peer and recipient_id=auth.uid()))
 and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit 41
 ) m);
end $$;
create or replace function public.examlab_v29_chat_summary()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập.';end if;
 return (select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (
 select case when sender_id=auth.uid() then recipient_id else sender_id end as peer_id,
 max(created_at) as latest_at,
 count(*) filter(where recipient_id=auth.uid() and read_at is null and revoked_at is null) as unread
 from public.examlab_friend_messages where (sender_id=auth.uid() or recipient_id=auth.uid())
 and public.examlab_v29_is_friend(case when sender_id=auth.uid() then recipient_id else sender_id end)
 group by 1) s);
end $$;
create or replace function public.examlab_v29_chat_read(p_peer uuid,p_ids uuid[])
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if auth.uid() is null or not coalesce(public.examlab_v29_is_friend(p_peer),false) then raise exception 'Cần đang là bạn bè.';end if;
 if p_ids is null or cardinality(p_ids)>200 then raise exception 'Tối đa 200 tin mỗi lần đánh dấu.';end if;
 update public.examlab_friend_messages set read_at=clock_timestamp() where id=any(p_ids) and sender_id=p_peer and recipient_id=auth.uid() and read_at is null and revoked_at is null;
 get diagnostics n=row_count;return n;
end $$;
create or replace function public.examlab_v29_chat_revoke(p_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập.';end if;
 update public.examlab_friend_messages set body='',revoked_at=coalesce(revoked_at,clock_timestamp()) where id=p_id and sender_id=auth.uid();
 if not found then raise exception 'Chỉ người gửi được thu hồi tin nhắn.';end if;
 return true;
end $$;
revoke all on function public.examlab_v29_is_friend(uuid) from public,anon;
revoke all on function public.examlab_v29_chat_send(uuid,uuid,text) from public,anon;
revoke all on function public.examlab_v29_chat_thread(uuid,timestamptz,uuid) from public,anon;
revoke all on function public.examlab_v29_chat_summary() from public,anon;
revoke all on function public.examlab_v29_chat_read(uuid,uuid[]) from public,anon;
revoke all on function public.examlab_v29_chat_revoke(uuid) from public,anon;
grant execute on function public.examlab_v29_chat_send(uuid,uuid,text),public.examlab_v29_chat_thread(uuid,timestamptz,uuid),public.examlab_v29_chat_summary(),public.examlab_v29_chat_read(uuid,uuid[]),public.examlab_v29_chat_revoke(uuid) to authenticated;
commit;
