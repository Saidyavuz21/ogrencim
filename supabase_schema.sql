-- ========================================================
-- ÖĞRENCİ & VELİ BİLGİ PORTALI - SUPABASE VERİTABANI ŞEMASI
-- ========================================================

-- 1. ÖĞRENCİLER TABLOSU
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  name text not null,
  avatar text default '',
  class_name text default '7-B',
  points integer default 100,
  plus_count integer default 5,
  minus_count integer default 1,
  attendance_days integer default 36,
  absence_days integer default 2,
  parent_pin text default '123456',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. PUAN GEÇMİŞİ TABLOSU (+ / - Hareketleri)
create table if not exists public.points_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  teacher_name text not null,
  change_type text check (change_type in ('plus', 'minus')),
  amount integer not null, -- +1 veya -1
  reason text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. MESAJLAR TABLOSU (Canlı WhatsApp Sohbeti)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null, -- Örn: 't1' (Zehra Hoca) veya 'g1' (7-B Sınıf Grubu)
  sender_id text not null,
  sender_name text not null,
  sender_role text check (sender_role in ('parent', 'teacher', 'admin')),
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'audio', 'file')),
  file_url text default null,
  audio_duration text default null,
  is_read boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. ÖDEVLER TABLOSU
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  teacher_name text not null,
  title text not null,
  file_type text default 'PDF',
  file_url text default null,
  due_days integer default 2,
  points integer default 100,
  is_submitted boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. DUYURULAR TABLOSU (Öğretmen Toplu Mesajları)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  title text not null,
  content text not null,
  priority text default 'normal' check (priority in ('normal', 'urgent')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================
-- GERÇEK ZAMANLI (REALTIME) YAYINLARIN AKTİF EDİLMESİ
-- ========================================================
-- Bu ayar sayesinde mesajlar ve puanlar sayfa yenilenmeden anlık güncellenir
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.points_history;
alter publication supabase_realtime add table public.announcements;

-- ========================================================
-- BAŞLANGIÇ DEMO VERİLERİ (Örnek Öğrenciler & Mesajlar)
-- ========================================================
insert into public.students (student_number, name, avatar, class_name, points, plus_count, minus_count, attendance_days, absence_days, parent_pin)
values 
  ('4527-B', 'Emre Demir', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '7-B', 104, 5, 1, 36, 2, '123456'),
  ('4510-B', 'Zeynep Kaya', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '7-B', 112, 12, 0, 38, 0, '123456'),
  ('4533-B', 'Burak Yıldız', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '7-B', 108, 9, 1, 37, 1, '123456'),
  ('4541-B', 'Elif Çelik', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '7-B', 98, 4, 2, 35, 3, '123456')
on conflict (student_number) do nothing;

insert into public.messages (conversation_id, sender_id, sender_name, sender_role, content, message_type, is_read)
values
  ('t1', 'p1', 'Ahmet Demir (Veli)', 'parent', 'Hocam iyi günler, Emre bugünkü matematik ödevinde biraz zorlandı da ek kaynak önerebilir misiniz?', 'text', true),
  ('t1', 't1', 'Zehra Aydın (Türkçe & Sınıf Rehber Öğrt.)', 'teacher', 'Merhaba Ahmet Bey, MEB kazanım testleri 4. fasiküldeki alıştırmalar pekiştirmesi için çok faydalı olacaktır.', 'text', true),
  ('g1', 't1', 'Zehra Aydın', 'teacher', 'Sayın Velilerimiz, Cuma günü saat 14:00te veli toplantımız olacaktır.', 'text', true);

