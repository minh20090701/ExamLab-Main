-- Run once in Supabase SQL Editor. Uses the existing verified admin table.
begin;
create table if not exists public.examlab_announcements (
 id integer primary key check (id = 1),
 content text not null check (char_length(btrim(content)) between 1 and 2000),
 updated_at timestamptz not null default now()
);
alter table public.examlab_announcements enable row level security;
grant select on public.examlab_announcements to anon, authenticated;
grant insert, update on public.examlab_announcements to authenticated;
drop policy if exists announcement_read on public.examlab_announcements;
create policy announcement_read on public.examlab_announcements for select to anon, authenticated using (true);
drop policy if exists announcement_admin_insert on public.examlab_announcements;
create policy announcement_admin_insert on public.examlab_announcements for insert to authenticated with check (exists(select 1 from public.examlab_material_admins where user_id=auth.uid()));
drop policy if exists announcement_admin_update on public.examlab_announcements;
create policy announcement_admin_update on public.examlab_announcements for update to authenticated using (exists(select 1 from public.examlab_material_admins where user_id=auth.uid())) with check (exists(select 1 from public.examlab_material_admins where user_id=auth.uid()));
insert into public.examlab_announcements(id,content) values (1,'Chào mừng bạn đến với ExamLab · Chúc bạn học tập hiệu quả!') on conflict (id) do nothing;
commit;
