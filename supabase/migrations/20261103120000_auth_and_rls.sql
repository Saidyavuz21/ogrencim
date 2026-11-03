-- ========================================================
-- 1. AŞAMA: GERÇEK KİMLİK DOĞRULAMA + SATIR SEVİYESİ GÜVENLİK (RLS)
-- ========================================================
-- Admin & Öğretmen : Supabase Auth (e-posta + şifre), rol bilgisi public.profiles tablosunda.
--                    Yeni öğretmenler admin onaylayana kadar (approved = false) yetkisizdir.
-- Öğrenci & Veli   : Anonim Supabase oturumu + okul no / 4 haneli PIN.
--                    PIN yalnızca bcrypt hash olarak saklanır, doğrulama sunucuda yapılır,
--                    5 hatalı denemede öğrenci 15 dk kilitlenir.
-- ========================================================

-- --------------------------------------------------------
-- PROFİLLER (admin / öğretmen)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'ogretmen' check (role in ('admin', 'ogretmen')),
  full_name text not null default '',
  email text,
  branch text,
  city text,
  district text,
  school_name text,
  class_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Yeni kayıt olan her (anonim olmayan) kullanıcı için ONAYSIZ öğretmen profili oluştur.
-- Not: user_metadata içindeki "role" alanına bilerek güvenilmez (kullanıcı tarafından değiştirilebilir).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.profiles (id, role, full_name, email, branch, city, district, school_name, class_name, approved)
  values (
    new.id,
    'ogretmen',
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 120),
    new.email,
    left(new.raw_user_meta_data ->> 'branch', 80),
    left(new.raw_user_meta_data ->> 'city', 80),
    left(new.raw_user_meta_data ->> 'district', 80),
    left(new.raw_user_meta_data ->> 'school', 160),
    left(new.raw_user_meta_data ->> 'class_name', 20),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mevcut süper admin hesabı
insert into public.profiles (id, role, full_name, email, approved)
select id, 'admin', 'Said Yavuz', email, true
from auth.users
where email = 'saidyvz21@gmail.com'
on conflict (id) do update set role = 'admin', approved = true;

-- --------------------------------------------------------
-- ÖĞRENCİ PIN ALANLARI & OTURUMLARI
-- --------------------------------------------------------
alter table public.students drop column if exists parent_pin;

-- PIN bilgileri AYRI tabloda: API (anon/authenticated) bu tabloya hiçbir şekilde erişemez,
-- realtime yayınında da yer almaz. Yalnızca aşağıdaki security definer fonksiyonları kullanır.
create table if not exists public.student_credentials (
  student_id uuid primary key references public.students(id) on delete cascade,
  pin_hash text not null,
  failed_pin_attempts integer not null default 0,
  pin_locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.student_credentials enable row level security;

-- Sahte varsayılan değerleri temizle
alter table public.students alter column class_name drop default;
alter table public.students alter column plus_count set default 0;
alter table public.students alter column minus_count set default 0;
alter table public.students alter column attendance_days set default 0;
alter table public.students alter column absence_days set default 0;

create table if not exists public.student_sessions (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
alter table public.student_sessions enable row level security;

create table if not exists public.pin_attempts (
  id bigint generated always as identity primary key,
  auth_uid uuid,
  student_number text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists pin_attempts_uid_time on public.pin_attempts (auth_uid, created_at);
alter table public.pin_attempts enable row level security;
-- student_credentials, student_sessions ve pin_attempts için bilerek politika YOK: sadece aşağıdaki fonksiyonlar erişir.

-- --------------------------------------------------------
-- YARDIMCI FONKSİYONLAR (politikalarda kullanılır)
-- --------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'ogretmen') and approved
  );
$$;

create or replace function public.current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select student_id from public.student_sessions
  where auth_uid = auth.uid() and expires_at > now();
$$;

-- --------------------------------------------------------
-- ÖĞRENCİ / VELİ GİRİŞİ
-- --------------------------------------------------------
create or replace function public.student_login(p_student_number text, p_pin text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_student public.students%rowtype;
  v_cred public.student_credentials%rowtype;
  v_recent_failures integer;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Oturum başına deneme sınırı (farklı numaralara PIN denemeyi yavaşlatır)
  select count(*) into v_recent_failures
  from public.pin_attempts
  where auth_uid = v_uid and not success and created_at > now() - interval '15 minutes';
  if v_recent_failures >= 10 then
    return json_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into v_student
  from public.students
  where student_number = trim(p_student_number);

  if found then
    select * into v_cred
    from public.student_credentials
    where student_id = v_student.id
    for update;
  end if;

  if v_student.id is null or v_cred.student_id is null then
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, left(p_student_number, 40), false);
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_cred.pin_locked_until is not null and v_cred.pin_locked_until > now() then
    return json_build_object('ok', false, 'error', 'locked', 'locked_until', v_cred.pin_locked_until);
  end if;

  if v_cred.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_cred.pin_hash) then
    update public.student_credentials
      set failed_pin_attempts = 0, pin_locked_until = null
      where student_id = v_student.id;
    insert into public.student_sessions (auth_uid, student_id)
      values (v_uid, v_student.id)
      on conflict (auth_uid) do update
        set student_id = excluded.student_id, created_at = now(), expires_at = now() + interval '30 days';
    insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, v_student.student_number, true);
    return json_build_object(
      'ok', true,
      'student', json_build_object(
        'id', v_student.id,
        'student_number', v_student.student_number,
        'name', v_student.name,
        'class_name', v_student.class_name,
        'avatar', v_student.avatar
      )
    );
  end if;

  insert into public.pin_attempts (auth_uid, student_number, success) values (v_uid, v_student.student_number, false);
  if v_cred.failed_pin_attempts + 1 >= 5 then
    update public.student_credentials
      set failed_pin_attempts = 0, pin_locked_until = now() + interval '15 minutes'
      where student_id = v_student.id;
    return json_build_object('ok', false, 'error', 'locked', 'locked_until', now() + interval '15 minutes');
  end if;

  update public.student_credentials
    set failed_pin_attempts = failed_pin_attempts + 1
    where student_id = v_student.id;
  return json_build_object('ok', false, 'error', 'invalid');
end;
$$;

-- Sayfa yenilendiğinde oturumdaki öğrenciyi geri getirir
create or replace function public.my_student()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', s.id,
    'student_number', s.student_number,
    'name', s.name,
    'class_name', s.class_name,
    'avatar', s.avatar
  )
  from public.students s
  where s.id = public.current_student_id();
$$;

create or replace function public.student_logout()
returns void language sql security definer set search_path = '' as $$
  delete from public.student_sessions where auth_uid = auth.uid();
$$;

-- Veli kilit ekranı: oturumdaki öğrencinin PIN'ini yeniden doğrular (aynı kilit kurallarıyla)
create or replace function public.verify_my_pin(p_pin text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_number text;
begin
  select s.student_number into v_number
  from public.students s
  where s.id = public.current_student_id();
  if v_number is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  return public.student_login(v_number, p_pin);
end;
$$;

-- --------------------------------------------------------
-- PERSONEL İŞLEMLERİ (öğrenci ekleme, PIN sıfırlama, öğretmen onayı)
-- --------------------------------------------------------
create or replace function public.staff_create_student(
  p_student_number text,
  p_name text,
  p_class_name text,
  p_pin text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if coalesce(trim(p_student_number), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Okul numarası ve ad soyad zorunludur.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;

  insert into public.students (student_number, name, class_name)
  values (
    trim(p_student_number),
    left(trim(p_name), 120),
    left(trim(coalesce(p_class_name, '')), 20)
  )
  returning id into v_id;

  insert into public.student_credentials (student_id, pin_hash)
  values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  return v_id;
end;
$$;

create or replace function public.staff_set_student_pin(p_student_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Öğrenci bulunamadı.';
  end if;

  insert into public.student_credentials (student_id, pin_hash)
  values (p_student_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (student_id) do update
    set pin_hash = excluded.pin_hash,
        failed_pin_attempts = 0,
        pin_locked_until = null,
        updated_at = now();
  -- Eski PIN ile açılmış oturumları kapat
  delete from public.student_sessions where student_id = p_student_id;
end;
$$;

-- Sınıf sıralaması: öğrenci yalnızca kendi sınıfını, personel herkesi görür (PIN alanları asla dönmez)
create or replace function public.class_leaderboard()
returns table (
  id uuid,
  student_number text,
  name text,
  class_name text,
  avatar text,
  points integer,
  plus_count integer,
  minus_count integer
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.student_number, s.name, s.class_name, s.avatar, s.points, s.plus_count, s.minus_count
  from public.students s
  where public.is_staff()
     or s.class_name = (select me.class_name from public.students me where me.id = public.current_student_id())
  order by s.points desc;
$$;

-- --------------------------------------------------------
-- MESAJLARDA GÖNDEREN KİMLİĞİNİ SUNUCU BELİRLER
-- --------------------------------------------------------
create or replace function public.messages_set_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid()::text;
  if public.is_staff() then
    new.sender_role := case when public.is_admin() then 'admin' else 'teacher' end;
  else
    new.sender_role := 'parent';
  end if;
  new.is_read := false;
  return new;
end;
$$;

drop trigger if exists messages_set_sender on public.messages;
create trigger messages_set_sender
  before insert on public.messages
  for each row execute function public.messages_set_sender();

-- --------------------------------------------------------
-- TABLO YETKİLERİ
-- --------------------------------------------------------
revoke all on public.students, public.points_history, public.messages, public.homeworks,
              public.announcements, public.profiles, public.student_credentials,
              public.student_sessions, public.pin_attempts
  from anon;
revoke all on public.students, public.profiles, public.student_credentials,
              public.student_sessions, public.pin_attempts
  from authenticated;
-- TRUNCATE RLS'i atlar; API kullanıcılarına asla verilmemeli
revoke truncate on public.points_history, public.messages, public.homeworks, public.announcements
  from authenticated;

-- students: PIN bilgisi bu tabloda yok; okul numarası (giriş anahtarı) API'den değiştirilemez
grant select on public.students to authenticated;
grant update (name, avatar, class_name, points, plus_count, minus_count, attendance_days, absence_days)
  on public.students to authenticated;
grant delete on public.students to authenticated;

-- profiles: herkes kendi satırını görür; yalnızca admin onay/rol değiştirir
grant select on public.profiles to authenticated;
grant update (approved, role) on public.profiles to authenticated;

-- --------------------------------------------------------
-- RLS POLİTİKALARI
-- --------------------------------------------------------
alter table public.students enable row level security;
alter table public.points_history enable row level security;
alter table public.messages enable row level security;
alter table public.homeworks enable row level security;
alter table public.announcements enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- students
drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated
  using ((select public.is_staff()) or id = (select public.current_student_id()));
drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students for delete to authenticated
  using ((select public.is_admin()));

-- points_history
drop policy if exists points_select on public.points_history;
create policy points_select on public.points_history for select to authenticated
  using ((select public.is_staff()) or student_id = (select public.current_student_id()));
drop policy if exists points_staff_insert on public.points_history;
create policy points_staff_insert on public.points_history for insert to authenticated
  with check ((select public.is_staff()));

-- messages (konuşma bazlı ayrıntılı kısıtlama 2. aşamada, gerçek konuşma modeliyle gelecek)
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using ((select public.is_staff()) or (select public.current_student_id()) is not null);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check ((select public.is_staff()) or (select public.current_student_id()) is not null);
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using ((select public.is_staff()) or (select public.current_student_id()) is not null)
  with check ((select public.is_staff()) or (select public.current_student_id()) is not null);
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;
revoke delete, truncate on public.messages from authenticated;

-- homeworks
drop policy if exists homeworks_select on public.homeworks;
create policy homeworks_select on public.homeworks for select to authenticated
  using ((select public.is_staff()) or (select public.current_student_id()) is not null);
drop policy if exists homeworks_staff_write on public.homeworks;
create policy homeworks_staff_write on public.homeworks for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- announcements
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using ((select public.is_staff()) or (select public.current_student_id()) is not null);
drop policy if exists announcements_staff_write on public.announcements;
create policy announcements_staff_write on public.announcements for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- --------------------------------------------------------
-- FONKSİYON ÇALIŞTIRMA YETKİLERİ
-- --------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.messages_set_sender() from public, anon, authenticated;

revoke execute on function public.student_login(text, text) from public, anon;
revoke execute on function public.my_student() from public, anon;
revoke execute on function public.student_logout() from public, anon;
revoke execute on function public.verify_my_pin(text) from public, anon;
revoke execute on function public.staff_create_student(text, text, text, text) from public, anon;
revoke execute on function public.staff_set_student_pin(uuid, text) from public, anon;
revoke execute on function public.class_leaderboard() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.current_student_id() from public, anon;

grant execute on function public.student_login(text, text) to authenticated;
grant execute on function public.my_student() to authenticated;
grant execute on function public.student_logout() to authenticated;
grant execute on function public.verify_my_pin(text) to authenticated;
grant execute on function public.staff_create_student(text, text, text, text) to authenticated;
grant execute on function public.staff_set_student_pin(uuid, text) to authenticated;
grant execute on function public.class_leaderboard() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_student_id() to authenticated;
