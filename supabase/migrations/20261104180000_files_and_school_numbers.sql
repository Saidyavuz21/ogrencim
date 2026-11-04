-- ========================================================
-- AŞAMA 2 (devam)
--  1) Öğrenci numarası okul bazında benzersiz
--  2) Ödev dosyaları (Supabase Storage, özel bucket)
-- Realtime: public.messages zaten supabase_realtime yayınında.
-- ========================================================

-- --------------------------------------------------------
-- 1) Okul bazında öğrenci numarası
-- --------------------------------------------------------
alter table public.students drop constraint if exists students_student_number_key;
create unique index if not exists students_school_number_key
  on public.students (school_id, student_number) nulls not distinct;
create index if not exists students_number_idx on public.students (student_number);

-- Giriş: aynı numara birden çok okulda olabilir; PIN'i tutan TEK öğrenci varsa giriş yapılır.
create or replace function public.student_login(p_student_number text, p_pin text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_recent_failures integer;
  v_candidates integer := 0;
  v_unlocked integer := 0;
  v_match_count integer := 0;
  v_match_id uuid;
  v_student public.students%rowtype;
  v_locked_until timestamptz;
  r record;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Oturum başına deneme sınırı (farklı numaralara PIN denemeyi yavaşlatır)
  select count(*) into v_recent_failures
  from public.pin_attempts
  where auth_uid = v_uid and not success and created_at > now() - interval '15 minutes';
  if v_recent_failures >= 10 then
    return json_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  for r in
    select s.id, c.pin_hash, c.pin_locked_until
    from public.students s
    join public.student_credentials c on c.student_id = s.id
    where s.student_number = trim(p_student_number)
    for update of c
  loop
    v_candidates := v_candidates + 1;
    if r.pin_locked_until is not null and r.pin_locked_until > now() then
      v_locked_until := greatest(coalesce(v_locked_until, r.pin_locked_until), r.pin_locked_until);
      continue;
    end if;
    v_unlocked := v_unlocked + 1;
    if r.pin_hash = extensions.crypt(coalesce(p_pin, ''), r.pin_hash) then
      v_match_count := v_match_count + 1;
      v_match_id := r.id;
    end if;
  end loop;

  if v_candidates = 0 then
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, left(p_student_number, 40), false);
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_unlocked = 0 then
    return json_build_object('ok', false, 'error', 'locked', 'locked_until', v_locked_until);
  end if;

  if v_match_count > 1 then
    -- Aynı numara + aynı PIN iki okulda: hangisi olduğu bilinemez
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, left(p_student_number, 40), false);
    return json_build_object('ok', false, 'error', 'ambiguous');
  end if;

  if v_match_count = 1 then
    select * into v_student from public.students where id = v_match_id;
    update public.student_credentials
      set failed_pin_attempts = 0, pin_locked_until = null
      where student_id = v_match_id;
    insert into public.student_sessions (auth_uid, student_id)
      values (v_uid, v_match_id)
      on conflict (auth_uid) do update
        set student_id = excluded.student_id, created_at = now(), expires_at = now() + interval '30 days';
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, v_student.student_number, true);
    return json_build_object(
      'ok', true,
      'student', json_build_object(
        'id', v_student.id,
        'student_number', v_student.student_number,
        'name', v_student.name,
        'class_name', v_student.class_name,
        'avatar', v_student.avatar
      )
    );
  end if;

  -- Hatalı PIN: bu numaradaki kilitli olmayan hesapların sayacı artar, 5'te 15 dk kilit
  insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, left(p_student_number, 40), false);
  update public.student_credentials c
     set failed_pin_attempts = case when c.failed_pin_attempts + 1 >= 5 then 0 else c.failed_pin_attempts + 1 end,
         pin_locked_until = case when c.failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else c.pin_locked_until end
   from public.students s
   where s.id = c.student_id
     and s.student_number = trim(p_student_number)
     and (c.pin_locked_until is null or c.pin_locked_until <= now());
  return json_build_object('ok', false, 'error', 'invalid');
end;
$$;
revoke execute on function public.student_login(text, text) from public, anon;
grant execute on function public.student_login(text, text) to authenticated;

-- --------------------------------------------------------
-- 2) Ödev dosyaları
--    Yol: <okul id|none>/<ödev id>/<dosya adı>
-- --------------------------------------------------------
alter table public.homeworks add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-files', 'homework-files', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Yükleme / silme: yalnızca ödevin sahibi öğretmen, kendi okul klasörüne
drop policy if exists homework_files_insert on storage.objects;
create policy homework_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'homework-files'
    and (storage.foldername(name))[1] = coalesce((select public.my_school_id())::text, 'none')
    and (select public.owns_homework(((storage.foldername(name))[2])::uuid))
  );

drop policy if exists homework_files_delete on storage.objects;
create policy homework_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'homework-files'
    and (select public.owns_homework(((storage.foldername(name))[2])::uuid))
  );

-- Okuma: ödevi görebilen herkes (homeworks RLS'i: aynı okulun personeli, ödevin sınıfındaki öğrenci)
drop policy if exists homework_files_select on storage.objects;
create policy homework_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'homework-files'
    and exists (
      select 1 from public.homeworks h
      where h.id::text = (storage.foldername(name))[2]
    )
  );
