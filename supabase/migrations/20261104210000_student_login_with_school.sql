-- ========================================================
-- Öğrenci girişi: OKUL + okul numarası + PIN
-- Aynı numara farklı okullarda olabileceği için okul girişte seçilir;
-- hatalı deneme kilidi yalnızca o okuldaki öğrenciye uygulanır.
-- ========================================================

create or replace function public.student_login(p_school_id uuid, p_student_number text, p_pin text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_student public.students%rowtype;
  v_cred public.student_credentials%rowtype;
  v_recent_failures integer;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_school_id is null then
    return json_build_object('ok', false, 'error', 'no_school');
  end if;

  -- Oturum başına deneme sınırı (farklı numaralara PIN denemeyi yavaşlatır)
  select count(*) into v_recent_failures
  from public.pin_attempts
  where auth_uid = v_uid and not success and created_at > now() - interval '15 minutes';
  if v_recent_failures >= 10 then
    return json_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into v_student
  from public.students
  where school_id = p_school_id and student_number = trim(p_student_number);

  if found then
    select * into v_cred
    from public.student_credentials
    where student_id = v_student.id
    for update;
  end if;

  if v_student.id is null or v_cred.student_id is null then
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, left(p_student_number, 40), false);
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_cred.pin_locked_until is not null and v_cred.pin_locked_until > now() then
    return json_build_object('ok', false, 'error', 'locked', 'locked_until', v_cred.pin_locked_until);
  end if;

  if v_cred.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_cred.pin_hash) then
    update public.student_credentials
      set failed_pin_attempts = 0, pin_locked_until = null
      where student_id = v_student.id;
    insert into public.student_sessions (auth_uid, student_id)
      values (v_uid, v_student.id)
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

  insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, v_student.student_number, false);
  if v_cred.failed_pin_attempts + 1 >= 5 then
    update public.student_credentials
      set failed_pin_attempts = 0, pin_locked_until = now() + interval '15 minutes'
      where student_id = v_student.id;
    return json_build_object('ok', false, 'error', 'locked', 'locked_until', now() + interval '15 minutes');
  end if;

  update public.student_credentials
    set failed_pin_attempts = failed_pin_attempts + 1
    where student_id = v_student.id;
  return json_build_object('ok', false, 'error', 'invalid');
end;
$$;
revoke execute on function public.student_login(uuid, text, text) from public, anon;
grant execute on function public.student_login(uuid, text, text) to authenticated;

-- Okulsuz eski giriş kaldırılır
drop function if exists public.student_login(text, text);

-- --------------------------------------------------------
-- Öğrenci ekleme: öğretmen kendi okuluna ekler; admin okulu seçer
-- --------------------------------------------------------
create or replace function public.staff_create_student(
  p_student_number text,
  p_name text,
  p_class_name text,
  p_pin text,
  p_school_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_school uuid;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if coalesce(trim(p_student_number), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Okul numarası ve ad soyad zorunludur.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;

  v_school := case when public.is_admin() then coalesce(p_school_id, public.my_school_id()) else public.my_school_id() end;
  if v_school is null then
    raise exception 'Öğrencinin okulu belirlenemedi. Öğretmen hesabı bir okula bağlı olmalı (admin ise okul seçmeli).';
  end if;

  insert into public.students (student_number, name, class_name, school_id)
  values (trim(p_student_number), left(trim(p_name), 120), left(trim(coalesce(p_class_name, '')), 20), v_school)
  returning id into v_id;

  insert into public.student_credentials (student_id, pin_hash)
  values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  return v_id;
end;
$$;
revoke execute on function public.staff_create_student(text, text, text, text, uuid) from public, anon;
grant execute on function public.staff_create_student(text, text, text, text, uuid) to authenticated;
drop function if exists public.staff_create_student(text, text, text, text);
