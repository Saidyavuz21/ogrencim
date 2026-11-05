-- ========================================================
-- TEK ROL: veli rolü kaldırıldı
-- Okul numarası + PIN ile giren herkes "öğrenci"dir (ilkokulda telefonu veli tutsa da
-- hesap öğrencinindir). Öğrenci başına tek birebir konuşma: ogr:<öğrenci id>
--   - Eski "soru:<id>" (öğrencinin soruları) mesajları ogr:<id> konuşmasına taşınır
--   - Eski veli mesajları öğrenci mesajı olur; gönderen adı öğrencinin adıdır
-- ========================================================

-- 1) Mesajları tek konuşmada ve tek rolde birleştir
update public.messages
   set conversation_id = 'ogr:' || split_part(conversation_id, ':', 2)
 where conversation_id like 'soru:%';

update public.messages m
   set sender_role = 'student',
       sender_name = s.name
  from public.students s
 where m.sender_role in ('parent', 'student')
   and s.id::text = split_part(m.conversation_id, ':', 2);

-- Öğrencisi silinmiş eski kayıtlar varsa rolü yine de düzelt
update public.messages set sender_role = 'student' where sender_role = 'parent';

alter table public.messages drop constraint if exists messages_sender_role_check;
alter table public.messages add constraint messages_sender_role_check
  check (sender_role = any (array['student', 'teacher', 'admin']));

-- 2) Okuma / yazma yetkisi: yalnızca ogr:<id> ve sınıf grubu
create or replace function public.can_read_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then true
    when public.is_staff() then
      (p_conv like 'ogr:%' and exists (
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
            or p_conv = public.class_conversation_id(me.school_id, me.class_name)
          )
      )
  end;
$$;

-- Öğrenci yalnızca kendi birebir konuşmasına yazar; sınıf grubuna yalnızca personel yazar
create or replace function public.can_write_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_read_conversation(p_conv)
     and (public.is_staff() or p_conv like 'ogr:%');
$$;

-- 3) Gönderen sunucuda belirlenir: personel → teacher/admin, diğer herkes → student (öğrencinin adıyla)
create or replace function public.messages_set_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid()::text;
  if public.is_staff() then
    new.sender_role := case when public.is_admin() then 'admin' else 'teacher' end;
    select coalesce(nullif(full_name, ''), 'Öğretmen') into new.sender_name from public.profiles where id = auth.uid();
  else
    new.sender_role := 'student';
    select s.name into new.sender_name from public.students s where s.id = public.current_student_id();
  end if;
  new.sender_name := coalesce(new.sender_name, 'Kullanıcı');
  new.is_read := false;
  return new;
end;
$$;
