-- ========================================================
-- Canlı ders ve tahta sürüm geçmişi testleri (Paket 10)
-- Sahte okul, öğretmen ve üç öğrenci oluşturur; kim neyi görüp yazabiliyor sınar.
-- TEK İŞLEM içinde çalışır ve sonda ROLLBACK edilir: veritabanında iz kalmaz.
-- Bir kontrol başarısız olursa "BAŞARISIZ: …" hatasıyla durur.
--
-- Çalıştırma: Supabase SQL Editor'e yapıştırarak ya da psql ile (TEST_DATABASE_URL).
-- ========================================================
begin;

-- Sonuçlar ayrı bir şemada (işlemle birlikte geri alınır); tam adla yazıldığı için arama yolundan etkilenmez
create schema live_test;
grant usage on schema live_test to authenticated, anon;
create table live_test.results (n serial, test text, detail text);
grant insert, select on live_test.results to authenticated, anon;
grant usage on sequence live_test.results_n_seq to authenticated, anon;
create table live_test.ids (k text primary key, v uuid);
grant insert, select, update on live_test.ids to authenticated, anon;

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'BAŞARISIZ: %', msg; end if;
  insert into live_test.results (test) values (msg);
end $$;

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.denied(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    insert into live_test.results (test, detail) values (msg, sqlstate || ' ' || sqlerrm);
    return;
  end;
  raise exception 'BAŞARISIZ: % (reddedilmesi gerekiyordu, işlem yapıldı)', msg;
end $$;

create function pg_temp.id(key text) returns uuid language sql as $$ select v from live_test.ids where k = key $$;

-- --------------------------------------------------------
-- Sahte veri: okul A, öğretmen a1 (T-9A), öğrenciler s1, s2 (T-9A) ve s3 (T-9B)
-- --------------------------------------------------------
insert into public.schools (id, name, city, district, status) values
  ('00000000-0000-4000-8000-00000000a000', 'TEST Okulu A', 'Test', 'Test', 'approved');

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'live-a1@test.invalid', '{"name":"Öğretmen A1"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', null, '{}', true, now(), now());

update public.profiles set approved = true, is_active = true, school_id = '00000000-0000-4000-8000-00000000a000', class_name = 'T-9A'
 where id = '00000000-0000-4000-8000-0000000000a1';

insert into public.students (id, student_number, name, class_name, school_id) values
  ('00000000-0000-4000-8000-0000000005a1', 'T001', 'Öğrenci 1', 'T-9A', '00000000-0000-4000-8000-00000000a000'),
  ('00000000-0000-4000-8000-0000000005a2', 'T002', 'Öğrenci 2', 'T-9A', '00000000-0000-4000-8000-00000000a000'),
  ('00000000-0000-4000-8000-0000000005a3', 'T003', 'Öğrenci 3', 'T-9B', '00000000-0000-4000-8000-00000000a000');

insert into public.student_sessions (auth_uid, student_id) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000005a1'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000005a2'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000005a3');

-- ========================================================
-- Öğretmen: tahta, sürüm geçmişi, canlı ders başlatma
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000a1');

with b as (
  insert into public.boards (title, content)
  values ('Test tahtası', '{"version":1,"pages":[{"id":"p1","background":"blank","elements":[{"id":"e1","type":"note","x":0,"y":0,"w":10,"h":10,"text":"ilk","color":"#fff","fontSize":24}]}]}')
  returning id
)
insert into live_test.ids select 'board', id from b;

update public.boards set content = jsonb_set(content, '{pages,0,elements,0,text}', '"ikinci"') where id = pg_temp.id('board');
select pg_temp.ok((select count(*) from public.board_versions where board_id = pg_temp.id('board')) = 1,
  'Tahta değişince önceki hâli sürüm olarak saklanır');
update public.boards set content = jsonb_set(content, '{pages,0,elements,0,text}', '"üçüncü"') where id = pg_temp.id('board');
select pg_temp.ok((select count(*) from public.board_versions where board_id = pg_temp.id('board')) = 1,
  '10 dakika içinde ikinci sürüm alınmaz');
select pg_temp.ok((select content #>> '{pages,0,elements,0,text}' from public.board_versions where board_id = pg_temp.id('board')) = 'ilk',
  'Sürüm, değişiklikten önceki hâli tutar');

select pg_temp.ok((public.board_restore_version((select id from public.board_versions where board_id = pg_temp.id('board'))) #>> '{pages,0,elements,0,text}') = 'ilk',
  'Sürüme dönülür');
select pg_temp.ok((select content #>> '{pages,0,elements,0,text}' from public.boards where id = pg_temp.id('board')) = 'ilk'
                  and (select count(*) from public.board_versions where board_id = pg_temp.id('board') and reason = 'restore') = 1,
  'Geri dönmeden önceki hâl de saklanır');

with q as (
  insert into public.quiz_questions (body, choices, correct_index, explanation)
  values ('2 + 2 kaçtır?', array['3', '4', '5'], 1, 'Dört.')
  returning id
)
insert into live_test.ids select 'question', id from q;

insert into live_test.ids values ('session', public.live_start('T-9A', pg_temp.id('board'), 'Canlı test',
  '{"version":1,"pages":[{"id":"p1","background":"blank","elements":[]},{"id":"p2","background":"grid","elements":[]}]}', '{}'));
select pg_temp.ok(pg_temp.id('session') is not null, 'Öğretmen kendi sınıfında canlı ders başlatır');
select pg_temp.denied($q$ select public.live_start('T-9B', null, 'Başka sınıf', '{"pages":[{"id":"x","elements":[]}]}', '{}') $q$,
  'Öğretmen yetkisi olmayan sınıfta canlı ders başlatamaz');

select pg_temp.ok((public.live_open_question(pg_temp.id('session'), pg_temp.id('question'))) ->> 'correct_index' is null,
  'Açılan soruda doğru cevap yok');
insert into live_test.ids values ('qkey', ((select question ->> 'key' from public.live_sessions where id = pg_temp.id('session')))::uuid);
select pg_temp.ok(public.live_save_layer(pg_temp.id('session'), 'p1', 'shared', '[{"id":"t1","type":"stroke","points":[0,0,5,5],"color":"#000","width":3}]') is not null,
  'Öğretmen ortak katmana yazar');
select pg_temp.denied($q$ select public.live_save_layer(pg_temp.id('session'), 'yok', 'shared', '[]') $q$,
  'Olmayan sayfaya yazılamaz');
reset role;

-- ========================================================
-- Öğrenci 1 (aynı sınıf)
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000c1');
select pg_temp.ok((select count(*) from public.live_sessions where id = pg_temp.id('session')) = 1, 'Sınıftaki öğrenci canlı dersi görür');
select pg_temp.ok((select count(*) from public.live_content where session_id = pg_temp.id('session')) = 1, 'Sınıftaki öğrenci tahtanın kopyasını görür');
select pg_temp.ok((select question ->> 'correct_index' from public.live_sessions where id = pg_temp.id('session')) is null,
  'Öğrenci doğru cevabı göremez');
select pg_temp.ok((select count(*) from public.boards where id = pg_temp.id('board')) = 0, 'Öğrenci öğretmenin tahtasını göremez');
select pg_temp.ok((select count(*) from public.board_versions) = 0, 'Öğrenci sürüm geçmişini göremez');
select public.live_answer(pg_temp.id('session'), pg_temp.id('qkey'), 1);
select public.live_answer(pg_temp.id('session'), pg_temp.id('qkey'), 1);
select pg_temp.ok((select count(*) from public.live_answers where session_id = pg_temp.id('session')) = 1, 'Öğrenci cevap verir (tekrar cevap üstüne yazılır)');
select pg_temp.denied($q$ select public.live_answer(pg_temp.id('session'), pg_temp.id('qkey'), 7) $q$, 'Olmayan seçenek reddedilir');
select public.live_save_layer(pg_temp.id('session'), 'p1', 'private', '[{"id":"s1","type":"stroke","points":[1,1,2,2],"color":"#000","width":3}]');
select pg_temp.ok((select count(*) from public.live_layers where session_id = pg_temp.id('session')) = 2, 'Öğrenci ortak katmanı ve kendi defterini görür');
select pg_temp.denied($q$ select public.live_save_layer(pg_temp.id('session'), 'p1', 'shared', '[]') $q$, 'Kalem izni yokken tahtaya yazılamaz');
select public.live_heartbeat(pg_temp.id('session'));
select pg_temp.denied($q$ select public.live_control(pg_temp.id('session'), '{"page_index":1}') $q$, 'Öğrenci dersi yönetemez');
select pg_temp.denied($q$ select public.live_open_question(pg_temp.id('session'), pg_temp.id('question')) $q$, 'Öğrenci soru açamaz');
reset role;

-- ========================================================
-- Öğrenci 3 (başka sınıf)
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000c3');
select pg_temp.ok((select count(*) from public.live_sessions) = 0, 'Başka sınıfın öğrencisi canlı dersi görmez');
select pg_temp.ok((select count(*) from public.live_content) = 0, 'Başka sınıfın öğrencisi tahta kopyasını görmez');
select pg_temp.ok((select count(*) from public.live_layers) = 0, 'Başka sınıfın öğrencisi çizimleri görmez');
select pg_temp.denied($q$ select public.live_answer(pg_temp.id('session'), pg_temp.id('qkey'), 0) $q$, 'Başka sınıfın öğrencisi cevap veremez');
reset role;

-- ========================================================
-- Öğrenci 2: başkasının defterini görmez
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000c2');
select pg_temp.ok((select count(*) from public.live_layers where session_id = pg_temp.id('session')) = 1, 'Öğrenci başkasının defterini görmez (yalnızca ortak katman)');
select pg_temp.ok((select count(*) from public.live_answers) = 0, 'Öğrenci başkasının cevabını görmez');
reset role;

-- ========================================================
-- Öğretmen: yansıtma ve kalem izni
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000a1');
select public.live_control(pg_temp.id('session'), '{"projected_student":"00000000-0000-4000-8000-0000000005a1","pen_student":"00000000-0000-4000-8000-0000000005a2","pen_seconds":30}');
select pg_temp.denied($q$ select public.live_control(pg_temp.id('session'), '{"projected_student":"00000000-0000-4000-8000-0000000005a3"}') $q$,
  'Başka sınıfın öğrencisi yansıtılamaz');
select pg_temp.ok((select count(*) from public.live_participants where session_id = pg_temp.id('session')) = 1, 'Öğretmen bağlı öğrencileri görür');
select pg_temp.ok((select count(*) from public.live_answers where session_id = pg_temp.id('session')) = 1, 'Öğretmen cevapları görür');
reset role;

select pg_temp.login('00000000-0000-4000-8000-0000000000c2');
select pg_temp.ok((select count(*) from public.live_layers where session_id = pg_temp.id('session')) = 2, 'Yansıtılan öğrencinin defteri sınıfa görünür');
select pg_temp.ok(public.live_save_layer(pg_temp.id('session'), 'p1', 'shared', '[{"id":"s2","type":"stroke","points":[3,3,4,4],"color":"#000","width":3}]') is not null,
  'Kalem izni olan öğrenci tahtaya yazar');
reset role;

select pg_temp.login('00000000-0000-4000-8000-0000000000c1');
select pg_temp.denied($q$ select public.live_save_layer(pg_temp.id('session'), 'p1', 'shared', '[]') $q$, 'Kalem başkasındayken tahtaya yazılamaz');
reset role;

-- ========================================================
-- Öğretmen: cevabı göster, dersi bitir
-- ========================================================
select pg_temp.login('00000000-0000-4000-8000-0000000000a1');
select pg_temp.ok((public.live_close_question(pg_temp.id('session'), true)) @> '{"closed":true,"correct_index":1,"counts":[0,1,0],"total":1}',
  'Cevap gösterilince doğru cevap ve dağılım açılır');
reset role;

select pg_temp.login('00000000-0000-4000-8000-0000000000c1');
select pg_temp.ok((select (question ->> 'correct_index')::int from public.live_sessions where id = pg_temp.id('session')) = 1, 'Gösterilen doğru cevap öğrenciye ulaşır');
select pg_temp.denied($q$ select public.live_answer(pg_temp.id('session'), pg_temp.id('qkey'), 0) $q$, 'Kapanan soruya cevap verilemez');
reset role;

select pg_temp.login('00000000-0000-4000-8000-0000000000a1');
select public.live_end(pg_temp.id('session'));
select pg_temp.ok((select count(*) from public.live_layers where session_id = pg_temp.id('session')) = 0
                  and (select count(*) from public.live_participants where session_id = pg_temp.id('session')) = 0,
  'Ders bitince çizimler ve katılım bilgisi silinir');
reset role;

select pg_temp.login('00000000-0000-4000-8000-0000000000c1');
select pg_temp.ok((select ended_at is not null from public.live_sessions where id = pg_temp.id('session')), 'Öğrenci dersin bittiğini görür');
select pg_temp.denied($q$ select public.live_save_layer(pg_temp.id('session'), 'p1', 'private', '[]') $q$, 'Biten derse yazılamaz');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.denied($q$ select count(*) from public.live_sessions $q$, 'Ziyaretçi canlı dersleri okuyamaz');
select pg_temp.denied($q$ select public.live_heartbeat(pg_temp.id('session')) $q$, 'Ziyaretçi canlı ders fonksiyonu çağıramaz');
reset role;

select n, test, detail from live_test.results order by n;
rollback;
