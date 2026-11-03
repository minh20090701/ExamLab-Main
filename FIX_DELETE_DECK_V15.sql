-- ExamLab: sua loi 'Xoa de' chi xoa IndexedDB, khong xoa Supabase.
-- Chay 1 lan trong Supabase -> SQL Editor tren dung project ExamLab.
-- Yeu cau: public.examlab_decks, public.examlab_material_admins da ton tai.
-- Chi Admin da duoc cap trong examlab_material_admins co quyen xoa tren may chu.
-- Lich su bai thi (public.examlab_attempts) khong bi sua/xoa.

create table if not exists public.examlab_deleted_deck_ids (
  deck_id text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid
);

alter table public.examlab_deleted_deck_ids enable row level security;
revoke all on table public.examlab_deleted_deck_ids from anon, authenticated;

-- Xoa ban ghi bo de tren Supabase; luu ID toi thieu de ban cache cu khong hien lai.
create or replace function public.examlab_admin_delete_deck(p_deck_id text)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null or not exists (
    select 1 from public.examlab_material_admins a where a.user_id = v_uid
  ) then
    raise exception 'Only an authorized ExamLab administrator can delete decks'
      using errcode = '42501';
  end if;
  if p_deck_id is null or length(btrim(p_deck_id)) = 0 or length(p_deck_id) > 500 then
    raise exception 'Invalid deck ID' using errcode = '22023';
  end if;

  delete from public.examlab_decks d where d.id = p_deck_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    insert into public.examlab_deleted_deck_ids (deck_id,deleted_by)
    values (p_deck_id,v_uid)
    on conflict (deck_id) do update
       set deleted_at = now(), deleted_by = excluded.deleted_by;
  end if;
  return v_count > 0;
end;
$$;
revoke all on function public.examlab_admin_delete_deck(text) from public;
grant execute on function public.examlab_admin_delete_deck(text) to authenticated;

-- Danh sach ID da xoa chi duoc quan tri xem qua RPC.
create or replace function public.examlab_admin_deleted_deck_ids()
returns table(deck_id text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.examlab_material_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Only an authorized ExamLab administrator can list deleted decks'
      using errcode = '42501';
  end if;
  return query select d.deck_id from public.examlab_deleted_deck_ids d;
end;
$$;
revoke all on function public.examlab_admin_deleted_deck_ids() from public;
grant execute on function public.examlab_admin_deleted_deck_ids() to authenticated;

-- ID an + ID da xoa duoc tra ve de loai bo ban cache cu o may hoc sinh.
-- Khong cong khai ten de, noi dung, dap an hay loi giai.
create or replace function public.examlab_hidden_deck_ids()
returns table(deck_id text)
language sql stable security definer
set search_path = ''
as $$
  select d.id from public.examlab_decks d where d.published is false
  union
  select r.deck_id from public.examlab_deleted_deck_ids r;
$$;
revoke all on function public.examlab_hidden_deck_ids() from public;
grant execute on function public.examlab_hidden_deck_ids() to anon, authenticated;
