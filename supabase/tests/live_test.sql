-- ========================================================
-- Canlı ders ve tahta sürüm geçmişi testleri (Paket 10)
-- Sahte okul, öğretmen ve üç öğrenci oluşturur; kim neyi görüp yazabiliyor sınar.
--
-- Bütün test TEK BİR komuttur (DO bloğu) ve sonunda bilerek hata verir:
-- böylece SQL Editor nasıl çalıştırırsa çalıştırsın her şey geri alınır, veritabanında iz kalmaz.
--   Hepsi geçerse:      ERROR: TEST TAMAM: <sayı> kontrol geçti …
--   Biri başarısızsa:   ERROR: BAŞARISIZ: <kontrolün adı>
--
-- Çalıştırma: Supabase SQL Editor'e dosyanın tamamını yapıştırıp Run (ya da psql ile).
-- ========================================================
do $test$
declare
  v_teacher constant uuid := '00000000-0000-4000-8000-0000000000a1';
  v_c1 constant uuid := '00000000-0000-4000-8000-0000000000c1';  -- öğrenci 1 (T-9A)
  v_c2 constant uuid := '00000000-0000-4000-8000-0000000000c2';  -- öğrenci 2 (T-9A)
  v_c3 constant uuid := '00000000-0000-4000-8000-0000000000c3';  -- öğrenci 3 (T-9B)
  v_s1 constant uuid := '00000000-0000-4000-8000-0000000005a1';
  v_s2 constant uuid := '00000000-0000-4000-8000-0000000005a2';
  v_s3 constant uuid := '00000000-0000-4000-8000-0000000005a3';
  v_school constant uuid := '00000000-0000-4000-8000-00000000a000';
  v_board uuid;
  v_question uuid;
  v_session uuid;
  v_key uuid;
  v_json jsonb;
  v_n integer;
  v_passed text[] := '{}';
  v_msg text;

  -- Kontrol: koşul doğru değilse dur
  -- (plpgsql'de iç fonksiyon olmadığı için aşağıda tekrar eden kalıp kullanılır)
begin
  -- ------------------------------------------------------
  -- Sahte veri (yönetici olarak)
  -- ------------------------------------------------------
  insert into public.schools (id, name, city, district, status) values (v_school, 'TEST Okulu A', 'Test', 'Test', 'approved');
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', v_teacher, 'authenticated', 'authenticated', 'live-a1@test.invalid', '{"name":"Öğretmen A1"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_c1, 'authenticated', 'authenticated', null, '{}', true, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_c2, 'authenticated', 'authenticated', null, '{}', true, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_c3, 'authenticated', 'authenticated', null, '{}', true, now(), now());
  update public.profiles set approved = true, is_active = true, school_id = v_school, class_name = 'T-9A' where id = v_teacher;
  insert into public.students (id, student_number, name, class_name, school_id) values
    (v_s1, 'T001', 'Öğrenci 1', 'T-9A', v_school),
    (v_s2, 'T002', 'Öğrenci 2', 'T-9A', v_school),
    (v_s3, 'T003', 'Öğrenci 3', 'T-9B', v_school);
  insert into public.student_sessions (auth_uid, student_id) values (v_c1, v_s1), (v_c2, v_s2), (v_c3, v_s3);

  -- ======================================================
  -- Öğretmen: tahta, sürüm geçmişi, canlı ders başlatma
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  insert into public.boards (title, content)
  values ('Test tahtası', '{"version":1,"pages":[{"id":"p1","background":"blank","elements":[{"id":"e1","type":"note","x":0,"y":0,"w":10,"h":10,"text":"ilk","color":"#fff","fontSize":24}]}]}')
  returning id into v_board;

  update public.boards set content = jsonb_set(content, '{pages,0,elements,0,text}', '"ikinci"') where id = v_board;
  v_msg := 'Tahta değişince önceki hâli sürüm olarak saklanır';
  if (select count(*) from public.board_versions where board_id = v_board) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  update public.boards set content = jsonb_set(content, '{pages,0,elements,0,text}', '"üçüncü"') where id = v_board;
  v_msg := '10 dakika içinde ikinci sürüm alınmaz';
  if (select count(*) from public.board_versions where board_id = v_board) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Sürüm, değişiklikten önceki hâli tutar';
  if (select content #>> '{pages,0,elements,0,text}' from public.board_versions where board_id = v_board) is distinct from 'ilk' then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Sürüme dönülür';
  v_json := public.board_restore_version((select id from public.board_versions where board_id = v_board));
  if v_json #>> '{pages,0,elements,0,text}' is distinct from 'ilk' then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Geri dönmeden önceki hâl de saklanır';
  if (select content #>> '{pages,0,elements,0,text}' from public.boards where id = v_board) is distinct from 'ilk'
     or (select count(*) from public.board_versions where board_id = v_board and reason = 'restore') <> 1 then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  insert into public.quiz_questions (body, choices, correct_index, explanation)
  values ('2 + 2 kaçtır?', array['3', '4', '5'], 1, 'Dört.')
  returning id into v_question;

  v_msg := 'Öğretmen kendi sınıfında canlı ders başlatır';
  v_session := public.live_start('T-9A', v_board, 'Canlı test',
    '{"version":1,"pages":[{"id":"p1","background":"blank","elements":[]},{"id":"p2","background":"grid","elements":[]}]}', '{}');
  if v_session is null then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğretmen yetkisi olmayan sınıfta canlı ders başlatamaz';
  begin
    perform public.live_start('T-9B', null, 'Başka sınıf', '{"pages":[{"id":"x","elements":[]}]}', '{}');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Açılan soruda doğru cevap yok';
  v_json := public.live_open_question(v_session, v_question);
  if v_json ? 'correct_index' then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;
  v_key := (v_json ->> 'key')::uuid;

  v_msg := 'Öğretmen ortak katmana yazar';
  if public.live_save_layer(v_session, 'p1', 'shared', '[{"id":"t1","type":"stroke","points":[0,0,5,5],"color":"#000","width":3}]') is null then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Olmayan sayfaya yazılamaz';
  begin
    perform public.live_save_layer(v_session, 'yok', 'shared', '[]');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Öğrenci 1 (aynı sınıf)
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);

  v_msg := 'Sınıftaki öğrenci canlı dersi görür';
  if (select count(*) from public.live_sessions where id = v_session) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Sınıftaki öğrenci tahtanın kopyasını görür';
  if (select count(*) from public.live_content where session_id = v_session) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci doğru cevabı göremez';
  if (select question ? 'correct_index' from public.live_sessions where id = v_session) then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci öğretmenin tahtasını göremez';
  if (select count(*) from public.boards where id = v_board) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci sürüm geçmişini göremez';
  if (select count(*) from public.board_versions) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci cevap verir (tekrar cevap üstüne yazılır)';
  perform public.live_answer(v_session, v_key, 0);
  perform public.live_answer(v_session, v_key, 1);
  if (select count(*) from public.live_answers where session_id = v_session) <> 1
     or (select choice from public.live_answers where session_id = v_session) <> 1 then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Olmayan seçenek reddedilir';
  begin
    perform public.live_answer(v_session, v_key, 7);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Öğrenci ortak katmanı ve kendi defterini görür';
  perform public.live_save_layer(v_session, 'p1', 'private', '[{"id":"s1","type":"stroke","points":[1,1,2,2],"color":"#000","width":3}]');
  if (select count(*) from public.live_layers where session_id = v_session) <> 2 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Kalem izni yokken tahtaya yazılamaz';
  begin
    perform public.live_save_layer(v_session, 'p1', 'shared', '[]');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  perform public.live_heartbeat(v_session);

  v_msg := 'Öğrenci dersi yönetemez';
  begin
    perform public.live_control(v_session, '{"page_index":1}');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Öğrenci soru açamaz';
  begin
    perform public.live_open_question(v_session, v_question);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Öğrenci 3 (başka sınıf)
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_c3, 'role', 'authenticated')::text, true);

  v_msg := 'Başka sınıfın öğrencisi canlı dersi görmez';
  if (select count(*) from public.live_sessions) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka sınıfın öğrencisi tahta kopyasını görmez';
  if (select count(*) from public.live_content) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka sınıfın öğrencisi çizimleri görmez';
  if (select count(*) from public.live_layers) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka sınıfın öğrencisi cevap veremez';
  begin
    perform public.live_answer(v_session, v_key, 0);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Öğrenci 2: başkasının defterini ve cevabını görmez
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_c2, 'role', 'authenticated')::text, true);

  v_msg := 'Öğrenci başkasının defterini görmez (yalnızca ortak katman)';
  if (select count(*) from public.live_layers where session_id = v_session) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci başkasının cevabını görmez';
  if (select count(*) from public.live_answers) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  -- ======================================================
  -- Öğretmen: yansıtma ve kalem izni
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
  perform public.live_control(v_session, jsonb_build_object('projected_student', v_s1, 'pen_student', v_s2, 'pen_seconds', 30));

  v_msg := 'Başka sınıfın öğrencisi yansıtılamaz';
  begin
    perform public.live_control(v_session, jsonb_build_object('projected_student', v_s3));
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Öğretmen bağlı öğrencileri görür';
  if (select count(*) from public.live_participants where session_id = v_session) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğretmen cevapları görür';
  if (select count(*) from public.live_answers where session_id = v_session) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_c2, 'role', 'authenticated')::text, true);

  v_msg := 'Yansıtılan öğrencinin defteri sınıfa görünür';
  if (select count(*) from public.live_layers where session_id = v_session) <> 2 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Kalem izni olan öğrenci tahtaya yazar';
  if public.live_save_layer(v_session, 'p1', 'shared', '[{"id":"s2","type":"stroke","points":[3,3,4,4],"color":"#000","width":3}]') is null then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);

  v_msg := 'Kalem başkasındayken tahtaya yazılamaz';
  begin
    perform public.live_save_layer(v_session, 'p1', 'shared', '[]');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Öğretmen: cevabı göster, dersi bitir
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);

  v_msg := 'Cevap gösterilince doğru cevap ve dağılım açılır';
  v_json := public.live_close_question(v_session, true);
  if not (v_json @> '{"closed":true,"correct_index":1,"counts":[0,1,0],"total":1}') then raise exception 'BAŞARISIZ: % (%)', v_msg, v_json; end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);

  v_msg := 'Gösterilen doğru cevap öğrenciye ulaşır';
  if (select (question ->> 'correct_index')::int from public.live_sessions where id = v_session) is distinct from 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Kapanan soruya cevap verilemez';
  begin
    perform public.live_answer(v_session, v_key, 0);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
  perform public.live_end(v_session);

  v_msg := 'Ders bitince çizimler ve katılım bilgisi silinir';
  if (select count(*) from public.live_layers where session_id = v_session) <> 0
     or (select count(*) from public.live_participants where session_id = v_session) <> 0 then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);

  v_msg := 'Öğrenci dersin bittiğini görür';
  if (select ended_at is null from public.live_sessions where id = v_session) is not false then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Biten derse yazılamaz';
  begin
    perform public.live_save_layer(v_session, 'p1', 'private', '[]');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Giriş yapmamış ziyaretçi
  -- ======================================================
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);

  v_msg := 'Ziyaretçi canlı dersleri okuyamaz';
  begin
    select count(*) into v_n from public.live_sessions;
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Ziyaretçi canlı ders fonksiyonu çağıramaz';
  begin
    perform public.live_heartbeat(v_session);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- Hepsi geçti: bilerek hata verilir, böylece sahte veriler de geri alınır
  raise exception 'TEST TAMAM: % kontrol geçti (bu hata bilerek verilir; test verileri geri alındı).', cardinality(v_passed)
    using detail = array_to_string(v_passed, E'\n');
end
$test$;
