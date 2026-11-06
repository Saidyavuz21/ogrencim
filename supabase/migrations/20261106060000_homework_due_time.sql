-- ========================================================
-- ÖDEV TESLİM ANI: isteğe bağlı saat + geçmiş tarih engeli
--  - due_time: isteğe bağlı teslim saati (boşsa gün sonu 23:59)
--  - due_at  : kesin teslim anı (due_date + saat, İstanbul saati); trigger doldurur.
--              Otomatik kapanış ve teslim kilidi (EduBoard listesi, Paket 2) bunu kullanacak.
--  - Yeni ödevde ya da teslim tarihi değiştirilirken geçmiş bir an verilemez.
-- ========================================================

alter table public.homeworks
  add column if not exists due_time time,
  add column if not exists due_at timestamptz;

-- Mevcut ödevler: gün sonu (trigger'dan önce; geçmiş tarihli eski ödevler engellenmesin)
update public.homeworks
   set due_at = (due_date + time '23:59') at time zone 'Europe/Istanbul'
 where due_date is not null and due_at is null;

create index if not exists homeworks_due_at_idx on public.homeworks (due_at) where due_at is not null;

create or replace function public.homeworks_set_due()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.due_date is null then
    new.due_time := null;
    new.due_at := null;
    return new;
  end if;

  new.due_at := (new.due_date + coalesce(new.due_time, time '23:59')) at time zone 'Europe/Istanbul';

  -- Yalnızca yeni ödevde ya da teslim anı değiştiğinde geçmiş kontrolü (eski ödevlerin başka alanları düzenlenebilsin)
  if (tg_op = 'INSERT' or new.due_at is distinct from old.due_at) and new.due_at < now() then
    raise exception 'Teslim tarihi ve saati geçmişte olamaz.' using errcode = '22007';
  end if;
  return new;
end;
$$;

drop trigger if exists homeworks_set_due on public.homeworks;
create trigger homeworks_set_due
  before insert or update of due_date, due_time on public.homeworks
  for each row execute function public.homeworks_set_due();
