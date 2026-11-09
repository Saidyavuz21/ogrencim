-- ========================================================
-- Topluluk / Keşfet testleri (Paket 11)
-- Sahte okul, iki öğretmen, bir yönetici ve bir öğrenci oluşturur; paylaşma, tarama, kopyalama, kota,
-- yıldız, favori ve yönetimi sınar.
--
-- Bütün test TEK BİR komuttur (DO bloğu) ve sonunda bilerek hata verir; her şey geri alınır.
--   Hepsi geçerse:      ERROR: TEST TAMAM: <sayı> kontrol geçti …
--   Biri başarısızsa:   ERROR: BAŞARISIZ: <kontrolün adı>
-- ========================================================
do $test$
declare
  v_school constant uuid := '00000000-0000-4000-8000-00000000c000';
  v_t1 constant uuid := '00000000-0000-4000-8000-0000000000d1';   -- paylaşan öğretmen
  v_t2 constant uuid := '00000000-0000-4000-8000-0000000000d2';   -- kopyalayan öğretmen
  v_admin constant uuid := '00000000-0000-4000-8000-0000000000d9';
  v_c1 constant uuid := '00000000-0000-4000-8000-0000000000e1';   -- öğrencinin oturumu
  v_s1 constant uuid := '00000000-0000-4000-8000-0000000006a1';
  v_q1 uuid;
  v_board uuid;
  v_item_board constant uuid := '00000000-0000-4000-8000-0000000007b1';
  v_item_q constant uuid := '00000000-0000-4000-8000-0000000007b2';
  v_json jsonb;
  v_res uuid;
  v_new_board uuid;
  v_n integer;
  v_passed text[] := '{}';
  v_msg text;
begin
  insert into public.schools (id, name, city, district, status) values (v_school, 'TEST Okulu C', 'Test', 'Test', 'approved');
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', v_t1, 'authenticated', 'authenticated', 'cm-t1@test.invalid', '{"name":"Öğretmen Bir"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_t2, 'authenticated', 'authenticated', 'cm-t2@test.invalid', '{"name":"Öğretmen İki"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated', 'cm-admin@test.invalid', '{"name":"Yönetici"}', false, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_c1, 'authenticated', 'authenticated', null, '{}', true, now(), now());
  update public.profiles set approved = true, is_active = true, school_id = v_school, class_name = 'T-5A', full_name = 'Öğretmen Bir' where id = v_t1;
  update public.profiles set approved = true, is_active = true, school_id = v_school, class_name = 'T-5B', full_name = 'Öğretmen İki' where id = v_t2;
  update public.profiles set approved = true, is_active = true, role = 'admin' where id = v_admin;
  insert into public.students (id, student_number, name, class_name, school_id) values (v_s1, 'C001', 'Ayşe Testoğlu', 'T-5A', v_school);
  insert into public.student_sessions (auth_uid, student_id) values (v_c1, v_s1);

  -- ======================================================
  -- Öğretmen 1: tahta + soru, tarama, paylaşma
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_t1, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  insert into public.quiz_questions (body, choices, correct_index, explanation, grade, subject)
  values ('1/2 + 1/4 kaçtır?', array['3/4', '2/6', '1/8'], 0, 'Paydaları eşitle.', '5. sınıf', 'Matematik')
  returning id into v_q1;
  insert into public.boards (title, grade, subject, content)
  values ('Kesirler', '5. sınıf', 'Matematik', jsonb_build_object('version', 1, 'pages', jsonb_build_array(jsonb_build_object(
    'id', 'p1', 'background', 'blank', 'elements', jsonb_build_array(
      jsonb_build_object('id', 'n1', 'type', 'note', 'x', 0, 'y', 0, 'w', 10, 'h', 10, 'text', 'Kesirlerde toplama', 'color', '#fff', 'fontSize', 24),
      jsonb_build_object('id', 'w1', 'type', 'widget', 'kind', 'minitest', 'x', 0, 'y', 0, 'w', 10, 'h', 10, 'data', jsonb_build_object('questionId', v_q1))
    )))))
  returning id into v_board;

  v_msg := 'Tarama okuldaki öğrenci adını bulur';
  v_json := public.community_publish(v_item_board, 'board', v_board, null, 'Ayşe Testoğlu için kesirler', null, null, null, null, null, '{}', false, true);
  if not exists (select 1 from jsonb_array_elements_text(v_json -> 'findings') x where x like 'öğrenci adı:%') then raise exception 'BAŞARISIZ: % (%)', v_msg, v_json; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Tarama e-posta ve telefonu bulur';
  v_json := public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', 'Sorular: veli@ornek.com, 0532 123 45 67', null, null, null, null, '{}', false, true);
  if jsonb_array_length(v_json -> 'findings') < 2 then raise exception 'BAŞARISIZ: % (%)', v_msg, v_json; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Temiz içerikte tarama bulgu vermez, Mini Test sorusu sayılır';
  v_json := public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', 'Toplama çalışması', null, null, null, null, '{}', false, true);
  if jsonb_array_length(v_json -> 'findings') <> 0 or (v_json ->> 'question_count')::int <> 1 then raise exception 'BAŞARISIZ: % (%)', v_msg, v_json; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğrenci adı içeren içerik paylaşılamaz';
  begin
    perform public.community_publish(v_item_board, 'board', v_board, null, 'Ayşe Testoğlu için kesirler', null, null, null, null, null, '{}', true, false);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Görsel onayı verilmeden paylaşılamaz';
  begin
    perform public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', null, null, null, null, null, '{}', false, false);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Geçersiz kazanım kodu reddedilir';
  begin
    perform public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', null, null, null, array['kesirler!'], null, '{}', true, false);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Tahta paylaşılır (kazanım kodu büyük harfe çevrilir, soru gömülür)';
  perform public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', 'Toplama çalışması', '5. sınıf', 'Matematik', array['mat.5.1.4.2'], array['kesir'], '{}', true, false);
  if (select outcomes from public.community_items where id = v_item_board) <> array['MAT.5.1.4.2']
     or (select question_count from public.community_items where id = v_item_board) <> 1
     or (select author_name from public.community_items where id = v_item_board) <> 'Öğretmen Bir' then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Aynı kimlikle ikinci kez paylaşılamaz';
  begin
    perform public.community_publish(v_item_board, 'board', v_board, null, 'Kesirler', null, null, null, null, null, '{}', true, false);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Soru seti paylaşılır';
  perform public.community_publish(v_item_q, 'questions', null, array[v_q1], 'Kesir soruları', null, '5. sınıf', 'Matematik', null, null, '{}', true, false);
  if (select question_count from public.community_items where id = v_item_q) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Kendi içeriğine yıldız verilemez';
  begin
    perform public.community_rate(v_item_board, 5);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Başkasının tahtasını paylaşamaz (öğretmen 2 adına)';
  perform set_config('request.jwt.claims', json_build_object('sub', v_t2, 'role', 'authenticated')::text, true);
  begin
    perform public.community_publish('00000000-0000-4000-8000-0000000007b3', 'board', v_board, null, 'Çalıntı', null, null, null, null, null, '{}', true, false);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  -- ======================================================
  -- Öğretmen 2: arama, yıldız, favori, kopyalama
  -- ======================================================
  v_msg := 'Diğer öğretmen içerikleri arar ve bulur';
  if (select count(*) from public.community_search(null, null, null, null, null, 'new', 'all', 24, 0) s where s.id in (v_item_board, v_item_q)) <> 2 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Kazanım kodunun ön ekiyle aranır';
  if (select count(*) from public.community_search(null, null, null, null, 'mat.5.1', 'new', 'all', 24, 0) s where s.id = v_item_board) <> 1
     or (select count(*) from public.community_search(null, null, null, null, 'FB.5', 'new', 'all', 24, 0) s where s.id = v_item_board) <> 0 then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Biçime göre süzülür';
  if (select count(*) from public.community_search(null, 'questions', null, null, null, 'new', 'all', 24, 0) s where s.id in (v_item_board, v_item_q)) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Yıldız verilir, ortalama hesaplanır';
  perform public.community_rate(v_item_board, 4);
  if (select rating_avg from public.community_search(null, null, null, null, null, 'rating', 'all', 24, 0) s where s.id = v_item_board) <> 4 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Favoriye eklenir, Favorilerim’de görünür';
  perform public.community_favorite(v_item_board, true);
  if (select count(*) from public.community_search(null, null, null, null, null, 'new', 'favorites', 24, 0)) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Tahta kopyalanır: Mini Test yeni soruya bağlanır, kaynak yazılır, kopya sayılır';
  v_json := public.community_copy_begin(v_item_board);
  v_res := (v_json ->> 'reservation')::uuid;
  v_json := public.community_copy_finish(v_res, '{}');
  v_new_board := (v_json ->> 'board_id')::uuid;
  if v_new_board is null
     or (select teacher_id from public.boards where id = v_new_board) <> v_t2
     or (select content #>> '{pages,0,elements,1,data,questionId}' from public.boards where id = v_new_board) = v_q1::text
     or not exists (select 1 from public.quiz_questions q where q.id::text = (select content #>> '{pages,0,elements,1,data,questionId}' from public.boards where id = v_new_board) and q.teacher_id = v_t2)
     or (select author_name from public.board_sources where board_id = v_new_board) <> 'Öğretmen Bir'
     or (select copy_count from public.community_items where id = v_item_board) <> 1 then
    raise exception 'BAŞARISIZ: % (%)', v_msg, v_json;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Aynı rezervasyonla ikinci kez kopyalanamaz';
  begin
    perform public.community_copy_finish(v_res, '{}');
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Kopyalanan tahtadan yeniden paylaşım orijinaline bağlanır';
  perform public.community_publish('00000000-0000-4000-8000-0000000007b4', 'board', v_new_board, null, 'Kesirler (uyarlama)', null, null, null, null, null, '{}', true, false);
  if (select parent_item_id from public.community_items where id = '00000000-0000-4000-8000-0000000007b4') is distinct from v_item_board
     or (select origin_author from public.community_items where id = '00000000-0000-4000-8000-0000000007b4') <> 'Öğretmen Bir' then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Soru seti kopyalanır (soru bankasına, Topluluk etiketiyle)';
  v_json := public.community_copy_finish((public.community_copy_begin(v_item_q) ->> 'reservation')::uuid, '{}');
  if (v_json ->> 'question_count')::int <> 1
     or (select count(*) from public.quiz_questions where teacher_id = v_t2 and 'Topluluk' = any(tags)) < 2 then
    raise exception 'BAŞARISIZ: % (%)', v_msg, v_json;
  end if;
  v_passed := v_passed || v_msg;

  v_msg := 'Öğretmen editörün seçimi yapamaz';
  begin
    perform public.community_moderate(v_item_board, true, null);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Başkasının paylaşımı kaldırılamaz';
  begin
    perform public.community_unpublish(v_item_board);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  v_msg := 'Öğretmen başkasının yıldızını ve favorisini göremez; kopya kaydına erişemez';
  if (select count(*) from public.community_ratings where teacher_id <> v_t2) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  begin
    select count(*) into v_n from public.community_copies;
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (kopya kaydı okundu)', v_msg; when others then v_passed := v_passed || v_msg; end;

  -- ======================================================
  -- Kota: yer yetmezse kopyalama başlamaz
  -- ======================================================
  v_msg := 'Kota yetmezse kopyalama başlamaz';
  reset role;
  update public.community_items set media_bytes = 600 * 1024 * 1024 where id = v_item_q;
  perform set_config('role', 'authenticated', true);
  begin
    perform public.community_copy_begin(v_item_q);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  -- ======================================================
  -- Öğrenci: topluluğu göremez
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_c1, 'role', 'authenticated')::text, true);
  v_msg := 'Öğrenci topluluğu göremez ve kopyalayamaz';
  if (select count(*) from public.community_items) <> 0 or (select count(*) from public.community_search()) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  begin
    perform public.community_copy_begin(v_item_board);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  -- ======================================================
  -- Yönetici: editörün seçimi ve gizleme
  -- ======================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_msg := 'Yönetici editörün seçimi yapar ve gizler';
  perform public.community_moderate(v_item_board, true, true);
  if not (select featured and hidden from public.community_items where id = v_item_board) then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_t2, 'role', 'authenticated')::text, true);
  v_msg := 'Gizlenen içerik diğer öğretmenlere görünmez ve kopyalanamaz';
  if (select count(*) from public.community_search(null, null, null, null, null, 'new', 'all', 24, 0) s where s.id = v_item_board) <> 0 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  begin
    perform public.community_copy_begin(v_item_board);
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_t1, 'role', 'authenticated')::text, true);
  v_msg := 'Yazar gizlenen içeriğini görmeye devam eder ve kaldırabilir';
  if (select count(*) from public.community_search(null, null, null, null, null, 'new', 'mine', 24, 0) s where s.id = v_item_board) <> 1 then raise exception 'BAŞARISIZ: %', v_msg; end if;
  perform public.community_unpublish(v_item_board);
  if exists (select 1 from public.community_items where id = v_item_board) then raise exception 'BAŞARISIZ: %', v_msg; end if;
  v_passed := v_passed || v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', v_t2, 'role', 'authenticated')::text, true);
  v_msg := 'Kaldırılan içeriğin kopyası ve kaynak bilgisi durur';
  if not exists (select 1 from public.boards where id = v_new_board) or (select author_name from public.board_sources where board_id = v_new_board) <> 'Öğretmen Bir' then
    raise exception 'BAŞARISIZ: %', v_msg;
  end if;
  v_passed := v_passed || v_msg;

  -- Ziyaretçi
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  v_msg := 'Ziyaretçi topluluğu okuyamaz';
  begin
    select count(*) into v_n from public.community_items;
    raise exception using errcode = 'LT001';
  exception when sqlstate 'LT001' then raise exception 'BAŞARISIZ: % (işlem yapıldı)', v_msg; when others then v_passed := v_passed || v_msg; end;

  raise exception 'TEST TAMAM: % kontrol geçti (bu hata bilerek verilir; test verileri geri alındı).', cardinality(v_passed)
    using detail = array_to_string(v_passed, E'\n');
end
$test$;
