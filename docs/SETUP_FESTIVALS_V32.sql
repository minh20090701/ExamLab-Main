-- V32: one server-owned theme/music configuration shared by all visitors.
begin;
do $$ begin
  if to_regclass('public.examlab_material_admins') is null then
    raise exception 'Cần có bảng quản trị examlab_material_admins của ExamLab trước khi cài V32.';
  end if;
end $$;
create table if not exists public.examlab_site_festival (
  id integer primary key check(id=1),
  theme_id text not null default 'classic' check(theme_id in ('classic','halloween','christmas','tet','midautumn','sakura','night')),
  music_id text not null default 'auto' check(music_id in ('auto','off','halloween','christmas','tet','midautumn','sakura','night','custom')),
  music_url text not null default '' check(length(music_url)<=2048),
  music_label text not null default '' check(length(music_label)<=80),
  effects boolean not null default true,
  revision bigint not null default 1 check(revision>0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.examlab_site_festival enable row level security;
revoke all on public.examlab_site_festival from public,anon,authenticated;
insert into public.examlab_site_festival(id) values(1) on conflict(id) do nothing;

create or replace function public.examlab_v32_get_festival()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('theme_id',theme_id,'music_id',music_id,'music_url',music_url,'music_label',music_label,
    'effects',effects,'revision',revision,'updated_at',updated_at) from public.examlab_site_festival where id=1
$$;

create or replace function public.examlab_v32_set_festival(
  p_theme text,p_music text,p_url text,p_label text,p_effects boolean,p_revision bigint
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); current_revision bigint; target_url text:=btrim(coalesce(p_url,'')); target_label text:=btrim(coalesce(p_label,''));
begin
  if u is null or not exists(select 1 from public.examlab_material_admins where user_id=u) then
    raise exception 'Chỉ quản trị viên được đổi giao diện và nhạc chung.' using errcode='42501';
  end if;
  if p_theme is null or p_theme not in ('classic','halloween','christmas','tet','midautumn','sakura','night') then raise exception 'Giao diện không hợp lệ.'; end if;
  if p_music is null or p_music not in ('auto','off','halloween','christmas','tet','midautumn','sakura','night','custom') then raise exception 'Bản nhạc không hợp lệ.'; end if;
  if p_effects is null or p_revision is null then raise exception 'Thiếu cấu hình hoặc phiên bản.'; end if;
  if length(target_label)>80 or length(target_url)>2048 then raise exception 'Tên hoặc đường dẫn nhạc quá dài.'; end if;
  if p_music='custom' then
    if target_url !~* '^https://[^/?#[:space:]@]+/[^?[:space:]#]*[.](mp3|ogg|wav|m4a)([?][^[:space:]#]*)?$' then
      raise exception 'Dùng đường dẫn HTTPS công khai tới file MP3, OGG, WAV hoặc M4A, không chứa tài khoản/mật khẩu.';
    end if;
  else target_url:='';target_label:='';
  end if;
  select revision into current_revision from public.examlab_site_festival where id=1 for update;
  if current_revision is null then raise exception 'Chưa khởi tạo cài đặt V32.'; end if;
  if current_revision<>p_revision then
    raise exception 'Cài đặt đã được quản trị viên khác cập nhật. Tải lại cài đặt trước khi lưu.' using errcode='40001';
  end if;
  update public.examlab_site_festival set theme_id=p_theme,music_id=p_music,music_url=target_url,music_label=target_label,
    effects=p_effects,revision=revision+1,updated_at=now(),updated_by=u where id=1;
  return public.examlab_v32_get_festival();
end $$;
revoke all on function public.examlab_v32_get_festival(),public.examlab_v32_set_festival(text,text,text,text,boolean,bigint) from public,anon,authenticated;
grant execute on function public.examlab_v32_get_festival() to anon,authenticated;
grant execute on function public.examlab_v32_set_festival(text,text,text,text,boolean,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
