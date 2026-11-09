'use client';

// Toplulukta paylaş: bilgiler, kazanım kodları, kişisel veri taraması ve onay.
import { useEffect, useState } from 'react';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { Modal } from '../files/FilesUi';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { CommunityMeta, OUTCOME_PATTERN, parseOutcomes, PublishInput, publishToCommunity, scanForPublish } from '../../lib/communityData';
import f from '../files/Files.module.css';
import styles from './Community.module.css';

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

  const publish = async () => {
    const m = meta();
    if (m.title.length < 3) { setError('Başlık en az 3 karakter olmalı.'); return; }
    if (badOutcomes.length) { setError(`Kazanım kodu geçersiz: ${badOutcomes.join(', ')} (ör. MAT.8.1.1.1)`); return; }
    setBusy(true);
    setError(null);
    const res = await publishToCommunity(source, m, confirm);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onPublished(res.data);
  };

  const blocked = !!scan?.findings.length;
  return (
    <Modal title="Toplulukta paylaş" kicker={source.kind === 'board' ? 'Tahta' : 'Soru seti'} onClose={onClose} busy={busy} wide>
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

