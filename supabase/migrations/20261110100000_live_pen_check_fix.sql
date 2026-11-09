-- ========================================================
-- Paket 10 düzeltme: kalem izni denetimi
-- Kimsede kalem yokken (pen_student boş) "pen_student = öğrenci" karşılaştırması NULL döner;
-- NOT NULL da NULL olduğu için izin denetimi reddetmiyordu. coalesce(..., false) ile kapatıldı.
-- (supabase/tests/live_test.sql: "Kalem izni yokken tahtaya yazılamaz")
-- ========================================================

create or replace function public.live_save_layer(p_session uuid, p_page text, p_kind text, p_strokes jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
  v_student uuid;
  v_at timestamptz := now();
begin
  if p_kind not in ('shared', 'private') then raise exception 'Geçersiz katman.'; end if;
  if jsonb_typeof(p_strokes) is distinct from 'array' then raise exception 'Çizim geçersiz.'; end if;
  if octet_length(p_strokes::text) > 262144 then raise exception 'Bu sayfadaki çizim sınırı doldu. Bazı çizgileri silip yeniden dene.'; end if;
  perform private.check_rate('live_layer', 240, 60);
  select * into s from public.live_sessions where id = p_session and ended_at is null;
  if not found then raise exception 'Canlı ders bulunamadı ya da bitti.'; end if;
  if not exists (
    select 1 from public.live_content c, jsonb_array_elements(c.content -> 'pages') p
    where c.session_id = s.id and p ->> 'id' = p_page
  ) then
    raise exception 'Sayfa bulunamadı.';
  end if;

  if s.teacher_id = auth.uid() then
    if p_kind <> 'shared' then raise exception 'Öğretmen ortak katmana yazar.'; end if;
    v_student := null;
  else
    v_student := public.current_student_id();
    if v_student is null or not public.student_in_class(s.class_name, s.school_id) then
      raise exception 'Canlı ders bulunamadı ya da bitti.';
    end if;
    if p_kind = 'shared' and not coalesce(s.pen_all or (s.pen_student = v_student and s.pen_until > now() - interval '3 seconds'), false) then
      raise exception 'Kalem izni yok ya da süresi doldu.';
    end if;
  end if;

  insert into public.live_layers (session_id, page_id, kind, author_student, strokes, updated_at)
  values (s.id, p_page, p_kind, v_student, p_strokes, v_at)
  on conflict on constraint live_layers_owner do update set strokes = excluded.strokes, updated_at = excluded.updated_at;
  return v_at;
end;
$$;
revoke all on function public.live_save_layer(uuid, text, text, jsonb) from public, anon;
grant execute on function public.live_save_layer(uuid, text, text, jsonb) to authenticated;
