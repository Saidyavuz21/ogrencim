-- ========================================================
-- İşlem kaydı düzeltmesi: öğrenci silinince zincirleme silinen alt kayıtlar (puan geçmişi vb.)
-- tek tek yazılıyordu (cascade silmede pg_trigger_depth artmıyor). Artık öğrencisi kalmamış
-- alt kayıtların silinmesi yazılmaz; öğrencinin silinmesi ve kopyası yeterli.
-- ========================================================

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redact text[] := case when TG_NARGS > 0 and TG_ARGV[0] <> '' then string_to_array(TG_ARGV[0], ',') else '{}'::text[] end;
  v_ignore text[] := case when TG_NARGS > 1 and TG_ARGV[1] <> '' then string_to_array(TG_ARGV[1], ',') else '{}'::text[] end;
  o jsonb;
  n jsonb;
  r jsonb;
  k text;
  v_school uuid;
begin
  -- Öğrenci silinince alt kayıtlar zincirleme (cascade) silinir; bunlar tek tek yazılmaz
  -- (öğrencinin silinmesi kaydedilir, verinin kopyası "silinenler" kutusunda durur).
  -- (Zincirleme silmede pg_trigger_depth artmıyor; bu yüzden öğrencisi artık olmayan alt kayıt da atlanır.)
  if TG_OP = 'DELETE' and (
    pg_trigger_depth() > 1
    or (TG_TABLE_NAME <> 'students' and to_jsonb(OLD) ? 'student_id'
        and not exists (select 1 from public.students s where s.id = public.try_uuid(to_jsonb(OLD) ->> 'student_id')))
  ) then
    return null;
  end if;

  if TG_OP <> 'INSERT' then o := to_jsonb(OLD); end if;
  if TG_OP <> 'DELETE' then n := to_jsonb(NEW); end if;

  if TG_OP = 'UPDATE' then
    select jsonb_object_agg(e.key, e.value) into r
    from jsonb_each(n) e
    where (o -> e.key) is distinct from e.value
      and e.key <> all (v_ignore || array['updated_at']);
    if r is null then
      return null; -- kayda değer değişiklik yok
    end if;
    select jsonb_object_agg(e.key, e.value) into o from jsonb_each(o) e where r ? e.key;
    n := r;
  end if;

  foreach k in array v_redact loop
    if o ? k then o := jsonb_set(o, array[k], '"***"'); end if;
    if n ? k then n := jsonb_set(n, array[k], '"***"'); end if;
  end loop;

  r := coalesce(to_jsonb(NEW), to_jsonb(OLD));
  v_school := public.try_uuid(r ->> 'school_id');
  if v_school is null and r ? 'student_id' then
    select s.school_id into v_school from public.students s where s.id = public.try_uuid(r ->> 'student_id');
  end if;

  insert into public.audit_log (actor_id, actor_kind, actor_student_id, school_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(), private.actor_kind(), public.current_student_id(), v_school,
    TG_TABLE_NAME, coalesce(r ->> 'id', r ->> 'student_id'), TG_OP, o, n
  );
  return null;
end;
$$;
revoke all on function private.audit_row() from public, anon, authenticated;
