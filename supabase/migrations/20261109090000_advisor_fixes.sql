-- ========================================================
-- Supabase advisor düzeltmeleri (Paket 8 · Güvenlik)
-- 1) Giriş yapmamış kullanıcı (anon) iki SECURITY DEFINER fonksiyonu çağırabiliyordu.
-- 2) Yabancı anahtarlarda (foreign key) eksik indeksler.
--
-- Bilerek bırakılan uyarılar (docs/GUVENLIK.md):
--  * auth_allow_anonymous_sign_ins: öğrenci girişi anonim oturum + PIN ile çalışır.
--  * rls_enabled_no_policy (student_credentials, student_sessions, pin_attempts,
--    conversation_reads): yalnızca SECURITY DEFINER fonksiyonlar erişir; politika yokluğu = tam kapalı.
--  * authenticated_security_definer_function_executable: uygulamanın RPC'leri ve RLS
--    yardımcıları; her biri kendi içinde yetki kontrolü yapar.
-- ========================================================

-- Trigger fonksiyonu doğrudan çağrılmamalı (trigger'lar EXECUTE yetkisi gerektirmez)
revoke execute on function public.announcements_set_author() from public, anon, authenticated;

-- Duyuru okuma kontrolü yalnızca giriş yapmış kullanıcıların RLS'inde kullanılır
revoke execute on function public.can_read_announcement(uuid) from public, anon;
grant execute on function public.can_read_announcement(uuid) to authenticated;

-- Eksik yabancı anahtar indeksleri
create index if not exists announcements_author_id_idx on public.announcements (author_id);
create index if not exists board_drawings_student_id_idx on public.board_drawings (student_id);
create index if not exists boards_school_id_idx on public.boards (school_id);
create index if not exists class_campuses_campus_id_idx on public.class_campuses (campus_id);
create index if not exists class_join_codes_school_id_idx on public.class_join_codes (school_id);
create index if not exists class_members_added_by_idx on public.class_members (added_by);
create index if not exists content_sets_school_id_idx on public.content_sets (school_id);
create index if not exists content_sets_teacher_id_idx on public.content_sets (teacher_id);
create index if not exists conversation_reads_student_id_idx on public.conversation_reads (student_id);
create index if not exists grades_teacher_id_idx on public.grades (teacher_id);
create index if not exists homework_boards_source_board_id_idx on public.homework_boards (source_board_id);
create index if not exists homework_checks_checked_by_idx on public.homework_checks (checked_by);
create index if not exists homework_checks_student_id_idx on public.homework_checks (student_id);
create index if not exists homeworks_teacher_id_idx on public.homeworks (teacher_id);
create index if not exists library_items_created_by_idx on public.library_items (created_by);
create index if not exists points_history_student_id_idx on public.points_history (student_id);
create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists quiz_answers_item_id_idx on public.quiz_answers (item_id);
create index if not exists quiz_attempts_student_id_idx on public.quiz_attempts (student_id);
create index if not exists quiz_items_source_question_id_idx on public.quiz_items (source_question_id);
create index if not exists quiz_questions_school_id_idx on public.quiz_questions (school_id);
create index if not exists reading_contests_teacher_id_idx on public.reading_contests (teacher_id);
create index if not exists reading_results_measured_by_idx on public.reading_results (measured_by);
create index if not exists schools_created_by_idx on public.schools (created_by);
create index if not exists staff_shares_shared_by_idx on public.staff_shares (shared_by);
create index if not exists student_sessions_student_id_idx on public.student_sessions (student_id);
create index if not exists teacher_files_folder_id_idx on public.teacher_files (folder_id);
create index if not exists teacher_files_school_id_idx on public.teacher_files (school_id);
create index if not exists teacher_shares_file_id_idx on public.teacher_shares (file_id);
create index if not exists teacher_shares_set_id_idx on public.teacher_shares (set_id);
create index if not exists teacher_shares_teacher_id_idx on public.teacher_shares (teacher_id);
