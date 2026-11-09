-- ExamLab V19: metadata catalogs, avoid returning large JSON payload for listing.
-- Run in Supabase SQL Editor BEFORE uploading V19 frontend files.
-- Existing public.examlab_decks table and payload remain unchanged.

create or replace function public.examlab_public_deck_catalog()
returns table(deck_id text, title text, subject text, description text,
 duration_minutes integer, question_count integer, first_type text, kind text, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
 select d.id::text,
  coalesce(nullif(d.payload->>'title',''),d.title::text,'Bộ đề'),
  coalesce(nullif(d.payload->>'subject',''),d.subject::text,'hoa'),
  left(coalesce(d.payload->>'description',''),700),
  coalesce(nullif(d.payload->>'durationMinutes','')::integer,60),
  case when jsonb_typeof((d.payload->'questions')::jsonb)='array'
   then jsonb_array_length((d.payload->'questions')::jsonb) else 0 end,
  coalesce(d.payload->'questions'->0->>'type','single'),
  case when d.payload->>'kind' in ('mock','practice') then d.payload->>'kind'
   when lower(coalesce(d.title::text,'')) ~ '(thi thử|đề thi|mô phỏng|giữa kì|giữa kỳ|cuối kì|cuối kỳ|tốt nghiệp|thpt|khảo sát)' then 'mock'
   else 'practice' end,
  d.updated_at
 from public.examlab_decks d
 where d.published is true
 order by d.updated_at desc
 limit 3000;
$$;
revoke all on function public.examlab_public_deck_catalog() from public;
grant execute on function public.examlab_public_deck_catalog() to anon, authenticated;

create or replace function public.examlab_admin_deck_catalog()
returns table(deck_id text, title text, subject text, description text,
 duration_minutes integer, question_count integer, first_type text, kind text, updated_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.examlab_material_admins a where a.user_id = auth.uid()
 ) then
  raise exception 'Only ExamLab administrators can read all deck metadata' using errcode='42501';
 end if;
 return query select d.id::text,
  coalesce(nullif(d.payload->>'title',''),d.title::text,'Bộ đề'),
  coalesce(nullif(d.payload->>'subject',''),d.subject::text,'hoa'),
  left(coalesce(d.payload->>'description',''),700),
  coalesce(nullif(d.payload->>'durationMinutes','')::integer,60),
  case when jsonb_typeof((d.payload->'questions')::jsonb)='array'
   then jsonb_array_length((d.payload->'questions')::jsonb) else 0 end,
  coalesce(d.payload->'questions'->0->>'type','single'),
  case when d.payload->>'kind' in ('mock','practice') then d.payload->>'kind'
   when lower(coalesce(d.title::text,'')) ~ '(thi thử|đề thi|mô phỏng|giữa kì|giữa kỳ|cuối kì|cuối kỳ|tốt nghiệp|thpt|khảo sát)' then 'mock'
   else 'practice' end,
  d.updated_at
 from public.examlab_decks d
 order by d.updated_at desc
 limit 3000;
end;
$$;
revoke all on function public.examlab_admin_deck_catalog() from public;
grant execute on function public.examlab_admin_deck_catalog() to authenticated;
