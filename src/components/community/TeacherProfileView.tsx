'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  type CommunitySummary,
} from '../../lib/communityData';
import {
  blockTeacher,
  followTeacher,
  getFeed,
  getTeacherProfile,
  listFollows,
  reportContent,
  type FeedPost,
  type TeacherCard,
  type TeacherProfile,
} from '../../lib/communitySocialData';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import {
  ArrowLeft,
  Bell,
  Edit,
  Flag,
  Layers,
  MoreHorizontal,
  School,
  UserCheck,
  UserPlus,
  UserX,
  Volume2,
  VolumeX,
  X,
} from '../icons';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import { CommunityPreview } from './CommunityPreview';
import { TeacherAvatar, TeacherByline } from './TeacherAvatar';
import base from './CommunitySocial.module.css';
import layout from './TeacherProfileView.module.css';
import { PostCard } from './PostCard';
const s = { ...base, ...layout };

type ProfileTab = 'shares' | 'posts' | 'about' | 'followers' | 'following';

export interface TeacherProfileViewProps {
  teacherId: string;
  onBack: () => void;
  onOpenTeacher: (teacherId: string) => void;
  onEditProfile?: () => void;
}

export function TeacherProfileView({
  teacherId,
  onBack,
  onOpenTeacher,
  onEditProfile,
}: TeacherProfileViewProps) {
  const { confirm } = useDialog();
  const menuRef = useRef<HTMLDivElement>(null);
  const reportTitleId = useId();
  const reportReasonId = useId();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [followBusy, setFollowBusy] = useState(false);
  const [relationBusy, setRelationBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Şikâyet modalı
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  // Sekme durumu
  const [tab, setTab] = useState<ProfileTab>('shares');
  const [shareView, setShareView] = useState<'feed' | 'list'>('feed');
  const [shares, setShares] = useState<FeedPost[]>([]);
  const [sharesMore, setSharesMore] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);

  const [posts, setPosts] = useState<FeedPost[]>([]);

  /** Akıştaki son ham gönderinin zamanı (paylaşılan içerikler süzülse de sayfalama ilerlesin) */

  const postsCursor = useRef<string | null>(null);
  const [postsMore, setPostsMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [followItems, setFollowItems] = useState<TeacherCard[]>([]);
  const [followMore, setFollowMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<CommunitySummary | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    const res = await getTeacherProfile(teacherId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.data) {
      setNotFound(true);
      setProfile(null);
      return;
    }
    setProfile(res.data);
  }, [teacherId]);

  const loadShares = useCallback(
    async (before?: string | null) => {
      setSharesLoading(true);
      setSharesError(null);
      const res = await getFeed({
        authorId: teacherId,
        kind: 'item',
        before: before || null,
        limit: 20,
      });
      setSharesLoading(false);
      if (!res.ok) {
        setSharesError(res.error);
        return;
      }
      const onlyItems = res.data.filter((p) => Boolean(p.item));
      setShares((prev) => (before ? [...prev, ...onlyItems] : onlyItems));
      setSharesMore(res.data.length >= 20);
    },
    [teacherId]
  );

  const loadPosts = useCallback(
    async (before?: string | null) => {
      setPostsLoading(true);
      setPostsError(null);
      // Tek akış + istemcide süzme: iki ayrı sayfalı listeyi birleştirmek sayfalamada gönderi atlatıyordu
      const res = await getFeed({ authorId: teacherId, before: before || null, limit: 20 });
      setPostsLoading(false);
      if (!res.ok) {
        setPostsError(res.error);
        return;
      }
      const mergedMap = new Map<string, FeedPost>();
      for (const p of res.data) {
        if (p.kind === 'text' || p.kind === 'link') {
          mergedMap.set(p.id, p);
        }
      }
      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      setPosts((prev) => {
        if (!before) return merged;
        const map = new Map<string, FeedPost>();
        for (const p of prev) map.set(p.id, p);
        for (const p of merged) map.set(p.id, p);
        return Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
      setPostsMore(res.data.length >= 20);
      postsCursor.current = res.data[res.data.length - 1]?.created_at || null;
    },
    [teacherId]
  );

  const loadFollowList = useCallback(
    async (kind: 'followers' | 'following', offset = 0) => {
      setFollowLoading(true);
      setFollowError(null);
      const res = await listFollows(teacherId, kind, 30, offset);
      setFollowLoading(false);
      if (!res.ok) {
        setFollowError(res.error);
        return;
      }
      setFollowItems((prev) => (offset > 0 ? [...prev, ...res.data] : res.data));
      setFollowMore(res.data.length >= 30);
    },
    [teacherId]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab('shares');
    setNotice(null);
    setMenuOpen(false);
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile || !profile.profile_visible) return;
    if (tab === 'shares') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadShares(null);
    } else if (tab === 'posts') {
      void loadPosts(null);
    } else if (tab === 'followers' || tab === 'following') {
      void loadFollowList(tab, 0);
    }
  }, [profile?.id, profile?.profile_visible, tab, loadShares, loadPosts, loadFollowList, profile]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  const handleToggleFollow = async () => {
    if (!profile || followBusy) return;
    const prevFollowing = Boolean(profile.is_following);
    const prevNotify = Boolean(profile.notify);
    const prevFollowers = profile.followers;
    const nextFollowing = !prevFollowing;
    const nextFollowers =
      typeof prevFollowers === 'number'
        ? Math.max(0, prevFollowers + (nextFollowing ? 1 : -1))
        : prevFollowers;

    setNotice(null);
    setFollowBusy(true);
    setProfile({
      ...profile,
      is_following: nextFollowing,
      notify: false,
      followers: nextFollowers,
    });

    // Her paylaşımda bildirim (zil) ayrı düğmeyle açılır; genel ayar "takip ettiklerim paylaşınca bildir" zaten geçerli
    const res = await followTeacher(profile.id, nextFollowing);
    setFollowBusy(false);
    if (!res.ok) {
      setProfile({
        ...profile,
        is_following: prevFollowing,
        notify: prevNotify,
        followers: prevFollowers,
      });
      setNotice({ kind: 'error', text: res.error });
    }
  };

  const handleToggleNotify = async () => {
    if (!profile || !profile.is_following || followBusy) return;
    const prevNotify = Boolean(profile.notify);
    const nextNotify = !prevNotify;

    setNotice(null);
    setFollowBusy(true);
    setProfile({ ...profile, notify: nextNotify });

    const res = await followTeacher(profile.id, true, nextNotify);
    setFollowBusy(false);
    if (!res.ok) {
      setProfile({ ...profile, notify: prevNotify });
      setNotice({ kind: 'error', text: res.error });
    }
  };

  const handleMuteToggle = async () => {
    if (!profile || relationBusy) return;
    setMenuOpen(false);
    const nextKind = profile.block === 'mute' ? null : 'mute';
    setNotice(null);
    setRelationBusy(true);
    const res = await blockTeacher(profile.id, nextKind);
    setRelationBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setProfile((prev) => (prev ? { ...prev, block: nextKind } : prev));
    setNotice({
      kind: 'ok',
      text: nextKind === 'mute' ? 'Öğretmen sessize alındı.' : 'Sessize alma kaldırıldı.',
    });
  };

  const handleBlockToggle = async () => {
    if (!profile || relationBusy) return;
    setMenuOpen(false);
    const isBlocked = profile.block === 'block';
    if (!isBlocked) {
      const ok = await confirm({
        title: 'Öğretmeni engelle',
        message: `${profile.name} adlı öğretmeni engellemek istediğinize emin misiniz? Engellediğiniz öğretmenin paylaşımlarını görmezsiniz ve takibiniz sonlandırılır.`,
        confirmText: 'Engelle',
        cancelText: 'Vazgeç',
        variant: 'danger',
      });
      if (!ok) return;
    }
    const nextKind = isBlocked ? null : 'block';
    setNotice(null);
    setRelationBusy(true);
    const res = await blockTeacher(profile.id, nextKind);
    setRelationBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            block: nextKind,
            is_following: nextKind === 'block' ? false : prev.is_following,
          }
        : prev
    );
    setNotice({
      kind: 'ok',
      text: nextKind === 'block' ? 'Öğretmen engellendi.' : 'Engel kaldırıldı.',
    });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || reportBusy) return;
    const clean = reportReason.trim();
    if (clean.length < 3 || clean.length > 500) {
      setNotice({ kind: 'error', text: 'Şikâyet nedeni 3 ile 500 karakter arasında olmalıdır.' });
      return;
    }
    setReportBusy(true);
    const res = await reportContent('profile', profile.id, clean);
    setReportBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setReportOpen(false);
    setReportReason('');
    setNotice({ kind: 'ok', text: 'Bildiriminiz yöneticiye iletildi. Teşekkürler.' });
  };

  const showFollowCounts =
    typeof profile?.followers === 'number' && typeof profile?.following === 'number';

  return (
    <div className={layout.profilePage}>
      <div className={s.backRow}>
        <button type="button" className={s.btnSecondary} onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Topluluğa dön</span>
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {loading && <Spinner center label="Öğretmen profili yükleniyor…" />}

      {!loading && error && (
        <div className={s.emptyBox}>
          <Notice notice={{ kind: 'error', text: error }} />
          <button type="button" className={s.btnSecondary} onClick={loadProfile}>
            Yeniden dene
          </button>
        </div>
      )}

      {!loading && !error && notFound && (
        <section className={s.emptyBox}>
          <h3>Bu profil görüntülenemiyor.</h3>
          <p>Aradığınız öğretmen profili bulunamadı veya erişime kapalı.</p>
        </section>
      )}

      {!loading && !error && profile && !profile.profile_visible && (
        <section className={s.profilePanel}>
          <div className={s.profileIdentity}>
            <TeacherAvatar card={profile} size={96} />
            <div className={s.profileText}>
              <h2 className={s.profileName}>{profile.name}</h2>
              <p className={s.profileSub}>Bu öğretmen profilini gizlemiş.</p>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && profile && profile.profile_visible && (
        <>
          <section className={s.profilePanel}>
            <div className={s.profileTop}>
              <div className={s.profileIdentity}>
                <TeacherAvatar card={profile} size={96} />
                <div className={s.profileText}>
                  <h2 className={s.profileName}>{profile.name}</h2>
                  {(profile.branch || profile.city) && (
                    <p className={s.profileSub}>
                      {[profile.branch, profile.city].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {profile.school && (
                    <p className={s.profileSchool}>
                      <School size={15} aria-hidden="true" />
                      <span>{profile.school}</span>
                    </p>
                  )}
                  {profile.bio && <p className={s.profileBio}>{profile.bio}</p>}
                </div>
              </div>

              <div className={s.profileActions}>
                {profile.is_self && onEditProfile && (
                  <button type="button" className={s.btnSecondary} onClick={onEditProfile}>
                    <Edit size={16} aria-hidden="true" />
                    <span>Profilimi düzenle</span>
                  </button>
                )}

                {!profile.is_self && profile.can_follow && (
                  <>
                    <button
                      type="button"
                      className={profile.is_following ? s.btnSecondary : s.btnPrimary}
                      aria-pressed={Boolean(profile.is_following)}
                      disabled={followBusy}
                      onClick={handleToggleFollow}
                    >
                      {profile.is_following ? (
                        <>
                          <UserCheck size={16} aria-hidden="true" />
                          <span>Takip ediliyor</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} aria-hidden="true" />
                          <span>Takip et</span>
                        </>
                      )}
                    </button>

                    {profile.is_following && (
                      <button
                        type="button"
                        className={s.btnIcon}
                        aria-label="Her paylaşımında bildir"
                        title="Her paylaşımında bildir"
                        aria-pressed={Boolean(profile.notify)}
                        disabled={followBusy}
                        onClick={handleToggleNotify}
                      >
                        <Bell size={18} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}

                {!profile.is_self && (
                  <div className={s.menuWrap} ref={menuRef}>
                    <button
                      type="button"
                      className={s.btnIcon}
                      aria-label="Diğer işlemler"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      disabled={relationBusy}
                      onClick={() => setMenuOpen((v) => !v)}
                    >
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </button>

                    {menuOpen && (
                      <div className={s.menuDropdown} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className={s.menuItem}
                          onClick={handleMuteToggle}
                        >
                          {profile.block === 'mute' ? (
                            <>
                              <Volume2 size={16} aria-hidden="true" />
                              <span>Sessize almayı kaldır</span>
                            </>
                          ) : (
                            <>
                              <VolumeX size={16} aria-hidden="true" />
                              <span>Sessize al</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className={`${s.menuItem} ${
                            profile.block === 'block' ? '' : s.menuItemDanger
                          }`}
                          onClick={handleBlockToggle}
                        >
                          <UserX size={16} aria-hidden="true" />
                          <span>
                            {profile.block === 'block' ? 'Engeli kaldır' : 'Engelle'}
                          </span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className={`${s.menuItem} ${s.menuItemDanger}`}
                          onClick={() => {
                            setMenuOpen(false);
                            setReportReason('');
                            setReportOpen(true);
                          }}
                        >
                          <Flag size={16} aria-hidden="true" />
                          <span>Profili şikâyet et</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={s.profileStatsRow}>
              <button type="button" onClick={() => setTab('shares')}><strong>{profile.item_count ?? 0}</strong> Paylaşım</button>
              {showFollowCounts && <>
                <button type="button" onClick={() => setTab('followers')}><strong>{profile.followers}</strong> Takipçi</button>
                <button type="button" onClick={() => setTab('following')}><strong>{profile.following}</strong> Takip</button>
              </>}
            </div>
          </section>

          {/* Sekmeler */}
          <div className={s.tabsBar} role="group" aria-label="Öğretmen profili bölümleri">
            <button
              type="button"
              className={s.tabBtn}
              aria-pressed={tab === 'shares'}
              onClick={() => setTab('shares')}
            >
              Paylaşımlar
            </button>
            <button
              type="button"
              className={s.tabBtn}
              aria-pressed={tab === 'posts'}
              onClick={() => setTab('posts')}
            >
              Yazılar
            </button>
            <button type="button" className={s.tabBtn} aria-pressed={tab === 'about'} onClick={() => setTab('about')}>Hakkında</button>
          </div>

          <div className={layout.profileLayout}>
          <div className={layout.profileFeed}>
          {tab === 'shares' && <div className={layout.viewControls}>
            <div className={base.viewSwitch} role="group" aria-label="Görünüm biçimi">
              <button type="button" className={base.viewSwitchBtn} aria-pressed={shareView === 'feed'} onClick={() => setShareView('feed')}>Akış</button>
              <button type="button" className={base.viewSwitchBtn} aria-pressed={shareView === 'list'} onClick={() => setShareView('list')}>Liste</button>
            </div>
          </div>}
          {tab === 'about' && <section className={layout.aboutPanel}>
            <h3>Hakkında</h3>
            {profile.bio && <p>{profile.bio}</p>}
            <p>{[profile.branch, profile.city, profile.school].filter(Boolean).join(' · ') || 'Henüz profil bilgisi eklenmemiş.'}</p>
          </section>}
          {(tab === 'followers' || tab === 'following') && <h3 className={layout.listTitle}>{tab === 'followers' ? 'Takipçiler' : 'Takip edilenler'}</h3>}
          {/* Paylaşımlar sekmesi */}
          {tab === 'shares' && (
            <>
              {sharesError && <Notice notice={{ kind: 'error', text: sharesError }} />}
              {sharesLoading && shares.length === 0 ? (
                <Spinner center label="Paylaşımlar yükleniyor…" />
              ) : shares.length === 0 ? (
                <section className={s.emptyBox}>
                  <h3>Henüz paylaşım yok</h3>
                  <p>Bu öğretmenin paylaştığı ders materyali bulunmuyor.</p>
                </section>
              ) : (
                <>
                  <div className={layout.postFeed}>
                    {shares.map((post) => <PostCard key={post.id} post={post} displayMode={shareView}
                      onOpenTeacher={onOpenTeacher} onOpenPreview={setPreviewItem}
                      onUpdated={(id, patch) => setShares(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))}
                      onDeleted={(id) => setShares(prev => prev.filter(p => p.id !== id))}
                    />)}
                  </div>
                  {sharesMore && (
                    <div className={s.moreRow}>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        disabled={sharesLoading}
                        onClick={() =>
                          loadShares(shares[shares.length - 1]?.created_at || null)
                        }
                      >
                        {sharesLoading ? 'Yükleniyor…' : 'Daha fazla'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Yazılar sekmesi */}
          {tab === 'posts' && (
            <>
              {postsError && <Notice notice={{ kind: 'error', text: postsError }} />}
              {postsLoading && posts.length === 0 ? (
                <Spinner center label="Yazılar yükleniyor…" />
              ) : posts.length === 0 ? (
                <section className={s.emptyBox}>
                  <h3>Henüz yazı veya bağlantı yok</h3>
                  <p>Bu öğretmenin paylaştığı kısa not veya bağlantı bulunmuyor.</p>
                </section>
              ) : (
                <>
                  <div className={layout.postFeed}>
                    {posts.map((post) => <PostCard key={post.id} post={post}
                      onOpenTeacher={onOpenTeacher} onOpenPreview={setPreviewItem}
                      onUpdated={(id, patch) => setPosts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))}
                      onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                    />)}
                  </div>

                  {postsMore && (
                    <div className={s.moreRow}>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        disabled={postsLoading}
                        onClick={() =>
                          loadPosts(postsCursor.current)
                        }
                      >
                        {postsLoading ? 'Yükleniyor…' : 'Daha fazla'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Takipçiler / Takip edilenler sekmeleri */}
          {(tab === 'followers' || tab === 'following') && showFollowCounts && (
            <>
              {followError && <Notice notice={{ kind: 'error', text: followError }} />}
              {followLoading && followItems.length === 0 ? (
                <Spinner center label="Liste yükleniyor…" />
              ) : followItems.length === 0 ? (
                <section className={s.emptyBox}>
                  <h3>
                    {tab === 'followers'
                      ? 'Henüz takipçisi yok'
                      : 'Henüz kimseyi takip etmiyor'}
                  </h3>
                  <p>Liste şu anda boş.</p>
                </section>
              ) : (
                <>
                  <ul className={s.followList}>
                    {followItems.map((card) => (
                      <li key={card.id} className={s.followRow}>
                        <TeacherByline card={card} onOpenTeacher={onOpenTeacher} />
                      </li>
                    ))}
                  </ul>

                  {followMore && (
                    <div className={s.moreRow}>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        disabled={followLoading}
                        onClick={() => loadFollowList(tab, followItems.length)}
                      >
                        {followLoading ? 'Yükleniyor…' : 'Daha fazla'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          </div>
          <aside className={layout.profileAside}>
            <section className={s.sideMenuCard} aria-label="Görünüm biçimi">
              <div className={s.sideMenuHeader}>
                <h3 className={s.asideTitle}>Görünüm</h3>
                <div className={base.viewSwitch} role="group" aria-label="Görünüm biçimi">
                  <button
                    type="button"
                    className={base.viewSwitchBtn}
                    aria-pressed={shareView === 'feed'}
                    onClick={() => {
                      setShareView('feed');
                      setTab('shares');
                    }}
                  >
                    Akış
                  </button>
                  <button
                    type="button"
                    className={base.viewSwitchBtn}
                    aria-pressed={shareView === 'list'}
                    onClick={() => {
                      setShareView('list');
                      setTab('shares');
                    }}
                  >
                    Liste
                  </button>
                </div>
              </div>
            </section>
            <section className={layout.aboutPanel}>
              <h3>Hakkında</h3>
              {profile.branch && <p>{profile.branch}</p>}
              {profile.city && <p>{profile.city}</p>}
              {profile.school && <p>{profile.school}</p>}
              {!profile.branch && !profile.city && !profile.school && <p>Henüz profil bilgisi eklenmemiş.</p>}
            </section>
            <section className={layout.aboutPanel}>
              <h3>Paylaşılan materyaller</h3>
              <button type="button" className={layout.materialLink} onClick={() => setTab('shares')}><Layers size={19} aria-hidden="true" />{profile.item_count ?? 0} materyal</button>
              <p>{profile.copy_total ?? 0} kopya · {profile.thanks_total ?? 0} teşekkür</p>
            </section>
          </aside>
          </div>
        </>
      )}

      {/* Önizleme penceresi */}
      {previewItem && (
        <CommunityPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onChanged={(patch) => {
            setPreviewItem((cur) => (cur ? { ...cur, ...patch } : null));
          }}
          onRemoved={() => {
            const removedId = previewItem.id;
            setPreviewItem(null);
            setShares((prev) => prev.filter((p) => p.item?.id !== removedId));
            setNotice({
              kind: 'ok',
              text: 'Paylaşım kaldırıldı. Daha önce kopyalayanların kopyaları duruyor.',
            });
          }}
          onCopied={(r) => {
            setPreviewItem(null);
            setNotice({
              kind: 'ok',
              text: r.boardId
                ? `Tahta Tahtalarım’a eklendi${
                    r.questionCount
                      ? `; ${r.questionCount} Mini Test sorusu soru bankanıza eklendi`
                      : ''
                  }.`
                : `${r.questionCount} soru soru bankanıza eklendi (“Topluluk” etiketiyle).`,
            });
          }}
        />
      )}

      {/* Şikâyet modalı */}
      {reportOpen && profile && (
        <div
          className={s.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby={reportTitleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !reportBusy) {
              e.preventDefault();
              setReportOpen(false);
            }
          }}
        >
          <form className={s.modalCard} onSubmit={handleReportSubmit}>
            <div className={s.modalHead}>
              <h3 id={reportTitleId}>Profili şikâyet et</h3>
              <button
                type="button"
                className={s.btnIcon}
                aria-label="Kapat"
                disabled={reportBusy}
                onClick={() => setReportOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className={s.field}>
              <label htmlFor={reportReasonId}>
                Şikâyet nedeninizi kısaca yazın (3–500 karakter)
              </label>
              <textarea
                id={reportReasonId}
                className={s.textarea}
                minLength={3}
                maxLength={500}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value.slice(0, 500))}
                placeholder="Neden uygunsuz olduğunu belirtin…"
                required
                autoFocus
              />
              <span className={s.charCount}>{reportReason.length} / 500</span>
            </div>

            <div className={s.modalActions}>
              <button
                type="button"
                className={s.btnSecondary}
                disabled={reportBusy}
                onClick={() => setReportOpen(false)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className={s.btnDanger}
                disabled={reportBusy || reportReason.trim().length < 3}
              >
                {reportBusy ? 'Gönderiliyor…' : 'Şikâyeti gönder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
