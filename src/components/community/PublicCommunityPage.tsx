'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  getPublicFacets,
  getPublicGallery,
  getPublicItem,
  getTeacherProfile,
  thumbUrl,
  type PublicItem,
  type PublicSort,
  type TeacherProfile,
} from '../../lib/communitySocialData';
import { restoreSession } from '../../lib/supabaseClient';
import { SiteHeader } from '../site/SiteHeader';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Copy,
  Globe,
  HeartHandshake,
  HelpCircle,
  Layers,
  LogIn,
  MessageSquare,

  Search,
  Star,
  UserPlus,
  X,
} from '../icons';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import { SiteFooter } from '../site/SiteFooter';

import { TeacherAvatar } from './TeacherAvatar';
import s from './PublicCommunity.module.css';

const PAGE_SIZE = 24;

const KIND_TABS: { value: '' | 'board' | 'questions'; label: string }[] = [
  { value: '', label: 'Hepsi' },
  { value: 'board', label: 'Tahta' },
  { value: 'questions', label: 'Soru seti' },
];

const SORT_OPTIONS: { value: PublicSort; label: string }[] = [
  { value: 'popular', label: 'Popüler' },
  { value: 'new', label: 'En yeni' },
  { value: 'rating', label: 'En yüksek puan' },
];

function subjectThumbClass(subject: string | null | undefined): string {
  const v = (subject || '').toLocaleLowerCase('tr-TR');
  if (v.includes('matematik')) return `${s.thumbWrap} ${s.thumbMath}`;
  if (v.includes('türkçe') || v.includes('edebiyat')) return `${s.thumbWrap} ${s.thumbTurkish}`;
  if (v.includes('fen') || v.includes('fizik') || v.includes('kimya') || v.includes('biyoloji')) {
    return `${s.thumbWrap} ${s.thumbScience}`;
  }
  if (v.includes('sosyal') || v.includes('tarih') || v.includes('coğrafya') || v.includes('hayat')) {
    return `${s.thumbWrap} ${s.thumbSocial}`;
  }
  return s.thumbWrap;
}

export function PublicCommunityPage() {
  const subjectSelectId = useId();
  const gradeSelectId = useId();
  const sortSelectId = useId();

  const filtersId = useId();

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Oturum kontrolü: yalnızca giriş yapmış öğretmene "Topluluğa git" düğmesi göstermek için
  const [hasTeacherSession, setHasTeacherSession] = useState(false);

  useEffect(() => {
    let alive = true;
    restoreSession()
      .then((user) => {
        if (!alive || !user) return;
        if (user.role === 'ogretmen' || user.role === 'admin') {
          setHasTeacherSession(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Facet seçenekleri (ders ve sınıf listesi)
  const [facetSubjects, setFacetSubjects] = useState<string[]>([]);
  const [facetGrades, setFacetGrades] = useState<string[]>([]);
  const [facetTotal, setFacetTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getPublicFacets().then((res) => {
      if (!alive || !res.ok) return;
      setFacetSubjects(res.data.subjects || []);
      setFacetGrades(res.data.grades || []);
      setFacetTotal(res.data.total ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Arama, tür, ders, sınıf ve sıralama
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<'' | 'board' | 'questions'>('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [sort, setSort] = useState<PublicSort>('popular');

  // Seçili yazar profili (yazar adına tıklanınca)
  const [selectedAuthor, setSelectedAuthor] = useState<TeacherProfile | null>(null);
  const [authorBusyId, setAuthorBusyId] = useState<string | null>(null);
  const [unavailableAuthors, setUnavailableAuthors] = useState<Record<string, boolean>>({});

  // Galeri listesi
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  // Önizleme Modalı
  const [previewItem, setPreviewItem] = useState<PublicItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const itemId = new URLSearchParams(window.location.search).get('materyal');
    if (!itemId) return;
    let cancelled = false;
    getPublicItem(itemId).then((result) => {
      if (!cancelled && result.ok && result.data) setPreviewItem(result.data);
    }).catch(() => { /* The gallery remains available if the shared item is unavailable. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadGallery = useCallback(
    async (offset = 0) => {
      if (offset > 0) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const res = await getPublicGallery({
        query: debounced || undefined,
        kind: kind || null,
        subject: subject || null,
        grade: grade || null,
        authorId: selectedAuthor?.id || null,
        sort,
        limit: PAGE_SIZE,
        offset,
      });

      if (offset > 0) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }

      if (!res.ok) {
        if (offset > 0) setNotice({ kind: 'error', text: res.error });
        else setError(res.error);
        return;
      }

      setItems((prev) => {
        if (offset === 0) return res.data;
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.data.filter((x) => !seen.has(x.id))];
      });
      setHasMore(res.data.length >= PAGE_SIZE);
    },
    [debounced, kind, subject, grade, selectedAuthor?.id, sort]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGallery(0);
  }, [loadGallery]);

  useEffect(() => {
    if (!previewItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewItem]);

  const handleOpenPreview = async (item: PublicItem) => {
    setPreviewItem(item);
    setPreviewLoading(true);
    const res = await getPublicItem(item.id);
    setPreviewLoading(false);
    if (res.ok && res.data) {
      setPreviewItem(res.data);
    }
  };

  const handleSelectAuthor = async (authorId: string) => {
    if (!authorId || authorBusyId || unavailableAuthors[authorId]) return;
    setAuthorBusyId(authorId);
    const res = await getTeacherProfile(authorId);
    setAuthorBusyId(null);

    if (!res.ok || !res.data) {
      setUnavailableAuthors((prev) => ({ ...prev, [authorId]: true }));
      return;
    }

    setPreviewItem(null);
    setSelectedAuthor(res.data);
    window.scrollTo({ top: 0 });
  };

  const hasActiveFilters = Boolean(
    query.trim() || kind || subject || grade || selectedAuthor
  );

  const clearFilters = () => {
    setQuery('');
    setDebounced('');
    setKind('');
    setSubject('');
    setGrade('');
    setSelectedAuthor(null);
  };

  const subjectOptions = [
    { value: '', label: 'Bütün branşlar' },
    ...facetSubjects.map((sub) => ({ value: sub, label: sub })),
  ];

  const gradeOptions = [
    { value: '', label: 'Bütün sınıflar' },
    ...facetGrades.map((gr) => ({ value: gr, label: gr })),
  ];

  return (
    <div className={s.page}>
      <SiteHeader action={hasTeacherSession ? (
        <Link className={s.btnPrimary} href="/giris?sayfa=topluluk">
          <Globe size={17} aria-hidden="true" />
          <span>Topluluğa git</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : undefined} />

      <main className={s.main}>
        <div className={s.introRow}>
          <div>
            <h1 className={s.pageTitle}>Öğretmen Topluluğu</h1>
            <p className={s.pageSubtitle}>
              Öğretmenlerin hazırlayıp paylaştığı etkileşimli ders tahtalarını ve soru
              setlerini inceleyin.
            </p>
          </div>
          {facetTotal !== null && facetTotal > 0 && (
            <span className={s.totalBadge}>
              {facetTotal.toLocaleString('tr-TR')} herkese açık materyal
            </span>
          )}
        </div>

        <div className={s.contentLayout}>
          {/* Sol Alan: Galeri */}
          <div className={s.galleryArea}>

        {/* Seçili öğretmen küçük profil kartı */}
        {selectedAuthor && (
          <section className={s.authorBanner} aria-label="Öğretmen profili">
            <div className={s.authorBannerTop}>
              <div className={s.authorIdentity}>
                <TeacherAvatar
                  card={{
                    name: selectedAuthor.name,
                    avatar_path: selectedAuthor.avatar_path,
                  }}
                  size={48}
                />
                <div className={s.authorText}>
                  <h2 className={s.authorName}>{selectedAuthor.name}</h2>
                  {[selectedAuthor.branch, selectedAuthor.city]
                    .filter(Boolean)
                    .join(' · ') && (
                    <span className={s.authorMeta}>
                      {[selectedAuthor.branch, selectedAuthor.city]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                  {selectedAuthor.followers != null && (
                    <span className={s.authorMeta}>
                      {selectedAuthor.followers.toLocaleString('tr-TR')} takipçi
                    </span>
                  )}
                </div>
              </div>

              <div className={s.authorActions}>
                <Link className={s.btnPrimary} href="/giris?sayfa=topluluk">
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Takip et</span>
                </Link>
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => setSelectedAuthor(null)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Tüm paylaşımlara dön</span>
                </button>
              </div>
            </div>

            {selectedAuthor.bio && <p className={s.authorBio}>{selectedAuthor.bio}</p>}
          </section>
        )}

        <Notice notice={notice} onClose={() => setNotice(null)} />

        {/* Galeri Listesi */}
        {error ? (
          <section className={s.emptyBox}>
            <Notice notice={{ kind: 'error', text: error }} />
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => loadGallery(0)}
            >
              Yeniden dene
            </button>
          </section>
        ) : loading ? (
          <Spinner center label="Paylaşımlar yükleniyor…" />
        ) : items.length === 0 ? (
          <section className={s.emptyBox}>
            <h2>{hasActiveFilters ? 'Aramanıza uyan paylaşım yok' : 'Henüz herkese açık paylaşım yok'}</h2>
            <p>
              {hasActiveFilters
                ? 'Süzgeçleri değiştirip yeniden deneyin.'
                : 'Öğretmenlerin hazırlayıp paylaştığı tahtalar ve soru setleri burada görünecek. Siz de öğretmenseniz ücretsiz kayıt olup ilk paylaşımı yapabilirsiniz.'}
            </p>
            <div className={s.emptyActions}>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={clearFilters}
                >
                  Süzgeçleri temizle
                </button>
              )}
              <Link className={s.btnSecondary} href="/giris">
                <LogIn size={16} aria-hidden="true" />
                <span>Giriş yap</span>
              </Link>
              <Link className={s.btnPrimary} href="/giris#kayit">
                <UserPlus size={16} aria-hidden="true" />
                <span>Ücretsiz kayıt ol</span>
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className={s.galleryGrid}>
              {items.map((item) => {
                const tUrl = thumbUrl(item.thumb_path);
                const showThumb = Boolean(tUrl && !failedThumbs[item.id]);
                const Icon = item.kind === 'board' ? Layers : HelpCircle;
                const kindLabel = item.kind === 'board' ? 'Tahta' : 'Soru seti';
                const countLabel =
                  item.kind === 'board'
                    ? `${item.page_count} sayfa`
                    : `${item.question_count} soru`;
                const subLine = [
                  item.subject,
                  item.grade,
                  countLabel,
                ]
                  .filter(Boolean)
                  .join(' · ');

                const canClickAuthor = Boolean(
                  item.author.id &&
                    item.author.profile_visible &&
                    !unavailableAuthors[item.author.id]
                );

                return (
                  <article key={item.id} className={s.card}>
                    <button
                      type="button"
                      className={s.cardOpenBtn}
                      onClick={() => void handleOpenPreview(item)}
                      aria-label={`${item.title} önizlemesini aç`}
                    >
                      <div className={subjectThumbClass(item.subject)}>
                        {showThumb && tUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tUrl}
                            alt={item.title}
                            className={s.thumbImg}
                            loading="lazy"
                            onError={() =>
                              setFailedThumbs((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                          />
                        ) : (
                          <div className={s.thumbPlaceholder}>
                            <Icon size={28} aria-hidden="true" />
                            <span className={s.thumbKindBadge}>{kindLabel}</span>
                          </div>
                        )}

                        {item.featured && (
                          <span className={s.featuredRibbon}>
                            <Award size={12} aria-hidden="true" />
                            <span>Editörün seçimi</span>
                          </span>
                        )}
                      </div>

                      <h2 className={s.cardTitle}>{item.title}</h2>
                      <p className={s.cardSub}>{subLine}</p>
                    </button>

                    <div className={s.cardFooter}>
                      {canClickAuthor ? (
                        <button
                          type="button"
                          className={s.authorChipBtn}
                          disabled={authorBusyId === item.author.id}
                          onClick={() => void handleSelectAuthor(item.author.id)}
                          aria-label={`${item.author.name} profilini göster`}
                        >
                          <TeacherAvatar card={item.author} size={32} />
                          <span className={s.authorChipName}>{item.author.name}</span>
                        </button>
                      ) : (
                        <div className={s.authorChipStatic}>
                          <TeacherAvatar card={item.author} size={32} />
                          <span className={s.authorChipName}>{item.author.name}</span>
                        </div>
                      )}

                      <div className={s.statsRow}>
                        <span
                          className={s.statItem}
                          aria-label={`${item.thanks_count} teşekkür`}
                        >
                          <HeartHandshake size={13} aria-hidden="true" />
                          <span>{item.thanks_count}</span>
                        </span>
                        <span
                          className={s.statItem}
                          aria-label={`${item.copy_count} kopyalama`}
                        >
                          <Copy size={13} aria-hidden="true" />
                          <span>{item.copy_count}</span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className={s.moreRow}>
                <button
                  type="button"
                  className={s.btnSecondary}
                  disabled={loadingMore}
                  onClick={() => loadGallery(items.length)}
                >
                  {loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
                </button>
              </div>
            )}
          </>
        )}
          </div>

          {/* Sağ Kenar Çubuğu: Süzgeçler ve Oturum Bilgisi */}
          <aside className={s.sidebar} aria-label="Arama ve süzgeçler">
            <section className={s.filterPanel} aria-label="Süzgeç paneli">
              <div className={s.searchRow}>
                <label className={s.searchInputLabel}>
                  <Search size={18} aria-hidden="true" />
                  <input
                    type="search"
                    className={s.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Başlık, konu ya da ders ara…"
                    aria-label="Herkese açık içeriklerde ara"
                  />
                </label>

                <div className={s.field}>
                  <span className={s.fieldLabel}>İçerik türü</span>
                  <div className={s.kindTabs} role="group" aria-label="İçerik türü">
                    {KIND_TABS.map((t) => (
                      <button
                        key={t.value || 'all'}
                        type="button"
                        className={s.kindTabBtn}
                        aria-pressed={kind === t.value}
                        onClick={() => setKind(t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="button" className={`${s.btnSecondary} ${s.mobileFilterToggle}`} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(!filtersOpen)}>
                <span>Filtreler ve sıralama{subject || grade || sort !== 'popular' ? ' · Seçili' : ''}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              <div id={filtersId} className={`${s.selectsRow} ${filtersOpen ? s.filtersOpen : ''}`}>
                <div className={s.field}>
                  <label htmlFor={subjectSelectId} className={s.fieldLabel}>
                    Ders
                  </label>
                  <CustomSelect
                    id={subjectSelectId}
                    value={subject}
                    options={subjectOptions}
                    onChange={setSubject}
                  />
                </div>

                <div className={s.field}>
                  <label htmlFor={gradeSelectId} className={s.fieldLabel}>
                    Sınıf
                  </label>
                  <CustomSelect
                    id={gradeSelectId}
                    value={grade}
                    options={gradeOptions}
                    onChange={setGrade}
                  />
                </div>

                <div className={s.field}>
                  <label htmlFor={sortSelectId} className={s.fieldLabel}>
                    Sıralama
                  </label>
                  <CustomSelect
                    id={sortSelectId}
                    value={sort}
                    options={SORT_OPTIONS}
                    onChange={(val) => setSort(val as PublicSort)}
                  />
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className={s.btnClearFilters}
                    onClick={clearFilters}
                  >
                    <X size={16} aria-hidden="true" />
                    <span>Süzgeçleri temizle</span>
                  </button>
                )}
              </div>
            </section>

            {/* Oturum Yan Kartı */}
            <div className={s.sessionCard}>
              {hasTeacherSession ? (
                <div className={s.sessionCallout}>
                  <div className={s.sessionCalloutHead}>
                    <span className={s.sessionDot} aria-hidden="true" />
                    <span className={s.sessionTitle}>Öğretmen oturumu açık</span>
                  </div>
                  <p className={s.sessionCalloutText}>
                    Topluluk paneline geçerek tahtalarınızı yönetebilir ve paylaşımları kopyalayabilirsiniz.
                  </p>
                  <Link className={s.btnPrimary} href="/giris?sayfa=topluluk">
                    <Globe size={16} aria-hidden="true" />
                    <span>Topluluk paneline git</span>
                  </Link>
                </div>
              ) : (
                <div className={s.sessionCallout}>
                  <span className={s.sessionTitle}>Öğretmen misiniz?</span>
                  <p className={s.sessionCalloutText}>
                    Hazırladığınız materyalleri paylaşmak ve diğer öğretmenlerle etkileşimde bulunmak için giriş yapın.
                  </p>
                  <Link className={s.btnSecondary} href="/giris">
                    <LogIn size={16} aria-hidden="true" />
                    <span>Öğretmen girişi</span>
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Önizleme Modalı */}
      {previewItem && (
        <div
          className={s.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-preview-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewItem(null);
          }}
        >
          <div className={s.modalCard}>
            <div className={s.modalHeader}>
              <h2 id="public-preview-title" className={s.modalTitle}>
                {previewItem.title}
              </h2>
              <button
                type="button"
                className={s.closeBtn}
                aria-label="Önizlemeyi kapat"
                onClick={() => setPreviewItem(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {(() => {
              const tUrl = thumbUrl(previewItem.thumb_path);
              const showThumb = Boolean(tUrl && !failedThumbs[previewItem.id]);
              const Icon = previewItem.kind === 'board' ? Layers : HelpCircle;
              const kindLabel =
                previewItem.kind === 'board' ? 'Tahta' : 'Soru seti';

              return (
                <div
                  className={`${subjectThumbClass(previewItem.subject)} ${s.modalThumbWrap}`}
                >
                  {showThumb && tUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tUrl}
                      alt={previewItem.title}
                      className={s.thumbImg}
                      onError={() =>
                        setFailedThumbs((prev) => ({
                          ...prev,
                          [previewItem.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className={s.thumbPlaceholder}>
                      <Icon size={36} aria-hidden="true" />
                      <span className={s.thumbKindBadge}>{kindLabel}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className={s.modalBadges}>
              <span className={`${s.badge} ${s.badgePrimary}`}>
                {previewItem.kind === 'board' ? 'Tahta' : 'Soru seti'}
              </span>
              {previewItem.featured && (
                <span className={s.badge}>
                  <Award size={13} aria-hidden="true" />
                  <span>Editörün seçimi</span>
                </span>
              )}
              {previewItem.subject && (
                <span className={s.badge}>{previewItem.subject}</span>
              )}
              {previewItem.grade && (
                <span className={s.badge}>{previewItem.grade}</span>
              )}
              <span className={s.badge}>
                {previewItem.kind === 'board'
                  ? `${previewItem.page_count} sayfa`
                  : `${previewItem.question_count} soru`}
              </span>
              <span className={s.badge}>
                <HeartHandshake size={13} aria-hidden="true" />
                <span>{previewItem.thanks_count} teşekkür</span>
              </span>
              <span className={s.badge}>
                <Copy size={13} aria-hidden="true" />
                <span>{previewItem.copy_count} kopya</span>
              </span>
              {previewItem.rating_avg !== null && (
                <span className={s.badge}>
                  <Star size={13} aria-hidden="true" />
                  <span>
                    {previewItem.rating_avg.toLocaleString('tr-TR')} (
                    {previewItem.rating_count})
                  </span>
                </span>
              )}
            </div>

            {previewLoading && <Spinner label="Ayrıntılar yükleniyor…" />}

            {previewItem.description && (
              <p className={s.modalDescription}>{previewItem.description}</p>
            )}

            {previewItem.kind === 'questions' && previewItem.first_question && (
              <div className={s.firstQuestionBox}>
                <span className={s.firstQuestionLabel}>İlk soru:</span>
                <p className={s.firstQuestionText}>{previewItem.first_question}</p>
              </div>
            )}

            <div className={s.modalAuthorRow}>
              {previewItem.author.id &&
              previewItem.author.profile_visible &&
              !unavailableAuthors[previewItem.author.id] ? (
                <button
                  type="button"
                  className={s.authorChipBtn}
                  onClick={() => void handleSelectAuthor(previewItem.author.id)}
                >
                  <TeacherAvatar card={previewItem.author} size={32} />
                  <span>{previewItem.author.name}</span>
                </button>
              ) : (
                <div className={s.authorChipStatic}>
                  <TeacherAvatar card={previewItem.author} size={32} />
                  <span>{previewItem.author.name}</span>
                </div>
              )}

              <div className={s.modalQuickActions}>
                <Link className={s.btnSecondary} href="/giris?sayfa=topluluk" aria-label="Teşekkürler" title="Teşekkürler">
                  <HeartHandshake size={15} aria-hidden="true" />
                  <span>Teşekkürler</span>
                </Link>
                <Link className={s.btnSecondary} href="/giris?sayfa=topluluk" aria-label="Derste kullandım" title="Derste kullandım">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>Derste kullandım</span>
                </Link>
                <Link className={s.btnSecondary} href="/giris?sayfa=topluluk" aria-label="Yorum yap" title="Yorum yap">
                  <MessageSquare size={15} aria-hidden="true" />
                  <span>Yorum yap</span>
                </Link>
                <Link className={s.btnSecondary} href="/giris?sayfa=topluluk" aria-label="Kopyala" title="Kopyala">
                  <Copy size={15} aria-hidden="true" />
                  <span>Kopyala</span>
                </Link>
              </div>
            </div>

            <div className={s.ctaBox}>
              <p className={s.ctaText}>
                Tahtaları tam ekran açmak, soru setlerini çözmek veya kendi arşivinize
                kopyalamak için öğretmen hesabınızla giriş yapın.
              </p>
              <div className={s.ctaButtons}>
                <Link
                  className={`${s.btnPrimary} ${s.ctaMainBtn}`}
                  href="/giris?sayfa=topluluk"
                >
                  <LogIn size={17} aria-hidden="true" />
                  <span className={s.ctaDesktopLabel}>Kullanmak için giriş yap</span>
                  <span className={s.ctaMobileLabel}>Giriş yap</span>
                </Link>
                <Link className={s.btnSecondary} href="/giris#kayit">
                  <UserPlus size={17} aria-hidden="true" />
                  <span>Ücretsiz kayıt ol</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <SiteFooter tagline="Öğretmen Topluluğu" />
    </div>
  );
}

