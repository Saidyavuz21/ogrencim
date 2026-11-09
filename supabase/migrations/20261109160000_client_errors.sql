-- ========================================================
-- Paket 9 · Hata izleme
-- Tarayıcıdaki beklenmedik hatalar (src/lib/errorReporting.ts) buraya yazılır.
--  - Dış servise veri gitmez; kayıtlar 30 gün tutulur.
--  - Kişisel veri sunucuda da temizlenir (e-posta, JWT/anahtar, uuid, mesajdaki 4+ haneli sayılar).
--  - Giriş yapmamış ziyaretçinin hatası da kaydedilir (giriş sayfası hataları); kötüye kullanıma karşı
--    kullanıcı başına ve genel saatlik sınır vardır.
--  - Yalnızca süper admin görür.
-- ========================================================

create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_kind text,
  kind text not null check (kind in ('error', 'promise', 'render')),
  message text not null,
  stack text,
  path text,
  user_agent text
);
create index if not exists client_errors_at_idx on public.client_errors (at desc);

alter table public.client_errors enable row level security;
revoke all on public.client_errors from public, anon, authenticated;
grant select on public.client_errors to authenticated;
drop policy if exists client_errors_select on public.client_errors;
create policy client_errors_select on public.client_errors for select to authenticated
  using ((select public.is_admin()));

create or replace function private.scrub_text(p text, p_numbers boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_numbers then regexp_replace(t, '\m\d{4,}\M', '[sayı]', 'g') else t end
  from (
    select regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(coalesce(p, ''), 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[jwt]', 'g'),
                 'sb_(publishable|secret)_[A-Za-z0-9_-]+', '[anahtar]', 'g'),
               '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+', '[e-posta]', 'g'),
             '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '[id]', 'g') as t
  ) s;
$$;
revoke all on function private.scrub_text(text, boolean) from public, anon, authenticated;

create or replace function public.report_client_error(
  p_kind text, p_message text, p_stack text default null, p_path text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('error', 'promise', 'render') or coalesce(trim(p_message), '') = '' then
    return;
  end if;
  -- Genel sınır: saatte en çok 300 kayıt (ziyaretçi kimliksiz olabildiği için)
  if (select count(*) from public.client_errors where at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  -- Kullanıcı başına sınır: dakikada 20
  if auth.uid() is not null then
    begin
      perform private.check_rate('client_errors', 20, 60);
    exception when others then
      return;
    end;
  end if;
  if random() < 0.02 then
    delete from public.client_errors where at < now() - interval '30 days';
  end if;

  insert into public.client_errors (actor_id, actor_kind, kind, message, stack, path, user_agent)
  values (
    auth.uid(),
    case when auth.uid() is null then 'visitor' else private.actor_kind() end,
    p_kind,
    left(private.scrub_text(p_message, true), 500),
    left(private.scrub_text(p_stack, false), 4000),
    left(regexp_replace(coalesce(p_path, ''), '\?.*$', ''), 200),
    left(p_user_agent, 200)
  );
end;
$$;
revoke all on function public.report_client_error(text, text, text, text, text) from public;
grant execute on function public.report_client_error(text, text, text, text, text) to anon, authenticated;
