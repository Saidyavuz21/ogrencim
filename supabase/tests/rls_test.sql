-- ========================================================
-- Veritabanı yetki (RLS) testleri
-- Sahte iki okul, üç öğretmen, üç öğrenci oluşturur; her rol için ne görüp neyi değiştirebildiğini sınar.
-- Hepsi TEK İŞLEM içinde çalışır ve sonda ROLLBACK edilir: veritabanında hiçbir iz kalmaz.
-- Bir kontrol başarısız olursa "BAŞARISIZ: …" hatasıyla durur.
--
-- Çalıştırma:  scripts/test-rls.sh   (TEST_DATABASE_URL ile)  ya da Supabase SQL Editor'e yapıştırarak.
-- ========================================================
begin;

-- --------------------------------------------------------
-- Yardımcılar (geçici şema: işlem bitince yok olur)
-- --------------------------------------------------------
create temp table t_results (n serial, test text, detail text);
grant insert, select on t_results to authenticated, anon;
grant usage on sequence t_results_n_seq to authenticated, anon;

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'BAŞARISIZ: %', msg; end if;
  insert into t_results (test) values (msg);
end $$;

-- Verilen kullanıcı olarak (authenticated rolü + JWT sub) devam et
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Sorgu reddedilmeli (yetki hatası, RLS ihlali ya da fonksiyonun kendi "yetkiniz yok" hatası)
create function pg_temp.denied(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    insert into t_results (test, detail) values (msg, sqlstate || ' ' || sqlerrm);
    return;
  end;
  raise exception 'BAŞARISIZ: % (reddedilmesi gerekiyordu, işlem yapıldı)', msg;
end $$;

-- --------------------------------------------------------
-- Sahte veri
-- --------------------------------------------------------
insert into public.schools (id, name, city, district, status) values
  ('00000000-0000-4000-8000-00000000a000', 'TEST Okulu A', 'Test', 'Test', 'approved'),
  ('00000000-0000-4000-8000-00000000b000', 'TEST Okulu B', 'Test', 'Test', 'approved');

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'rls-a1@test.invalid', '{"name":"Öğretmen A1"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'rls-a2@test.invalid', '{"name":"Öğretmen A2"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'rls-b1@test.invalid', '{"name":"Öğretmen B1"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', null, '{}', true, now(), now());

-- handle_new_user profilleri onaysız açar; öğretmenleri onayla ve okul/sınıf ata
update public.profiles set approved = true, is_active = true, school_id = '00000000-0000-4000-8000-00000000a000', class_name = 'T-9A'
 where id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set approved = true, is_active = true, school_id = '00000000-0000-4000-8000-00000000a000', class_name = 'T-9B'
 where id = '00000000-0000-4000-8000-0000000000a2';
update public.profiles set approved = true, is_active = true, school_id = '00000000-0000-4000-8000-00000000b000', class_name = 'T-9A'
 where id = '00000000-0000-4000-8000-0000000000b1';

insert into public.students (id, student_number, name, class_name, school_id) values
  ('00000000-0000-4000-8000-0000000005a1', 'T001', 'Öğrenci A1', 'T-9A', '00000000-0000-4000-8000-00000000a000'),
  ('00000000-0000-4000-8000-0000000005a2', 'T002', 'Öğrenci A2', 'T-9B', '00000000-0000-4000-8000-00000000a000'),
  ('00000000-0000-4000-8000-0000000005b1', 'T001', 'Öğrenci B1', 'T-9A', '00000000-0000-4000-8000-00000000b000');

insert into public.student_credentials (student_id, pin_hash, pin_enc)
select id, extensions.crypt('1234', extensions.gen_salt('bf', 4)), extensions.pgp_sym_encrypt('1234', private.student_pin_key())
from public.students where id in ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1');

insert into public.points_history (student_id, teacher_name, change_type, amount, reason)
select id, 'Test', 'plus', 1, 'RLS testi'
from public.students where id in ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1');

-- Öğrenci A1'in açık oturumu (anonim kullanıcı c1)
insert into public.student_sessions (auth_uid, student_id)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000005a1');

create temp view t_students with (security_invoker = true) as
  select id from public.students
  where id in ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1');
grant select on t_students to authenticated, anon;

-- ========================================================
-- Öğretmen A1 (Okul A, sınıf T-9A)
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000a1');

select pg_temp.ok((select count(*) from public.students where id in (
  '00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1')) = 2,
  'Öğretmen kendi okulunun öğrencilerini görür, başka okulunkini görmez');

select pg_temp.ok((select count(*) from public.points_history where student_id = '00000000-0000-4000-8000-0000000005b1') = 0,
  'Öğretmen başka okuldaki öğrencinin puan geçmişini görmez');

with u as (update public.students set name = name where id = '00000000-0000-4000-8000-0000000005a2' returning 1)
select pg_temp.ok(count(*) = 0,
  'Öğretmen aynı okuldaki başka sınıfın öğrencisini değiştiremez') from u;

with u as (update public.students set name = name where id = '00000000-0000-4000-8000-0000000005a1' returning 1)
select pg_temp.ok(count(*) = 1,
  'Öğretmen kendi sınıfındaki öğrenciyi değiştirebilir') from u;

select pg_temp.ok((select array_agg(student_id::text || ':' || coalesce(pin, '-'))
                   from public.staff_list_student_pins(array[
                     '00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1']::uuid[]))
                  = array['00000000-0000-4000-8000-0000000005a1:1234'],
  'Öğretmen yalnızca kendi sınıfındaki öğrencinin PIN''ini görür');

select pg_temp.ok((select count(*) from public.access_log where student_id = '00000000-0000-4000-8000-0000000005a1') = 0,
  'Öğretmen erişim kaydını okuyamaz (yazılmış olsa bile)');
select pg_temp.ok((select count(*) from public.audit_log) = 0,
  'Okul yöneticisi olmayan öğretmen işlem kaydını göremez');

select pg_temp.denied($q$ select * from public.deleted_students $q$,
  'Silinenler tablosu doğrudan okunamaz');
select pg_temp.denied($q$ select public.staff_delete_student('00000000-0000-4000-8000-0000000005a2') $q$,
  'Öğretmen başka sınıfın öğrencisini silemez');
select pg_temp.denied($q$ insert into public.data_requests (school_id, student_name, kind, requester_name)
                          values ('00000000-0000-4000-8000-00000000a000', 'x', 'export', 'x') $q$,
  'Okul yöneticisi olmayan öğretmen KVKK talebi kaydedemez');
select pg_temp.denied($q$ select public.staff_export_student('00000000-0000-4000-8000-0000000005b1') $q$,
  'Öğretmen başka okuldaki öğrencinin verisini dışa aktaramaz');
select pg_temp.denied($q$ insert into public.audit_log (actor_kind, table_name, action) values ('x', 'x', 'INSERT') $q$,
  'İşlem kaydına doğrudan yazılamaz');

reset role;

-- ========================================================
-- Öğretmen B1 (Okul B)
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000b1');

select pg_temp.ok((select array_agg(id::text) from t_students) = array['00000000-0000-4000-8000-0000000005b1'],
  'Okul B öğretmeni yalnızca kendi okulunun öğrencisini görür');
select pg_temp.denied($q$ select public.staff_delete_student('00000000-0000-4000-8000-0000000005a1') $q$,
  'Öğretmen başka okulun öğrencisini silemez');
select pg_temp.denied($q$ select public.staff_set_student_pin('00000000-0000-4000-8000-0000000005a1', '9999') $q$,
  'Öğretmen başka okulun öğrencisinin PIN''ini değiştiremez');

reset role;

-- ========================================================
-- Öğrenci A1 (anonim oturum + PIN oturumu)
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000c1');

select pg_temp.ok((select array_agg(id::text) from t_students) = array['00000000-0000-4000-8000-0000000005a1'],
  'Öğrenci yalnızca kendi kaydını görür');
select pg_temp.ok((select count(*) from public.points_history where student_id in (
  '00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000005b1')) = 0,
  'Öğrenci başkasının puan geçmişini görmez');
with u as (update public.students set points = 999 where id = '00000000-0000-4000-8000-0000000005a1' returning 1)
select pg_temp.ok(count(*) = 0,
  'Öğrenci kendi puanını değiştiremez') from u;
select pg_temp.denied($q$ select * from public.staff_list_student_pins(array['00000000-0000-4000-8000-0000000005a1']::uuid[]) $q$,
  'Öğrenci PIN listesini çağıramaz');
select pg_temp.denied($q$ select public.staff_give_points('00000000-0000-4000-8000-0000000005a1', 50, 'hile') $q$,
  'Öğrenci kendine puan veremez');
select pg_temp.ok((select count(*) from public.audit_log) = 0, 'Öğrenci işlem kaydını göremez');

reset role;

-- ========================================================
-- Giriş yapmamış ziyaretçi (anon)
-- ========================================================
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.denied($q$ select count(*) from public.students $q$, 'Ziyaretçi öğrenci tablosunu okuyamaz');
select pg_temp.denied($q$ select count(*) from public.points_history $q$, 'Ziyaretçi puan geçmişini okuyamaz');
select pg_temp.denied($q$ select count(*) from public.audit_log $q$, 'Ziyaretçi işlem kaydını okuyamaz');
select pg_temp.denied($q$ select public.staff_export_student('00000000-0000-4000-8000-0000000005a1') $q$,
  'Ziyaretçi dışa aktarma fonksiyonunu çağıramaz');
reset role;

-- Reddedilenlerde hata mesajı da listelenir: "yetkiniz yok" yerine başka bir hata (ör. fonksiyon yok) varsa test yanlış sebeple geçmiştir.
select n, test, detail from t_results order by n;
rollback;
