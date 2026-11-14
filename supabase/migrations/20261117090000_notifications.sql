-- ========================================================
-- Bildirimler – Aşama 1 (zil + okunmamış sayısı)
-- Plan: docs/BILDIRIM_PLANI.md
--
--  1) notifications: öğretmen (recipient_user) ya da öğrenci (recipient_student) için tek tablo.
--     Aynı alıcıya aynı group_key ile okunmamış kayıt varsa yeni satır açılmaz; count artar.
--  2) notification_settings: tür başına zil / push kapatma, sessiz saatler (öğretmen)
--  3) Tetikleyiciler: mesaj, yeni ödev, değerlendirme, teslim, canlı ders, duyuru, topluluk
--  4) Okuma / okundu / ayar fonksiyonları
--  5) Temizlik (pg_cron) ve realtime
--
-- Bildirim üretimi hiçbir zaman asıl işi (mesaj, teslim…) bozmaz: hata olursa uyarı yazılır, işlem sürer.
-- İstemci bildirim yazamaz; yalnızca kendi bildirimini okur ve okundu yapar.
-- ========================================================

-- --------------------------------------------------------
-- 1) Tablo
-- --------------------------------------------------------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_user uuid references auth.users(id) on delete cascade,
  recipient_student uuid references public.students(id) on delete cascade,
  kind text not null check (kind in (
    'mesaj', 'odev_yeni', 'odev_degerlendirildi', 'odev_teslim', 'canli_ders', 'duyuru', 'topluluk',
    -- Aşama 3 için ayrıldı
    'odev_hatirlatma', 'odev_bitti', 'quiz', 'quiz_bitti', 'soru_yeni', 'soru_cevap', 'tahta_paylasildi', 'dosya_silinecek'
  )),
  sub text check (sub is null or char_length(sub) <= 30),
  group_key text not null check (char_length(group_key) between 1 and 200),
  ref_id text check (ref_id is null or char_length(ref_id) <= 200),
  title text not null check (char_length(title) <= 200),
  body text check (body is null or char_length(body) <= 300),
  actor_name text check (actor_name is null or char_length(actor_name) <= 120),
  count integer not null default 1 check (count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  push_state text not null default 'bekliyor' check (push_state in ('bekliyor', 'gonderildi', 'atlandi', 'ertelendi')),
  constraint notifications_one_recipient check (num_nonnulls(recipient_user, recipient_student) = 1)
);

create unique index if not exists notifications_open_user_key
  on public.notifications (recipient_user, group_key) where read_at is null and recipient_user is not null;
create unique index if not exists notifications_open_student_key
  on public.notifications (recipient_student, group_key) where read_at is null and recipient_student is not null;
create index if not exists notifications_user_time_idx
  on public.notifications (recipient_user, updated_at desc) where recipient_user is not null;
create index if not exists notifications_student_time_idx
  on public.notifications (recipient_student, updated_at desc) where recipient_student is not null;
create index if not exists notifications_ref_idx on public.notifications (ref_id) where ref_id is not null;
create index if not exists notifications_push_idx
  on public.notifications (updated_at) where push_state in ('bekliyor', 'ertelendi');

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
-- Okuma izni yalnızca realtime için (kendi satırları); liste ve sayı fonksiyonlardan gelir
grant select on public.notifications to authenticated;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_user = (select auth.uid()) or recipient_student = (select public.current_student_id()));

-- --------------------------------------------------------
-- 2) Ayarlar
-- --------------------------------------------------------
create table if not exists public.notification_settings (
  id bigint generated always as identity primary key,
  recipient_user uuid unique references auth.users(id) on delete cascade,
  recipient_student uuid unique references public.students(id) on delete cascade,
  off_in_app text[] not null default '{}' check (cardinality(off_in_app) <= 30),
  off_push text[] not null default '{}' check (cardinality(off_push) <= 30),
  quiet_enabled boolean not null default true,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  updated_at timestamptz not null default now(),
  constraint notification_settings_one_owner check (num_nonnulls(recipient_user, recipient_student) = 1)
);
alter table public.notification_settings enable row level security;
revoke all on public.notification_settings from public, anon, authenticated;

create or replace function private.nt_kinds()
returns text[] language sql immutable set search_path = '' as $$
  select array['mesaj', 'odev_yeni', 'odev_degerlendirildi', 'odev_teslim', 'canli_ders', 'duyuru', 'topluluk',
               'odev_hatirlatma', 'odev_bitti', 'quiz', 'quiz_bitti', 'soru_yeni', 'soru_cevap', 'tahta_paylasildi', 'dosya_silinecek'];
$$;
revoke all on function private.nt_kinds() from public, anon, authenticated;

-- --------------------------------------------------------
-- 3) Yazma yardımcıları (yalnızca tetikleyiciler kullanır)
-- p_bump = false: okunmamış kayıt varsa sayı artmaz, yalnızca bilgi ve zaman yenilenir (ör. değerlendirme)
-- --------------------------------------------------------
create or replace function private.nt_to_users(
  p_users uuid[], p_kind text, p_sub text, p_group text, p_ref text,
  p_title text, p_body text, p_actor text, p_bump boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_users is null or cardinality(p_users) = 0 then return; end if;
  insert into public.notifications as n (recipient_user, kind, sub, group_key, ref_id, title, body, actor_name)
  select u, p_kind, left(p_sub, 30), left(p_group, 200), left(p_ref, 200),
         left(coalesce(nullif(btrim(p_title), ''), 'Bildirim'), 200), left(p_body, 300), left(p_actor, 120)
  from (select distinct x as u from unnest(p_users) x where x is not null) r
  where not exists (
    select 1 from public.notification_settings s where s.recipient_user = r.u and p_kind = any (s.off_in_app)
  )
  on conflict (recipient_user, group_key) where read_at is null and recipient_user is not null
  do update set
    count = n.count + case when p_bump then 1 else 0 end,
    sub = excluded.sub, ref_id = excluded.ref_id, title = excluded.title, body = excluded.body,
    actor_name = excluded.actor_name, updated_at = now(), push_state = 'bekliyor';
end;
$$;
revoke all on function private.nt_to_users(uuid[], text, text, text, text, text, text, text, boolean) from public, anon, authenticated;

create or replace function private.nt_to_students(
  p_students uuid[], p_kind text, p_sub text, p_group text, p_ref text,
  p_title text, p_body text, p_actor text, p_bump boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_students is null or cardinality(p_students) = 0 then return; end if;
  insert into public.notifications as n (recipient_student, kind, sub, group_key, ref_id, title, body, actor_name)
  select u, p_kind, left(p_sub, 30), left(p_group, 200), left(p_ref, 200),
         left(coalesce(nullif(btrim(p_title), ''), 'Bildirim'), 200), left(p_body, 300), left(p_actor, 120)
  from (select distinct x as u from unnest(p_students) x where x is not null) r
  where not exists (
    select 1 from public.notification_settings s where s.recipient_student = r.u and p_kind = any (s.off_in_app)
  )
  on conflict (recipient_student, group_key) where read_at is null and recipient_student is not null
  do update set
    count = n.count + case when p_bump then 1 else 0 end,
    sub = excluded.sub, ref_id = excluded.ref_id, title = excluded.title, body = excluded.body,
    actor_name = excluded.actor_name, updated_at = now(), push_state = 'bekliyor';
end;
$$;
revoke all on function private.nt_to_students(uuid[], text, text, text, text, text, text, text, boolean) from public, anon, authenticated;

-- Bir sınıfın öğrencileri (student_in_class ile aynı kural: ana sınıf ya da onaylı üyelik)
create or replace function private.nt_class_students(p_school uuid, p_class text)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select array(
    select id from (
      select s.id from public.students s
      where s.school_id is not distinct from p_school and s.class_name = p_class
      union
      select m.student_id from public.class_members m
      join public.students s on s.id = m.student_id
      where m.class_name = p_class and m.status = 'approved' and s.school_id is not distinct from p_school
    ) t
    limit 5000
  );
$$;
revoke all on function private.nt_class_students(uuid, text) from public, anon, authenticated;

-- Mesaj önizlemesi (yalnızca site içi listede; push'a girmez)
create or replace function private.nt_message_preview(p_type text, p_content text)
returns text language sql immutable set search_path = '' as $$
  select case p_type
    when 'audio' then 'Sesli mesaj'
    when 'file' then 'Dosya'
    else left(btrim(regexp_replace(coalesce(p_content, ''), '\s+', ' ', 'g')), 140)
  end;
$$;
revoke all on function private.nt_message_preview(text, text) from public, anon, authenticated;

-- --------------------------------------------------------
-- 4) Tetikleyiciler
-- --------------------------------------------------------

-- 4a) Mesaj
--  Öğrenci yazdı (ogr:<öğrenci>) → bu sohbete son 180 günde yazmış öğretmenler; yoksa öğrencinin sınıflarının öğretmenleri
--  Öğretmen yazdı → ogr:<öğrenci> ise o öğrenci; sinif:<okul>:<sınıf> ise sınıfın öğrencileri
create or replace function private.nt_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_conv text := new.conversation_id;
  v_body text := private.nt_message_preview(new.message_type, new.content);
  v_sid uuid;
  v_st public.students;
  v_school_txt text;
  v_class text;
  v_users uuid[];
begin
  begin
    if new.sender_role = 'student' then
      if v_conv not like 'ogr:%' then return null; end if;
      v_sid := split_part(v_conv, ':', 2)::uuid;
      select * into v_st from public.students where id = v_sid;
      if v_st.id is null or v_st.school_id is null then return null; end if;
      v_users := array(
        select distinct p.id from public.profiles p
        where p.approved and p.is_active and p.role in ('ogretmen', 'admin')
          and (p.role = 'admin' or p.school_id = v_st.school_id)
          and exists (
            select 1 from public.messages m
            where m.conversation_id = v_conv and m.sender_id = p.id::text and m.created_at > now() - interval '180 days'
          )
        limit 20
      );
      if cardinality(v_users) = 0 then
        v_users := array(
          select distinct p.id from public.profiles p
          where p.approved and p.is_active and p.role = 'ogretmen' and p.school_id = v_st.school_id
            and (
              p.class_name = v_st.class_name
              or exists (
                select 1 from public.teacher_classes t
                where t.teacher_id = p.id
                  and (t.class_name = v_st.class_name
                       or t.class_name in (select cm.class_name from public.class_members cm where cm.student_id = v_sid and cm.status = 'approved'))
              )
            )
          limit 20
        );
      end if;
      perform private.nt_to_users(v_users, 'mesaj', null, 'mesaj:' || v_conv, v_conv, new.sender_name, v_body, new.sender_name);
    else
      if v_conv like 'ogr:%' then
        v_sid := split_part(v_conv, ':', 2)::uuid;
        perform private.nt_to_students(array[v_sid], 'mesaj', null, 'mesaj:' || v_conv, v_conv, new.sender_name, v_body, new.sender_name);
      elsif v_conv like 'sinif:%' then
        v_school_txt := split_part(v_conv, ':', 2);
        v_class := substr(v_conv, char_length('sinif:' || v_school_txt || ':') + 1);
        perform private.nt_to_students(
          private.nt_class_students(case when v_school_txt = 'none' then null else v_school_txt::uuid end, v_class),
          'mesaj', 'sinif', 'mesaj:' || v_conv, v_conv, new.sender_name, v_body, new.sender_name);
      end if;
    end if;
  exception when others then
    raise warning 'bildirim (mesaj) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_message() from public, anon, authenticated;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function private.nt_message();

-- 4b) Yeni ödev → sınıfın öğrencileri
create or replace function private.nt_homework_new()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if coalesce(btrim(new.class_name), '') = '' then return null; end if;
    perform private.nt_to_students(
      private.nt_class_students(new.school_id, new.class_name),
      'odev_yeni', null, 'odev:' || new.id, new.id::text, new.title,
      nullif(btrim(coalesce(new.subject, '')), ''), new.teacher_name, false);
  exception when others then
    raise warning 'bildirim (ödev) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_homework_new() from public, anon, authenticated;
drop trigger if exists homeworks_notify on public.homeworks;
create trigger homeworks_notify after insert on public.homeworks
  for each row execute function private.nt_homework_new();

-- 4c) Değerlendirme → öğrenci (yalnızca sonuçlar açıklanmışsa)
--     Kontrol girilince/değişince: o öğrenci. Sonuçlar sonradan açıklanınca: kontrolü olan bütün öğrenciler (4c-2).
create or replace function private.nt_homework_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  h public.homeworks;
begin
  begin
    if tg_op = 'UPDATE' and new.status = old.status and new.score is not distinct from old.score
       and new.note is not distinct from old.note and new.awarded_points is not distinct from old.awarded_points then
      return null;
    end if;
    select * into h from public.homeworks where id = new.homework_id;
    if h.id is null or not h.results_released then return null; end if;
    perform private.nt_to_students(
      array[new.student_id], 'odev_degerlendirildi', new.status, 'degerlendirme:' || h.id, h.id::text, h.title,
      null, h.teacher_name, false);
  exception when others then
    raise warning 'bildirim (değerlendirme) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_homework_check() from public, anon, authenticated;
drop trigger if exists homework_checks_notify on public.homework_checks;
create trigger homework_checks_notify after insert or update on public.homework_checks
  for each row execute function private.nt_homework_check();

-- 4c-2) Sonuçlar açıklandı → kontrolü girilmiş öğrenciler
create or replace function private.nt_homework_release()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if not (new.results_released and not old.results_released) then return null; end if;
    perform private.nt_to_students(
      array(select c.student_id from public.homework_checks c where c.homework_id = new.id),
      'odev_degerlendirildi', null, 'degerlendirme:' || new.id, new.id::text, new.title,
      null, new.teacher_name, false);
  exception when others then
    raise warning 'bildirim (sonuç açıklama) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_homework_release() from public, anon, authenticated;
drop trigger if exists homeworks_release_notify on public.homeworks;
create trigger homeworks_release_notify after update of results_released on public.homeworks
  for each row execute function private.nt_homework_release();

-- 4d) Teslim → ödevin öğretmeni (ödev başına toplanır: count = yeni teslim sayısı)
create or replace function private.nt_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  h public.homeworks;
begin
  begin
    if new.status <> 'teslim' or (tg_op = 'UPDATE' and old.status = 'teslim') then return null; end if;
    select * into h from public.homeworks where id = new.homework_id;
    if h.id is null or h.teacher_id is null then return null; end if;
    perform private.nt_to_users(
      array[h.teacher_id], 'odev_teslim', null, 'teslim:' || h.id, h.id::text, h.title, h.class_name,
      (select s.name from public.students s where s.id = new.student_id), true);
  exception when others then
    raise warning 'bildirim (teslim) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_submission() from public, anon, authenticated;
drop trigger if exists homework_submissions_notify on public.homework_submissions;
create trigger homework_submissions_notify after insert or update of status on public.homework_submissions
  for each row execute function private.nt_submission();

-- 4e) Canlı ders başladı → sınıfın öğrencileri; bitince okunmamış bildirim kalkar
create or replace function private.nt_live()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform private.nt_to_students(
        private.nt_class_students(new.school_id, new.class_name),
        'canli_ders', null, 'canli:' || new.id, new.id::text, new.title, new.class_name,
        (select coalesce(nullif(btrim(p.full_name), ''), 'Öğretmen') from public.profiles p where p.id = new.teacher_id), false);
    elsif new.ended_at is not null and old.ended_at is null then
      delete from public.notifications where group_key = 'canli:' || new.id and read_at is null;
    end if;
  exception when others then
    raise warning 'bildirim (canlı ders) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_live() from public, anon, authenticated;
drop trigger if exists live_sessions_notify on public.live_sessions;
create trigger live_sessions_notify after insert or update of ended_at on public.live_sessions
  for each row execute function private.nt_live();

-- 4f) Duyuru → okulun öğrencileri ve diğer öğretmenleri (school_id boşsa: herkes)
create or replace function private.nt_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_body text := left(btrim(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g')), 140);
begin
  begin
    perform private.nt_to_students(
      array(select s.id from public.students s where new.school_id is null or s.school_id = new.school_id limit 20000),
      'duyuru', new.priority, 'duyuru:' || new.id, new.id::text, new.title, v_body, new.teacher_name, false);
    perform private.nt_to_users(
      array(select p.id from public.profiles p
            where p.approved and p.is_active and p.id is distinct from new.author_id
              and (new.school_id is null or p.school_id = new.school_id)
            limit 20000),
      'duyuru', new.priority, 'duyuru:' || new.id, new.id::text, new.title, v_body, new.teacher_name, false);
  exception when others then
    raise warning 'bildirim (duyuru) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_announcement() from public, anon, authenticated;
drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify after insert on public.announcements
  for each row execute function private.nt_announcement();

-- 4g) Kaynak silinince ona ait bildirimler de silinir (ödev, duyuru, canlı ders)
create or replace function private.nt_source_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications
  where ref_id = old.id::text
    and kind in ('odev_yeni', 'odev_degerlendirildi', 'odev_teslim', 'duyuru', 'canli_ders', 'odev_hatirlatma', 'odev_bitti');
  return null;
end;
$$;
revoke all on function private.nt_source_deleted() from public, anon, authenticated;
drop trigger if exists homeworks_notify_delete on public.homeworks;
create trigger homeworks_notify_delete after delete on public.homeworks
  for each row execute function private.nt_source_deleted();
drop trigger if exists announcements_notify_delete on public.announcements;
create trigger announcements_notify_delete after delete on public.announcements
  for each row execute function private.nt_source_deleted();
drop trigger if exists live_sessions_notify_delete on public.live_sessions;
create trigger live_sessions_notify_delete after delete on public.live_sessions
  for each row execute function private.nt_source_deleted();

-- 4h) Topluluk köprüsü: community_notifications → notifications (kind = 'topluluk', sub = topluluk türü)
-- Toplama anahtarı: yorum/teşekkür/kullandım/kopya gönderi başına; yeni gönderi yazar başına; takip tek satır
create or replace function private.nt_cp_group(p_kind text, p_post uuid, p_item uuid, p_actor uuid, p_id bigint)
returns text language sql immutable set search_path = '' as $$
  select 'topluluk:' || case
    when p_kind = 'follow' then 'follow'
    when p_kind = 'post' then 'post:' || coalesce(p_actor::text, '-')
    when p_kind = 'moderation' then 'moderation:' || p_id
    else p_kind || ':' || coalesce(p_post::text, p_item::text, p_id::text)
  end;
$$;
revoke all on function private.nt_cp_group(text, uuid, uuid, uuid, bigint) from public, anon, authenticated;

create or replace function private.nt_community()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_actor text;
begin
  begin
    if new.read_at is not null then return null; end if;
    v_title := coalesce(
      (select i.title from public.community_items i where i.id = new.item_id),
      (select coalesce(i.title, left(coalesce(nullif(btrim(p.link_title), ''), nullif(btrim(p.body), '')), 80))
         from public.community_posts p left join public.community_items i on i.id = p.item_id
        where p.id = new.post_id),
      'Topluluk');
    if new.actor_id is not null then
      v_actor := private.cp_card(new.actor_id, false) ->> 'name';
    end if;
    perform private.nt_to_users(
      array[new.recipient_id], 'topluluk', new.kind,
      private.nt_cp_group(new.kind, new.post_id, new.item_id, new.actor_id, new.id),
      coalesce(new.post_id::text, new.item_id::text), v_title, new.message, v_actor, true);
  exception when others then
    raise warning 'bildirim (topluluk) üretilemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_community() from public, anon, authenticated;
drop trigger if exists community_notifications_bridge on public.community_notifications;
create trigger community_notifications_bridge after insert on public.community_notifications
  for each row execute function private.nt_community();

-- Topluluk sayfasında okundu yapılınca ana zildeki karşılığı da okundu olur
-- (o gruba ait okunmamış topluluk kaydı kalmadıysa)
create or replace function private.nt_community_read()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_group text := private.nt_cp_group(new.kind, new.post_id, new.item_id, new.actor_id, new.id);
begin
  begin
    update public.notifications n set read_at = now()
    where n.recipient_user = new.recipient_id and n.group_key = v_group and n.read_at is null
      and not exists (
        select 1 from public.community_notifications c
        where c.recipient_id = new.recipient_id and c.read_at is null
          and private.nt_cp_group(c.kind, c.post_id, c.item_id, c.actor_id, c.id) = v_group
      );
  exception when others then
    raise warning 'bildirim (topluluk okundu) eşitlenemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_community_read() from public, anon, authenticated;
drop trigger if exists community_notifications_read_sync on public.community_notifications;
create trigger community_notifications_read_sync after update of read_at on public.community_notifications
  for each row when (old.read_at is null and new.read_at is not null)
  execute function private.nt_community_read();

-- --------------------------------------------------------
-- 5) İstemci fonksiyonları
-- --------------------------------------------------------

-- Ana zilde okundu yapılan topluluk gruplarını topluluk tablosunda da okundu yapar
create or replace function private.nt_sync_community_read(p_user uuid, p_groups text[])
returns void language sql security definer set search_path = '' as $$
  update public.community_notifications c set read_at = now()
  where c.recipient_id = p_user and c.read_at is null
    and private.nt_cp_group(c.kind, c.post_id, c.item_id, c.actor_id, c.id) = any (p_groups);
$$;
revoke all on function private.nt_sync_community_read(uuid, text[]) from public, anon, authenticated;

-- Okunmamış bildirim sayısı (grup sayısı: "5 yeni teslim" tek bildirimdir)
create or replace function public.notifications_unread_count()
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
begin
  if v_student is not null then
    return (select count(*)::integer from public.notifications where recipient_student = v_student and read_at is null);
  elsif public.is_staff() then
    return (select count(*)::integer from public.notifications where recipient_user = auth.uid() and read_at is null);
  end if;
  return 0;
end;
$$;
revoke all on function public.notifications_unread_count() from public, anon;
grant execute on function public.notifications_unread_count() to authenticated;

-- Liste: en yeni önce; sayfalama p_before (bir önceki sayfanın son "at" değeri)
create or replace function public.notifications_list(p_limit integer default 30, p_before timestamptz default null)
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_user uuid;
begin
  if v_student is null then
    if not public.is_staff() then return; end if;
    v_user := auth.uid();
  end if;
  return query
    select jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'sub', n.sub, 'group_key', n.group_key, 'ref_id', n.ref_id,
      'title', n.title, 'body', n.body, 'actor_name', n.actor_name, 'count', n.count,
      'at', n.updated_at, 'unread', n.read_at is null
    )
    from public.notifications n
    where (case when v_student is not null then n.recipient_student = v_student else n.recipient_user = v_user end)
      and (p_before is null or n.updated_at < p_before)
    order by n.updated_at desc, n.id desc
    limit greatest(1, least(60, coalesce(p_limit, 30)));
end;
$$;
revoke all on function public.notifications_list(integer, timestamptz) from public, anon;
grant execute on function public.notifications_list(integer, timestamptz) to authenticated;

-- Okundu yap: p_ids boşsa hepsi. Okundu yapılan satır sayısını döner.
create or replace function public.notifications_mark_read(p_ids bigint[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_user uuid;
  v_groups text[];
  v_n integer;
begin
  if v_student is null then
    if not public.is_staff() then return 0; end if;
    v_user := auth.uid();
  end if;
  with u as (
    update public.notifications n set read_at = now()
    where (case when v_student is not null then n.recipient_student = v_student else n.recipient_user = v_user end)
      and n.read_at is null
      and (p_ids is null or n.id = any (p_ids))
    returning n.kind, n.group_key
  )
  select coalesce(array_agg(group_key) filter (where kind = 'topluluk'), '{}'), count(*)::integer
  into v_groups, v_n from u;
  if v_user is not null and cardinality(v_groups) > 0 then
    perform private.nt_sync_community_read(v_user, v_groups);
  end if;
  return v_n;
end;
$$;
revoke all on function public.notifications_mark_read(bigint[]) from public, anon;
grant execute on function public.notifications_mark_read(bigint[]) to authenticated;

-- İlgili sayfa açılınca: ör. ['mesaj:ogr:<id>'], ['odev:<id>', 'degerlendirme:<id>'], ['teslim:<id>']
create or replace function public.notifications_mark_groups_read(p_groups text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_user uuid;
  v_n integer;
begin
  if p_groups is null or cardinality(p_groups) = 0 or cardinality(p_groups) > 50 then return 0; end if;
  if v_student is null then
    if not public.is_staff() then return 0; end if;
    v_user := auth.uid();
  end if;
  update public.notifications n set read_at = now()
  where (case when v_student is not null then n.recipient_student = v_student else n.recipient_user = v_user end)
    and n.read_at is null and n.group_key = any (p_groups);
  get diagnostics v_n = row_count;
  if v_user is not null then
    perform private.nt_sync_community_read(v_user, array(select g from unnest(p_groups) g where g like 'topluluk:%'));
  end if;
  return v_n;
end;
$$;
revoke all on function public.notifications_mark_groups_read(text[]) from public, anon;
grant execute on function public.notifications_mark_groups_read(text[]) to authenticated;

-- Öğrenci sınıf grubu sohbetini açınca ilgili mesaj bildirimi de okunur
create or replace function public.mark_group_read(p_conv text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
begin
  if v_student is null or p_conv not like 'sinif:%' or not public.can_read_conversation(p_conv) then return; end if;
  insert into public.conversation_reads (conversation_id, student_id, last_read_at)
  values (p_conv, v_student, now())
  on conflict (conversation_id, student_id) do update set last_read_at = now();
  update public.notifications set read_at = now()
  where recipient_student = v_student and group_key = 'mesaj:' || p_conv and read_at is null;
end;
$$;
revoke execute on function public.mark_group_read(text) from public, anon;
grant execute on function public.mark_group_read(text) to authenticated;

-- Ayarlar
create or replace function public.notification_settings_get()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  s public.notification_settings;
begin
  if v_student is not null then
    select * into s from public.notification_settings where recipient_student = v_student;
  elsif public.is_staff() then
    select * into s from public.notification_settings where recipient_user = auth.uid();
  else
    return null;
  end if;
  return jsonb_build_object(
    'off_in_app', to_jsonb(coalesce(s.off_in_app, '{}'::text[])),
    'off_push', to_jsonb(coalesce(s.off_push, '{}'::text[])),
    'quiet_enabled', case when v_student is not null then true else coalesce(s.quiet_enabled, true) end,
    'quiet_start', to_char(case when v_student is not null then '22:00'::time else coalesce(s.quiet_start, '22:00'::time) end, 'HH24:MI'),
    'quiet_end', to_char(case when v_student is not null then '07:00'::time else coalesce(s.quiet_end, '07:00'::time) end, 'HH24:MI'),
    'can_edit_quiet', v_student is null
  );
end;
$$;
revoke all on function public.notification_settings_get() from public, anon;
grant execute on function public.notification_settings_get() to authenticated;

-- Öğrencide sessiz saatler sabittir (gönderilen değerler yok sayılır)
create or replace function public.notification_settings_save(
  p_off_in_app text[], p_off_push text[],
  p_quiet_enabled boolean default null, p_quiet_start time default null, p_quiet_end time default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_user uuid;
  v_in text[] := array(select distinct k from unnest(coalesce(p_off_in_app, '{}')) k where k = any (private.nt_kinds()));
  v_push text[] := array(select distinct k from unnest(coalesce(p_off_push, '{}')) k where k = any (private.nt_kinds()));
begin
  if v_student is null then
    if not public.is_staff() then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
    v_user := auth.uid();
  end if;
  if v_student is not null then
    insert into public.notification_settings (recipient_student, off_in_app, off_push)
    values (v_student, v_in, v_push)
    on conflict (recipient_student) do update
      set off_in_app = excluded.off_in_app, off_push = excluded.off_push, updated_at = now();
  else
    insert into public.notification_settings (recipient_user, off_in_app, off_push, quiet_enabled, quiet_start, quiet_end)
    values (v_user, v_in, v_push, coalesce(p_quiet_enabled, true), coalesce(p_quiet_start, '22:00'), coalesce(p_quiet_end, '07:00'))
    on conflict (recipient_user) do update
      set off_in_app = excluded.off_in_app, off_push = excluded.off_push,
          quiet_enabled = coalesce(p_quiet_enabled, notification_settings.quiet_enabled),
          quiet_start = coalesce(p_quiet_start, notification_settings.quiet_start),
          quiet_end = coalesce(p_quiet_end, notification_settings.quiet_end),
          updated_at = now();
  end if;
end;
$$;
revoke all on function public.notification_settings_save(text[], text[], boolean, time, time) from public, anon;
grant execute on function public.notification_settings_save(text[], text[], boolean, time, time) to authenticated;

-- --------------------------------------------------------
-- 6) Temizlik ve realtime
-- --------------------------------------------------------
create or replace function private.nt_cleanup()
returns void language sql security definer set search_path = '' as $$
  delete from public.notifications where read_at is not null and read_at < now() - interval '60 days';
  delete from public.notifications where updated_at < now() - interval '180 days';
$$;
revoke all on function private.nt_cleanup() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'notifications-cleanup') then perform cron.unschedule('notifications-cleanup'); end if;
end $$;
select cron.schedule('notifications-cleanup', '45 1 * * *', $cron$ select private.nt_cleanup(); $cron$);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
