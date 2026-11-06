-- ========================================================
-- ÖĞRENCİ TESLİMİ + TESLİM KİLİDİ + OTOMATİK KAPANIŞ
--  - homeworks.accepts_submissions: öğretmen "uygulamadan teslim" isterse true (varsayılan false; eski ödevler etkilenmez)
--  - homeworks.closed_at: öğretmenin elle kapattığı an (null = açık)
--  - Ödev açık sayılır: teslim alıyor + elle kapatılmamış + teslim anı (due_at) gelmemiş.
--    Teslim anı gelince ödev kendiliğinden kapanır: kural her yazmada sunucuda now() ile denetlenir,
--    zamanlanmış bir göreve gerek kalmaz (görev kaçsa bile kilit gecikmez).
--  - homework_submissions: öğrenci başına tek kayıt, taslak → teslim
--    * Taslakken öğrenci dosya ekler/çıkarır, not yazar; "teslim" sonrası değiştiremez
--    * Ödev kapanınca öğrenci hiçbir şey değiştiremez
--    * Öğretmen yalnızca teslimi iade edebilir (teslim → taslak; ödev açıksa öğrenci yeniden teslim eder)
--  - Storage: özel "homework-submissions" bucket'ı, yol <ödev id>/<öğrenci id>/<dosya>
-- ========================================================

alter table public.homeworks
  add column if not exists accepts_submissions boolean not null default false,
  add column if not exists closed_at timestamptz;

-- Metni güvenle uuid'e çevirir (geçersizse null; politika içinde cast hatası olmasın)
create or replace function public.try_uuid(p text)
returns uuid language sql immutable set search_path = '' as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;
grant execute on function public.try_uuid(text) to authenticated;

-- Ödev teslim alıyor ve hâlâ açık mı?
create or replace function public.homework_is_open(p_homework_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.homeworks h
    where h.id = p_homework_id
      and h.accepts_submissions
      and h.closed_at is null
      and (h.due_at is null or h.due_at > now())
  );
$$;
revoke execute on function public.homework_is_open(uuid) from public, anon;
grant execute on function public.homework_is_open(uuid) to authenticated;

-- Oturumdaki öğrenci bu ödevin sınıfında mı?
create or replace function public.student_has_homework(p_homework_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.homeworks h
    join public.students me on me.id = public.current_student_id()
    where h.id = p_homework_id
      and me.class_name = h.class_name
      and me.school_id is not distinct from h.school_id
  );
$$;
revoke execute on function public.student_has_homework(uuid) from public, anon;
grant execute on function public.student_has_homework(uuid) to authenticated;

-- --------------------------------------------------------
-- TESLİMLER
-- --------------------------------------------------------
create table if not exists public.homework_submissions (
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'taslak' check (status in ('taslak', 'teslim')),
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 5),
  note text check (char_length(note) <= 500),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);
create index if not exists homework_submissions_student_idx on public.homework_submissions (student_id);
alter table public.homework_submissions enable row level security;
revoke all on public.homework_submissions from anon;
grant select, insert, update, delete on public.homework_submissions to authenticated;

drop policy if exists homework_submissions_select on public.homework_submissions;
create policy homework_submissions_select on public.homework_submissions for select to authenticated
  using (student_id = (select public.current_student_id()) or (select public.owns_homework(homework_id)));

drop policy if exists homework_submissions_insert on public.homework_submissions;
create policy homework_submissions_insert on public.homework_submissions for insert to authenticated
  with check (
    student_id = (select public.current_student_id())
    and public.student_has_homework(homework_id)
    and public.homework_is_open(homework_id)
  );

drop policy if exists homework_submissions_update on public.homework_submissions;
create policy homework_submissions_update on public.homework_submissions for update to authenticated
  using (student_id = (select public.current_student_id()) or (select public.owns_homework(homework_id)))
  with check (student_id = (select public.current_student_id()) or (select public.owns_homework(homework_id)));

-- Öğrenci yalnızca açık ödevdeki taslağını silebilir
drop policy if exists homework_submissions_delete on public.homework_submissions;
create policy homework_submissions_delete on public.homework_submissions for delete to authenticated
  using (
    student_id = (select public.current_student_id())
    and status = 'taslak'
    and public.homework_is_open(homework_id)
  );

-- Kilit kuralları (RLS'in üstüne; istemci ne gönderirse göndersin)
create or replace function public.homework_submissions_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_is_student boolean := new.student_id = public.current_student_id();
  v_prefix text := new.homework_id::text || '/' || new.student_id::text || '/';
  v_file jsonb;
begin
  -- Not: INSERT'te OLD yok; OLD'a yalnızca tg_op = 'UPDATE' dalının içinde bakılır
  if tg_op = 'UPDATE' then
    if new.homework_id <> old.homework_id or new.student_id <> old.student_id then
      raise exception 'Teslim kaydı başka ödeve/öğrenciye taşınamaz.' using errcode = '42501';
    end if;
  end if;

  if not coalesce(v_is_student, false) then
    -- Öğretmen: yalnızca teslimi iade edebilir (teslim → taslak), içeriğe dokunamaz
    if tg_op <> 'UPDATE' then
      raise exception 'Teslim kaydını yalnızca öğrenci oluşturabilir.' using errcode = '42501';
    end if;
    if not public.owns_homework(new.homework_id)
       or old.status <> 'teslim' or new.status <> 'taslak'
       or new.files is distinct from old.files or new.note is distinct from old.note then
      raise exception 'Öğretmen yalnızca teslim edilmiş ödevi iade edebilir.' using errcode = '42501';
    end if;
    new.submitted_at := null;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;

  -- Öğrenci
  if not public.homework_is_open(new.homework_id) then
    raise exception 'Bu ödevin teslim süresi doldu ya da ödev kapatıldı; değişiklik yapılamaz.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'teslim' then
      raise exception 'Teslim edilmiş ödev değiştirilemez. Değişiklik için öğretmeninizden iade isteyin.' using errcode = '42501';
    end if;
  end if;

  -- Dosya kayıtları yalnızca öğrencinin kendi klasörünü gösterebilir
  for v_file in select * from jsonb_array_elements(new.files) loop
    if jsonb_typeof(v_file) <> 'object'
       or coalesce(v_file->>'path', '') not like v_prefix || '%'
       or position('..' in v_file->>'path') > 0 then
      raise exception 'Geçersiz dosya kaydı.' using errcode = '22023';
    end if;
  end loop;

  if new.status = 'teslim' then
    if jsonb_array_length(new.files) = 0 and coalesce(btrim(new.note), '') = '' then
      raise exception 'Teslim için en az bir dosya ya da açıklama ekleyin.' using errcode = '22023';
    end if;
    new.submitted_at := now();
  else
    new.submitted_at := null;
  end if;

  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.homework_submissions_guard() from public, anon, authenticated;

drop trigger if exists homework_submissions_guard on public.homework_submissions;
create trigger homework_submissions_guard
  before insert or update on public.homework_submissions
  for each row execute function public.homework_submissions_guard();

-- Realtime: öğretmen teslimleri canlı görebilsin (yayında zaten varsa atla)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'homework_submissions'
     ) then
    alter publication supabase_realtime add table public.homework_submissions;
  end if;
end $$;

-- --------------------------------------------------------
-- TESLİM DOSYALARI (Storage)
-- --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-submissions', 'homework-submissions', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Öğrenci: kendi klasörüne, ödev açıkken ve henüz teslim etmemişken yükler
drop policy if exists homework_submissions_files_insert on storage.objects;
create policy homework_submissions_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'homework-submissions'
    and (storage.foldername(name))[2] = (select public.current_student_id())::text
    and public.student_has_homework(public.try_uuid((storage.foldername(name))[1]))
    and public.homework_is_open(public.try_uuid((storage.foldername(name))[1]))
    and not exists (
      select 1 from public.homework_submissions s
      where s.homework_id = public.try_uuid((storage.foldername(name))[1])
        and s.student_id = (select public.current_student_id())
        and s.status = 'teslim'
    )
  );

-- Okuma: öğrencinin kendisi ve ödevin sahibi öğretmen
drop policy if exists homework_submissions_files_select on storage.objects;
create policy homework_submissions_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'homework-submissions'
    and (
      (storage.foldername(name))[2] = (select public.current_student_id())::text
      or public.owns_homework(public.try_uuid((storage.foldername(name))[1]))
    )
  );

-- Silme: öğrenci taslaktaki dosyasını (ödev açıkken); öğretmen ödevi silerken temizlik için
drop policy if exists homework_submissions_files_delete on storage.objects;
create policy homework_submissions_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'homework-submissions'
    and (
      public.owns_homework(public.try_uuid((storage.foldername(name))[1]))
      or (
        (storage.foldername(name))[2] = (select public.current_student_id())::text
        and public.homework_is_open(public.try_uuid((storage.foldername(name))[1]))
        and not exists (
          select 1 from public.homework_submissions s
          where s.homework_id = public.try_uuid((storage.foldername(name))[1])
            and s.student_id = (select public.current_student_id())
            and s.status = 'teslim'
        )
      )
    )
  );
