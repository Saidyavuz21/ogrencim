-- ========================================================
-- Mesaj silme (öğretmen) + mesaj güncelleme koruması
--
-- 1) Öğretmen kendi mesajını ve (uygunsuz içerik için) öğrenci mesajını silebilir.
--    Silme yumuşaktır: satır kalır, metin boşaltılır, "Bu mesaj silindi" gösterilir; kimin sildiği kayıtlıdır.
--    Öğrenci mesaj silemez.
-- 2) İkinci güvenlik katmanı: istemcinin UPDATE izni zaten yalnızca is_read sütunundadır (sütun izni).
--    Bu tetikleyici, izinler ileride genişletilse bile metin, gönderen vb. alanların istemciden değişmemesini garanti eder.
-- ========================================================

alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- 2) Koruma: istemci güncellemesinde yalnızca is_read değişebilir
create or replace function public.messages_update_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Silme fonksiyonu ve sunucu işleri (oturum yok) serbest
  if coalesce(current_setting('tofutr.msg_delete', true), '') = 'on' or auth.uid() is null then
    return new;
  end if;
  if new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id
     or new.sender_name is distinct from old.sender_name
     or new.sender_role is distinct from old.sender_role
     or new.content is distinct from old.content
     or new.message_type is distinct from old.message_type
     or new.file_url is distinct from old.file_url
     or new.audio_duration is distinct from old.audio_duration
     or new.created_at is distinct from old.created_at
     or new.deleted_at is distinct from old.deleted_at
     or new.deleted_by is distinct from old.deleted_by then
    raise exception 'Mesaj değiştirilemez.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.messages_update_guard() from public, anon, authenticated;
drop trigger if exists messages_update_guard on public.messages;
create trigger messages_update_guard before update on public.messages
  for each row execute function public.messages_update_guard();

-- 1) Silme
create or replace function public.delete_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.messages;
begin
  if not public.is_staff() then
    raise exception 'Mesajı yalnızca öğretmen silebilir.' using errcode = '42501';
  end if;
  select * into m from public.messages where id = p_id;
  if m.id is null or not public.can_read_conversation(m.conversation_id) then
    raise exception 'Mesaj bulunamadı.' using errcode = '22023';
  end if;
  if m.deleted_at is not null then return; end if;
  if m.sender_id is distinct from auth.uid()::text and m.sender_role <> 'student' then
    raise exception 'Başka bir öğretmenin mesajını silemezsiniz.' using errcode = '42501';
  end if;

  perform set_config('tofutr.msg_delete', 'on', true);
  update public.messages
     set content = '', file_url = null, audio_duration = null, deleted_at = now(), deleted_by = auth.uid()
   where id = p_id;
  perform set_config('tofutr.msg_delete', '', true);

  -- Bildirimdeki önizleme metni de kalkar
  update public.notifications
     set body = null
   where group_key = 'mesaj:' || m.conversation_id
     and body = private.nt_message_preview(m.message_type, m.content);
end;
$$;
revoke all on function public.delete_message(uuid) from public, anon;
grant execute on function public.delete_message(uuid) to authenticated;

notify pgrst, 'reload schema';
