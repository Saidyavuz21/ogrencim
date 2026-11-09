'use client';

// Toplulukta paylaş: bilgiler, kazanım kodları, kişisel veri taraması ve onay.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { Modal } from '../files/FilesUi';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { GRADE_OPTIONS } from '../../lib/filesData';
import {
  BoardPage,
  WidgetEl,
  boardImageUrls,
  getBoard,
  mediaRefs,
  renderBoardSvgToBlob,
} from '../../lib/boardData';
import { BoardCanvas } from '../board/BoardCanvas';
import { WidgetContext, WidgetView } from '../board/Widgets';
import {
  CommunityMeta,
  OUTCOME_PATTERN,
  parseOutcomes,
  PublishInput,
  publishToCommunity,
  scanForPublish,
} from '../../lib/communityData';
import { uploadItemThumb } from '../../lib/communitySocialData';
import f from '../files/Files.module.css';
import styles from './Community.module.css';
import socialStyles from './CommunitySocial.module.css';

export function PublishDialog({ source, initial, onClose, onPublished }: {
  source: PublishInput;
  initial: Partial<CommunityMeta>;
  onClose: () => void;
  onPublished: (id: string) => void;
}) {
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [grade, setGrade] = useState(initial.grade || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [outcomes, setOutcomes] = useState((initial.outcomes || []).join(', '));
  const [tags, setTags] = useState((initial.tags || []).join(', '));
  const [confirm, setConfirm] = useState(false);
  const [scan, setScan] = useState<{ findings: string[]; page_count: number; question_count: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tahta önizleme resmi için ilk sayfa hazırlığı
  const [firstPage, setFirstPage] = useState<BoardPage | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (source.kind !== 'board') return;
    let alive = true;
    getBoard(source.boardId).then(async (res) => {
      if (!alive || !res.ok) return;
      const p0 = res.data.content.pages[0] || null;
      setFirstPage(p0);
      if (p0) {
        const refs = mediaRefs([p0]);
        if (refs.length > 0) {
          const u = await boardImageUrls(refs);
          if (alive) setThumbUrls(u);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [source]);

  const thumbCtx = useMemo<WidgetContext>(() => {
    const widgets = new Map(
      (firstPage?.elements || [])
        .filter((e): e is WidgetEl => e.type === 'widget')
        .map((w) => [w.id, w])
    );
    return {
      mode: 'teacher',
      questions: new Map(),
      allWidgets: widgets,
      mediaUrls: thumbUrls,
    };
  }, [firstPage, thumbUrls]);

  const meta = (): CommunityMeta => ({
    title: title.trim(),
    description: description.trim(),
    grade,
    subject,
    outcomes: parseOutcomes(outcomes),
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
  });
  const badOutcomes = parseOutcomes(outcomes).filter((o) => !OUTCOME_PATTERN.test(o));

  // Açılınca ve başlık/açıklama değişince (0,6 sn sonra) içerik taranır
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      setScanning(true);
      const res = await scanForPublish(source, { ...meta(), outcomes: [] });
      if (!alive) return;
      setScanning(false);
      if (res.ok) { setScan(res.data); setError(null); } else setError(res.error);
    }, 600);
    return () => { alive = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca metin alanları değişince yeniden taranır
  }, [title, description]);

  const generateAndUploadThumb = async (itemId: string) => {
    if (source.kind !== 'board' || !svgRef.current) return;
    const attempts: { width: number; type: 'image/webp' | 'image/jpeg'; quality: number }[] = [
      { width: 640, type: 'image/webp', quality: 0.75 },
      { width: 640, type: 'image/webp', quality: 0.55 },
      { width: 540, type: 'image/webp', quality: 0.45 },
      { width: 480, type: 'image/jpeg', quality: 0.4 },
    ];
    for (const opt of attempts) {
      try {
        const blob = await renderBoardSvgToBlob(svgRef.current, opt);
        if (blob.size <= 200 * 1024) {
          await uploadItemThumb(itemId, blob);
          return;
        }
      } catch {
        // Hata olursa sessizce geç
      }
    }
  };

  const publish = async () => {
    const m = meta();
    if (m.title.length < 3) { setError('Başlık en az 3 karakter olmalı.'); return; }
    if (badOutcomes.length) { setError(`Kazanım kodu geçersiz: ${badOutcomes.join(', ')} (ör. MAT.8.1.1.1)`); return; }
    setBusy(true);
    setError(null);
    const res = await publishToCommunity(source, m, confirm);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    await generateAndUploadThumb(res.data);
    setBusy(false);
    onPublished(res.data);
  };

  const blocked = !!scan?.findings.length;
  return (
    <Modal title="Toplulukta paylaş" kicker={source.kind === 'board' ? 'Tahta' : 'Soru seti'} onClose={onClose} busy={busy} wide>
      {source.kind === 'board' && firstPage && (
        <div className={socialStyles.hiddenThumbStage} aria-hidden="true">
          <BoardCanvas
            page={firstPage}
            imageUrls={thumbUrls}
            renderWidget={(w) => <WidgetView el={w} ctx={thumbCtx} />}
            widgetsPassive
            thumbnail
            svgRef={(node) => {
              svgRef.current = node;
            }}
          />
        </div>
      )}
      <div className={styles.form}>
        <p className={f.muted}>
          Paylaştığınız içerik platformdaki bütün öğretmenlere görünür (öğrenciler görmez). O anki hâlinin kopyası paylaşılır; sonradan tahtanızda
          yaptığınız değişiklikler paylaşıma yansımaz. Adınız yazar olarak görünür; kopyalayanlarda da kaynak olarak yazılır.
        </p>
        <label className={f.field} htmlFor="pub-title"><span>Başlık</span>
          <input id="pub-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Kesirlerle toplama — 5. sınıf" />
        </label>
        <label className={f.field} htmlFor="pub-desc"><span>Açıklama</span>
          <textarea id="pub-desc" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Nasıl kullanılır, kaç ders sürer, nelere dikkat edilmeli" />
        </label>
        <div className={styles.formGrid}>
          <div className={styles.field}><label htmlFor="pub-grade">Kademe</label>
            <CustomSelect id="pub-grade" value={grade} onChange={setGrade} options={[{ value: '', label: 'Seçilmedi' }, ...GRADE_OPTIONS]} />
          </div>
          <div className={styles.field}><label htmlFor="pub-subject">Branş</label>
            <CustomSelect id="pub-subject" value={subject} onChange={setSubject} options={[{ value: '', label: 'Seçilmedi' }, ...SUBJECT_OPTIONS]} />
          </div>
          <div className={styles.field}><label htmlFor="pub-outcomes">MEB kazanım kodları</label>
            <input id="pub-outcomes" type="text" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} placeholder="ör. MAT.5.1.4.2, MAT.5.1.4.3" aria-describedby="pub-outcomes-hint" />
            <small id="pub-outcomes-hint" className={f.muted}>{badOutcomes.length ? `Biçimi uymayan: ${badOutcomes.join(', ')}` : 'Virgülle ayırın; en çok 10 kod.'}</small>
          </div>
          <div className={styles.field}><label htmlFor="pub-tags">Etiketler</label>
            <input id="pub-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ör. LGS, tekrar, oyun" />
          </div>
        </div>

        {scanning && !scan ? <Spinner label="İçerik taranıyor…" /> : scan && (
          blocked ? (
            <div className={styles.findings} role="alert">
              <b>Paylaşmadan önce düzeltin: içerikte kişisel veri olabilir.</b>
              <ul>{scan.findings.map((x) => <li key={x}>{x}</li>)}</ul>
              <span>Tahtadaki notlardan / sorulardan bu bilgileri silip kaydedin, sonra yeniden açın.</span>
            </div>
          ) : (
            <p className={styles.scanOk} role="status">
              Metinlerde öğrenci adı, e-posta, telefon ya da kimlik numarası bulunmadı
              {source.kind === 'board' ? ` · ${scan.page_count} sayfa` : ''}{scan.question_count ? ` · ${scan.question_count} soru` : ''}.
            </p>
          )
        )}

        <label className={styles.confirm}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>Görsellerde, el yazısı çizimlerde ve ses kayıtlarında öğrenci adı, yüzü, notu ya da başka kişisel bilgisi olmadığını kontrol ettim (bunlar otomatik taranamaz).</span>
        </label>

        {error && <p className={f.error} role="alert">{error}</p>}
        <div className={f.cardActions}>
          <button type="button" className={f.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="button" className={f.primaryButton} onClick={publish} disabled={busy || !confirm || blocked || !scan || title.trim().length < 3}>
            {busy ? 'Paylaşılıyor…' : 'Paylaş'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
