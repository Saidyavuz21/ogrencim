-- ========================================================
-- ÖDEV KONTROLÜ → DAVRANIŞ PUANI
--   Yaptı +1 · Kısmen 0 · Yapmadı −1
-- - Durum değişince yalnızca fark uygulanır (Yaptı → Yapmadı = −2); aynı ödevden çift puan olmaz
-- - Öğretmen işareti kaldırırsa verilen puan geri alınır
-- - Ödev veya öğrenci silinince kazanılmış puanlar geri alınmaz
-- - Bu migration'dan önceki kontroller puan vermemiştir (awarded_points = null);
--   böyle bir kontrolün durumu sonradan değişirse yeni durumun puanı verilir
-- Puan geçmişine "Ödev yapıldı: <ödev başlığı>" gibi kayıt düşer (öğrenci panelinde görünür)
-- ========================================================

alter table public.homework_checks add column if not exists awarded_points integer;

create or replace function public.homework_status_points(p_status text)
returns integer language sql immutable set search_path = '' as $$
  select case p_status when 'yapti' then 1 when 'yapmadi' then -1 else 0 end;
$$;

-- Puanı öğrenciye işler ve geçmişe yazar (yalnızca tetikleyiciden çağrılır)
create or replace function public.apply_homework_points(p_student_id uuid, p_homework_id uuid, p_delta integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_teacher text;
begin
  if p_delta = 0 then
    return;
  end if;
  select title into v_title from public.homeworks where id = p_homework_id;
  select coalesce(nullif(full_name, ''), 'Öğretmen') into v_teacher from public.profiles where id = auth.uid();

  update public.students
     set points = coalesce(points, 0) + p_delta,
         plus_count = coalesce(plus_count, 0) + case when p_delta > 0 then 1 else 0 end,
         minus_count = coalesce(minus_count, 0) + case when p_delta < 0 then 1 else 0 end
   where id = p_student_id;
  if not found then
    return;
  end if;

  insert into public.points_history (student_id, teacher_name, change_type, amount, reason)
  values (
    p_student_id,
    coalesce(v_teacher, 'Öğretmen'),
    case when p_delta > 0 then 'plus' else 'minus' end,
    p_delta,
    left(p_reason || coalesce(': ' || v_title, ''), 200)
  );
end;
$$;
revoke execute on function public.apply_homework_points(uuid, uuid, integer, text) from public, anon, authenticated;

create or replace function public.homework_checks_points()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_new integer;
  v_old integer;
  v_reason text;
begin
  if tg_op = 'DELETE' then
    -- Ödev / öğrenci silinirken (cascade) puanlara dokunma
    if old.awarded_points is null
       or not exists (select 1 from public.homeworks where id = old.homework_id)
       or not exists (select 1 from public.students where id = old.student_id) then
      return old;
    end if;
    perform public.apply_homework_points(old.student_id, old.homework_id, -old.awarded_points, 'Ödev kontrolü kaldırıldı');
    return old;
  end if;

  v_new := public.homework_status_points(new.status);

  if tg_op = 'INSERT' then
    v_old := 0;
  elsif old.awarded_points is null then
    -- Eski (puansız) kontrol: durum aynıysa yine puan verilmez
    if new.status = old.status then
      new.awarded_points := null;
      return new;
    end if;
    v_old := 0;
  else
    v_old := old.awarded_points;
  end if;

  new.awarded_points := v_new;
  if v_new <> v_old then
    v_reason := case new.status
      when 'yapti' then 'Ödev yapıldı'
      when 'yapmadi' then 'Ödev yapılmadı'
      else 'Ödev kısmen yapıldı'
    end;
    if tg_op = 'UPDATE' and old.status <> new.status then
      v_reason := v_reason || ' (düzeltme)';
    end if;
    perform public.apply_homework_points(new.student_id, new.homework_id, v_new - v_old, v_reason);
  end if;
  return new;
end;
$$;
revoke execute on function public.homework_checks_points() from public, anon, authenticated;

drop trigger if exists homework_checks_points on public.homework_checks;
create trigger homework_checks_points
  before insert or update or delete on public.homework_checks
  for each row execute function public.homework_checks_points();
