'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import {
  KIND_LABEL,
  PAGE_SIZE,
  SCOPE_LABEL,
  searchCommunity,
  type CommunityKind,
  type CommunityScope,
  type CommunitySummary,
} from '../../lib/communityData';
import {
  FEED_TAB_LABEL,
  followTeacher,
  followTopic,
  getFeed,
  getSuggestions,
  listMyTopics,
  thumbUrl,
  type FeedKindFilter,
  type FeedPost,
  type FeedTab,
  type TeacherCard,
} from '../../lib/communitySocialData';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import {
  Award,
  Bookmark,
  ChevronDown,
  Filter,
  HelpCircle,
  Layers,
  Plus,
  Search,
  Star,
  UserCheck,
  UserPlus,
  X,
} from '../icons';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import { CommunityPreview } from './CommunityPreview';
import { PostCard, feedPostToSummary } from './PostCard';
import { PostComposer } from './PostComposer';
import { TeacherByline } from './TeacherAvatar';
import s from './CommunitySocial.module.css';

type ViewMode = 'feed' | 'gallery';
type SpecialScope = Exclude<CommunityScope, 'all'> | null;

const VIEW_STORAGE_KEY = 'topluluk-gorunum';

function readStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'feed';
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'gallery' ? 'gallery' : 'feed';
  } catch {
    return 'feed';
  }
}

const KIND_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Hepsi' },
  { value: 'text', label: 'Yazı' },
  { value: 'link', label: 'Bağlantı' },
  { value: 'board', label: 'Tahta' },
  { value: 'questions', label: 'Soru seti' },
];

const SUBJECT_FILTER_OPTIONS = [{ value: '', label: 'Bütün branşlar' }, ...SUBJECT_OPTIONS];
const GRADE_FILTER_OPTIONS = [{ value: '', label: 'Bütün kademeler' }, ...GRADE_OPTIONS];
const TOPIC_GRADE_OPTIONS = [{ value: '', label: 'Tüm sınıflar' }, ...GRADE_OPTIONS];

const KIND_ICON: Record<CommunityKind, React.ComponentType<{ size?: number }>> = {
  board: Layers,
  questions: HelpCircle,
};

function subjectThumbClass(subject: string | null | undefined): string {
  const v = (subject || '').toLocaleLowerCase('tr-TR');
  if (v.includes('matematik')) return `${s.thumbBox} ${s.thumbMath}`;
  if (v.includes('türkçe') || v.includes('edebiyat')) return `${s.thumbBox} ${s.thumbTurkish}`;
  if (v.includes('fen') || v.includes('fizik') || v.includes('kimya') || v.includes('biyoloji')) {
    return `${s.thumbBox} ${s.thumbScience}`;
  }
  if (v.includes('sosyal') || v.includes('tarih') || v.includes('coğrafya') || v.includes('hayat')) {
    return `${s.thumbBox} ${s.thumbSocial}`;
  }
  return s.thumbBox;
}

export interface CommunityFeedProps {
  onOpenTeacher: (teacherId: string) => void;
  onOpenBoards?: () => void;
  onOpenQuestions?: () => void;
}

export function CommunityFeed({
  onOpenTeacher,
  onOpenBoards,
  onOpenQuestions,
}: CommunityFeedProps) {
  const kindSelectId = useId();
  const subjectSelectId = useId();
  const gradeSelectId = useId();
  const topicSubjectId = useId();
  const topicGradeId = useId();

  const [tab, setTab] = useState<FeedTab>('all');
  const [specialScope, setSpecialScope] = useState<SpecialScope>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredView);

  // Arama & Süzgeçler
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');

  // Akış / Galeri verisi (getFeed)
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  // Özel kapsam verisi (Editörün seçimi / Favorilerim / Paylaştıklarım -> searchCommunity)
  const [scopeItems, setScopeItems] = useState<CommunitySummary[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeMore, setScopeMore] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  // Öneriler & Konular
  const [suggestions, setSuggestions] = useState<TeacherCard[]>([]);
  const [emptySuggestions, setEmptySuggestions] = useState<TeacherCard[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  const [topics, setTopics] = useState<{ subject: string; grade: string }[]>([]);
  const [topicSubject, setTopicSubject] = useState(SUBJECT_OPTIONS[0] || 'Matematik');
  const [topicGrade, setTopicGrade] = useState('');
  const [topicBusy, setTopicBusy] = useState(false);
  const [mobileSideOpen, setMobileSideOpen] = useState(false);

  // Önizleme modalı
  const [previewItem, setPreviewItem] = useState<CommunitySummary | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const handleChangeView = (next: ViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Depolama kapalıysa yoksay
    }
  };

  // Yan sütun verileri: öneriler ve konular
  const loadSideData = useCallback(async () => {
    const [sugRes, topRes] = await Promise.all([getSuggestions(5), listMyTopics()]);
    if (sugRes.ok) setSuggestions(sugRes.data);
    if (topRes.ok) setTopics(topRes.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSideData();
  }, [loadSideData]);

  // Ana akış / galeri yüklemesi
  const effectiveFeedKind = (): FeedKindFilter => {
    if (viewMode === 'gallery') {
      if (kindFilter === 'board' || kindFilter === 'questions') return kindFilter;
      return 'item';
    }
    if (
      kindFilter === 'text' ||
      kindFilter === 'link' ||
      kindFilter === 'board' ||
      kindFilter === 'questions'
    ) {
      return kindFilter;
    }
    return null;
  };

  const loadFeed = useCallback(
    async (before?: string | null) => {
      if (specialScope) return;
      if (before) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      const k = effectiveFeedKind();
      const res = await getFeed({
        tab,
        kind: k,
        subject: subject || null,
        grade: grade || null,
        query: debounced || null,
        before: before || null,
        limit: 20,
      });

      if (before) setLoadingMore(false);
      else setLoading(false);

      if (!res.ok) {
        if (before) setNotice({ kind: 'error', text: res.error });
        else setError(res.error);
        return;
      }

      setPosts((prev) => {
        if (!before) return res.data;
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...res.data.filter((p) => !existingIds.has(p.id))];
      });
      setHasMore(res.data.length >= 20);

      // "Takip ettiklerim" sekmesi boşsa 8 öneri yükle
      if (!before && tab === 'following' && res.data.length === 0) {
        const emptySug = await getSuggestions(8);
        if (emptySug.ok) setEmptySuggestions(emptySug.data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, viewMode, kindFilter, subject, grade, debounced, specialScope]
  );

  // Özel kapsam yüklemesi (Editörün seçimi / Favorilerim / Paylaştıklarım)
  const loadScope = useCallback(
    async (offset = 0) => {
      if (!specialScope) return;
      if (offset > 0) setLoadingMore(true);
      else {
        setScopeLoading(true);
        setScopeError(null);
      }

      const itemKind: CommunityKind | null =
        kindFilter === 'board' || kindFilter === 'questions' ? kindFilter : null;

      const res = await searchCommunity({
        query: debounced,
        kind: itemKind,
        grade: grade || null,
        subject: subject || null,
        outcome: null,
        sort: 'new',
        scope: specialScope,
        offset,
      });

      if (offset > 0) setLoadingMore(false);
      else setScopeLoading(false);

      if (!res.ok) {
        if (offset > 0) setNotice({ kind: 'error', text: res.error });
        else setScopeError(res.error);
        return;
      }

      setScopeItems((prev) => {
        if (offset === 0) return res.data;
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...res.data.filter((x) => !ids.has(x.id))];
      });
      setScopeMore(res.data.length >= PAGE_SIZE);
    },
    [specialScope, debounced, kindFilter, grade, subject]
  );

  useEffect(() => {
    if (specialScope) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadScope(0);
    } else {
      void loadFeed(null);
    }
  }, [specialScope, loadFeed, loadScope]);

  const hasActiveFilters = Boolean(query.trim() || kindFilter || subject || grade);

  const clearFilters = () => {
    setQuery('');
    setDebounced('');
    setKindFilter('');
    setSubject('');
    setGrade('');
  };

  const handleFollowSuggestion = async (card: TeacherCard) => {
    if (followBusyId) return;
    const isNow = Boolean(followedIds[card.id]);
    const next = !isNow;
    setFollowBusyId(card.id);
    setFollowedIds((prev) => ({ ...prev, [card.id]: next }));
    const res = await followTeacher(card.id, next, true);
    setFollowBusyId(null);
    if (!res.ok) {
      setFollowedIds((prev) => ({ ...prev, [card.id]: isNow }));
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    if (tab === 'following') {
      void loadFeed(null);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicSubject || topicBusy) return;
    setTopicBusy(true);
    const res = await followTopic(topicSubject, topicGrade || null, true);
    setTopicBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setTopics((prev) => {
      const exists = prev.some((t) => t.subject === topicSubject && t.grade === topicGrade);
      if (exists) return prev;
      return [...prev, { subject: topicSubject, grade: topicGrade }];
    });
    if (tab === 'following') {
      void loadFeed(null);
    }
  };

  const handleRemoveTopic = async (t: { subject: string; grade: string }) => {
    if (topicBusy) return;
    setTopicBusy(true);
    const res = await followTopic(t.subject, t.grade || null, false);
    setTopicBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setTopics((prev) =>
      prev.filter((x) => !(x.subject === t.subject && x.grade === t.grade))
    );
  };

  const renderSideWidgets = (suffix: string) => (
    <>
      <section className={s.asideCard} aria-label="Takip önerileri">
        <h3 className={s.asideTitle}>Takip önerileri</h3>
        {suggestions.length === 0 ? (
          <p className={s.privacyNote}>Şu an yeni takip önerisi yok.</p>
        ) : (
          <ul className={s.suggestionList}>
            {suggestions.map((c) => {
              const isFollowing = Boolean(followedIds[c.id]);
              return (
                <li key={c.id} className={s.suggestionRow}>
                  <TeacherByline card={c} size={32} onOpenTeacher={onOpenTeacher} />
                  <button
                    type="button"
                    className={isFollowing ? s.btnSecondary : s.btnPrimary}
                    aria-pressed={isFollowing}
                    disabled={followBusyId === c.id}
                    onClick={() => handleFollowSuggestion(c)}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={15} aria-hidden="true" />
                        <span>Takipte</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} aria-hidden="true" />
                        <span>Takip et</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={s.asideCard} aria-label="Takip ettiğin konular">
        <h3 className={s.asideTitle}>Takip ettiğin konular</h3>
        {topics.length === 0 ? (
          <p className={s.privacyNote}>
            İlgilendiğin ders ve sınıf düzeylerini ekleyerek &ldquo;Takip ettiklerim&rdquo;
            akışında görebilirsin.
          </p>
        ) : (
          <ul className={s.topicChips}>
            {topics.map((t) => {
              const key = `${t.subject}__${t.grade}`;
              const label = t.grade ? `${t.subject} · ${t.grade}` : `${t.subject} · Tüm sınıflar`;
              return (
                <li key={key} className={s.topicChip}>
                  <span>{label}</span>
                  <button
                    type="button"
                    className={s.topicRemoveBtn}
                    aria-label={`${label} konusunu çıkar`}
                    disabled={topicBusy}
                    onClick={() => handleRemoveTopic(t)}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form className={s.topicAddForm} onSubmit={handleAddTopic}>
          <div className={s.field}>
            <label htmlFor={`${topicSubjectId}-${suffix}`}>Ders</label>
            <CustomSelect
              id={`${topicSubjectId}-${suffix}`}
              value={topicSubject}
              options={SUBJECT_OPTIONS}
              onChange={setTopicSubject}
            />
          </div>
          <div className={s.field}>
            <label htmlFor={`${topicGradeId}-${suffix}`}>Sınıf</label>
            <CustomSelect
              id={`${topicGradeId}-${suffix}`}
              value={topicGrade}
              options={TOPIC_GRADE_OPTIONS}
              onChange={setTopicGrade}
            />
          </div>
          <button type="submit" className={s.btnSecondary} disabled={topicBusy}>
            <Plus size={16} aria-hidden="true" />
            <span>Konu ekle</span>
          </button>
        </form>
      </section>
    </>
  );

  return (
    <div className={s.hubWrap}>
      {/* Üst sekmeler ve Akış / Galeri anahtarı */}
      <div className={s.feedTopBar}>
        <div className={s.tabsBar} role="tablist" aria-label="Topluluk akışı sekmeleri">
          {(Object.keys(FEED_TAB_LABEL) as FeedTab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={s.tabBtn}
              aria-pressed={specialScope === null && tab === t}
              onClick={() => {
                setSpecialScope(null);
                setTab(t);
              }}
            >
              {FEED_TAB_LABEL[t]}
            </button>
          ))}

          <button
            type="button"
            className={s.tabBtn}
            aria-pressed={specialScope === 'featured'}
            onClick={() => setSpecialScope('featured')}
          >
            <Award size={15} aria-hidden="true" />{' '}
            <span>{SCOPE_LABEL.featured}</span>
          </button>

          <button
            type="button"
            className={s.tabBtn}
            aria-pressed={specialScope === 'favorites'}
            onClick={() => setSpecialScope('favorites')}
          >
            <Bookmark size={15} aria-hidden="true" />{' '}
            <span>{SCOPE_LABEL.favorites}</span>
          </button>

          <button
            type="button"
            className={s.tabBtn}
            aria-pressed={specialScope === 'mine'}
            onClick={() => setSpecialScope('mine')}
          >
            {SCOPE_LABEL.mine}
          </button>
        </div>

        {specialScope === null && (
          <div className={s.viewSwitch} role="group" aria-label="Görünüm biçimi">
            <button
              type="button"
              className={s.viewSwitchBtn}
              aria-pressed={viewMode === 'feed'}
              onClick={() => handleChangeView('feed')}
            >
              Akış
            </button>
            <button
              type="button"
              className={s.viewSwitchBtn}
              aria-pressed={viewMode === 'gallery'}
              onClick={() => handleChangeView('gallery')}
            >
              Galeri
            </button>
          </div>
        )}
      </div>

      {/* Arama ve Süz çubuğu */}
      <div className={s.searchBarWrap}>
        <div className={s.searchBarRow}>
          <label className={s.searchInputLabel}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              className={s.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Başlık, konu, etiket ya da öğretmen ara…"
              aria-label="Toplulukta ara"
            />
          </label>

          <button
            type="button"
            className={s.btnSecondary}
            aria-expanded={filterOpen}
            aria-pressed={filterOpen || Boolean(kindFilter || subject || grade)}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter size={16} aria-hidden="true" />
            <span>Süz</span>
          </button>

          {hasActiveFilters && (
            <button type="button" className={s.btnSecondary} onClick={clearFilters}>
              <X size={16} aria-hidden="true" />
              <span>Temizle</span>
            </button>
          )}
        </div>

        {filterOpen && (
          <div className={s.filterDrawer}>
            <div className={s.field}>
              <label htmlFor={kindSelectId}>Tür</label>
              <CustomSelect
                id={kindSelectId}
                value={kindFilter}
                options={KIND_FILTER_OPTIONS}
                onChange={setKindFilter}
              />
            </div>
            <div className={s.field}>
              <label htmlFor={subjectSelectId}>Ders</label>
              <CustomSelect
                id={subjectSelectId}
                value={subject}
                options={SUBJECT_FILTER_OPTIONS}
                onChange={setSubject}
              />
            </div>
            <div className={s.field}>
              <label htmlFor={gradeSelectId}>Sınıf</label>
              <CustomSelect
                id={gradeSelectId}
                value={grade}
                options={GRADE_FILTER_OPTIONS}
                onChange={setGrade}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobilde katlanabilir Öneriler & Konular */}
      <div className={s.mobileSideCollapse}>
        <button
          type="button"
          className={s.mobileSideToggle}
          aria-expanded={mobileSideOpen}
          onClick={() => setMobileSideOpen((v) => !v)}
        >
          <span>Takip önerileri ve konular ({topics.length})</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
        {mobileSideOpen && <div className={s.feedMain}>{renderSideWidgets('mobile')}</div>}
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={s.feedLayout}>
        <div className={s.feedMain}>
          {/* Paylaşım kutusu (yalnızca ana sekmelerde) */}
          {specialScope === null && (
            <PostComposer
              onCreated={(newPost) => {
                setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
              }}
              onOpenBoards={onOpenBoards}
              onOpenQuestions={onOpenQuestions}
            />
          )}

          {/* Özel kapsam görünümü (Editörün seçimi / Favorilerim / Paylaştıklarım) */}
          {specialScope !== null ? (
            scopeError ? (
              <div className={s.emptyBox}>
                <Notice notice={{ kind: 'error', text: scopeError }} />
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => loadScope(0)}
                >
                  Yeniden dene
                </button>
              </div>
            ) : scopeLoading ? (
              <Spinner center label="İçerikler yükleniyor…" />
            ) : scopeItems.length === 0 ? (
              <section className={s.emptyBox}>
                <h3>
                  {specialScope === 'favorites'
                    ? 'Henüz favoriniz yok'
                    : specialScope === 'mine'
                    ? 'Henüz paylaştığınız materyal yok'
                    : 'Henüz editörün seçimi yok'}
                </h3>
                <p>
                  {hasActiveFilters
                    ? 'Arama süzgeçlerini temizleyerek tekrar deneyin.'
                    : 'Beğendiğiniz tahta ve soru setlerini kaydedebilir veya kendi içeriklerinizi paylaşabilirsiniz.'}
                </p>
              </section>
            ) : (
              <>
                <div className={s.galleryGrid}>
                  {scopeItems.map((x) => {
                    const Icon = KIND_ICON[x.kind] || Layers;
                    const subLine = [x.subject, x.grade].filter(Boolean).join(' · ');
                    const countText =
                      x.kind === 'board'
                        ? `${x.page_count} sayfa`
                        : `${x.question_count} soru`;

                    return (
                      <div key={x.id} className={s.galleryCard}>
                        <button
                          type="button"
                          className={subjectThumbClass(x.subject)}
                          style={{ border: 0, cursor: 'pointer' }}
                          onClick={() => setPreviewItem(x)}
                          aria-label={`${x.title} önizle`}
                        >
                          <Icon size={28} />
                        </button>
                        <h3 className={s.galleryTitle}>{x.title}</h3>
                        <p className={s.galleryMeta}>
                          {[subLine || KIND_LABEL[x.kind], countText]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <div className={s.itemBadges}>
                          <button
                            type="button"
                            className={s.cardAuthorBtn}
                            onClick={() => onOpenTeacher(x.author_id)}
                          >
                            {x.author_name}
                          </button>
                          <span className={s.itemBadge}>
                            <Star size={12} aria-hidden="true" />
                            <span>
                              {x.rating_avg != null
                                ? x.rating_avg.toLocaleString('tr-TR')
                                : '—'}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          className={s.btnSecondary}
                          onClick={() => setPreviewItem(x)}
                        >
                          Önizle
                        </button>
                      </div>
                    );
                  })}
                </div>

                {scopeMore && (
                  <div className={s.moreRow}>
                    <button
                      type="button"
                      className={s.btnSecondary}
                      disabled={loadingMore}
                      onClick={() => loadScope(scopeItems.length)}
                    >
                      {loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
                    </button>
                  </div>
                )}
              </>
            )
          ) : error ? (
            <div className={s.emptyBox}>
              <Notice notice={{ kind: 'error', text: error }} />
              <button
                type="button"
                className={s.btnSecondary}
                onClick={() => loadFeed(null)}
              >
                Yeniden dene
              </button>
            </div>
          ) : loading ? (
            <Spinner center label="Topluluk akışı yükleniyor…" />
          ) : posts.length === 0 ? (
            tab === 'following' && !hasActiveFilters ? (
              <section className={s.emptyBox}>
                <h3>Henüz kimseyi takip etmiyorsun</h3>
                <p>
                  Meslektaşlarını veya ilgilendiğin ders konularını takip ederek paylaşımlarını
                  burada görebilirsin.
                </p>
                {emptySuggestions.length > 0 && (
                  <div className={s.suggestionsEmptyGrid}>
                    {emptySuggestions.map((c) => {
                      const isFollowing = Boolean(followedIds[c.id]);
                      return (
                        <div key={c.id} className={s.suggestionCard}>
                          <TeacherByline
                            card={c}
                            size={40}
                            onOpenTeacher={onOpenTeacher}
                          />
                          <button
                            type="button"
                            className={isFollowing ? s.btnSecondary : s.btnPrimary}
                            aria-pressed={isFollowing}
                            disabled={followBusyId === c.id}
                            onClick={() => handleFollowSuggestion(c)}
                          >
                            {isFollowing ? 'Takip ediliyor' : 'Takip et'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className={s.emptyBox}>
                <h3>Gösterilecek gönderi bulunamadı</h3>
                <p>
                  {hasActiveFilters
                    ? 'Arama süzgeçlerini gevşetin ya da temizleyin.'
                    : 'İlk paylaşımı yukarıdaki kutudan siz yapabilirsiniz.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className={s.btnSecondary}
                    onClick={clearFilters}
                  >
                    Süzgeçleri temizle
                  </button>
                )}
              </section>
            )
          ) : viewMode === 'gallery' ? (
            <>
              <div className={s.galleryGrid}>
                {posts.map((post) => {
                  const it = post.item;
                  if (!it) return null;
                  const tUrl = thumbUrl(it.thumb_path);
                  const showThumb = Boolean(
                    it.kind === 'board' && tUrl && !failedThumbs[it.id]
                  );
                  const Icon = KIND_ICON[it.kind] || Layers;
                  const subLine = [it.subject, it.grade].filter(Boolean).join(' · ');
                  const countText =
                    it.kind === 'board'
                      ? `${it.page_count} sayfa`
                      : `${it.question_count} soru`;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      className={s.galleryCard}
                      onClick={() => {
                        const sum = feedPostToSummary(post);
                        if (sum) setPreviewItem(sum);
                      }}
                    >
                      <div className={subjectThumbClass(it.subject)}>
                        {showThumb && tUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tUrl}
                            alt=""
                            className={s.thumbImg}
                            loading="lazy"
                            onError={() =>
                              setFailedThumbs((prev) => ({ ...prev, [it.id]: true }))
                            }
                          />
                        ) : (
                          <Icon size={28} />
                        )}
                      </div>
                      <h3 className={s.galleryTitle}>{it.title}</h3>
                      <p className={s.galleryMeta}>
                        {[subLine || KIND_LABEL[it.kind], countText]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <span className={s.bylineMeta}>{post.author.name}</span>
                    </button>
                  );
                })}
              </div>

              {hasMore && (
                <div className={s.moreRow}>
                  <button
                    type="button"
                    className={s.btnSecondary}
                    disabled={loadingMore}
                    onClick={() => loadFeed(posts[posts.length - 1]?.created_at || null)}
                  >
                    {loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpenTeacher={onOpenTeacher}
                  onOpenPreview={(sum) => setPreviewItem(sum)}
                  onUpdated={(postId, patch) => {
                    setPosts((prev) =>
                      prev.map((p) => (p.id === postId ? { ...p, ...patch } : p))
                    );
                  }}
                  onDeleted={(postId) => {
                    setPosts((prev) => prev.filter((p) => p.id !== postId));
                  }}
                  onMutedAuthor={(authorId) => {
                    setPosts((prev) => prev.filter((p) => p.author.id !== authorId));
                  }}
                />
              ))}

              {hasMore && (
                <div className={s.moreRow}>
                  <button
                    type="button"
                    className={s.btnSecondary}
                    disabled={loadingMore}
                    onClick={() => loadFeed(posts[posts.length - 1]?.created_at || null)}
                  >
                    {loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Masaüstü sağ kenar çubuğu */}
        <aside className={s.feedAside}>{renderSideWidgets('desktop')}</aside>
      </div>

      {/* Materyal Önizleme Modalı */}
      {previewItem && (
        <CommunityPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onChanged={(patch) => {
            setPreviewItem((cur) => (cur ? { ...cur, ...patch } : null));
            setPosts((prev) =>
              prev.map((p) =>
                p.item && p.item.id === previewItem.id
                  ? {
                      ...p,
                      item: {
                        ...p.item,
                        copy_count: patch.copy_count ?? p.item.copy_count,
                        rating_avg:
                          patch.rating_avg !== undefined
                            ? patch.rating_avg
                            : p.item.rating_avg,
                        rating_count: patch.rating_count ?? p.item.rating_count,
                        is_favorite: patch.is_favorite ?? p.item.is_favorite,
                      },
                    }
                  : p
              )
            );
            setScopeItems((prev) =>
              prev.map((x) => (x.id === previewItem.id ? { ...x, ...patch } : x))
            );
          }}
          onRemoved={() => {
            const removedId = previewItem.id;
            setPreviewItem(null);
            setPosts((prev) => prev.filter((p) => p.item?.id !== removedId));
            setScopeItems((prev) => prev.filter((x) => x.id !== removedId));
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
    </div>
  );
}
