-- ========================================================
-- Öğretmen yalnızca KENDİ SINIFLARINDAKİ öğrencileri yönetir
--  * Kendi sınıfları: profildeki rehberlik sınıfı + teacher_classes
--  * Ekleme, sınıf değiştirme, PIN sıfırlama, silme bu sınıflarla sınırlı
--  * Admin her öğrenciyi yönetir
-- Ayrıca öğrenci silme (veli mesajlarıyla birlikte).
-- ========================================================

-- Oturumdaki personel bu sınıfın öğretmeni mi?
create or replace function public.teacher_has_class(p_class text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_staff() and coalesce(trim(p_class), '') <> '' and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.class_name = p_class)
      or exists (select 1 from public.teacher_classes t where t.teacher_id = auth.uid() and t.class_name = p_class)
    )
  );
$$;
revoke execute on function public.teacher_has_class(text) from public, anon;
grant execute on function public.teacher_has_class(text) to authenticated;

-- Bu öğrenciyi yönetebilir mi? (aynı okul + kendi sınıfı; admin her zaman)
create or replace function public.staff_can_manage_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.staff_can_see_student(p_student_id)
    and exists (select 1 from public.students s where s.id = p_student_id and public.teacher_has_class(s.class_name))
  );
$$;
revoke execute on function public.staff_can_manage_student(uuid) from public, anon;
grant execute on function public.staff_can_manage_student(uuid) to authenticated;

-- Güncelleme (ad / sınıf): yalnızca kendi sınıfındaki öğrenci, yalnızca kendi sınıflarına
drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students for update to authenticated
  using ((select public.staff_can_manage_student(id)))
  with check (
    (select public.is_admin())
    or (school_id is not distinct from (select public.my_school_id()) and (select public.teacher_has_class(class_name)))
  );

-- Ekleme: öğretmen kendi okuluna ve kendi sınıflarına; admin okulu seçer
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
  if not public.is_admin() and not public.teacher_has_class(trim(p_class_name)) then
    raise exception 'Öğrenciyi yalnızca kendi sınıflarınıza ekleyebilirsiniz.' using errcode = '42501';
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

-- PIN sıfırlama: yalnızca yönetebildiği öğrenci
create or replace function public.staff_set_student_pin(p_student_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.staff_can_manage_student(p_student_id) then
    raise exception 'Yalnızca kendi sınıflarınızdaki öğrencilerin PIN''ini değiştirebilirsiniz.' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;
  insert into public.student_credentials (student_id, pin_hash)
  values (p_student_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (student_id) do update
    set pin_hash = excluded.pin_hash,
        failed_pin_attempts = 0,
        pin_locked_until = null,
        updated_at = now();
  delete from public.student_sessions where student_id = p_student_id;
end;
$$;

-- Silme: yalnızca yönetebildiği öğrenci. PIN, oturum, puan geçmişi, ödev kontrolü ve notlar
-- yabancı anahtarlarla (on delete cascade) otomatik silinir; veli mesajları burada silinir.
create or replace function public.staff_delete_student(p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.staff_can_manage_student(p_student_id) then
    raise exception 'Yalnızca kendi sınıflarınızdaki öğrencileri silebilirsiniz.' using errcode = '42501';
  end if;
  delete from public.messages where conversation_id = 'ogr:' || p_student_id::text;
  delete from public.students where id = p_student_id;
  if not found then
    raise exception 'Öğrenci bulunamadı.';
  end if;
end;
$$;
revoke execute on function public.staff_delete_student(uuid) from public, anon;
grant execute on function public.staff_delete_student(uuid) to authenticated;

-- Daha önce silinmiş öğrencilerden kalan sahipsiz veli mesajlarını temizle
delete from public.messages m
where m.conversation_id like 'ogr:%'
  and not exists (select 1 from public.students s where 'ogr:' || s.id::text = m.conversation_id);
