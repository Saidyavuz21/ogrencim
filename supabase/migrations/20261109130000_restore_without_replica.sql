-- ========================================================
-- Silinenler kutusu düzeltmesi: geri alma, trigger'ları tablo bazında kapatır
-- (ALTER TABLE … DISABLE TRIGGER USER). Supabase, fonksiyon içinden session_replication_role
-- ayarına izin vermiyor ("permission denied to set parameter").
-- ========================================================

-- Geri alma: kopyadaki bütün kayıtlar geri yazılır.
-- Geri yazılan tablolarda kullanıcı trigger'ları işlem boyunca kapatılır (ALTER TABLE … DISABLE TRIGGER USER):
-- puan ikinci kez verilmesin, mesaj göndereni / sahiplik alanları geri alanın bilgisiyle ezilmesin, hız sınırına
-- takılmasın. Yabancı anahtar kontrolleri açık kalır; bu sürede silinmiş ödev/yarışma/quiz sorusuna ait satırlar
-- atlanır, silinmiş öğretmene işaret eden alanlar boşaltılır. Hepsi tek işlemdir: hata olursa hiçbir şey değişmez.
-- (Supabase, fonksiyon içinden trigger'ları toptan kapatan ayara izin vermediği için bu yol kullanılıyor.)
create or replace function public.staff_restore_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deleted_students;
  v jsonb;
  t text;
  c_tables constant text[] := array[
    'students', 'student_credentials', 'points_history', 'grades', 'homework_checks', 'homework_submissions',
    'quiz_attempts', 'quiz_answers', 'reading_results', 'class_members', 'conversation_reads', 'board_drawings', 'messages'
  ];
begin
  select * into d from public.deleted_students where student_id = p_student_id and purge_after > now();
  if d.student_id is null then
    raise exception 'Silinen öğrenci bulunamadı (30 günlük süre dolmuş olabilir).';
  end if;
  if not private.can_manage_deleted(d.school_id, d.class_name) then
    raise exception 'Bu öğrenciyi geri alma yetkiniz yok.' using errcode = '42501';
  end if;
  if exists (select 1 from public.students s where s.id = p_student_id) then
    raise exception 'Bu öğrenci zaten kayıtlı.';
  end if;
  if exists (
    select 1 from public.students s
    where s.school_id is not distinct from d.school_id and s.student_number = d.student_number
  ) then
    raise exception 'Okul numarası % şu an başka bir öğrencide. Önce o öğrencinin numarasını değiştirin.', d.student_number;
  end if;
  if d.school_id is not null and not exists (select 1 from public.schools where id = d.school_id) then
    raise exception 'Öğrencinin okulu artık kayıtlı değil; geri alınamaz.';
  end if;

  v := d.data;
  -- Tablo kilidi beklenirse 5 saniyede vazgeç (o sırada yoğun bir işlem varsa)
  perform set_config('lock_timeout', '5s', true);
  foreach t in array c_tables loop
    execute format('alter table public.%I disable trigger user', t);
  end loop;

  insert into public.students
    select * from jsonb_populate_recordset(null::public.students, v -> 'students');
  insert into public.student_credentials
    select * from jsonb_populate_recordset(null::public.student_credentials, v -> 'student_credentials');
  insert into public.points_history
    select * from jsonb_populate_recordset(null::public.points_history, v -> 'points_history');
  insert into public.grades
    select * from jsonb_populate_recordset(null::public.grades, v -> 'grades');
  insert into public.homework_checks
    select r.* from jsonb_populate_recordset(null::public.homework_checks, v -> 'homework_checks') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.homework_submissions
    select r.* from jsonb_populate_recordset(null::public.homework_submissions, v -> 'homework_submissions') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.quiz_attempts
    select r.* from jsonb_populate_recordset(null::public.quiz_attempts, v -> 'quiz_attempts') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.quiz_answers
    select r.* from jsonb_populate_recordset(null::public.quiz_answers, v -> 'quiz_answers') r
    where exists (select 1 from public.quiz_attempts a where a.homework_id = r.homework_id and a.student_id = r.student_id)
      and exists (select 1 from public.quiz_items i where i.id = r.item_id);
  insert into public.reading_results
    select r.* from jsonb_populate_recordset(null::public.reading_results, v -> 'reading_results') r
    where exists (select 1 from public.reading_contests c where c.id = r.contest_id);
  insert into public.class_members
    select r.* from jsonb_populate_recordset(null::public.class_members, v -> 'class_members') r
    where r.school_id is null or exists (select 1 from public.schools s where s.id = r.school_id);
  insert into public.conversation_reads
    select * from jsonb_populate_recordset(null::public.conversation_reads, v -> 'conversation_reads');
  insert into public.board_drawings
    select r.* from jsonb_populate_recordset(null::public.board_drawings, v -> 'board_drawings') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.messages
    select * from jsonb_populate_recordset(null::public.messages, v -> 'messages')
    on conflict do nothing;

  -- Bu sürede silinmiş öğretmen/kullanıcıya işaret eden alanlar (ON DELETE SET NULL davranışı)
  update public.grades g set teacher_id = null
   where g.student_id = p_student_id and g.teacher_id is not null
     and not exists (select 1 from public.profiles p where p.id = g.teacher_id);
  update public.homework_checks c set checked_by = null
   where c.student_id = p_student_id and c.checked_by is not null
     and not exists (select 1 from public.profiles p where p.id = c.checked_by);
  update public.reading_results r set measured_by = null
   where r.student_id = p_student_id and r.measured_by is not null
     and not exists (select 1 from public.profiles p where p.id = r.measured_by);
  update public.class_members m set added_by = null
   where m.student_id = p_student_id and m.added_by is not null
     and not exists (select 1 from auth.users u where u.id = m.added_by);

  foreach t in array c_tables loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;

  delete from public.deleted_students where student_id = p_student_id;

  insert into public.audit_log (actor_id, actor_kind, school_id, table_name, row_id, action, new_data)
  values (auth.uid(), private.actor_kind(), d.school_id, 'students', p_student_id::text, 'RESTORE',
          jsonb_build_object('name', d.name, 'student_number', d.student_number, 'class_name', d.class_name));
end;
$$;
revoke all on function public.staff_restore_student(uuid) from public, anon;
grant execute on function public.staff_restore_student(uuid) to authenticated;
