-- ========================================================
-- Mesajın okunma saati (✓✓ "Okundu · 14:32")
-- is_read false → true olduğu anda read_at sunucuda yazılır. İstemci read_at'i değiştiremez
-- (UPDATE sütun izni yalnızca is_read'de). Eski okunmuş mesajlarda read_at boş kalır ("Okundu", saatsiz).
-- ========================================================

alter table public.messages add column if not exists read_at timestamptz;

create or replace function public.messages_set_read_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_read and not coalesce(old.is_read, false) then
    new.read_at := now();
  elsif not new.is_read then
    new.read_at := null;
  else
    new.read_at := old.read_at;
  end if;
  return new;
end;
$$;
revoke all on function public.messages_set_read_at() from public, anon, authenticated;
drop trigger if exists messages_set_read_at on public.messages;
create trigger messages_set_read_at before update of is_read on public.messages
  for each row execute function public.messages_set_read_at();

notify pgrst, 'reload schema';
