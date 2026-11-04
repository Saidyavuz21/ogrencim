-- ========================================================
-- Öğrenci → öğretmen mesajlaşması ("Öğretmenime soru sor")
--   soru:<öğrenci id>  -> öğrencinin kendisi ile öğretmenleri (veliden ayrı)
--   ogr:<öğrenci id>   -> velisi ile öğretmenleri (değişmedi)
--   sinif:<okul>:<sınıf> -> sınıf grubu (veli ve öğrenci okur, personel yazar)
-- ========================================================

alter table public.messages drop constraint if exists messages_sender_role_check;
alter table public.messages add constraint messages_sender_role_check
  check (sender_role = any (array['parent', 'student', 'teacher', 'admin']));

create or replace function public.can_read_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then true
    when public.is_staff() then
      ((p_conv like 'ogr:%' or p_conv like 'soru:%') and exists (
        select 1 from public.students s
        where s.id::text = split_part(p_conv, ':', 2) and s.school_id is not distinct from public.my_school_id()
      ))
      or (p_conv like 'sinif:%' and split_part(p_conv, ':', 2) = coalesce(public.my_school_id()::text, 'none'))
    else
      exists (
        select 1 from public.students me
        where me.id = public.current_student_id()
          and (
            p_conv = 'ogr:' || me.id::text
            or p_conv = 'soru:' || me.id::text
            or p_conv = public.class_conversation_id(me.school_id, me.class_name)
          )
      )
  end;
$$;

-- Aile tarafı yalnızca birebir konuşmalara yazar; sınıf grubuna yalnızca personel yazar
create or replace function public.can_write_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_read_conversation(p_conv)
     and (public.is_staff() or p_conv like 'ogr:%' or p_conv like 'soru:%');
$$;

-- Gönderen sunucuda belirlenir: soru:* öğrenci, ogr:* veli
create or replace function public.messages_set_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid()::text;
  if public.is_staff() then
    new.sender_role := case when public.is_admin() then 'admin' else 'teacher' end;
    select coalesce(nullif(full_name, ''), 'Öğretmen') into new.sender_name from public.profiles where id = auth.uid();
  elsif new.conversation_id like 'soru:%' then
    new.sender_role := 'student';
    select s.name || ' (öğrenci)' into new.sender_name from public.students s where s.id = public.current_student_id();
  else
    new.sender_role := 'parent';
    select s.name || ' velisi' into new.sender_name from public.students s where s.id = public.current_student_id();
  end if;
  new.sender_name := coalesce(new.sender_name, 'Kullanıcı');
  new.is_read := false;
  return new;
end;
$$;

-- Öğrenci silinince öğrenci soruları da silinir
create or replace function public.staff_delete_student(p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.staff_can_manage_student(p_student_id) then
    raise exception 'Yalnızca kendi sınıflarınızdaki öğrencileri silebilirsiniz.' using errcode = '42501';
  end if;
  delete from public.messages
   where conversation_id in ('ogr:' || p_student_id::text, 'soru:' || p_student_id::text);
  delete from public.students where id = p_student_id;
  if not found then
    raise exception 'Öğrenci bulunamadı.';
  end if;
end;
$$;
