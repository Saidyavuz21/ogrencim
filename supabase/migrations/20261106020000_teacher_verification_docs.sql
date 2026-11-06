-- ========================================================
-- ÖĞRETMEN DOĞRULAMA BELGESİ
--  Kayıt sırasında öğretmen; MEBBİS ekran görüntüsü, öğretmenlik belgesi vb.
--  bir PDF / JPG / PNG yükler. Süper admin onaylamadan önce bu belgeyi görür.
--  Yol: teacher-documents/<kullanıcı id>/<dosya adı>
-- ========================================================

alter table public.profiles add column if not exists verification_doc text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-documents', 'teacher-documents', false, 5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Yükleme: yalnızca öğretmen hesabı, yalnızca kendi klasörüne (onay beklerken de)
drop policy if exists teacher_documents_insert on storage.objects;
create policy teacher_documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'teacher-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'ogretmen'
    )
  );

-- Görüntüleme: belgenin sahibi veya admin
drop policy if exists teacher_documents_select on storage.objects;
create policy teacher_documents_select on storage.objects for select to authenticated
  using (
    bucket_id = 'teacher-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

-- Silme: belgenin sahibi veya admin (öğretmen silinirken/reddedilirken temizlik)
drop policy if exists teacher_documents_delete on storage.objects;
create policy teacher_documents_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'teacher-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

-- Onay bekleyen öğretmen profilini güncelleyemez (RLS yalnızca admin).
-- Belge yolunu bu fonksiyon kaydeder: yol kendi klasöründe olmalı ve dosya gerçekten yüklenmiş olmalı.
create or replace function public.set_my_verification_doc(p_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_path is null then
    return false;
  end if;
  if split_part(p_path, '/', 1) <> v_uid::text then
    return false;
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-documents' and o.name = p_path
  ) then
    return false;
  end if;

  update public.profiles
     set verification_doc = p_path
   where id = v_uid and role = 'ogretmen';
  return found;
end;
$$;

revoke all on function public.set_my_verification_doc(text) from public, anon;
grant execute on function public.set_my_verification_doc(text) to authenticated;
