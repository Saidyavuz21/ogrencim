-- ========================================================
-- Bilgi yarışması testleri
-- İki sahte okul, iki öğretmen ve iki öğrenci oluşturur; kim neyi görüp yazabiliyor sınar.
--
-- Bütün test TEK BİR komuttur (DO bloğu) ve sonunda bilerek hata verir:
-- böylece nasıl çalıştırılırsa çalıştırılsın her şey geri alınır, veritabanında iz kalmaz.
--   Hepsi geçerse:      ERROR: TEST TAMAM: <sayı> kontrol geçti …
--   Biri başarısızsa:   ERROR: BAŞARISIZ: <kontrolün adı>
-- ========================================================
do $test$
declare
  v_ta constant uuid := '00000000-0000-4000-8000-0000000000d1';  -- öğretmen A (okul A)
  v_tb constant uuid := '00000000-0000-4000-8000-0000000000d2';  -- öğretmen B (okul B)
  v_c1 constant uuid := '00000000-0000-4000-8000-0000000000e1';  -- öğrenci oturumu (okul A)
  v_s1 constant uuid := '00000000-0000-4000-8000-0000000006a1';  -- öğrenci 1 (okul A)
  v_s2 constant uuid := '00000000-0000-4000-8000-0000000006a2';  -- öğrenci 2 (okul A)
  v_s3 constant uuid := '00000000-0000-4000-8000-0000000006b1';  -- öğrenci 3 (okul B)
  v_school_a constant uuid := '00000000-0000-4000-8000-00000000b000';
  v_school_b constant uuid := '00000000-0000-4000-8000-00000000b001';
  v_teams constant jsonb := '[{"name":"Takım 1","color":"coral","members":[],"score":0},{"name":"Takım 2","color":"blue","members":[],"score":0}]';
  v_show uuid;
  v_n integer;
  v_passed text[] := '{}';
  v_msg text;
begin
  -- ------------------------------------------------------
  -- Sahte veri (yönetici olarak)
  -- ------------------------------------------------------
  insert into public.schools (id, name, city, district, status) values
    (v_school_a, 'TEST Yarışma Okulu A', 'Test', 'Test', 'approved'),
    (v_school_b, 'TEST Yarışma Okulu B', 'Test', 'Test', 'approved');
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', v_ta, 'authenticated', 'authenticated', 'show-a@test.invalid', '{"name":"Öğretmen A"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_tb, 'authenticated', 'authenticated', 'show-b@test.invalid', '{"name":"Öğretmen B"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_c1, 'authenticated', 'authenticated', null, '{}', true, now(), now());
  update public.profiles set approved = true, is_active = true, school_id = v_school_a, class_name = 'Y-5A' where id = v_ta;
  update public.profiles set approved = true, is_active = true, school_id = v_school_b, class_name = 'Y-5A' where id = v_tb;
  insert into public.students (id, student_number, name, class_name, school_id) values
    (v_s1, 'Y001', 'Öğrenci 1', 'Y-5A', v_school_a),
    (v_s2, 'Y002', 'Öğrenci 2', 'Y-5A', v_school_a),
    (v_s3, 'Y003', 'Öğrenci 3', 'Y-5A', v_school_b);
  insert into public.student_sessions (auth_uid, student_id) values (v_c1, v_s1);

  -- ======================================================
  -- Öğretmen A
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_ta, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  v_msg := 'Öğretmen yarışma oluşturur; sahibi ve okulu sunucuda atanır';
  insert into public.quiz_shows (title, class_name, mode, state, teacher_id)
  values ('  Kesirler yarışması ', 'Y-5A', 'questions', jsonb_build_object('teams', v_teams, 'questions', '[]'::jsonb), v_tb)
  returning id into v_show;
  if (select teacher_id = v_ta and school_id = v_school_a and title = 'Kesirler yarışması' from public.quiz_shows where id = v_show) is not true then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Tek takımlı yarışma kaydedilemez';
  begin
    insert into public.quiz_shows (title, state) values ('Tek takım', '{"teams":[{"name":"A"}]}');
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := '50 sorudan fazlası kaydedilemez';
  begin
    update public.quiz_shows
       set state = jsonb_build_object('teams', v_teams, 'questions', (select jsonb_agg(jsonb_build_object('id', g)) from generate_series(1, 51) g))
     where id = v_show;
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Yarışma türü sonradan değiştirilemez';
  begin
    update public.quiz_shows set mode = 'score' where id = v_show;
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Bitmeyen yarışmada davranış puanı verilemez';
  begin
    perform public.quiz_show_award(v_show, array[v_s1], 1);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Öğretmen puan kaydını doğrudan yazamaz';
  update public.quiz_shows set status = 'finished', awarded_at = now(), awarded_points = 5 where id = v_show;
  if (select awarded_at is null and awarded_points is null and status = 'finished' from public.quiz_shows where id = v_show) is not true then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka okulun öğrencisine puan verilemez (hiçbiri yazılmaz)';
  begin
    perform public.quiz_show_award(v_show, array[v_s1, v_s3], 1);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;
  if (select points from public.students where id = v_s1) is distinct from 0 then raise exception 'BAŞARISIZ: % (puan yazıldı)', v_msg; end if;

  v_msg := '5 puandan fazlası verilemez';
  begin
    perform public.quiz_show_award(v_show, array[v_s1], 6);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Kazanan takımın öğrencilerine puan verilir (aynı öğrenci iki kez sayılmaz)';
  v_n := public.quiz_show_award(v_show, array[v_s1, v_s2, v_s1], 2);
  if v_n <> 2
     or (select points from public.students where id = v_s1) <> 2
     or (select points from public.students where id = v_s2) <> 2
     or (select awarded_at is not null and awarded_points = 2 from public.quiz_shows where id = v_show) is not true then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Puan geçmişine yarışmanın adı yazılır';
  if (select count(*) from public.points_history where student_id = v_s1 and reason = 'Bilgi yarışması: Kesirler yarışması') <> 1 then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Aynı yarışma için ikinci kez puan verilemez';
  begin
    perform public.quiz_show_award(v_show, array[v_s1], 1);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Sonradan yapılan kayıt puan bilgisini silmez';
  update public.quiz_shows set title = 'Kesirler 2', awarded_at = null where id = v_show;
  if (select awarded_at is not null and title = 'Kesirler 2' from public.quiz_shows where id = v_show) is not true then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  -- ======================================================
  -- Öğretmen B (başka okul)
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tb, 'role', 'authenticated')::text, true);

  v_msg := 'Başka öğretmen yarışmayı göremez';
  if (select count(*) from public.quiz_shows where id = v_show) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka öğretmen yarışmayı değiştiremez';
  update public.quiz_shows set title = 'Ele geçirildi' where id = v_show;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka öğretmen yarışmayı silemez';
  delete from public.quiz_shows where id = v_show;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Başka öğretmen bu yarışma üzerinden puan veremez';
  begin
    perform public.quiz_show_award(v_show, array[v_s3], 1);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Öğrenci
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);

  v_msg := 'Öğrenci yarışmaları göremez';
  if (select count(*) from public.quiz_shows) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci yarışma oluşturamaz';
  begin
    insert into public.quiz_shows (title, state) values ('Öğrenci yarışması', jsonb_build_object('teams', v_teams));
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Öğrenci puan fonksiyonunu kullanamaz';
  begin
    perform public.quiz_show_award(v_show, array[v_s1], 5);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- ======================================================
  -- Giriş yapmamış ziyaretçi
  -- ======================================================
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);

  v_msg := 'Ziyaretçi yarışmaları okuyamaz';
  begin
    select count(*) into v_n from public.quiz_shows;
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  v_msg := 'Ziyaretçi puan fonksiyonunu çağıramaz';
  begin
    perform public.quiz_show_award(v_show, array[v_s1], 1);
    raise exception using errcode = 'QT001';
  exception when sqlstate 'QT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg;
            when others then v_passed := v_passed || v_msg;
  end;

  -- Hepsi geçti: bilerek hata verilir, böylece sahte veriler de geri alınır
  raise exception 'TEST TAMAM: % kontrol geçti (bu hata bilerek verilir; test verileri geri alındı).', cardinality(v_passed)
    using detail = array_to_string(v_passed, E'\n');
end
$test$;
