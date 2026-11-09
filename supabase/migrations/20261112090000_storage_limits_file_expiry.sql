-- ========================================================
-- DEPOLAMA SINIRLARI VE DOSYALARIN OTOMATİK SİLİNMESİ
-- - Öğretmen kotası 500 MB → 100 MB; Dosyalarım + tahta görselleri + soru görselleri tek kotada
-- - Dosyalarım'da dosya başına 25 MB → 10 MB
-- - Öğrenci teslimi: en fazla 3 dosya, her biri 5 MB; ödev eki: en fazla 3 dosya
-- - Ödev ekleri, son teslim anından (yoksa ödevin verildiği andan) 30 gün sonra silinir.
--   Teslim dosyaları da aynı kuralla silinir; ama teslimden itibaren en az 30 gün kalır (geç/süresiz ödev).
--   Ödev, not, puan ve "teslim etti" bilgisi kalır; yalnızca dosyalar silinir (files_purged_at işaretlenir).
-- - Silme işini her gece "purge-expired-files" Edge Function yapar (Supabase, depolama nesnelerinin SQL ile
--   silinmesine izin vermez). pg_cron her gece 03:30'da (İstanbul) fonksiyonu çağırır; gizli anahtar Vault'ta.
--   VPS'e taşınınca cron'daki adres yeni sunucuya göre güncellenmeli.
-- ========================================================

-- --------------------------------------------------------
-- 1) Kota
-- --------------------------------------------------------
create or replace function public.teacher_file_quota()
returns bigint language sql immutable set search_path = '' as $$
  select 104857600::bigint; -- 100 MB
$$;

-- Kullanılan alan: Dosyalarım + tahta görselleri/sesleri + soru görselleri
create or replace function public.teacher_storage_used()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id in ('teacher-files', 'board-images', 'quiz-images')
    and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;
revoke execute on function public.teacher_storage_used() from public, anon;
grant execute on function public.teacher_storage_used() to authenticated;

-- Dosyalarım kaydı: kota kontrolüne tahta ve soru görselleri de girer
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
    v_used := v_used + coalesce((
      select sum((o.metadata ->> 'size')::bigint) from storage.objects o
      where o.bucket_id in ('board-images', 'quiz-images') and (storage.foldername(o.name))[1] = new.teacher_id::text
    ), 0);
    if v_used + new.size > public.teacher_file_quota() then
      raise exception 'Depolama alanınız doldu (100 MB). Yer açmak için kullanmadığınız dosyaları silin.';
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

-- Tahta ve soru görselleri: kota dolduysa yükleme reddedilir
drop policy if exists board_images_insert on storage.objects;
create policy board_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'board-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_staff())
    and (select public.teacher_storage_used()) < (select public.teacher_file_quota())
  );
drop policy if exists quiz_images_insert on storage.objects;
create policy quiz_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'quiz-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_staff())
    and (select public.teacher_storage_used()) < (select public.teacher_file_quota())
  );

-- --------------------------------------------------------
-- 2) Dosya başına ve adet sınırları
-- --------------------------------------------------------
update storage.buckets set file_size_limit = 10485760 where id = 'teacher-files';        -- 10 MB
update storage.buckets set file_size_limit = 5242880 where id = 'homework-submissions';  -- 5 MB

alter table public.teacher_files drop constraint if exists teacher_files_size_check;
alter table public.teacher_files add constraint teacher_files_size_check
  check (size > 0 and size <= 10485760) not valid;

alter table public.homework_submissions drop constraint if exists homework_submissions_files_check;
alter table public.homework_submissions add constraint homework_submissions_files_check
  check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 3) not valid;

alter table public.homeworks drop constraint if exists homeworks_attachments_max;
alter table public.homeworks add constraint homeworks_attachments_max
  check (attachments is null or jsonb_array_length(attachments) <= 3) not valid;

-- --------------------------------------------------------
-- 3) Süresi dolan dosyalar
-- --------------------------------------------------------
alter table public.homeworks add column if not exists files_purged_at timestamptz;
alter table public.homework_submissions add column if not exists files_purged_at timestamptz;

create or replace function public.file_retention_days()
returns integer language sql immutable set search_path = '' as $$ select 30 $$;
grant execute on function public.file_retention_days() to authenticated;

-- Teslim kaydı koruması: silme işi (service_role) dosya listesini boşaltabilsin
create or replace function public.homework_submissions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_student boolean := new.student_id = public.current_student_id();
  v_prefix text := new.homework_id::text || '/' || new.student_id::text || '/';
  v_file jsonb;
begin
  -- Süresi dolan dosyaların silinmesi (yalnızca sunucu işi): dosya listesi boşaltılır, başka alan değişmez
  if tg_op = 'UPDATE' and (select auth.role()) = 'service_role' then
    if new.homework_id <> old.homework_id or new.student_id <> old.student_id
       or new.status is distinct from old.status or new.note is distinct from old.note
       or new.files <> '[]'::jsonb then
      raise exception 'Silme işi yalnızca dosya listesini boşaltabilir.' using errcode = '42501';
    end if;
    new.submitted_at := old.submitted_at;
    new.created_at := old.created_at;
    return new;
  end if;

  -- Not: INSERT'te OLD yok; OLD'a yalnızca tg_op = 'UPDATE' dalının içinde bakılır
  if tg_op = 'UPDATE' then
    if new.homework_id <> old.homework_id or new.student_id <> old.student_id then
      raise exception 'Teslim kaydı başka ödeve/öğrenciye taşınamaz.' using errcode = '42501';
    end if;
    -- files_purged_at yalnızca sunucu işinde değişir
    new.files_purged_at := old.files_purged_at;
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
  if tg_op = 'INSERT' then
    new.files_purged_at := null;
  end if;
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

-- Öğretmen files_purged_at alanını kendisi değiştiremez
create or replace function public.homeworks_keep_purge_mark()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    new.files_purged_at := case when tg_op = 'UPDATE' then old.files_purged_at else null end;
  end if;
  return new;
end;
$$;
revoke execute on function public.homeworks_keep_purge_mark() from public, anon, authenticated;
drop trigger if exists homeworks_keep_purge_mark on public.homeworks;
create trigger homeworks_keep_purge_mark before insert or update on public.homeworks
  for each row execute function public.homeworks_keep_purge_mark();

-- Silinecek dosyalar (yalnızca sunucu işi çağırır)
create or replace function public.purge_file_candidates(p_limit integer default 100)
returns table (kind text, homework_id uuid, student_id uuid, paths text[])
language sql stable security definer set search_path = '' as $$
  (
    select 'homework'::text, h.id, null::uuid,
           array(select a ->> 'path' from jsonb_array_elements(h.attachments) a where coalesce(a ->> 'path', '') <> '')
    from public.homeworks h
    where h.files_purged_at is null
      and jsonb_typeof(h.attachments) = 'array' and jsonb_array_length(h.attachments) > 0
      and coalesce(h.due_at, h.created_at) < now() - make_interval(days => public.file_retention_days())
    limit p_limit
  )
  union all
  (
    select 'submission'::text, s.homework_id, s.student_id,
           array(select f ->> 'path' from jsonb_array_elements(s.files) f where coalesce(f ->> 'path', '') <> '')
    from public.homework_submissions s
    join public.homeworks h on h.id = s.homework_id
    where s.files_purged_at is null
      and jsonb_array_length(s.files) > 0
      -- Geç ya da süresiz ödevde yüklenen dosya da en az 30 gün kalır
      and greatest(coalesce(h.due_at, h.created_at), coalesce(s.submitted_at, s.updated_at))
          < now() - make_interval(days => public.file_retention_days())
    limit p_limit
  );
$$;
revoke all on function public.purge_file_candidates(integer) from public, anon, authenticated;
grant execute on function public.purge_file_candidates(integer) to service_role;

-- Dosyaları depodan silindikten sonra kaydı işaretler
create or replace function public.mark_files_purged(p_kind text, p_homework uuid, p_student uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'homework' then
    update public.homeworks set attachments = '[]'::jsonb, files_purged_at = now() where id = p_homework;
  elsif p_kind = 'submission' then
    update public.homework_submissions set files = '[]'::jsonb, files_purged_at = now()
     where homework_id = p_homework and student_id = p_student;
  else
    raise exception 'Bilinmeyen tür: %', p_kind;
  end if;
end;
$$;
revoke all on function public.mark_files_purged(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_files_purged(text, uuid, uuid) to service_role;

-- --------------------------------------------------------
-- 4) Gece çalışan silme işi
-- --------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Edge Function'ı yalnızca cron çağırabilsin diye ortak gizli anahtar (Vault'ta, kodda yok)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'purge_files_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'purge_files_secret', 'purge-expired-files çağrı anahtarı');
  end if;
end $$;

create or replace function public.check_purge_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'purge_files_secret' and decrypted_secret = p_secret
  );
$$;
revoke all on function public.check_purge_secret(text) from public, anon, authenticated;
grant execute on function public.check_purge_secret(text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-expired-files') then
    perform cron.unschedule('purge-expired-files');
  end if;
end $$;

select cron.schedule(
  'purge-expired-files',
  '30 0 * * *', -- 00:30 UTC = 03:30 İstanbul
  $cron$
  select net.http_post(
    url := 'https://pvxkyazarymowhbbhzgo.supabase.co/functions/v1/purge-expired-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'purge_files_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
