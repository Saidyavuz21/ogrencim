'use client';

// Öğretmen: Topluluk / Keşfet. Diğer öğretmenlerin paylaştığı tahta ve soru setlerini ara, önizle, kopyala, puanla.
// Süper admin aynı sayfayı yönetim panelinde görür: editörün seçimi ve gizleme.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Bookmark, Copy, Eye, Globe, HelpCircle, Layers, Search, Star, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { GRADE_OPTIONS } from '../../lib/filesData';
import {
  CommunityFilter, CommunityKind, CommunityScope, CommunitySort, CommunitySummary, favoriteCommunity, KIND_LABEL, PAGE_SIZE,
  SCOPE_LABEL, searchCommunity, SORT_LABEL,
} from '../../lib/communityData';
import { CommunityPreview } from './CommunityPreview';
import f from '../files/Files.module.css';
import styles from './Community.module.css';
import socialStyles from './CommunitySocial.module.css';

const SORTS: CommunitySort[] = ['trend', 'rating', 'used', 'new'];

export function CommunityPage({
  admin,
  onOpenTeacher,
}: {
  /** Yönetim paneli: editörün seçimi / gizleme */
  admin?: boolean;
  onOpenTeacher?: (teacherId: string) => void;
}) {
  const [items, setItems] = useState<CommunitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<CommunityKind | ''>('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [outcome, setOutcome] = useState('');
  const [sort, setSort] = useState<CommunitySort>('trend');
  const [scope, setScope] = useState<CommunityScope>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const filter: CommunityFilter = useMemo(() => ({
    query: debounced, kind: kind || null, grade: grade || null, subject: subject || null, outcome: outcome.trim() || null,
    sort, scope,
  }), [debounced, kind, grade, subject, outcome, sort, scope]);

  useEffect(() => {
    let alive = true;
    searchCommunity(filter).then((res) => {
      if (!alive) return;
      if (res.ok) { setItems(res.data); setHasMore(res.data.length === PAGE_SIZE); setError(null); } else setError(res.error);
    });
    return () => { alive = false; };
  }, [filter, version]);

  const loadMore = async () => {
    if (!items) return;
    setLoadingMore(true);
    const res = await searchCommunity({ ...filter, offset: items.length });
    setLoadingMore(false);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setItems([...items, ...res.data.filter((x) => !items.some((y) => y.id === x.id))]);
    setHasMore(res.data.length === PAGE_SIZE);
  };

  const patchItem = useCallback((id: string, patch: Partial<CommunitySummary> | null) => {
    setItems((prev) => (prev || []).flatMap((x) => (x.id !== id ? [x] : patch ? [{ ...x, ...patch }] : [])));
  }, []);

  const toggleFavorite = async (x: CommunitySummary) => {
    patchItem(x.id, { is_favorite: !x.is_favorite });
    const res = await favoriteCommunity(x.id, !x.is_favorite);
    if (!res.ok) { patchItem(x.id, { is_favorite: x.is_favorite }); setNotice({ kind: 'error', text: res.error }); }
  };

  const filtering = !!(query.trim() || kind || grade || subject || outcome.trim());
  const clear = () => { setQuery(''); setKind(''); setGrade(''); setSubject(''); setOutcome(''); };
  const open = items?.find((x) => x.id === openId) || null;

  return (
    <section className={`${f.page} ${styles.workspace}`} aria-label="Topluluk">
      <div className={styles.intro}>
        <p>
          Diğer öğretmenlerin paylaştığı tahtalar ve soru setleri. Beğendiğinizi önizleyin, kopyalayıp kendinize göre uyarlayın; kopyada orijinal yazar kaynak olarak yazılır.
          Kendi içeriğinizi paylaşmak için Tahtalarım’da ya da Soru bankası’nda <b>Toplulukta paylaş</b> düğmesini kullanın. Öğrenciler bu sayfayı görmez.
        </p>
      </div>

      <div className={styles.tabs} role="group" aria-label="Görünüm">
        {(Object.keys(SCOPE_LABEL) as CommunityScope[]).map((s) => (
          <button key={s} type="button" className={styles.tab} aria-pressed={scope === s} onClick={() => setScope(s)}>{SCOPE_LABEL[s]}</button>
        ))}
      </div>

      <div className={styles.filters}>
        <label className={`${f.search} ${styles.searchRow}`}>
          <span className={f.srOnly}>Toplulukta ara</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Başlık, konu, etiket ya da yazar ara" />
        </label>
        <div className={styles.field}><label htmlFor="cm-kind">Biçim</label>
          <CustomSelect id="cm-kind" value={kind} onChange={(v) => setKind(v as CommunityKind | '')} options={[{ value: '', label: 'Hepsi' }, { value: 'board', label: KIND_LABEL.board }, { value: 'questions', label: KIND_LABEL.questions }]} />
        </div>
        <div className={styles.field}><label htmlFor="cm-grade">Kademe</label>
          <CustomSelect id="cm-grade" value={grade} onChange={setGrade} options={[{ value: '', label: 'Bütün kademeler' }, ...GRADE_OPTIONS]} />
        </div>
        <div className={styles.field}><label htmlFor="cm-subject">Branş</label>
          <CustomSelect id="cm-subject" value={subject} onChange={setSubject} options={[{ value: '', label: 'Bütün branşlar' }, ...SUBJECT_OPTIONS]} />
        </div>
        <div className={styles.field}><label htmlFor="cm-outcome">Kazanım kodu</label>
          <input id="cm-outcome" type="text" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="ör. MAT.5.1" />
        </div>
        <button type="button" className={f.secondaryButton} onClick={clear} disabled={!filtering}><X size={18} aria-hidden="true" />Temizle</button>
      </div>

      <div className={styles.sortRow}>
        <div className={styles.tabs} role="group" aria-label="Sıralama">
          {SORTS.map((s) => <button key={s} type="button" className={styles.tab} aria-pressed={sort === s} onClick={() => setSort(s)}>{SORT_LABEL[s]}</button>)}
        </div>
        {items && <p>{items.length}{hasMore ? '+' : ''} içerik{sort === 'trend' ? ' · son 14 günde en çok kopyalananlar önde' : ''}</p>}
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {error ? <p className={f.error} role="alert">Topluluk açılamadı: {error}</p>
        : !items ? <Spinner center label="Yükleniyor…" />
        : items.length === 0 ? (
          <div className={f.empty}>
            <Globe size={32} aria-hidden="true" />
            <h3>{filtering ? 'Aramaya uyan içerik yok' : scope === 'favorites' ? 'Henüz favoriniz yok' : scope === 'mine' ? 'Henüz paylaşmadınız' : scope === 'featured' ? 'Henüz editörün seçimi yok' : 'Toplulukta henüz içerik yok'}</h3>
            <p>{filtering ? 'Süzgeçleri gevşetin ya da temizleyin.' : 'İlk paylaşan siz olun: Tahtalarım’da bir tahtanın üzerindeki “Toplulukta paylaş” düğmesine basın.'}</p>
            {filtering && <button type="button" className={f.secondaryButton} onClick={clear}>Süzgeçleri temizle</button>}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((x) => (
                <article key={x.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <span className={styles.cardIcon}>{x.kind === 'board' ? <Layers size={22} aria-hidden="true" /> : <HelpCircle size={22} aria-hidden="true" />}</span>
                    <h3>
                      {x.title}
                      <small>
                        {onOpenTeacher && x.author_id ? (
                          <button
                            type="button"
                            className={socialStyles.cardAuthorBtn}
                            onClick={() => onOpenTeacher(x.author_id)}
                          >
                            {x.author_name}
                          </button>
                        ) : (
                          x.author_name
                        )}
                        {x.is_mine ? ' (siz)' : ''}
                      </small>
                    </h3>
                  </div>
                  <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles.badgeKind}`}>{KIND_LABEL[x.kind]} · {x.kind === 'board' ? `${x.page_count} sayfa` : `${x.question_count} soru`}</span>
                    {x.featured && <span className={`${styles.badge} ${styles.badgeFeatured}`}><Award size={14} aria-hidden="true" />Editörün seçimi</span>}
                    {x.hidden && <span className={`${styles.badge} ${styles.badgeHidden}`}>Gizlendi</span>}
                    {[x.grade, x.subject].filter(Boolean).map((t) => <span key={t} className={styles.badge}>{t}</span>)}
                    {x.outcomes.slice(0, 3).map((o) => <span key={o} className={`${styles.badge} ${styles.outcome}`}>{o}</span>)}
                    {x.outcomes.length > 3 && <span className={styles.badge}>+{x.outcomes.length - 3}</span>}
                  </div>
                  {x.description && <p>{x.description.length > 160 ? `${x.description.slice(0, 160)}…` : x.description}</p>}
                  {x.origin_author && <p>Uyarlama · kaynak: {x.origin_author}{x.origin_title ? ` — ${x.origin_title}` : ''}</p>}
                  <div className={styles.stats}>
                    <span aria-label={x.rating_avg != null ? `Puan ${x.rating_avg}, ${x.rating_count} oy` : 'Henüz puan yok'}>
                      <Star size={15} aria-hidden="true" className={x.rating_avg != null ? styles.starOn : undefined} />
                      {x.rating_avg != null ? `${x.rating_avg.toLocaleString('tr-TR')} (${x.rating_count})` : 'Puan yok'}
                    </span>
                    <span><Copy size={15} aria-hidden="true" />{x.copy_count} kopya</span>
                    {x.recent_copies > 0 && <span>{x.recent_copies} son 14 günde</span>}
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className={f.primaryButton} onClick={() => setOpenId(x.id)}><Eye size={18} aria-hidden="true" />Önizle</button>
                    {!admin && (
                      <button type="button" className={f.iconButton} aria-pressed={x.is_favorite} onClick={() => toggleFavorite(x)}
                        aria-label={x.is_favorite ? `${x.title}: favorilerden çıkar` : `${x.title}: favorilere ekle`} title={x.is_favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                        style={x.is_favorite ? { color: 'var(--teacher-primary, #25634b)', borderColor: 'var(--teacher-primary, #25634b)' } : undefined}>
                        <Bookmark size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {hasMore && <button type="button" className={`${f.secondaryButton} ${styles.more}`} onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}</button>}
          </>
        )}

      {open && (
        <CommunityPreview
          item={open}
          admin={admin}
          onClose={() => setOpenId(null)}
          onChanged={(patch) => patchItem(open.id, patch)}
          onRemoved={() => { patchItem(open.id, null); setOpenId(null); setNotice({ kind: 'ok', text: 'Paylaşım kaldırıldı. Daha önce kopyalayanların kopyaları duruyor.' }); }}
          onCopied={(r) => {
            setOpenId(null);
            setVersion((v) => v + 1);
            setNotice({
              kind: 'ok',
              text: r.boardId
                ? `Tahta Tahtalarım’a eklendi${r.questionCount ? `; ${r.questionCount} Mini Test sorusu soru bankanıza eklendi` : ''}.`
                : `${r.questionCount} soru soru bankanıza eklendi (“Topluluk” etiketiyle).`,
            });
          }}
        />
      )}
    </section>
  );
}
