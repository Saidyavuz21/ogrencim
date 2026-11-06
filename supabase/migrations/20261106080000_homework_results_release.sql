-- ========================================================
-- ÖDEV SONUÇLARINI AÇIKLAMA ("hemen" ya da "sonra açıkla")
--  - homeworks.results_released: true = öğrenci kontrol sonucunu görür (varsayılan, eski ödevler dahil)
--  - Gizliyken öğrenci kendi homework_checks satırını okuyamaz (RLS)
--  - Gizliyken davranış puanı işlenmez (puan geçmişinden sonuç sızmasın);
--    awarded_points "öğrenciye fiilen işlenmiş puan" olarak kalır
--  - Sonuçlar açıklanınca bekleyen puan farkları tek seferde işlenir
--  - Yeniden gizlemek mümkün; önceden işlenmiş puanlar geri alınmaz, sonraki değişiklikler
--    yeniden açıklanana kadar bekler
-- ========================================================

alter table public.homeworks
  add column if not exists results_released boolean not null default true;

-- Öğrenci yalnızca açıklanmış ödevlerin sonucunu görür
drop policy if exists homework_checks_select on public.homework_checks;
create policy homework_checks_select on public.homework_checks for select to authenticated
  using (
    (select public.owns_homework(homework_id))
    or (
      student_id = (select public.current_student_id())
      and exists (select 1 from public.homeworks h where h.id = homework_checks.homework_id and h.results_released)
    )
  );

-- Puan tetikleyicisi: gizli ödevde puan işlemeden bekler
create or replace function public.homework_checks_points()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_new integer;
  v_old integer;
  v_reason text;
  v_released boolean;
begin
  if tg_op = 'DELETE' then
    -- Ödev / öğrenci silinirken (cascade) puanlara dokunma
    if old.awarded_points is null
       or not exists (select 1 from public.homeworks where id = old.homework_id)
       or not exists (select 1 from public.students where id = old.student_id) then
      return old;
    end if;
    -- Yalnızca fiilen işlenmiş puan geri alınır (gizliyken bekleyen puan işlenmemişti)
    perform public.apply_homework_points(old.student_id, old.homework_id, -old.awarded_points, 'Ödev kontrolü kaldırıldı');
    return old;
  end if;

  select results_released into v_released from public.homeworks where id = new.homework_id;

  if not coalesce(v_released, true) then
    -- Sonuç gizli: puan işleme, işlenmiş olanı koru
    if tg_op = 'INSERT' then
      new.awarded_points := 0;
    else
      new.awarded_points := old.awarded_points;
    end if;
    return new;
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
    if tg_op = 'UPDATE' and old.status <> new.status and old.awarded_points = public.homework_status_points(old.status) then
      v_reason := v_reason || ' (düzeltme)';
    end if;
    perform public.apply_homework_points(new.student_id, new.homework_id, v_new - v_old, v_reason);
  end if;
  return new;
end;
$$;
revoke execute on function public.homework_checks_points() from public, anon, authenticated;

-- Sonuçlar açıklanınca bekleyen puanları işle (kontrol satırlarını "dokunarak" puan tetikleyicisine bırakır)
create or replace function public.homeworks_release_results()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.results_released and not old.results_released then
    update public.homework_checks set updated_at = updated_at where homework_id = new.id;
  end if;
  return null;
end;
$$;
revoke execute on function public.homeworks_release_results() from public, anon, authenticated;

drop trigger if exists homeworks_release_results on public.homeworks;
create trigger homeworks_release_results
  after update of results_released on public.homeworks
  for each row execute function public.homeworks_release_results();
