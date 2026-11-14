-- ========================================================
-- Bildirimler – Aşama 2: telefon bildirimi (Web Push) ve ikon rozeti
-- Plan: docs/BILDIRIM_PLANI.md
--
--  1) push_subscriptions: cihaz abonelikleri (öğrencide oturuma bağlı: çıkışta silinir)
--  2) Abone ol / çık / durum / deneme fonksiyonları (istemci)
--  3) Gönderim kuyruğu: push_claim (Edge Function "send-push" çağırır) + push_report
--     Kurallar: tür push'a kapalıysa atla; sessiz saatte ertele (sabah tek özet);
--     aynı bildirim için 10 dakikada en fazla bir push; 30 dakikadan eski bekleyen atlanır.
--  4) Tetikleme: yeni bekleyen bildirim olunca pg_net ile anında; pg_cron her dakika yedek tarama
--
-- Push metninde içerik YOK (KVKK, kilit ekranı): yalnızca "Yeni mesajın var" gibi genel cümle.
-- Gizli değerler Vault'ta (migration'da değil): push_vapid_public, push_vapid_private, push_dispatch_secret
-- ========================================================

-- --------------------------------------------------------
-- 0) notifications ekleri
-- --------------------------------------------------------
alter table public.notifications add column if not exists pushed_at timestamptz;

-- 'sistem' türü: deneme bildirimi
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'mesaj', 'odev_yeni', 'odev_degerlendirildi', 'odev_teslim', 'canli_ders', 'duyuru', 'topluluk',
  'odev_hatirlatma', 'odev_bitti', 'quiz', 'quiz_bitti', 'soru_yeni', 'soru_cevap', 'tahta_paylasildi', 'dosya_silinecek',
  'sistem'
));

-- --------------------------------------------------------
-- 1) Abonelikler
-- --------------------------------------------------------
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  recipient_user uuid references auth.users(id) on delete cascade,
  recipient_student uuid references public.students(id) on delete cascade,
  -- Öğrenci oturumu: öğrenci çıkış yapınca (student_sessions satırı silinince) abonelik de silinir
  session_uid uuid references public.student_sessions(auth_uid) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fail_count integer not null default 0,
  constraint push_subscriptions_one_owner check (num_nonnulls(recipient_user, recipient_student) = 1),
  constraint push_subscriptions_student_session check (recipient_student is null or session_uid is not null)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (recipient_user) where recipient_user is not null;
create index if not exists push_subscriptions_student_idx on public.push_subscriptions (recipient_student) where recipient_student is not null;
create index if not exists push_subscriptions_session_idx on public.push_subscriptions (session_uid) where session_uid is not null;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;

-- --------------------------------------------------------
-- 2) İstemci fonksiyonları
-- --------------------------------------------------------
-- VAPID açık anahtarı (gizli değildir; tarayıcı aboneliği için gerekir)
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public' limit 1;
$$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Bu cihazı oturumdaki kişiye bağlar (aynı uç nokta başka kişideyse ona geçer)
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_user uuid;
begin
  if v_student is null then
    if not public.is_staff() then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
    v_user := auth.uid();
  end if;
  perform private.check_rate('push_subscribe', 30, 3600);
  insert into public.push_subscriptions (recipient_user, recipient_student, session_uid, endpoint, p256dh, auth, user_agent)
  values (v_user, v_student, case when v_student is not null then auth.uid() end, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set
    recipient_user = excluded.recipient_user,
    recipient_student = excluded.recipient_student,
    session_uid = excluded.session_uid,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    fail_count = 0;
  -- Kişi başına en fazla 10 cihaz (en eskiler silinir)
  delete from public.push_subscriptions p
  where p.id in (
    select x.id from public.push_subscriptions x
    where (case when v_student is not null then x.recipient_student = v_student else x.recipient_user = v_user end)
    order by x.created_at desc
    offset 10
  );
end;
$$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- Bu cihazın aboneliğini siler (uç noktayı bilen cihazın kendisidir)
create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;
revoke all on function public.push_unsubscribe(text) from public, anon;
grant execute on function public.push_unsubscribe(text) to authenticated;

-- Bu cihaz oturumdaki kişi için kayıtlı mı?
create or replace function public.push_is_subscribed(p_endpoint text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
begin
  if v_student is not null then
    return exists (select 1 from public.push_subscriptions where endpoint = p_endpoint and recipient_student = v_student);
  elsif public.is_staff() then
    return exists (select 1 from public.push_subscriptions where endpoint = p_endpoint and recipient_user = auth.uid());
  end if;
  return false;
end;
$$;
revoke all on function public.push_is_subscribed(text) from public, anon;
grant execute on function public.push_is_subscribed(text) to authenticated;

-- Deneme bildirimi: kişinin kendi cihazlarına (saatte en fazla 5)
create or replace function public.push_test()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
begin
  perform private.check_rate('push_test', 5, 3600);
  if v_student is not null then
    delete from public.notifications where recipient_student = v_student and group_key = 'sistem:test';
    insert into public.notifications (recipient_student, kind, group_key, title, body)
    values (v_student, 'sistem', 'sistem:test', 'Deneme bildirimi', 'Telefon bildirimleri bu cihazda çalışıyor.');
  elsif public.is_staff() then
    delete from public.notifications where recipient_user = auth.uid() and group_key = 'sistem:test';
    insert into public.notifications (recipient_user, kind, group_key, title, body)
    values (auth.uid(), 'sistem', 'sistem:test', 'Deneme bildirimi', 'Telefon bildirimleri bu cihazda çalışıyor.');
  else
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;

-- --------------------------------------------------------
-- 3) Gönderim kuyruğu (yalnızca Edge Function, service_role + gizli anahtar)
-- --------------------------------------------------------
create or replace function private.push_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'push_dispatch_secret' and decrypted_secret = p_secret
  );
$$;
revoke all on function private.push_secret_ok(text) from public, anon, authenticated;

create or replace function public.push_vapid_keys(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.push_secret_ok(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public' limit 1),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_private' limit 1)
  );
end;
$$;
revoke all on function public.push_vapid_keys(text) from public, anon, authenticated;
grant execute on function public.push_vapid_keys(text) to service_role;

-- Öğrenci aboneliği yalnızca oturumu süresi dolmamışsa geçerli (öğretmende session_uid boş)
create or replace function private.push_sub_live(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_session is null or exists (
    select 1 from public.student_sessions ss where ss.auth_uid = p_session and ss.expires_at > now()
  );
$$;
revoke all on function private.push_sub_live(uuid) from public, anon, authenticated;

-- Sessiz saat mi? (İstanbul saatiyle; gece yarısını aşan aralık desteklenir)
create or replace function private.nt_in_quiet(p_enabled boolean, p_start time, p_end time)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(p_enabled, true) and case
    when p_start = p_end then false
    when p_start < p_end then (now() at time zone 'Europe/Istanbul')::time >= p_start and (now() at time zone 'Europe/Istanbul')::time < p_end
    else (now() at time zone 'Europe/Istanbul')::time >= p_start or (now() at time zone 'Europe/Istanbul')::time < p_end
  end;
$$;
revoke all on function private.nt_in_quiet(boolean, time, time) from public, anon, authenticated;

-- Push metni (içerik yok). Öğrenciye "sen", öğretmene "siz".
create or replace function private.nt_push_text(p_kind text, p_sub text, p_count integer, p_student boolean)
returns text language sql immutable set search_path = '' as $$
  select case p_kind
    when 'mesaj' then case
      when p_sub = 'sinif' then 'Sınıf grubunda yeni mesaj var'
      when p_student then 'Öğretmeninden yeni mesaj var'
      else 'Öğrencinizden yeni mesaj var' end
    when 'odev_yeni' then 'Yeni ödevin var'
    when 'odev_degerlendirildi' then 'Ödevin değerlendirildi'
    when 'odev_teslim' then case when p_count > 1 then p_count || ' yeni ödev teslimi' else 'Yeni ödev teslimi' end
    when 'canli_ders' then 'Sınıfında canlı ders başladı'
    when 'duyuru' then case when p_student then 'Okulundan yeni duyuru var' else 'Yeni okul duyurusu' end
    when 'topluluk' then 'Toplulukta yeni bildiriminiz var'
    when 'sistem' then 'Telefon bildirimleri bu cihazda çalışıyor.'
    else case when p_student then 'Yeni bildirimin var' else 'Yeni bildiriminiz var' end
  end;
$$;
revoke all on function private.nt_push_text(text, text, integer, boolean) from public, anon, authenticated;

-- Tıklanınca açılacak adres
create or replace function private.nt_push_url(p_kind text, p_student boolean)
returns text language sql immutable set search_path = '' as $$
  select '/giris' || coalesce('?sayfa=' || case
    when p_student then case p_kind
      when 'mesaj' then 'mesajlar'
      when 'odev_yeni' then 'odevler' when 'odev_degerlendirildi' then 'odevler' when 'odev_hatirlatma' then 'odevler' when 'quiz' then 'odevler'
      when 'duyuru' then 'duyurular'
      else null end
    else case p_kind
      when 'mesaj' then 'mesajlar'
      when 'odev_teslim' then 'odev-kontrol' when 'odev_bitti' then 'odev-kontrol'
      when 'duyuru' then 'duyurular'
      when 'topluluk' then 'topluluk'
      else null end
  end, '');
$$;
revoke all on function private.nt_push_url(text, boolean) from public, anon, authenticated;

-- Gönderilecekleri alır ve "gönderildi" işaretler. Kişi başına tek push: birden fazla bildirim varsa özet.
-- Dönen her satır: { subs: [{id, endpoint, p256dh, auth}], payload: {title, body, url, tag, badge} }
create or replace function public.push_claim(p_secret text, p_limit integer default 200)
returns setof jsonb language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  if not private.push_secret_ok(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;

  -- Eski bekleyenler (ör. Aşama 2'den önce oluşanlar) ve okunmuşlar push almaz
  update public.notifications set push_state = 'atlandi'
  where push_state in ('bekliyor', 'ertelendi')
    and (read_at is not null
         or (push_state = 'bekliyor' and updated_at < now() - interval '30 minutes')
         or (push_state = 'ertelendi' and updated_at < now() - interval '14 hours'));

  for r in
    with cand as (
      select n.id, n.recipient_user, n.recipient_student, n.kind, n.sub, n.count, n.group_key, n.pushed_at,
             s.off_push,
             case when n.recipient_student is not null then private.nt_in_quiet(true, '22:00', '07:00')
                  else private.nt_in_quiet(s.quiet_enabled, coalesce(s.quiet_start, '22:00'), coalesce(s.quiet_end, '07:00')) end as quiet,
             exists (
               select 1 from public.push_subscriptions p
               where ((n.recipient_user is not null and p.recipient_user = n.recipient_user)
                   or (n.recipient_student is not null and p.recipient_student = n.recipient_student))
                 and private.push_sub_live(p.session_uid)
             ) as has_sub
      from public.notifications n
      left join public.notification_settings s
        on (n.recipient_user is not null and s.recipient_user = n.recipient_user)
        or (n.recipient_student is not null and s.recipient_student = n.recipient_student)
      where n.push_state in ('bekliyor', 'ertelendi') and n.read_at is null
      order by n.updated_at
      limit greatest(1, least(1000, coalesce(p_limit, 200)))
      for update of n skip locked
    )
    select * from cand
  loop
    if not r.has_sub or (r.kind <> 'sistem' and r.kind = any (coalesce(r.off_push, '{}'::text[]))) then
      update public.notifications set push_state = 'atlandi' where id = r.id;
    elsif r.quiet and r.kind <> 'sistem' then
      update public.notifications set push_state = 'ertelendi' where id = r.id and push_state <> 'ertelendi';
    elsif r.pushed_at is not null and r.pushed_at > now() - interval '10 minutes' and r.kind <> 'sistem' then
      null; -- aynı bildirim için kısa sürede ikinci push yok; süre dolunca güncel sayıyla gider
    else
      update public.notifications set push_state = 'gonderildi', pushed_at = now() where id = r.id;
    end if;
  end loop;

  -- Bu çağrıda "gönderildi" olanlar, kişi başına bir push
  return query
    with sent as (
      select n.* from public.notifications n
      where n.push_state = 'gonderildi' and n.pushed_at = now()  -- bu işlemde işaretlenenler
    ),
    per as (
      select recipient_user, recipient_student,
             count(*) as n_items,
             (array_agg(kind order by updated_at desc))[1] as kind,
             (array_agg(sub order by updated_at desc))[1] as sub,
             (array_agg(count order by updated_at desc))[1] as cnt,
             (array_agg(group_key order by updated_at desc))[1] as group_key
      from sent group by recipient_user, recipient_student
    )
    select jsonb_build_object(
      'subs', (
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
        from public.push_subscriptions p
        where ((per.recipient_user is not null and p.recipient_user = per.recipient_user)
            or (per.recipient_student is not null and p.recipient_student = per.recipient_student))
          and private.push_sub_live(p.session_uid)
      ),
      'payload', jsonb_build_object(
        'title', 'tofutr',
        'body', case when per.n_items > 1
                     then per.n_items || case when per.recipient_student is not null then ' yeni bildirimin var' else ' yeni bildiriminiz var' end
                     else private.nt_push_text(per.kind, per.sub, per.cnt, per.recipient_student is not null) end,
        'url', case when per.n_items > 1 then '/giris' else private.nt_push_url(per.kind, per.recipient_student is not null) end,
        'tag', case when per.n_items > 1 then 'ozet' else left(per.kind, 30) end,
        'badge', (select count(*) from public.notifications u
                  where u.read_at is null
                    and ((per.recipient_user is not null and u.recipient_user = per.recipient_user)
                      or (per.recipient_student is not null and u.recipient_student = per.recipient_student)))
      )
    )
    from per;
end;
$$;
revoke all on function public.push_claim(text, integer) from public, anon, authenticated;
grant execute on function public.push_claim(text, integer) to service_role;

-- Gönderim sonuçları: [{id, ok, gone}] — gone (404/410) ya da 5 ardışık hata → abonelik silinir
create or replace function public.push_report(p_secret text, p_results jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.push_secret_ok(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_results) is distinct from 'array' then return; end if;
  delete from public.push_subscriptions p
  using jsonb_array_elements(p_results) e
  where p.id = (e ->> 'id')::bigint and coalesce((e ->> 'gone')::boolean, false);
  update public.push_subscriptions p set last_ok_at = now(), fail_count = 0
  from jsonb_array_elements(p_results) e
  where p.id = (e ->> 'id')::bigint and coalesce((e ->> 'ok')::boolean, false);
  update public.push_subscriptions p set fail_count = p.fail_count + 1
  from jsonb_array_elements(p_results) e
  where p.id = (e ->> 'id')::bigint and not coalesce((e ->> 'ok')::boolean, false) and not coalesce((e ->> 'gone')::boolean, false);
  delete from public.push_subscriptions where fail_count >= 5;
end;
$$;
revoke all on function public.push_report(text, jsonb) from public, anon, authenticated;
grant execute on function public.push_report(text, jsonb) to service_role;

-- --------------------------------------------------------
-- 4) Tetikleme
-- --------------------------------------------------------
create or replace function private.push_kick()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret' limit 1;
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'http://supabase-kong:8000/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function private.push_kick() from public, anon, authenticated;

-- Yeni bekleyen bildirim olan işlemin sonunda bir kez (25 öğrenciye ödev = tek çağrı)
create or replace function private.nt_push_kick_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if exists (
      select 1 from new_rows x
      where x.push_state = 'bekliyor' and x.read_at is null
        and exists (
          select 1 from public.push_subscriptions p
          where (x.recipient_user is not null and p.recipient_user = x.recipient_user)
             or (x.recipient_student is not null and p.recipient_student = x.recipient_student)
        )
    ) then
      perform private.push_kick();
    end if;
  exception when others then
    raise warning 'push tetiklenemedi: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.nt_push_kick_trigger() from public, anon, authenticated;
drop trigger if exists notifications_push_ins on public.notifications;
create trigger notifications_push_ins after insert on public.notifications
  referencing new table as new_rows for each statement execute function private.nt_push_kick_trigger();
drop trigger if exists notifications_push_upd on public.notifications;
create trigger notifications_push_upd after update on public.notifications
  referencing new table as new_rows for each statement execute function private.nt_push_kick_trigger();

-- Her dakika yedek: ertelenenler (sessiz saat bitince) ve bekleyenler
create or replace function private.push_cron()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.notifications n
    where n.push_state in ('bekliyor', 'ertelendi') and n.read_at is null
      and n.updated_at > now() - interval '14 hours'
  ) then
    perform private.push_kick();
  end if;
end;
$$;
revoke all on function private.push_cron() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'push-dispatch') then perform cron.unschedule('push-dispatch'); end if;
end $$;
select cron.schedule('push-dispatch', '* * * * *', $cron$ select private.push_cron(); $cron$);

notify pgrst, 'reload schema';
