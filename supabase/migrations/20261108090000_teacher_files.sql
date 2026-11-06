-- ========================================================
-- ÖĞRETMEN DOSYALARI VE İÇERİK DÜZENİ (EduBoard paket 3)
-- - teacher_folders / teacher_files: öğretmenin kendi dosya deposu (tek seviye klasör, sıralama, etiketler)
-- - Kota: öğretmen başına 500 MB (satır tetikleyicisi + depolama yükleme kuralı)
-- - teacher_shares: dosya ya da seti sınıfla paylaşma; öğrenci "Ders materyalleri"nde görür
-- - content_sets / content_set_items: birden çok dosyayı tek paket yapma
-- - library_items: ortak eğitim medya kütüphanesi (yönetici yükler, bütün öğretmenler kullanır, kotadan muaf)
-- - homework-files: "Dosyalarımdan ekle" için Office türleri ve 25 MB'a kadar kopyalar
-- Depolama: teacher-files (<öğretmen>/<dosya>), library (<dosya>)
-- ========================================================

-- --------------------------------------------------------
-- Kota
-- --------------------------------------------------------
create or replace function public.teacher_file_quota()
returns bigint language sql immutable set search_path = '' as $$
  select 524288000::bigint; -- 500 MB
$$;
grant execute on function public.teacher_file_quota() to authenticated;

-- --------------------------------------------------------
-- Klasörler (tek seviye)
-- --------------------------------------------------------
create table if not exists public.teacher_folders (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists teacher_folders_name_uidx on public.teacher_folders (teacher_id, lower(btrim(name)));
alter table public.teacher_folders enable row level security;

drop policy if exists teacher_folders_own on public.teacher_folders;
create policy teacher_folders_own on public.teacher_folders for all to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));

-- --------------------------------------------------------
-- Dosyalar
-- --------------------------------------------------------
create table if not exists public.teacher_files (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  folder_id uuid references public.teacher_folders(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  path text not null unique,
  size bigint not null check (size > 0 and size <= 26214400),
  mime text not null check (char_length(mime) <= 120),
  grade text check (grade is null or char_length(grade) <= 30),
  subject text check (subject is null or char_length(subject) <= 80),
  topic text check (topic is null or char_length(topic) <= 120),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_files_teacher_idx on public.teacher_files (teacher_id, folder_id, position);
alter table public.teacher_files enable row level security;

create or replace function public.teacher_files_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_used bigint;
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then
      raise exception 'Yalnızca öğretmenler dosya yükleyebilir.';
    end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    if split_part(new.path, '/', 1) <> auth.uid()::text then
      raise exception 'Geçersiz dosya yolu.';
    end if;
    -- Aynı anda yüklenen dosyalar kotayı birlikte aşmasın
    perform pg_advisory_xact_lock(hashtext('teacher_files:' || auth.uid()::text));
    select coalesce(sum(size), 0) into v_used from public.teacher_files where teacher_id = new.teacher_id;
    if v_used + new.size > public.teacher_file_quota() then
      raise exception 'Depolama alanınız doldu (500 MB). Yer açmak için kullanmadığınız dosyaları silin.';
    end if;
  else
    -- Yol, boyut, tür ve sahip değişmez (yalnızca ad, klasör, etiket, sıra)
    if new.teacher_id is distinct from old.teacher_id or new.path is distinct from old.path
       or new.size is distinct from old.size or new.mime is distinct from old.mime
       or new.school_id is distinct from old.school_id or new.created_at is distinct from old.created_at then
      raise exception 'Bu alan değiştirilemez.';
    end if;
    new.updated_at := now();
  end if;
  new.name := btrim(new.name);
  new.grade := nullif(btrim(coalesce(new.grade, '')), '');
  new.subject := nullif(btrim(coalesce(new.subject, '')), '');
  new.topic := nullif(btrim(coalesce(new.topic, '')), '');
  -- Etiketler: boşlar atılır, tekrarlar birleşir, her biri en fazla 30 karakter
  new.tags := coalesce((
    select array_agg(t order by min_ord)
    from (
      select left(btrim(x), 30) as t, min(ord) as min_ord
      from unnest(new.tags) with ordinality as u(x, ord)
      where btrim(x) <> ''
      group by left(btrim(x), 30)
    ) d
  ), '{}');
  if new.folder_id is not null and not exists (
    select 1 from public.teacher_folders f where f.id = new.folder_id and f.teacher_id = new.teacher_id
  ) then
    raise exception 'Klasör bulunamadı.';
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_files_guard on public.teacher_files;
create trigger teacher_files_guard before insert or update on public.teacher_files
  for each row execute function public.teacher_files_guard();

-- --------------------------------------------------------
-- Setler
-- --------------------------------------------------------
create table if not exists public.content_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_sets enable row level security;

create table if not exists public.content_set_items (
  set_id uuid not null references public.content_sets(id) on delete cascade,
  file_id uuid not null references public.teacher_files(id) on delete cascade,
  position integer not null default 0,
  primary key (set_id, file_id)
);
create index if not exists content_set_items_file_idx on public.content_set_items (file_id);
alter table public.content_set_items enable row level security;

create or replace function public.content_sets_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then raise exception 'Yalnızca öğretmenler set oluşturabilir.'; end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
  else
    if new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id then
      raise exception 'Bu alan değiştirilemez.';
    end if;
    new.updated_at := now();
  end if;
  new.title := btrim(new.title);
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  return new;
end;
$$;
drop trigger if exists content_sets_guard on public.content_sets;
create trigger content_sets_guard before insert or update on public.content_sets
  for each row execute function public.content_sets_guard();

-- Sete yalnızca setin sahibinin kendi dosyası eklenir
create or replace function public.content_set_items_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.content_sets s
    join public.teacher_files f on f.id = new.file_id and f.teacher_id = s.teacher_id
    where s.id = new.set_id
  ) then
    raise exception 'Bu dosya bu sete eklenemez.';
  end if;
  return new;
end;
$$;
drop trigger if exists content_set_items_guard on public.content_set_items;
create trigger content_set_items_guard before insert or update on public.content_set_items
  for each row execute function public.content_set_items_guard();

-- --------------------------------------------------------
-- Sınıfla paylaşım
-- --------------------------------------------------------
create table if not exists public.teacher_shares (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  teacher_name text not null default '',
  school_id uuid references public.schools(id),
  class_name text not null check (char_length(btrim(class_name)) between 1 and 40),
  file_id uuid references public.teacher_files(id) on delete cascade,
  set_id uuid references public.content_sets(id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  check ((file_id is null) <> (set_id is null))
);
create unique index if not exists teacher_shares_file_uidx on public.teacher_shares (school_id, class_name, file_id) nulls not distinct where file_id is not null;
create unique index if not exists teacher_shares_set_uidx on public.teacher_shares (school_id, class_name, set_id) nulls not distinct where set_id is not null;
create index if not exists teacher_shares_class_idx on public.teacher_shares (school_id, class_name, created_at desc);
alter table public.teacher_shares enable row level security;

create or replace function public.teacher_shares_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id
       or new.class_name is distinct from old.class_name or new.file_id is distinct from old.file_id
       or new.set_id is distinct from old.set_id then
      raise exception 'Yalnızca not değiştirilebilir.';
    end if;
    new.note := nullif(btrim(coalesce(new.note, '')), '');
    return new;
  end if;
  new.teacher_id := auth.uid();
  new.school_id := public.my_school_id();
  new.class_name := btrim(new.class_name);
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  select coalesce(nullif(btrim(p.full_name), ''), 'Öğretmen') into new.teacher_name from public.profiles p where p.id = auth.uid();
  if not public.teacher_has_class(new.class_name) then
    raise exception 'Yalnızca kendi sınıflarınızla paylaşabilirsiniz.';
  end if;
  if new.file_id is not null and not exists (select 1 from public.teacher_files f where f.id = new.file_id and f.teacher_id = auth.uid()) then
    raise exception 'Dosya bulunamadı.';
  end if;
  if new.set_id is not null and not exists (select 1 from public.content_sets s where s.id = new.set_id and s.teacher_id = auth.uid()) then
    raise exception 'Set bulunamadı.';
  end if;
  return new;
end;
$$;
drop trigger if exists teacher_shares_guard on public.teacher_shares;
create trigger teacher_shares_guard before insert or update on public.teacher_shares
  for each row execute function public.teacher_shares_guard();

-- --------------------------------------------------------
-- Öğrenci görünürlüğü (paylaşım üzerinden)
-- --------------------------------------------------------
create or replace function public.student_sees_share(p_school uuid, p_class text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students me
    where me.id = public.current_student_id()
      and me.class_name = p_class
      and me.school_id is not distinct from p_school
  );
$$;
revoke execute on function public.student_sees_share(uuid, text) from public, anon;
grant execute on function public.student_sees_share(uuid, text) to authenticated;

create or replace function public.student_can_see_set(p_set uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_shares s
    where s.set_id = p_set and public.student_sees_share(s.school_id, s.class_name)
  );
$$;
revoke execute on function public.student_can_see_set(uuid) from public, anon;
grant execute on function public.student_can_see_set(uuid) to authenticated;

create or replace function public.student_can_see_file(p_file uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_shares s
    where public.student_sees_share(s.school_id, s.class_name)
      and (s.file_id = p_file
           or exists (select 1 from public.content_set_items i where i.set_id = s.set_id and i.file_id = p_file))
  );
$$;
revoke execute on function public.student_can_see_file(uuid) from public, anon;
grant execute on function public.student_can_see_file(uuid) to authenticated;

-- --------------------------------------------------------
-- Erişim kuralları
-- --------------------------------------------------------
drop policy if exists teacher_files_select on public.teacher_files;
create policy teacher_files_select on public.teacher_files for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.student_can_see_file(id)));
drop policy if exists teacher_files_insert on public.teacher_files;
create policy teacher_files_insert on public.teacher_files for insert to authenticated
  with check ((select public.is_staff()));
drop policy if exists teacher_files_update on public.teacher_files;
create policy teacher_files_update on public.teacher_files for update to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()));
drop policy if exists teacher_files_delete on public.teacher_files;
create policy teacher_files_delete on public.teacher_files for delete to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists content_sets_select on public.content_sets;
create policy content_sets_select on public.content_sets for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.student_can_see_set(id)));
drop policy if exists content_sets_write on public.content_sets;
create policy content_sets_write on public.content_sets for insert to authenticated
  with check ((select public.is_staff()));
drop policy if exists content_sets_update on public.content_sets;
create policy content_sets_update on public.content_sets for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
drop policy if exists content_sets_delete on public.content_sets;
create policy content_sets_delete on public.content_sets for delete to authenticated
  using (teacher_id = (select auth.uid()));

create or replace function public.owns_content_set(p_set uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.content_sets s where s.id = p_set and s.teacher_id = auth.uid());
$$;
revoke execute on function public.owns_content_set(uuid) from public, anon;
grant execute on function public.owns_content_set(uuid) to authenticated;

drop policy if exists content_set_items_select on public.content_set_items;
create policy content_set_items_select on public.content_set_items for select to authenticated
  using ((select public.owns_content_set(set_id)) or (select public.student_can_see_set(set_id)));
drop policy if exists content_set_items_write on public.content_set_items;
create policy content_set_items_write on public.content_set_items for all to authenticated
  using ((select public.owns_content_set(set_id)))
  with check ((select public.owns_content_set(set_id)));

drop policy if exists teacher_shares_select on public.teacher_shares;
create policy teacher_shares_select on public.teacher_shares for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.student_sees_share(school_id, class_name)));
drop policy if exists teacher_shares_insert on public.teacher_shares;
create policy teacher_shares_insert on public.teacher_shares for insert to authenticated
  with check ((select public.is_staff()));
drop policy if exists teacher_shares_update on public.teacher_shares;
create policy teacher_shares_update on public.teacher_shares for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
drop policy if exists teacher_shares_delete on public.teacher_shares;
create policy teacher_shares_delete on public.teacher_shares for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- --------------------------------------------------------
-- Sıralama ve kullanım
-- --------------------------------------------------------
-- Sürükle-bırak sonrası sıra: verilen sırayla 0,1,2… (yalnızca kendi dosyaları)
create or replace function public.reorder_teacher_files(p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  update public.teacher_files f set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where f.id = o.id and f.teacher_id = auth.uid();
$$;
revoke execute on function public.reorder_teacher_files(uuid[]) from public, anon;
grant execute on function public.reorder_teacher_files(uuid[]) to authenticated;

create or replace function public.reorder_teacher_folders(p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  update public.teacher_folders f set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where f.id = o.id and f.teacher_id = auth.uid();
$$;
revoke execute on function public.reorder_teacher_folders(uuid[]) from public, anon;
grant execute on function public.reorder_teacher_folders(uuid[]) to authenticated;

create or replace function public.reorder_set_items(p_set uuid, p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  update public.content_set_items i set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where i.set_id = p_set and i.file_id = o.id;
$$;
revoke execute on function public.reorder_set_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_set_items(uuid, uuid[]) to authenticated;

-- Depolamada gerçekten kullanılan alan (yükleme kuralı bunu denetler; satırı yazılmamış yüklemeler de sayılır)
create or replace function public.teacher_storage_used()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id = 'teacher-files' and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;
revoke execute on function public.teacher_storage_used() from public, anon;
grant execute on function public.teacher_storage_used() to authenticated;

-- --------------------------------------------------------
-- Ortak eğitim medya kütüphanesi
-- --------------------------------------------------------
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  path text not null unique,
  size bigint not null check (size > 0 and size <= 26214400),
  mime text not null check (char_length(mime) <= 120),
  category text check (category is null or char_length(category) <= 60),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.library_items enable row level security;

drop policy if exists library_items_select on public.library_items;
create policy library_items_select on public.library_items for select to authenticated
  using ((select public.is_staff()));
drop policy if exists library_items_admin on public.library_items;
create policy library_items_admin on public.library_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- --------------------------------------------------------
-- Depolama alanları
-- --------------------------------------------------------
-- Dosyalarım ve kütüphane: PDF, resim, Word, PowerPoint, Excel · dosya başına 25 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('teacher-files', 'teacher-files', false, 26214400, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('library', 'library', false, 26214400, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ödev dosyaları: "Dosyalarımdan ekle" ile gelen Office dosyaları ve 25 MB'a kadar kopyalar
update storage.buckets
  set file_size_limit = 26214400,
      allowed_mime_types = array[
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
  where id = 'homework-files';

-- Öğrenci, kendisiyle paylaşılan dosyayı açabilir mi? (yol → dosya → paylaşım)
create or replace function public.student_can_read_teacher_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_files f
    where f.path = p_path and public.student_can_see_file(f.id)
  );
$$;
revoke execute on function public.student_can_read_teacher_path(text) from public, anon;
grant execute on function public.student_can_read_teacher_path(text) to authenticated;

drop policy if exists teacher_files_obj_insert on storage.objects;
create policy teacher_files_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'teacher-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_staff())
    and (select public.teacher_storage_used()) < (select public.teacher_file_quota())
  );
drop policy if exists teacher_files_obj_select on storage.objects;
create policy teacher_files_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'teacher-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.student_can_read_teacher_path(name)))
  );
drop policy if exists teacher_files_obj_delete on storage.objects;
create policy teacher_files_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'teacher-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists library_obj_select on storage.objects;
create policy library_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'library' and (select public.is_staff()));
drop policy if exists library_obj_insert on storage.objects;
create policy library_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and (select public.is_admin()));
drop policy if exists library_obj_delete on storage.objects;
create policy library_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'library' and (select public.is_admin()));

-- --------------------------------------------------------
-- Yetkiler (anonim erişim yok; kurallar RLS'te)
-- --------------------------------------------------------
revoke all on public.teacher_folders, public.teacher_files, public.content_sets, public.content_set_items,
  public.teacher_shares, public.library_items from anon;
grant select, insert, update, delete on public.teacher_folders, public.teacher_files, public.content_sets,
  public.content_set_items, public.teacher_shares, public.library_items to authenticated;

-- Tetikleyici fonksiyonları doğrudan çağrılamaz
revoke execute on function public.teacher_files_guard() from public, anon, authenticated;
revoke execute on function public.content_sets_guard() from public, anon, authenticated;
revoke execute on function public.content_set_items_guard() from public, anon, authenticated;
revoke execute on function public.teacher_shares_guard() from public, anon, authenticated;
