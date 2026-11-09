-- ========================================================
-- Paket 11 düzeltme: tarama fonksiyonunda metin dizisine ekleme
-- text[] || 'sabit' ifadesinde sabit dizi sanılıyordu ("malformed array literal"); ::text ile düzeltildi.
-- ========================================================

create or replace function private.community_pii(p_text text, p_school uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_text text := lower(coalesce(p_text, ''));
  v_found text[] := '{}';
  v_name text;
begin
  if v_text = '' then return v_found; end if;
  if v_text ~ '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+' then v_found := v_found || 'e-posta adresi'::text; end if;
  if v_text ~ '(\+90|\m0)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\M' then v_found := v_found || 'telefon numarası'::text; end if;
  if v_text ~ '\m[1-9]\d{10}\M' then v_found := v_found || 'TC kimlik numarası olabilecek 11 haneli sayı'::text; end if;
  if p_school is not null then
    for v_name in
      select distinct s.name from public.students s
      where s.school_id = p_school and char_length(btrim(s.name)) >= 5 and position(' ' in btrim(s.name)) > 0
    loop
      if position(lower(btrim(v_name)) in v_text) > 0 then
        v_found := v_found || ('öğrenci adı: ' || v_name)::text;
      end if;
      exit when cardinality(v_found) >= 8;
    end loop;
  end if;
  return v_found;
end;
$$;
revoke all on function private.community_pii(text, uuid) from public, anon, authenticated;
