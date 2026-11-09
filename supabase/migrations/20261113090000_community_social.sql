-- ========================================================
-- TOPLULUK (sosyal) — docs/TOPLULUK_PLANI.md Aşama 1–4 veritabanı
--  1) Profil + gizlilik ayarları + profil resmi (avatars deposu)
--  2) Takip (öğretmen ve konu), engelle / sessize al
--  3) Gönderiler: yazı, bağlantı, paylaşılan içerik (community_items yayınlanınca otomatik)
--  4) Tepkiler (Teşekkürler, Derste kullandım), yorumlar
--  5) Bildirimler (yalnızca site içi)
--  6) Şikâyet + yönetici denetimi + topluluktan uzaklaştırma (kayıtlar saklanır, 5651)
--  7) Herkese açık önizleme (giriş gerektirmez): yalnızca izin verilen içerik, yalnızca özet bilgiler
--
-- GÜVENLİK İLKELERİ
--  - Yeni tablolar doğrudan okunamaz/yazılamaz (RLS açık, politika yok ya da yalnızca sahibine);
--    bütün okuma ve yazma aşağıdaki security definer fonksiyonlarla yapılır.
--  - Gizlilik süzmesi sunucuda yapılır: kapalı bilgi (okul, il, branş, tanıtım, resim, sayılar)
--    fonksiyon çıktısına hiç girmez. Süper admin her şeyi görür.
--  - Öğretmen = public.is_staff(). Öğrenciler (anonim oturum) ve ziyaretçiler öğretmen sayılmaz.
--  - Ziyaretçiye tahta içeriği, soru şıkları ve cevaplar hiçbir zaman gönderilmez.
--  - Metinler private.community_pii ile taranır (öğrenci adı, e-posta, telefon, TC no).
-- ========================================================

-- --------------------------------------------------------
-- 0) Yardımcılar
-- --------------------------------------------------------

-- Görünen ad: tam / kısaltılmış ("Ayşe Y.") / takma ad
create or replace function private.cp_display_name(p_full text, p_mode text, p_alias text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_mode = 'alias' and coalesce(btrim(p_alias), '') <> '' then btrim(p_alias)
    when p_mode = 'full' then coalesce(nullif(btrim(p_full), ''), 'Öğretmen')
    else coalesce((
      select case
        when cardinality(w) = 0 then null
        when cardinality(w) = 1 then w[1]
        else array_to_string(w[1:cardinality(w) - 1], ' ') || ' ' || upper(left(w[cardinality(w)], 1)) || '.'
      end
      from (select regexp_split_to_array(btrim(p_full), '\s+') as w) x
      where coalesce(btrim(p_full), '') <> ''
    ), 'Öğretmen')
  end;
$$;
revoke all on function private.cp_display_name(text, text, text) from public, anon, authenticated;

-- --------------------------------------------------------
-- 1) Profil ve gizlilik
-- --------------------------------------------------------
create table if not exists public.community_profiles (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  display_mode text not null default 'short' check (display_mode in ('full', 'short', 'alias')),
  alias text check (alias is null or char_length(btrim(alias)) between 2 and 40),
  bio text check (bio is null or char_length(bio) <= 200),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 200),
  show_avatar boolean not null default true,
  show_school boolean not null default false,
  show_city boolean not null default true,
  show_branch boolean not null default true,
  -- Profil sayfasını kimler görebilir
  visibility text not null default 'teachers' check (visibility in ('public', 'teachers', 'followers', 'nobody')),
  allow_follow boolean not null default true,
  show_follow_counts boolean not null default true,
  -- Paylaştığı tahta/soru setleri giriş yapmayanlara önizleme olarak gösterilsin mi
  public_preview boolean not null default false,
  -- Takip ettiklerim paylaşınca bildirim al
  notify_follow_posts boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.community_profiles enable row level security;
revoke all on public.community_profiles from public, anon, authenticated;

-- Topluluktan uzaklaştırma (yönetici)
create table if not exists public.community_suspensions (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  until timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.community_suspensions enable row level security;
revoke all on public.community_suspensions from public, anon, authenticated;

create or replace function private.cp_suspended(p_teacher uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_suspensions s where s.teacher_id = p_teacher and s.until > now());
$$;
revoke all on function private.cp_suspended(uuid) from public, anon, authenticated;

-- Topluluğa yazabilir mi (onaylı öğretmen, uzaklaştırılmamış)
create or replace function private.cp_require_writer()
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Topluluğu yalnızca onaylı öğretmenler kullanabilir.' using errcode = '42501';
  end if;
  if private.cp_suspended(auth.uid()) then
    raise exception 'Topluluk hesabınız geçici olarak durduruldu.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;
revoke all on function private.cp_require_writer() from public, anon, authenticated;

-- Kişisel veri taraması (öğretmenin okulundaki öğrenci adları dahil)
create or replace function private.cp_check_text(p_text text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  v_found text[] := private.community_pii(p_text, public.my_school_id());
begin
  if cardinality(v_found) > 0 then
    raise exception 'Paylaşılamadı: metinde kişisel veri olabilir (%). Öğrenci adı, telefon, e-posta ya da kimlik numarası yazmayın.',
      array_to_string(v_found, ', ') using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.cp_check_text(text) from public, anon, authenticated;

-- --------------------------------------------------------
-- 2) Takip, konu takibi, engelleme
-- --------------------------------------------------------
create table if not exists public.community_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  -- Bu öğretmenin her paylaşımında bildirim (genel ayardan bağımsız)
  notify boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists community_follows_followee_idx on public.community_follows (followee_id);
alter table public.community_follows enable row level security;
revoke all on public.community_follows from public, anon, authenticated;

create table if not exists public.community_topic_follows (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 80),
  grade text not null default '' check (char_length(grade) <= 30), -- '' = bütün sınıflar
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject, grade)
);
alter table public.community_topic_follows enable row level security;
revoke all on public.community_topic_follows from public, anon, authenticated;

-- kind: block = karşı taraf beni göremez/takip edemez, ben de onu görmem; mute = yalnızca ben onu görmem
create table if not exists public.community_blocks (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('block', 'mute')),
  created_at timestamptz not null default now(),
  primary key (teacher_id, target_id),
  check (teacher_id <> target_id)
);
create index if not exists community_blocks_target_idx on public.community_blocks (target_id);
alter table public.community_blocks enable row level security;
revoke all on public.community_blocks from public, anon, authenticated;

-- Görüntüleyen (p_viewer) bu yazarın içeriğini görmemeli mi?
create or replace function private.cp_hidden_for(p_viewer uuid, p_author uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_viewer is not null and p_viewer <> p_author and exists (
    select 1 from public.community_blocks b
    where (b.teacher_id = p_viewer and b.target_id = p_author)
       or (b.teacher_id = p_author and b.target_id = p_viewer and b.kind = 'block')
  );
$$;
revoke all on function private.cp_hidden_for(uuid, uuid) from public, anon, authenticated;

-- --------------------------------------------------------
-- Öğretmen kartı: gizlilik süzmesi tek yerde
--  p_detail = false → ad, resim, branş, il (akış kartları)
--  p_detail = true  → + tanıtım, okul, sayılar, takip durumu (profil sayfası; görünürlük izin veriyorsa)
-- Süper admin her şeyi görür (gerçek ad dahil).
-- --------------------------------------------------------
create or replace function private.cp_card(p_teacher uuid, p_detail boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := auth.uid();
  v_staff boolean := public.is_staff();
  v_admin boolean := public.is_admin();
  pr public.profiles;
  cp public.community_profiles;
  v_self boolean;
  v_follows boolean := false;
  v_profile_visible boolean;
  v_card jsonb;
begin
  select * into pr from public.profiles where id = p_teacher;
  if pr.id is null then return null; end if;
  select * into cp from public.community_profiles where teacher_id = p_teacher;
  -- Ayar satırı yoksa varsayılanlar
  cp.display_mode := coalesce(cp.display_mode, 'short');
  cp.show_avatar := coalesce(cp.show_avatar, true);
  cp.show_school := coalesce(cp.show_school, false);
  cp.show_city := coalesce(cp.show_city, true);
  cp.show_branch := coalesce(cp.show_branch, true);
  cp.visibility := coalesce(cp.visibility, 'teachers');
  cp.allow_follow := coalesce(cp.allow_follow, true);
  cp.show_follow_counts := coalesce(cp.show_follow_counts, true);

  v_self := v_viewer is not null and v_viewer = p_teacher;
  if v_viewer is not null then
    v_follows := exists (select 1 from public.community_follows f where f.follower_id = v_viewer and f.followee_id = p_teacher);
  end if;
  v_profile_visible := v_self or v_admin or case cp.visibility
    when 'public' then true
    when 'teachers' then v_staff
    when 'followers' then v_staff and v_follows
    else false end;
  if not v_self and not v_admin and private.cp_hidden_for(v_viewer, p_teacher) then
    v_profile_visible := false;
  end if;

  v_card := jsonb_build_object(
    'id', p_teacher,
    'name', private.cp_display_name(pr.full_name, cp.display_mode, cp.alias),
    'avatar_path', case when (cp.show_avatar or v_self or v_admin) then cp.avatar_path end,
    'branch', case when (cp.show_branch or v_self or v_admin) then nullif(btrim(pr.branch), '') end,
    'city', case when (cp.show_city or v_self or v_admin) then nullif(btrim(pr.city), '') end,
    'profile_visible', v_profile_visible
  );
  if v_admin then
    v_card := v_card || jsonb_build_object('real_name', pr.full_name, 'school', pr.school_name);
  end if;
  if not p_detail or not v_profile_visible then
    return v_card;
  end if;

  v_card := v_card || jsonb_build_object(
    'bio', cp.bio,
    'school', case when (cp.show_school or v_self or v_admin) then nullif(btrim(pr.school_name), '') end,
    'is_self', v_self,
    'is_following', v_follows,
    'can_follow', v_staff and not v_self and cp.allow_follow and not private.cp_hidden_for(v_viewer, p_teacher)
                  and not exists (select 1 from public.community_blocks b where b.teacher_id = p_teacher and b.target_id = v_viewer and b.kind = 'block'),
    'notify', coalesce((select f.notify from public.community_follows f where f.follower_id = v_viewer and f.followee_id = p_teacher), false),
    'block', (select b.kind from public.community_blocks b where b.teacher_id = v_viewer and b.target_id = p_teacher),
    'item_count', (select count(*) from public.community_items i where i.author_id = p_teacher and not i.hidden
                    and (v_staff or coalesce((select c.public_preview from public.community_profiles c where c.teacher_id = p_teacher), false))),
    'copy_total', (select coalesce(sum(i.copy_count), 0) from public.community_items i where i.author_id = p_teacher and not i.hidden),
    'thanks_total', (select coalesce(sum(p.thanks_count), 0) from public.community_posts p where p.author_id = p_teacher and not p.hidden)
  );
  if cp.show_follow_counts or v_self or v_admin then
    v_card := v_card || jsonb_build_object(
      'followers', (select count(*) from public.community_follows f where f.followee_id = p_teacher),
      'following', (select count(*) from public.community_follows f where f.follower_id = p_teacher)
    );
  end if;
  return v_card;
end;
$$;
-- (community_posts aşağıda oluşturulur; plpgsql gövdesi çağrı anında çözülür)
revoke all on function private.cp_card(uuid, boolean) from public, anon, authenticated;

-- --------------------------------------------------------
-- Profil resmi deposu (herkese açık; dosya adı rastgele, kart yalnızca izin varsa yolu verir)
-- --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Tahta önizleme resimleri (herkese açık; yalnızca ilk sayfanın küçük resmi)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-thumbs', 'community-thumbs', true, 204800, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Kişi başına dosya sayısı (depo politikası içinden RLS'e takılmadan sayar)
-- (public şemada: depo politikası çağırabilsin; yalnızca kendi dosya sayısını verir, zararsız)
create or replace function public.my_object_count(p_bucket text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = p_bucket and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;
revoke all on function public.my_object_count(text) from public, anon;
grant execute on function public.my_object_count(text) to authenticated;

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_staff())
              and (select public.my_object_count('avatars')) < 3);
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists community_thumbs_insert on storage.objects;
create policy community_thumbs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'community-thumbs' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_staff())
              and (select public.my_object_count('community-thumbs')) < 500);
drop policy if exists community_thumbs_delete on storage.objects;
create policy community_thumbs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'community-thumbs' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.community_items add column if not exists thumb_path text check (thumb_path is null or char_length(thumb_path) <= 200);

-- --------------------------------------------------------
-- 3) Gönderiler
-- --------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text', 'link', 'item')),
  body text check (body is null or char_length(body) <= 2000),
  link_url text check (link_url is null or (char_length(link_url) <= 500 and link_url ~* '^https?://')),
  link_title text check (link_title is null or char_length(link_title) <= 160),
  item_id uuid unique references public.community_items(id) on delete cascade,
  subject text check (subject is null or char_length(subject) <= 80),
  grade text check (grade is null or char_length(grade) <= 30),
  thanks_count integer not null default 0,
  used_count integer not null default 0,
  comment_count integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  check ((kind = 'item') = (item_id is not null)),
  check (kind <> 'link' or link_url is not null),
  check (kind <> 'text' or coalesce(btrim(body), '') <> '')
);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc) where not hidden;
create index if not exists community_posts_author_idx on public.community_posts (author_id, created_at desc);
create index if not exists community_posts_subject_idx on public.community_posts (subject, created_at desc);
alter table public.community_posts enable row level security;
revoke all on public.community_posts from public, anon, authenticated;

-- Paylaşılan tahta/soru seti otomatik gönderi olur (mevcutlar da)
create or replace function private.cp_item_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.community_posts (author_id, kind, body, item_id, subject, grade, created_at)
    values (new.author_id, 'item', new.description, new.id, new.subject, new.grade, new.created_at)
    on conflict (item_id) do nothing;
  else
    update public.community_posts
       set body = new.description, subject = new.subject, grade = new.grade
     where item_id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function private.cp_item_post() from public, anon, authenticated;
drop trigger if exists community_items_post on public.community_items;
create trigger community_items_post after insert or update of description, subject, grade on public.community_items
  for each row execute function private.cp_item_post();

insert into public.community_posts (author_id, kind, body, item_id, subject, grade, created_at)
select i.author_id, 'item', i.description, i.id, i.subject, i.grade, i.created_at
from public.community_items i
on conflict (item_id) do nothing;

-- --------------------------------------------------------
-- 4) Tepkiler ve yorumlar
-- --------------------------------------------------------
create table if not exists public.community_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('thanks', 'used')),
  created_at timestamptz not null default now(),
  primary key (post_id, teacher_id, kind)
);
create index if not exists community_reactions_teacher_idx on public.community_reactions (teacher_id);
alter table public.community_reactions enable row level security;
revoke all on public.community_reactions from public, anon, authenticated;

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_author_idx on public.community_comments (author_id);
alter table public.community_comments enable row level security;
revoke all on public.community_comments from public, anon, authenticated;

-- Sayaçlar
create or replace function private.cp_counts()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  update public.community_posts p set
    thanks_count = (select count(*) from public.community_reactions r where r.post_id = v_post and r.kind = 'thanks'),
    used_count = (select count(*) from public.community_reactions r where r.post_id = v_post and r.kind = 'used'),
    comment_count = (select count(*) from public.community_comments c where c.post_id = v_post and not c.hidden)
  where p.id = v_post;
  return null;
end;
$$;
revoke all on function private.cp_counts() from public, anon, authenticated;
drop trigger if exists community_reactions_count on public.community_reactions;
create trigger community_reactions_count after insert or delete on public.community_reactions
  for each row execute function private.cp_counts();
drop trigger if exists community_comments_count on public.community_comments;
create trigger community_comments_count after insert or delete or update of hidden on public.community_comments
  for each row execute function private.cp_counts();

-- --------------------------------------------------------
-- 5) Bildirimler
-- --------------------------------------------------------
create table if not exists public.community_notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('follow', 'post', 'copy', 'thanks', 'used', 'comment', 'moderation')),
  actor_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  item_id uuid references public.community_items(id) on delete cascade,
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists community_notifications_recipient_idx on public.community_notifications (recipient_id, created_at desc);
alter table public.community_notifications enable row level security;
revoke all on public.community_notifications from public, anon, authenticated;

create or replace function private.cp_notify(p_recipient uuid, p_kind text, p_actor uuid, p_post uuid default null, p_item uuid default null, p_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if p_actor is not null and private.cp_hidden_for(p_recipient, p_actor) then return; end if;
  -- Aynı kişiden aynı şey için tekrar bildirim yok (ör. teşekkür al/geri al/yeniden ver)
  if p_kind in ('follow', 'thanks', 'used') and exists (
    select 1 from public.community_notifications n
    where n.recipient_id = p_recipient and n.kind = p_kind and n.actor_id is not distinct from p_actor
      and n.post_id is not distinct from p_post and n.created_at > now() - interval '7 days'
  ) then return; end if;
  insert into public.community_notifications (recipient_id, kind, actor_id, post_id, item_id, message)
  values (p_recipient, p_kind, p_actor, p_post, p_item, p_message);
end;
$$;
revoke all on function private.cp_notify(uuid, text, uuid, uuid, uuid, text) from public, anon, authenticated;

-- Yeni gönderi → takipçilere (genel ayar açık ya da bu öğretmen için zil açık)
create or replace function private.cp_post_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hidden then return null; end if;
  insert into public.community_notifications (recipient_id, kind, actor_id, post_id, item_id)
  select f.follower_id, 'post', new.author_id, new.id, new.item_id
  from public.community_follows f
  left join public.community_profiles c on c.teacher_id = f.follower_id
  where f.followee_id = new.author_id
    and (f.notify or coalesce(c.notify_follow_posts, true))
    and not private.cp_hidden_for(f.follower_id, new.author_id)
  limit 5000;
  return null;
end;
$$;
revoke all on function private.cp_post_notify() from public, anon, authenticated;
drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify after insert on public.community_posts
  for each row execute function private.cp_post_notify();

-- İçerik kopyalanınca yazara
create or replace function private.cp_copy_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.cp_notify(
    (select i.author_id from public.community_items i where i.id = new.item_id), 'copy', new.teacher_id,
    (select p.id from public.community_posts p where p.item_id = new.item_id), new.item_id);
  return null;
end;
$$;
revoke all on function private.cp_copy_notify() from public, anon, authenticated;
drop trigger if exists community_copies_notify on public.community_copies;
create trigger community_copies_notify after insert on public.community_copies
  for each row execute function private.cp_copy_notify();

-- --------------------------------------------------------
-- 6) Şikâyet
-- --------------------------------------------------------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_kind text not null check (target_kind in ('post', 'comment', 'profile')),
  target_id uuid not null,
  -- Şikâyet anındaki içeriğin kopyası (silinse de kayıt kalır)
  snapshot jsonb,
  target_author uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  resolution text check (resolution is null or char_length(resolution) <= 500),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists community_reports_open_uidx on public.community_reports (reporter_id, target_kind, target_id) where status = 'open';
create index if not exists community_reports_status_idx on public.community_reports (status, created_at desc);
alter table public.community_reports enable row level security;
revoke all on public.community_reports from public, anon, authenticated;

-- ========================================================
-- FONKSİYONLAR — Profil ve ayarlar
-- ========================================================

-- Kendi ayarlarım (satır yoksa varsayılanlar)
create or replace function public.community_my_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c public.community_profiles;
  pr public.profiles;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  select * into c from public.community_profiles where teacher_id = auth.uid();
  select * into pr from public.profiles where id = auth.uid();
  return jsonb_build_object(
    'full_name', pr.full_name, 'branch', pr.branch, 'city', pr.city, 'school', pr.school_name,
    'display_mode', coalesce(c.display_mode, 'short'), 'alias', c.alias, 'bio', c.bio, 'avatar_path', c.avatar_path,
    'show_avatar', coalesce(c.show_avatar, true), 'show_school', coalesce(c.show_school, false),
    'show_city', coalesce(c.show_city, true), 'show_branch', coalesce(c.show_branch, true),
    'visibility', coalesce(c.visibility, 'teachers'), 'allow_follow', coalesce(c.allow_follow, true),
    'show_follow_counts', coalesce(c.show_follow_counts, true), 'public_preview', coalesce(c.public_preview, false),
    'notify_follow_posts', coalesce(c.notify_follow_posts, true),
    'preview_name', private.cp_display_name(pr.full_name, coalesce(c.display_mode, 'short'), c.alias),
    'suspended_until', (select s.until from public.community_suspensions s where s.teacher_id = auth.uid() and s.until > now())
  );
end;
$$;
revoke all on function public.community_my_settings() from public, anon;
grant execute on function public.community_my_settings() to authenticated;

create or replace function public.community_save_settings(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_bio text := nullif(btrim(coalesce(p ->> 'bio', '')), '');
  v_alias text := nullif(btrim(coalesce(p ->> 'alias', '')), '');
  v_mode text := coalesce(p ->> 'display_mode', 'short');
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  if v_mode = 'alias' and v_alias is null then raise exception 'Takma ad seçtiyseniz takma adınızı yazın.' using errcode = '22023'; end if;
  perform private.cp_check_text(concat_ws(E'\n', v_bio, v_alias));
  perform private.check_rate('community_settings', 30, 3600);
  insert into public.community_profiles as c (
    teacher_id, display_mode, alias, bio, show_avatar, show_school, show_city, show_branch, visibility,
    allow_follow, show_follow_counts, public_preview, notify_follow_posts, updated_at)
  values (
    v_uid, v_mode, v_alias, left(v_bio, 200),
    coalesce((p ->> 'show_avatar')::boolean, true), coalesce((p ->> 'show_school')::boolean, false),
    coalesce((p ->> 'show_city')::boolean, true), coalesce((p ->> 'show_branch')::boolean, true),
    coalesce(p ->> 'visibility', 'teachers'), coalesce((p ->> 'allow_follow')::boolean, true),
    coalesce((p ->> 'show_follow_counts')::boolean, true), coalesce((p ->> 'public_preview')::boolean, false),
    coalesce((p ->> 'notify_follow_posts')::boolean, true), now())
  on conflict (teacher_id) do update set
    display_mode = excluded.display_mode, alias = excluded.alias, bio = excluded.bio,
    show_avatar = excluded.show_avatar, show_school = excluded.show_school, show_city = excluded.show_city,
    show_branch = excluded.show_branch, visibility = excluded.visibility, allow_follow = excluded.allow_follow,
    show_follow_counts = excluded.show_follow_counts, public_preview = excluded.public_preview,
    notify_follow_posts = excluded.notify_follow_posts, updated_at = now();
  -- Takip kapatıldıysa mevcut takipçiler kalır (yalnızca yeni takip engellenir)
end;
$$;
revoke all on function public.community_save_settings(jsonb) from public, anon;
grant execute on function public.community_save_settings(jsonb) to authenticated;

-- Profil resmi: önce istemci avatars/<uid>/<rastgele>.webp yükler, sonra bu fonksiyon yolu kaydeder.
-- Dönen değer: silinecek eski yol (istemci depodan siler).
create or replace function public.community_set_avatar(p_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  if p_path is not null and (split_part(p_path, '/', 1) <> v_uid::text or position('..' in p_path) > 0
     or not exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = p_path)) then
    raise exception 'Geçersiz resim yolu.' using errcode = '22023';
  end if;
  perform private.check_rate('community_avatar', 20, 3600);
  select avatar_path into v_old from public.community_profiles where teacher_id = v_uid;
  insert into public.community_profiles as c (teacher_id, avatar_path, updated_at) values (v_uid, p_path, now())
  on conflict (teacher_id) do update set avatar_path = excluded.avatar_path, updated_at = now();
  return case when v_old is distinct from p_path then v_old end;
end;
$$;
revoke all on function public.community_set_avatar(text) from public, anon;
grant execute on function public.community_set_avatar(text) to authenticated;

-- Profil sayfası (ziyaretçi de çağırabilir; gizlilik süzmesi cp_card içinde)
create or replace function public.community_profile(p_teacher uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_card jsonb;
begin
  if not exists (select 1 from public.profiles where id = p_teacher and role in ('ogretmen', 'admin') and approved and is_active) then
    return null;
  end if;
  v_card := private.cp_card(p_teacher, true);
  -- Ziyaretçi ve öğrenci, görünürlüğü kapalı profilin adını bile almaz
  if not public.is_staff() and not coalesce((v_card ->> 'profile_visible')::boolean, false) then
    return null;
  end if;
  return v_card;
end;
$$;
revoke all on function public.community_profile(uuid) from public;
grant execute on function public.community_profile(uuid) to anon, authenticated;

-- Takipçi / takip listesi
create or replace function public.community_follow_list(p_teacher uuid, p_which text default 'followers', p_limit integer default 30, p_offset integer default 0)
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_card jsonb := private.cp_card(p_teacher, true);
begin
  if not public.is_staff() then raise exception 'Bu listeyi yalnızca öğretmenler görebilir.' using errcode = '42501'; end if;
  if v_card is null or not (v_card ->> 'profile_visible')::boolean or not (v_card ? 'followers') then
    return;
  end if;
  return query
    select private.cp_card(case when p_which = 'following' then f.followee_id else f.follower_id end, false)
    from public.community_follows f
    where (p_which = 'following' and f.follower_id = p_teacher) or (p_which <> 'following' and f.followee_id = p_teacher)
    order by f.created_at desc
    limit greatest(1, least(60, p_limit)) offset greatest(0, p_offset);
end;
$$;
revoke all on function public.community_follow_list(uuid, text, integer, integer) from public, anon;
grant execute on function public.community_follow_list(uuid, text, integer, integer) to authenticated;

-- ========================================================
-- FONKSİYONLAR — Takip, engelleme
-- ========================================================
create or replace function public.community_follow(p_teacher uuid, p_on boolean, p_notify boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
begin
  if p_teacher = v_uid then raise exception 'Kendinizi takip edemezsiniz.' using errcode = '22023'; end if;
  if not p_on then
    delete from public.community_follows where follower_id = v_uid and followee_id = p_teacher;
    return;
  end if;
  if exists (select 1 from public.community_follows where follower_id = v_uid and followee_id = p_teacher) then
    if p_notify is not null then
      update public.community_follows set notify = p_notify where follower_id = v_uid and followee_id = p_teacher;
    end if;
    return;
  end if;
  if not exists (select 1 from public.profiles where id = p_teacher and role in ('ogretmen', 'admin') and approved and is_active) then
    raise exception 'Öğretmen bulunamadı.' using errcode = '22023';
  end if;
  if not coalesce((select allow_follow from public.community_profiles where teacher_id = p_teacher), true)
     or private.cp_hidden_for(v_uid, p_teacher)
     or exists (select 1 from public.community_blocks b where b.teacher_id = p_teacher and b.target_id = v_uid and b.kind = 'block') then
    raise exception 'Bu öğretmen takip edilemiyor.' using errcode = '42501';
  end if;
  perform private.check_rate('community_follow', 100, 86400);
  insert into public.community_follows (follower_id, followee_id, notify) values (v_uid, p_teacher, coalesce(p_notify, false));
  perform private.cp_notify(p_teacher, 'follow', v_uid);
end;
$$;
revoke all on function public.community_follow(uuid, boolean, boolean) from public, anon;
grant execute on function public.community_follow(uuid, boolean, boolean) to authenticated;

create or replace function public.community_topic_follow(p_subject text, p_grade text, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
begin
  if coalesce(btrim(p_subject), '') = '' then raise exception 'Ders seçin.' using errcode = '22023'; end if;
  if p_on then
    if (select count(*) from public.community_topic_follows where teacher_id = v_uid) >= 30 then
      raise exception 'En çok 30 konu takip edebilirsiniz.' using errcode = '22023';
    end if;
    insert into public.community_topic_follows (teacher_id, subject, grade)
    values (v_uid, btrim(p_subject), coalesce(btrim(p_grade), '')) on conflict do nothing;
  else
    delete from public.community_topic_follows where teacher_id = v_uid and subject = btrim(p_subject) and grade = coalesce(btrim(p_grade), '');
  end if;
end;
$$;
revoke all on function public.community_topic_follow(text, text, boolean) from public, anon;
grant execute on function public.community_topic_follow(text, text, boolean) to authenticated;

create or replace function public.community_my_topics()
returns table (subject text, grade text) language sql stable security definer set search_path = '' as $$
  select t.subject, t.grade from public.community_topic_follows t
  where t.teacher_id = auth.uid() and public.is_staff() order by t.subject, t.grade;
$$;
revoke all on function public.community_my_topics() from public, anon;
grant execute on function public.community_my_topics() to authenticated;

-- p_kind: 'block' | 'mute' | null (kaldır)
create or replace function public.community_block(p_teacher uuid, p_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  if p_teacher = v_uid then raise exception 'Kendinizi engelleyemezsiniz.' using errcode = '22023'; end if;
  if p_kind is null then
    delete from public.community_blocks where teacher_id = v_uid and target_id = p_teacher;
    return;
  end if;
  if p_kind not in ('block', 'mute') then raise exception 'Geçersiz seçim.' using errcode = '22023'; end if;
  insert into public.community_blocks (teacher_id, target_id, kind) values (v_uid, p_teacher, p_kind)
  on conflict (teacher_id, target_id) do update set kind = excluded.kind, created_at = now();
  -- Engellemede iki yönlü takip kalkar; sessize almada yalnızca benim takibim
  delete from public.community_follows where follower_id = v_uid and followee_id = p_teacher;
  if p_kind = 'block' then
    delete from public.community_follows where follower_id = p_teacher and followee_id = v_uid;
  end if;
end;
$$;
revoke all on function public.community_block(uuid, text) from public, anon;
grant execute on function public.community_block(uuid, text) to authenticated;

create or replace function public.community_my_blocks()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select private.cp_card(b.target_id, false) || jsonb_build_object('block', b.kind)
  from public.community_blocks b where b.teacher_id = auth.uid() and public.is_staff()
  order by b.created_at desc;
$$;
revoke all on function public.community_my_blocks() from public, anon;
grant execute on function public.community_my_blocks() to authenticated;

-- Takip önerileri: aynı branş, aynı il; takip etmediklerim, takip edilebilenler, en çok paylaşım yapanlar önce
create or replace function public.community_suggestions(p_limit integer default 8)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with me as (select branch, city from public.profiles where id = auth.uid())
  select private.cp_card(p.id, false)
  from public.profiles p
  left join public.community_profiles c on c.teacher_id = p.id
  cross join me
  where public.is_staff()
    and p.id <> auth.uid() and p.role = 'ogretmen' and p.approved and p.is_active
    and coalesce(c.allow_follow, true)
    and coalesce(c.visibility, 'teachers') in ('public', 'teachers')
    and not exists (select 1 from public.community_follows f where f.follower_id = auth.uid() and f.followee_id = p.id)
    and not private.cp_hidden_for(auth.uid(), p.id)
    and not exists (select 1 from public.community_blocks b where b.teacher_id = p.id and b.target_id = auth.uid())
    and exists (select 1 from public.community_posts x where x.author_id = p.id and not x.hidden)
  order by
    (coalesce(nullif(btrim(p.branch), ''), '-') = coalesce(nullif(btrim(me.branch), ''), '+'))::int
      * coalesce(c.show_branch, true)::int desc,
    (coalesce(nullif(btrim(p.city), ''), '-') = coalesce(nullif(btrim(me.city), ''), '+'))::int
      * coalesce(c.show_city, true)::int desc,
    (select count(*) from public.community_posts x where x.author_id = p.id and not x.hidden) desc
  limit greatest(1, least(20, p_limit));
$$;
revoke all on function public.community_suggestions(integer) from public, anon;
grant execute on function public.community_suggestions(integer) to authenticated;

-- ========================================================
-- FONKSİYONLAR — Gönderiler
-- ========================================================

-- Tek gönderinin görüntüleyene uygun hâli (öğretmen görünümü; tahta içeriği içermez)
create or replace function private.cp_post_json(p public.community_posts)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  i public.community_items;
  v_uid uuid := auth.uid();
begin
  if p.item_id is not null then
    select * into i from public.community_items where id = p.item_id;
  end if;
  return jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'body', p.body, 'link_url', p.link_url, 'link_title', p.link_title,
    'subject', p.subject, 'grade', p.grade, 'created_at', p.created_at, 'edited_at', p.edited_at,
    'thanks_count', p.thanks_count, 'used_count', p.used_count, 'comment_count', p.comment_count,
    'is_mine', p.author_id = v_uid,
    'my_thanks', exists (select 1 from public.community_reactions r where r.post_id = p.id and r.teacher_id = v_uid and r.kind = 'thanks'),
    'my_used', exists (select 1 from public.community_reactions r where r.post_id = p.id and r.teacher_id = v_uid and r.kind = 'used'),
    'author', private.cp_card(p.author_id, false),
    'item', case when i.id is null then null else jsonb_build_object(
      'id', i.id, 'kind', i.kind, 'title', i.title, 'grade', i.grade, 'subject', i.subject,
      'outcomes', to_jsonb(i.outcomes), 'tags', to_jsonb(i.tags),
      'page_count', i.page_count, 'question_count', i.question_count, 'thumb_path', i.thumb_path,
      'copy_count', i.copy_count, 'featured', i.featured,
      'rating_avg', case when i.rating_count > 0 then round(i.rating_sum::numeric / i.rating_count, 1) end,
      'rating_count', i.rating_count,
      'is_favorite', exists (select 1 from public.community_favorites f where f.item_id = i.id and f.teacher_id = v_uid),
      'origin_author', i.origin_author, 'origin_title', i.origin_title
    ) end
  );
end;
$$;
revoke all on function private.cp_post_json(public.community_posts) from public, anon, authenticated;

-- Akış. p_tab: 'following' | 'subject' | 'all' | 'author' (p_author ile) ; p_kind: null | 'text' | 'link' | 'item' | 'board' | 'questions'
-- Sayfalama: p_before (son görülen gönderinin created_at'i)
create or replace function public.community_feed(
  p_tab text default 'all', p_kind text default null, p_subject text default null, p_grade text default null,
  p_query text default null, p_author uuid default null, p_before timestamptz default null, p_limit integer default 20
)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid, (select branch from public.profiles where id = auth.uid()) as branch)
  select private.cp_post_json(p)
  from public.community_posts p
  cross join me
  left join public.community_items i on i.id = p.item_id
  where public.is_staff()
    and not p.hidden
    and (i.id is null or not i.hidden or i.author_id = me.uid)
    and (p.author_id = me.uid or not private.cp_suspended(p.author_id))
    and not private.cp_hidden_for(me.uid, p.author_id)
    and (p_before is null or p.created_at < p_before)
    and (p_kind is null
         or (p_kind in ('text', 'link', 'item') and p.kind = p_kind)
         or (p_kind in ('board', 'questions') and i.kind = p_kind))
    and (p_subject is null or p.subject = p_subject)
    and (p_grade is null or p.grade = p_grade)
    and (p_query is null or btrim(p_query) = '' or
         lower(concat_ws(' ', p.body, p.link_title, i.title, i.description, array_to_string(i.tags, ' '), array_to_string(i.outcomes, ' '), p.subject, p.grade))
           like '%' || lower(btrim(p_query)) || '%')
    and case p_tab
      when 'following' then p.author_id = me.uid
        or exists (select 1 from public.community_follows f where f.follower_id = me.uid and f.followee_id = p.author_id)
      when 'subject' then (coalesce(btrim(me.branch), '') <> '' and p.subject = btrim(me.branch))
        or exists (select 1 from public.community_topic_follows t where t.teacher_id = me.uid and t.subject = p.subject
                   and (t.grade = '' or t.grade = p.grade))
      when 'author' then p.author_id = p_author
        and coalesce((private.cp_card(p_author, false) ->> 'profile_visible')::boolean, false)
      else true end
  order by p.created_at desc
  limit greatest(1, least(50, p_limit));
$$;
revoke all on function public.community_feed(text, text, text, text, text, uuid, timestamptz, integer) from public, anon;
grant execute on function public.community_feed(text, text, text, text, text, uuid, timestamptz, integer) to authenticated;

create or replace function public.community_post_get(p_post uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.cp_post_json(p) from public.community_posts p
  left join public.community_items i on i.id = p.item_id
  where p.id = p_post and public.is_staff()
    and (not p.hidden or p.author_id = auth.uid() or public.is_admin())
    and (i.id is null or not i.hidden or i.author_id = auth.uid() or public.is_admin())
    and not private.cp_hidden_for(auth.uid(), p.author_id);
$$;
revoke all on function public.community_post_get(uuid) from public, anon;
grant execute on function public.community_post_get(uuid) to authenticated;

-- Yazı ya da bağlantı paylaş
create or replace function public.community_post_create(p_kind text, p_body text, p_link_url text default null, p_link_title text default null, p_subject text default null, p_grade text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_url text := nullif(btrim(coalesce(p_link_url, '')), '');
  v_title text := nullif(btrim(coalesce(p_link_title, '')), '');
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_id uuid;
begin
  if p_kind not in ('text', 'link') then raise exception 'Geçersiz gönderi türü.' using errcode = '22023'; end if;
  if p_kind = 'text' and v_body is null then raise exception 'Bir şey yazın.' using errcode = '22023'; end if;
  if p_kind = 'link' then
    if v_url is null or v_url !~* '^https?://[^\s/$.?#][^\s]*$' then
      raise exception 'Geçerli bir bağlantı (https://…) yazın.' using errcode = '22023';
    end if;
    v_title := coalesce(v_title, left(regexp_replace(v_url, '^https?://(www\.)?', ''), 160));
  else
    v_url := null; v_title := null;
  end if;
  if v_subject is null then
    v_subject := nullif(btrim((select branch from public.profiles where id = v_uid)), '');
  end if;
  perform private.cp_check_text(concat_ws(E'\n', v_body, v_title, v_url));
  perform private.check_rate('community_post', 20, 86400);
  insert into public.community_posts (author_id, kind, body, link_url, link_title, subject, grade)
  values (v_uid, p_kind, left(v_body, 2000), left(v_url, 500), left(v_title, 160), left(v_subject, 80), left(nullif(btrim(coalesce(p_grade, '')), ''), 30))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.community_post_create(text, text, text, text, text, text) from public, anon;
grant execute on function public.community_post_create(text, text, text, text, text, text) to authenticated;

-- Düzenle (yazı/bağlantı; paylaşılan içeriğin açıklaması community_update ile değişir)
create or replace function public.community_post_update(p_post uuid, p_body text, p_link_title text default null, p_subject text default null, p_grade text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
  p public.community_posts;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
begin
  select * into p from public.community_posts where id = p_post and author_id = v_uid;
  if p.id is null then raise exception 'Gönderi bulunamadı.' using errcode = '22023'; end if;
  if p.kind = 'item' then raise exception 'Paylaşılan içeriğin bilgilerini içeriğin kendi düzenleme ekranından değiştirin.' using errcode = '22023'; end if;
  if p.kind = 'text' and v_body is null then raise exception 'Gönderi boş olamaz.' using errcode = '22023'; end if;
  perform private.cp_check_text(concat_ws(E'\n', v_body, p_link_title));
  perform private.check_rate('community_post_edit', 60, 3600);
  update public.community_posts set
    body = left(v_body, 2000),
    link_title = case when kind = 'link' then coalesce(left(nullif(btrim(coalesce(p_link_title, '')), ''), 160), link_title) else null end,
    subject = left(nullif(btrim(coalesce(p_subject, '')), ''), 80),
    grade = left(nullif(btrim(coalesce(p_grade, '')), ''), 30),
    edited_at = now()
  where id = p_post;
end;
$$;
revoke all on function public.community_post_update(uuid, text, text, text, text) from public, anon;
grant execute on function public.community_post_update(uuid, text, text, text, text) to authenticated;

-- Sil (paylaşılan içerik gönderisi için community_unpublish kullanılır; gönderi de silinir)
create or replace function public.community_post_delete(p_post uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.community_posts;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  select * into p from public.community_posts where id = p_post;
  if p.id is null then return; end if;
  if p.author_id <> auth.uid() and not public.is_admin() then raise exception 'Yalnızca kendi gönderinizi silebilirsiniz.' using errcode = '42501'; end if;
  if p.kind = 'item' then raise exception 'Paylaşılan içeriği "Paylaşımdan kaldır" ile kaldırın.' using errcode = '22023'; end if;
  delete from public.community_posts where id = p_post;
end;
$$;
revoke all on function public.community_post_delete(uuid) from public, anon;
grant execute on function public.community_post_delete(uuid) to authenticated;

-- Tahta önizleme resmi (yazar, paylaşımdan sonra yükler). Dönen: silinecek eski yol
create or replace function public.community_set_thumb(p_item uuid, p_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  select thumb_path into v_old from public.community_items where id = p_item and author_id = v_uid;
  if not found then raise exception 'İçerik bulunamadı.' using errcode = '22023'; end if;
  if p_path is not null and (split_part(p_path, '/', 1) <> v_uid::text or position('..' in p_path) > 0
     or not exists (select 1 from storage.objects o where o.bucket_id = 'community-thumbs' and o.name = p_path)) then
    raise exception 'Geçersiz resim yolu.' using errcode = '22023';
  end if;
  update public.community_items set thumb_path = p_path where id = p_item;
  return case when v_old is distinct from p_path then v_old end;
end;
$$;
revoke all on function public.community_set_thumb(uuid, text) from public, anon;
grant execute on function public.community_set_thumb(uuid, text) to authenticated;

-- ========================================================
-- FONKSİYONLAR — Tepkiler ve yorumlar
-- ========================================================
create or replace function public.community_react(p_post uuid, p_kind text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
  p public.community_posts;
begin
  if p_kind not in ('thanks', 'used') then raise exception 'Geçersiz tepki.' using errcode = '22023'; end if;
  select * into p from public.community_posts where id = p_post and not hidden;
  if p.id is null or private.cp_hidden_for(v_uid, p.author_id) then raise exception 'Gönderi bulunamadı.' using errcode = '22023'; end if;
  if p.author_id = v_uid then raise exception 'Kendi gönderinize tepki veremezsiniz.' using errcode = '22023'; end if;
  if p_on then
    perform private.check_rate('community_react', 300, 3600);
    insert into public.community_reactions (post_id, teacher_id, kind) values (p_post, v_uid, p_kind) on conflict do nothing;
    if found then perform private.cp_notify(p.author_id, p_kind, v_uid, p.id, p.item_id); end if;
  else
    delete from public.community_reactions where post_id = p_post and teacher_id = v_uid and kind = p_kind;
  end if;
  return (select jsonb_build_object('thanks_count', thanks_count, 'used_count', used_count) from public.community_posts where id = p_post);
end;
$$;
revoke all on function public.community_react(uuid, text, boolean) from public, anon;
grant execute on function public.community_react(uuid, text, boolean) to authenticated;

create or replace function public.community_comments_list(p_post uuid, p_limit integer default 50, p_offset integer default 0)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at, 'edited_at', c.edited_at,
           'is_mine', c.author_id = auth.uid(),
           'can_delete', c.author_id = auth.uid() or p.author_id = auth.uid() or public.is_admin(),
           'author', private.cp_card(c.author_id, false))
  from public.community_comments c
  join public.community_posts p on p.id = c.post_id
  where c.post_id = p_post and public.is_staff() and not c.hidden and not p.hidden
    and not private.cp_hidden_for(auth.uid(), c.author_id)
    and not private.cp_hidden_for(auth.uid(), p.author_id)
  order by c.created_at
  limit greatest(1, least(100, p_limit)) offset greatest(0, p_offset);
$$;
revoke all on function public.community_comments_list(uuid, integer, integer) from public, anon;
grant execute on function public.community_comments_list(uuid, integer, integer) to authenticated;

create or replace function public.community_comment_add(p_post uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.cp_require_writer();
  p public.community_posts;
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_body = '' then raise exception 'Yorum boş olamaz.' using errcode = '22023'; end if;
  select * into p from public.community_posts where id = p_post and not hidden;
  if p.id is null or private.cp_hidden_for(v_uid, p.author_id)
     or exists (select 1 from public.community_blocks b where b.teacher_id = p.author_id and b.target_id = v_uid and b.kind = 'block') then
    raise exception 'Gönderi bulunamadı.' using errcode = '22023';
  end if;
  perform private.cp_check_text(v_body);
  perform private.check_rate('community_comment', 60, 86400);
  insert into public.community_comments (post_id, author_id, body) values (p_post, v_uid, left(v_body, 1000)) returning id into v_id;
  perform private.cp_notify(p.author_id, 'comment', v_uid, p.id, p.item_id);
  return jsonb_build_object('id', v_id, 'body', left(v_body, 1000), 'created_at', now(), 'is_mine', true, 'can_delete', true,
                            'author', private.cp_card(v_uid, false));
end;
$$;
revoke all on function public.community_comment_add(uuid, text) from public, anon;
grant execute on function public.community_comment_add(uuid, text) to authenticated;

create or replace function public.community_comment_delete(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
  v_post_author uuid;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  select c.author_id, p.author_id into v_author, v_post_author
  from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = p_comment;
  if v_author is null then return; end if;
  if auth.uid() not in (v_author, v_post_author) and not public.is_admin() then
    raise exception 'Bu yorumu silemezsiniz.' using errcode = '42501';
  end if;
  delete from public.community_comments where id = p_comment;
end;
$$;
revoke all on function public.community_comment_delete(uuid) from public, anon;
grant execute on function public.community_comment_delete(uuid) to authenticated;

-- ========================================================
-- FONKSİYONLAR — Bildirimler
-- ========================================================
-- Aynı gün, aynı tür ve aynı gönderi/kişi için gelenler tek satırda toplanır
create or replace function public.community_notifications(p_limit integer default 30, p_before timestamptz default null)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with n as (
    select x.*,
      case when x.kind = 'post' then 'post:' || (x.created_at at time zone 'Europe/Istanbul')::date::text
           when x.kind = 'follow' then 'follow:' || (x.created_at at time zone 'Europe/Istanbul')::date::text
           else x.kind || ':' || coalesce(x.post_id::text, x.item_id::text, x.id::text) || ':' || (x.created_at at time zone 'Europe/Istanbul')::date::text
      end as grp
    from public.community_notifications x
    where x.recipient_id = auth.uid() and public.is_staff()
      and (x.actor_id is null or not private.cp_hidden_for(auth.uid(), x.actor_id))
  ),
  g as (
    select grp, min(kind) as kind, max(created_at) as at, count(*) as total, count(distinct actor_id) as actors,
           bool_or(read_at is null) as unread, (array_agg(id order by created_at desc))[1] as last_id
    from n group by grp
  )
  select jsonb_build_object(
    'key', g.grp, 'kind', g.kind, 'at', g.at, 'count', g.total, 'actors', g.actors, 'unread', g.unread,
    'actor', private.cp_card(l.actor_id, false), 'post_id', l.post_id, 'item_id', l.item_id, 'message', l.message,
    'title', coalesce((select i.title from public.community_items i where i.id = l.item_id),
                      (select left(coalesce(p.link_title, p.body), 80) from public.community_posts p where p.id = l.post_id))
  )
  from g join public.community_notifications l on l.id = g.last_id
  where p_before is null or g.at < p_before
  order by g.at desc
  limit greatest(1, least(60, p_limit));
$$;
revoke all on function public.community_notifications(integer, timestamptz) from public, anon;
grant execute on function public.community_notifications(integer, timestamptz) to authenticated;

create or replace function public.community_unread_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.community_notifications
  where recipient_id = auth.uid() and read_at is null and public.is_staff();
$$;
revoke all on function public.community_unread_count() from public, anon;
grant execute on function public.community_unread_count() to authenticated;

create or replace function public.community_mark_read()
returns void language sql security definer set search_path = '' as $$
  update public.community_notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;
revoke all on function public.community_mark_read() from public, anon;
grant execute on function public.community_mark_read() to authenticated;

-- 90 günden eski okunmuş bildirimler silinir (her gece)
create or replace function private.cp_cleanup()
returns void language sql security definer set search_path = '' as $$
  delete from public.community_notifications where read_at is not null and created_at < now() - interval '90 days';
  delete from public.community_suspensions where until < now() - interval '30 days';
$$;
revoke all on function private.cp_cleanup() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'community-cleanup') then perform cron.unschedule('community-cleanup'); end if;
end $$;
select cron.schedule('community-cleanup', '15 1 * * *', $cron$ select private.cp_cleanup(); $cron$);

-- ========================================================
-- FONKSİYONLAR — Şikâyet ve denetim
-- ========================================================
create or replace function public.community_report(p_kind text, p_target uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
  v_snapshot jsonb;
begin
  if not public.is_staff() then raise exception 'Yalnızca öğretmenler şikâyet edebilir.' using errcode = '42501'; end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then raise exception 'Şikâyet nedenini kısaca yazın.' using errcode = '22023'; end if;
  if p_kind = 'post' then
    select author_id, to_jsonb(p) - 'thanks_count' - 'used_count' - 'comment_count' into v_author, v_snapshot
    from public.community_posts p where id = p_target;
  elsif p_kind = 'comment' then
    select author_id, to_jsonb(c) into v_author, v_snapshot from public.community_comments c where id = p_target;
  elsif p_kind = 'profile' then
    select teacher_id, to_jsonb(c) into v_author, v_snapshot from public.community_profiles c where teacher_id = p_target;
    v_author := coalesce(v_author, p_target);
  else
    raise exception 'Geçersiz şikâyet türü.' using errcode = '22023';
  end if;
  if v_author is null then raise exception 'Şikâyet edilen içerik bulunamadı.' using errcode = '22023'; end if;
  if v_author = v_uid then raise exception 'Kendi içeriğinizi şikâyet edemezsiniz.' using errcode = '22023'; end if;
  perform private.check_rate('community_report', 20, 86400);
  insert into public.community_reports (reporter_id, target_kind, target_id, snapshot, target_author, reason)
  values (v_uid, p_kind, p_target, v_snapshot, v_author, left(btrim(p_reason), 500))
  on conflict do nothing;
end;
$$;
revoke all on function public.community_report(text, uuid, text) from public, anon;
grant execute on function public.community_report(text, uuid, text) to authenticated;

-- Yönetici: şikâyet listesi (gerçek adlarla)
create or replace function public.community_reports_list(p_status text default 'open', p_limit integer default 50, p_offset integer default 0)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'target_kind', r.target_kind, 'target_id', r.target_id, 'snapshot', r.snapshot,
    'reason', r.reason, 'status', r.status, 'resolution', r.resolution, 'created_at', r.created_at, 'resolved_at', r.resolved_at,
    'reporter', (select jsonb_build_object('id', p.id, 'name', p.full_name, 'school', p.school_name) from public.profiles p where p.id = r.reporter_id),
    'author', (select jsonb_build_object('id', p.id, 'name', p.full_name, 'school', p.school_name, 'email', p.email) from public.profiles p where p.id = r.target_author),
    'resolver', (select p.full_name from public.profiles p where p.id = r.resolved_by),
    'same_target_reports', (select count(*) from public.community_reports x where x.target_kind = r.target_kind and x.target_id = r.target_id),
    'author_suspended_until', (select s.until from public.community_suspensions s where s.teacher_id = r.target_author and s.until > now())
  )
  from public.community_reports r
  where public.is_admin() and (p_status is null or r.status = p_status)
  order by r.created_at desc
  limit greatest(1, least(100, p_limit)) offset greatest(0, p_offset);
$$;
revoke all on function public.community_reports_list(text, integer, integer) from public, anon;
grant execute on function public.community_reports_list(text, integer, integer) to authenticated;

-- p_action: 'remove' (içeriği gizle) | 'dismiss' (şikâyeti reddet). p_suspend_days > 0 ise yazar topluluktan uzaklaştırılır.
create or replace function public.community_resolve_report(p_report uuid, p_action text, p_note text default null, p_suspend_days integer default 0)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.community_reports;
begin
  if not public.is_admin() then raise exception 'Yalnızca yönetici.' using errcode = '42501'; end if;
  select * into r from public.community_reports where id = p_report;
  if r.id is null then raise exception 'Şikâyet bulunamadı.' using errcode = '22023'; end if;
  if p_action not in ('remove', 'dismiss') then raise exception 'Geçersiz işlem.' using errcode = '22023'; end if;

  if p_action = 'remove' then
    if r.target_kind = 'post' then
      update public.community_posts set hidden = true where id = r.target_id;
      update public.community_items set hidden = true where id = (select item_id from public.community_posts where id = r.target_id);
    elsif r.target_kind = 'comment' then
      update public.community_comments set hidden = true where id = r.target_id;
    elsif r.target_kind = 'profile' then
      update public.community_profiles set bio = null, alias = null, avatar_path = null,
        display_mode = case when display_mode = 'alias' then 'short' else display_mode end
      where teacher_id = r.target_id;
    end if;
    perform private.cp_notify(r.target_author, 'moderation', null, null, null,
      left('Topluluk kurallarına uymadığı için içeriğiniz kaldırıldı.' || coalesce(' Not: ' || nullif(btrim(p_note), ''), ''), 300));
  end if;

  if coalesce(p_suspend_days, 0) > 0 and r.target_author is not null then
    insert into public.community_suspensions (teacher_id, until, reason, created_by)
    values (r.target_author, now() + make_interval(days => least(p_suspend_days, 365)), left(p_note, 500), auth.uid())
    on conflict (teacher_id) do update set until = excluded.until, reason = excluded.reason, created_by = excluded.created_by, created_at = now();
    perform private.cp_notify(r.target_author, 'moderation', null, null, null,
      'Topluluk hesabınız ' || least(p_suspend_days, 365) || ' gün süreyle durduruldu.');
  end if;

  -- Aynı içerik için açık bütün şikâyetler kapanır
  update public.community_reports set
    status = case when p_action = 'remove' then 'removed' else 'dismissed' end,
    resolution = left(nullif(btrim(coalesce(p_note, '')), ''), 500), resolved_by = auth.uid(), resolved_at = now()
  where target_kind = r.target_kind and target_id = r.target_id and status = 'open';
end;
$$;
revoke all on function public.community_resolve_report(uuid, text, text, integer) from public, anon;
grant execute on function public.community_resolve_report(uuid, text, text, integer) to authenticated;

-- Yönetici: uzaklaştırmayı kaldır
create or replace function public.community_unsuspend(p_teacher uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yalnızca yönetici.' using errcode = '42501'; end if;
  delete from public.community_suspensions where teacher_id = p_teacher;
end;
$$;
revoke all on function public.community_unsuspend(uuid) from public, anon;
grant execute on function public.community_unsuspend(uuid) to authenticated;

-- ========================================================
-- FONKSİYONLAR — Herkese açık önizleme (giriş gerektirmez)
-- Yalnızca: yazarı "herkese açık önizleme"ye izin vermiş, gizlenmemiş, yazarı uzaklaştırılmamış içerik.
-- Gönderilenler: başlık, ders, sınıf, sayfa/soru sayısı, önizleme resmi yolu, sayılar, yazar kartı,
-- soru setinde yalnızca ilk sorunun metni (şık/cevap/açıklama yok). Tahta içeriği hiç yok.
-- ========================================================
create or replace function private.cp_public_item_json(i public.community_items)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'title', i.title, 'grade', i.grade, 'subject', i.subject,
    'description', left(i.description, 300),
    'page_count', i.page_count, 'question_count', i.question_count, 'thumb_path', i.thumb_path,
    'copy_count', i.copy_count,
    'thanks_count', coalesce((select p.thanks_count from public.community_posts p where p.item_id = i.id), 0),
    'rating_avg', case when i.rating_count > 0 then round(i.rating_sum::numeric / i.rating_count, 1) end,
    'rating_count', i.rating_count, 'featured', i.featured, 'created_at', i.created_at,
    'first_question', case when i.kind = 'questions' then left(i.questions -> 0 ->> 'body', 300) end,
    'author', private.cp_card(i.author_id, false)
  );
$$;
revoke all on function private.cp_public_item_json(public.community_items) from public, anon, authenticated;

create or replace function private.cp_public_ok(i public.community_items)
returns boolean language sql stable security definer set search_path = '' as $$
  select not i.hidden
    and coalesce((select c.public_preview from public.community_profiles c where c.teacher_id = i.author_id), false)
    and not private.cp_suspended(i.author_id)
    and exists (select 1 from public.profiles p where p.id = i.author_id and p.approved and p.is_active)
    and not exists (select 1 from public.community_posts p where p.item_id = i.id and p.hidden);
$$;
revoke all on function private.cp_public_ok(public.community_items) from public, anon, authenticated;

-- p_sort: 'new' | 'popular' (kopya + teşekkür) | 'rating'
create or replace function public.community_public_gallery(
  p_query text default null, p_kind text default null, p_subject text default null, p_grade text default null,
  p_author uuid default null, p_sort text default 'popular', p_limit integer default 24, p_offset integer default 0
)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select private.cp_public_item_json(i)
  from public.community_items i
  where private.cp_public_ok(i)
    and (p_kind is null or i.kind = p_kind)
    and (p_subject is null or i.subject = p_subject)
    and (p_grade is null or i.grade = p_grade)
    and (p_author is null or i.author_id = p_author)
    and (p_query is null or btrim(p_query) = '' or
         lower(concat_ws(' ', i.title, i.description, array_to_string(i.tags, ' '), i.subject, i.grade)) like '%' || lower(btrim(left(p_query, 100))) || '%')
  order by
    case when p_sort = 'popular' then i.copy_count + coalesce((select p.thanks_count from public.community_posts p where p.item_id = i.id), 0) end desc nulls last,
    case when p_sort = 'rating' then (i.rating_sum + 17.5) / (i.rating_count + 5) end desc nulls last,
    i.featured desc,
    i.created_at desc
  limit greatest(1, least(48, p_limit)) offset greatest(0, least(2000, p_offset));
$$;
revoke all on function public.community_public_gallery(text, text, text, text, uuid, text, integer, integer) from public;
grant execute on function public.community_public_gallery(text, text, text, text, uuid, text, integer, integer) to anon, authenticated;

create or replace function public.community_public_item(p_item uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.cp_public_item_json(i) from public.community_items i where i.id = p_item and private.cp_public_ok(i);
$$;
revoke all on function public.community_public_item(uuid) from public;
grant execute on function public.community_public_item(uuid) to anon, authenticated;

-- Herkese açık sayfadaki ders/sınıf süzgeci için seçenekler
create or replace function public.community_public_facets()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'subjects', coalesce((select jsonb_agg(distinct i.subject) from public.community_items i where private.cp_public_ok(i) and i.subject is not null), '[]'::jsonb),
    'grades', coalesce((select jsonb_agg(distinct i.grade) from public.community_items i where private.cp_public_ok(i) and i.grade is not null), '[]'::jsonb),
    'total', (select count(*) from public.community_items i where private.cp_public_ok(i))
  );
$$;
revoke all on function public.community_public_facets() from public;
grant execute on function public.community_public_facets() to anon, authenticated;
