'use client';

// Kopyalamadan önce hızlı önizleme: tahtanın sayfaları ya da soru setinin soruları; yıldız, kopyala, (yazar) kaldır, (admin) editörün seçimi / gizle.
import { useEffect, useMemo, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Copy, Star } from '../icons';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import { Modal } from '../files/FilesUi';
import { BoardCanvas } from '../board/BoardCanvas';
import { WidgetContext, WidgetView } from '../board/Widgets';
import { RichText } from '../math/RichText';
import { BoardContent, mediaRefs, WidgetEl } from '../../lib/boardData';
import { CHOICE_LETTERS, QuestionRow } from '../../lib/quizData';
import {
  COMMUNITY_BUCKET, CommunityQuestion, CommunitySummary, communityMediaUrls, copyFromCommunity, getCommunityItem, KIND_LABEL,
  moderateCommunity, rateCommunity, unpublishCommunity,
} from '../../lib/communityData';
import f from '../files/Files.module.css';
import styles from './Community.module.css';

const asQuestionRow = (q: CommunityQuestion): QuestionRow => ({
  id: q.ref, body: q.body, image_path: q.image_path, choices: q.choices, correct_index: q.correct_index, explanation: q.explanation,
  grade: q.grade, subject: q.subject, topic: q.topic, tags: [], created_at: '', updated_at: '',
});

export function CommunityPreview({ item, admin, onClose, onChanged, onRemoved, onCopied }: {
  item: CommunitySummary;
  admin?: boolean;
  onClose: () => void;
  onChanged: (patch: Partial<CommunitySummary>) => void;
  onRemoved: () => void;
  onCopied: (r: { boardId: string | null; questionCount: number }) => void;
}) {
  const { confirm } = useDialog();
  const [data, setData] = useState<{ content: BoardContent | null; questions: CommunityQuestion[] } | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCommunityItem(item.id).then(async (res) => {
      if (!alive) return;
      if (!res.ok) { setError(res.error); return; }
      setData(res.data);
      const paths = [
        ...mediaRefs(res.data.content?.pages || []).filter((r) => r.bucket === COMMUNITY_BUCKET).map((r) => r.path),
        ...res.data.questions.map((q) => q.image_path || ''),
      ];
      const u = await communityMediaUrls(paths);
      if (alive) setUrls(u);
    });
    return () => { alive = false; };
  }, [item.id]);

  const questionMap = useMemo(() => new Map((data?.questions || []).map((q) => [q.ref, asQuestionRow(q)])), [data]);
  const widgets = useMemo(() => new Map((data?.content?.pages || []).flatMap((p) => p.elements.filter((e): e is WidgetEl => e.type === 'widget')).map((w) => [w.id, w])), [data]);
  const ctx: WidgetContext = { mode: 'teacher', questions: questionMap, allWidgets: widgets, mediaUrls: urls };

  const copy = async () => {
    setBusy(true);
    setError(null);
    const res = await copyFromCommunity(item.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onChanged({ copy_count: item.copy_count + 1, recent_copies: item.recent_copies + 1 });
    onCopied(res.data);
  };
  const rate = async (stars: number) => {
    const next = item.my_rating === stars ? 0 : stars;
    setError(null);
    const res = await rateCommunity(item.id, next);
    if (!res.ok) { setError(res.error); return; }
    // Ortalama ekranda yaklaşık güncellenir; doğru değer bir sonraki aramada gelir
    const sum = (item.rating_avg || 0) * item.rating_count - (item.my_rating || 0) + next;
    const count = item.rating_count + (item.my_rating ? 0 : 1) - (next ? 0 : 1);
    onChanged({ my_rating: next || null, rating_count: count, rating_avg: count ? Math.round((sum / count) * 10) / 10 : null });
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Paylaşımı kaldır', message: `"${item.title}" topluluktan kaldırılsın mı?\nKopyalamış öğretmenlerin kopyaları etkilenmez.`, confirmText: 'Kaldır', cancelText: 'Vazgeç', variant: 'danger' });
    if (!ok) return;
    setBusy(true);
    const res = await unpublishCommunity(item.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onRemoved();
  };
  const moderate = async (patch: { featured?: boolean; hidden?: boolean }) => {
    setBusy(true);
    const res = await moderateCommunity(item.id, patch);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onChanged(patch);
  };

  const pages = data?.content?.pages || [];
  const shown = pages[Math.min(page, Math.max(0, pages.length - 1))];

  return (
    <Modal title={item.title} kicker={`${KIND_LABEL[item.kind]} · ${item.author_name}`} onClose={onClose} wide busy={busy}>
      <div className={styles.previewMeta}>
        <div className={styles.badges}>
          {item.featured && <span className={`${styles.badge} ${styles.badgeFeatured}`}><Award size={14} aria-hidden="true" />Editörün seçimi</span>}
          {[item.grade, item.subject].filter(Boolean).map((t) => <span key={t} className={styles.badge}>{t}</span>)}
          {item.outcomes.map((o) => <span key={o} className={`${styles.badge} ${styles.outcome}`}>{o}</span>)}
          {item.tags.map((t) => <span key={t} className={styles.badge}>#{t}</span>)}
        </div>
        {item.description && <p className={f.muted} style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>}
        {item.origin_author && <p className={styles.origin}>Bu içerik bir uyarlamadır. Kaynak: <b>{item.origin_author}</b>{item.origin_title ? ` — ${item.origin_title}` : ''}</p>}
      </div>

      {error && <p className={f.error} role="alert">{error}</p>}
      {!data ? (!error && <Spinner center label="Önizleme hazırlanıyor…" />) : item.kind === 'board' ? (
        shown ? (
          <>
            <BoardCanvas page={shown} imageUrls={urls} renderWidget={(w) => <WidgetView el={w} ctx={ctx} />} widgetsPassive ariaLabel={`${item.title}, ${page + 1}. sayfa (önizleme)`} />
            <div className={styles.pager}>
              <button type="button" className={f.secondaryButton} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft size={18} aria-hidden="true" />Önceki</button>
              <span className={f.muted}>Sayfa {page + 1} / {pages.length}</span>
              <button type="button" className={f.secondaryButton} onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page >= pages.length - 1}>Sonraki<ChevronRight size={18} aria-hidden="true" /></button>
            </div>
            {data.questions.length > 0 && <p className={f.muted}>Tahtadaki {data.questions.length} Mini Test sorusu da kopyalanır (soru bankanıza eklenir).</p>}
          </>
        ) : <p className={f.muted}>Tahta boş.</p>
      ) : (
        <ol className={styles.qList}>
          {data.questions.map((q, i) => (
            <li key={q.ref} className={styles.qItem}>
              <b>{i + 1}.</b>
              <RichText text={q.body} />
              {q.image_path && urls[`${COMMUNITY_BUCKET}/${q.image_path}`] && (
                // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                <img className={styles.qImg} src={urls[`${COMMUNITY_BUCKET}/${q.image_path}`]} alt="" />
              )}
              <ol aria-label="Şıklar">
                {q.choices.map((c, j) => (
                  <li key={j} className={j === q.correct_index ? styles.correct : undefined}>
                    {CHOICE_LETTERS[j]}) <RichText text={c} inline />{j === q.correct_index ? ' ✓' : ''}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {!admin && !item.is_mine && (
        <div className={styles.rateRow} role="group" aria-label="Puanınız">
          <span className={f.muted}>Puanınız:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={styles.starBtn} aria-pressed={(item.my_rating || 0) >= n} onClick={() => rate(n)} aria-label={`${n} yıldız${item.my_rating === n ? ' (kaldırmak için yeniden basın)' : ''}`}>
              <Star size={22} aria-hidden="true" fill={(item.my_rating || 0) >= n ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      )}
      {admin && (
        <div className={styles.adminRow} role="group" aria-label="Yönetim">
          <button type="button" className={f.secondaryButton} onClick={() => moderate({ featured: !item.featured })} disabled={busy}>
            <Award size={18} aria-hidden="true" />{item.featured ? 'Editörün seçiminden çıkar' : 'Editörün seçimi yap'}
          </button>
          <button type="button" className={f.secondaryButton} onClick={() => moderate({ hidden: !item.hidden })} disabled={busy}>
            {item.hidden ? 'Yeniden göster' : 'Gizle (uygunsuz içerik)'}
          </button>
        </div>
      )}
      <div className={f.cardActions}>
        {item.is_mine && <button type="button" className={f.secondaryButton} onClick={remove} disabled={busy}>Paylaşımı kaldır</button>}
        <button type="button" className={f.secondaryButton} onClick={onClose} disabled={busy}>Kapat</button>
        {!admin && (
          <button type="button" className={f.primaryButton} onClick={copy} disabled={busy || !data}>
            <Copy size={18} aria-hidden="true" />{busy ? 'Kopyalanıyor…' : item.kind === 'board' ? 'Tahtalarıma kopyala' : 'Soru bankama kopyala'}
          </button>
        )}
      </div>
    </Modal>
  );
}
