-- Run after V32. Does not change the selected theme or current music.
begin;
create or replace function public.examlab_v33_music_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from public.examlab_material_admins where user_id=auth.uid())
$$;
revoke all on function public.examlab_v33_music_admin() from public,anon;
grant execute on function public.examlab_v33_music_admin() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('examlab-festival-music','examlab-festival-music',true,20971520,array['audio/mpeg','audio/ogg','audio/wav','audio/mp4'])
on conflict(id) do update set public=true,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists examlab_v33_music_insert on storage.objects;
create policy examlab_v33_music_insert on storage.objects for insert to authenticated with check(
 bucket_id='examlab-festival-music' and public.examlab_v33_music_admin()
 and split_part(name,'/',1)=auth.uid()::text and name ~* '[.](mp3|ogg|wav|m4a)$');
drop policy if exists examlab_v33_music_read on storage.objects;
create policy examlab_v33_music_read on storage.objects for select to authenticated using(
 bucket_id='examlab-festival-music' and public.examlab_v33_music_admin());
drop policy if exists examlab_v33_music_delete on storage.objects;
create policy examlab_v33_music_delete on storage.objects for delete to authenticated using(
 bucket_id='examlab-festival-music' and public.examlab_v33_music_admin());
notify pgrst,'reload schema';
commit;
