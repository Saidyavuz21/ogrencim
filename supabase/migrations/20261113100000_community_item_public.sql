-- ========================================================
-- Topluluk: "herkese açık önizleme" paylaşım başına
-- - community_items.is_public: bu tahta/soru seti giriş yapmayanlara önizleme olarak görünsün mü
-- - Profil ayarındaki public_preview artık yalnızca yeni paylaşımlar için varsayılan değerdir
-- - Mevcut paylaşımlar yazarın profil ayarından başlar
-- ========================================================
alter table public.community_items add column if not exists is_public boolean not null default false;

update public.community_items i
   set is_public = coalesce((select c.public_preview from public.community_profiles c where c.teacher_id = i.author_id), false)
 where not i.is_public;

-- Herkese açık önizleme koşulu: paylaşımın kendisi açık
create or replace function private.cp_public_ok(i public.community_items)
returns boolean language sql stable security definer set search_path = '' as $$
  select not i.hidden
    and i.is_public
    and not private.cp_suspended(i.author_id)
    and exists (select 1 from public.profiles p where p.id = i.author_id and p.approved and p.is_active)
    and not exists (select 1 from public.community_posts p where p.item_id = i.id and p.hidden);
$$;
revoke all on function private.cp_public_ok(public.community_items) from public, anon, authenticated;

-- Yazar: paylaşımın herkese açıklığını değiştirir
create or replace function public.community_set_public(p_item uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  update public.community_items set is_public = coalesce(p_on, false)
   where id = p_item and author_id = auth.uid();
  if not found then raise exception 'İçerik bulunamadı.' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.community_set_public(uuid, boolean) from public, anon;
grant execute on function public.community_set_public(uuid, boolean) to authenticated;

-- Akış kartında içeriğin herkese açık olup olmadığı (yazarın menüsü için)
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
      'origin_author', i.origin_author, 'origin_title', i.origin_title,
      'is_public', case when i.author_id = v_uid then i.is_public end
    ) end
  );
end;
$$;
revoke all on function private.cp_post_json(public.community_posts) from public, anon, authenticated;

-- Profil kartındaki paylaşım sayısı: ziyaretçiye yalnızca herkese açık olanlar
create or replace function private.cp_public_item_count(p_teacher uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.community_items i
  where i.author_id = p_teacher and not i.hidden and (public.is_staff() or i.is_public);
$$;
revoke all on function private.cp_public_item_count(uuid) from public, anon, authenticated;

-- Öğretmen kartı: paylaşım sayısı yeni kurala göre
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
    'item_count', private.cp_public_item_count(p_teacher),
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
revoke all on function private.cp_card(uuid, boolean) from public, anon, authenticated;
