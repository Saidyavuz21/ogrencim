'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { Copy, Edit, Layers, Plus, Search, Trash2, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { BoardSummary, createBoard, deleteBoard, duplicateBoard, listBoards, saveBoard } from '../../lib/boardData';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { Modal, normalize } from '../files/FilesUi';
import { BoardEditor } from './BoardEditor';
import styles from './Board.module.css';
import f from '../files/Files.module.css';

const ALL = '__all__';
const NONE = '__none__';
const dateLabel = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

type Info = { title: string; category: string; subject: string; grade: string };

/** Öğretmen: tahtalarım (kategoriler, oluştur, aç, çoğalt, düzenle, sil) */
export function TeacherBoardsPage({ defaultSubject }: { defaultSubject?: string }) {
  const { confirm } = useDialog();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [view, setView] = useState(ALL);
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [dialog, setDialog] = useState<{ board: BoardSummary | null } | null>(null);

  useEffect(() => {
    let alive = true;
    listBoards().then((res) => {
      if (!alive) return;
      if (res.ok) setBoards(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [version]);

  const all = useMemo(() => boards || [], [boards]);
  const categories = useMemo(() => Array.from(new Set(all.map((b) => b.category).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, 'tr')), [all]);
  // Süzgeçlerde yalnızca tahtalarda kullanılan dersler ve kademeler
  const subjects = useMemo(() => Array.from(new Set(all.map((b) => b.subject).filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b, 'tr')), [all]);
  const grades = useMemo(() => GRADE_OPTIONS.filter((g) => all.some((b) => b.grade === g)), [all]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return all.filter((b) => (view === ALL || (view === NONE ? !b.category : b.category === view))
      && (!subjectFilter || b.subject === subjectFilter)
      && (!gradeFilter || b.grade === gradeFilter)
      && (!n || normalize([b.title, b.category || '', b.subject || '', b.grade || ''].join(' ')).includes(n)));
  }, [all, view, q, subjectFilter, gradeFilter]);
  const filtering = !!(q.trim() || subjectFilter || gradeFilter || view !== ALL);
  // "Tümü"nde kategorilere göre gruplanır
  const groups = useMemo(() => {
    if (view !== ALL) return [{ key: view, title: '', items: visible }];
    const out = categories.map((c) => ({ key: c, title: c, items: visible.filter((b) => b.category === c) })).filter((g) => g.items.length);
    const rest = visible.filter((b) => !b.category);
    if (rest.length) out.push({ key: NONE, title: categories.length ? 'Kategorisiz' : '', items: rest });
    return out;
  }, [view, visible, categories]);

  if (openId) return <BoardEditor boardId={openId} onClose={() => { setOpenId(null); setVersion((v) => v + 1); }} />;

  const saveInfo = async (info: Info, board: BoardSummary | null) => {
    const subject = info.subject || null;
    const grade = info.grade || null;
    const category = info.category.trim().slice(0, 60) || null;
    if (!board) {
      const res = await createBoard(info.title, subject, grade, undefined, category);
      if (!res.ok) return res.error;
      // Güvence: sunucudan dönen kayıtta kategori yoksa bir kez daha yaz
      if (category && res.data.category !== category) {
        const fix = await saveBoard(res.data.id, { category });
        if (!fix.ok) return `Tahta oluşturuldu ama kategori kaydedilemedi: ${fix.error}`;
      }
      setDialog(null);
      setOpenId(res.data.id);
      return null;
    }
    const res = await saveBoard(board.id, { title: info.title, subject, grade, category });
    if (!res.ok) return res.error;
    setDialog(null);
    // Liste sunucudan yeniden okunur: ekranda görünen gerçekten kaydedilendir
    setVersion((v) => v + 1);
    setNotice({ kind: 'ok', text: category ? `Tahta bilgileri kaydedildi (kategori: ${category}).` : 'Tahta bilgileri kaydedildi.' });
    return null;
  };
  const duplicate = async (b: BoardSummary) => {
    const res = await duplicateBoard(b.id);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setVersion((v) => v + 1);
    setNotice({ kind: 'ok', text: `"${b.title}" çoğaltıldı.` });
  };
  const remove = async (b: BoardSummary) => {
    const ok = await confirm({ title: 'Tahtayı sil', message: `"${b.title}" silinsin mi?\nÖdev olarak gönderdiğiniz kopyalar etkilenmez.`, confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' });
    if (!ok) return;
    const res = await deleteBoard(b.id);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setBoards((prev) => (prev || []).filter((x) => x.id !== b.id));
  };

  if (error) return <p className={f.error} role="alert">Tahtalar alınamadı: {error}</p>;
  if (!boards) return <Spinner center label="Tahtalar yükleniyor…" />;

  const card = (b: BoardSummary) => (
    <article key={b.id} className={styles.boardCard}>
      <h3>{b.title}</h3>
      <p>{[`${b.pageCount} sayfa`, b.subject, b.grade].filter(Boolean).join(' · ')}</p>
      <p>{dateLabel(b.updated_at)}</p>
      <div className={f.cardActions}>
        <button type="button" className={f.primaryButton} onClick={() => setOpenId(b.id)}>Aç</button>
        <button type="button" className={f.iconButton} onClick={() => setDialog({ board: b })} aria-label={`${b.title} bilgilerini düzenle`} title="Ad, kategori, ders, kademe"><Edit size={18} aria-hidden="true" /></button>
        <button type="button" className={f.iconButton} onClick={() => duplicate(b)} aria-label={`${b.title} çoğalt`} title="Çoğalt"><Copy size={18} aria-hidden="true" /></button>
        <button type="button" className={f.iconButton} onClick={() => remove(b)} aria-label={`${b.title} sil`} title="Sil"><Trash2 size={18} aria-hidden="true" /></button>
      </div>
    </article>
  );

  return (
    <section className={f.page} aria-label="Tahtalarım">
      <div className={f.topBar}>
        <p className={f.muted}>Tahtayı derste tam ekran açın (akıllı tahta) ya da Ödev gönder’de türü “Tahta” seçip sınıfa gönderin; öğrenciler kendi kopyası üzerinde çözer.</p>
        <button type="button" className={f.primaryButton} onClick={() => setDialog({ board: null })}><Plus size={18} aria-hidden="true" />Yeni tahta</button>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {all.length === 0 ? (
        <div className={f.empty}>
          <Layers size={32} aria-hidden="true" />
          <h3>Henüz tahtanız yok</h3>
          <p>Kalem, şekil, not, görsel ve Mini Test, Adım Adım, Kronometre gibi parçalarla ders tahtası hazırlayın. Tahtaları “1. Ünite”, “LGS tekrar” gibi kategorilere ayırabilirsiniz.</p>
          <button type="button" className={f.primaryButton} onClick={() => setDialog({ board: null })}><Plus size={18} aria-hidden="true" />İlk tahtayı oluştur</button>
        </div>
      ) : (
        <>
          <div className={f.filters} style={{ gridTemplateColumns: 'minmax(200px, 2fr) repeat(3, minmax(150px, 1fr)) auto' }}>
            <label className={f.search}>
              <span className={f.srOnly}>Tahtalarda ara</span>
              <Search size={18} aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, kategori ya da ders ara" />
            </label>
            <CustomSelect
              value={view}
              onChange={setView}
              disabled={!categories.length}
              options={[
                { value: ALL, label: categories.length ? `Tüm kategoriler (${all.length})` : 'Kategori yok' },
                ...categories.map((c) => ({ value: c, label: `${c} (${all.filter((b) => b.category === c).length})` })),
                ...(categories.length && all.some((b) => !b.category) ? [{ value: NONE, label: `Kategorisiz (${all.filter((b) => !b.category).length})` }] : []),
              ]}
            />
            <CustomSelect value={subjectFilter} onChange={setSubjectFilter} options={[{ value: '', label: subjects.length ? 'Tüm dersler' : 'Ders girilmedi' }, ...subjects]} disabled={!subjects.length} />
            <CustomSelect value={gradeFilter} onChange={setGradeFilter} options={[{ value: '', label: grades.length ? 'Tüm kademeler' : 'Kademe girilmedi' }, ...grades]} disabled={!grades.length} />
            <button
              type="button"
              className={f.secondaryButton}
              onClick={() => { setQ(''); setSubjectFilter(''); setGradeFilter(''); setView(ALL); }}
              disabled={!filtering}
              title={filtering ? 'Arama ve süzgeçleri temizle' : 'Temizlenecek süzgeç yok'}
            >
              <X size={18} aria-hidden="true" />Temizle
            </button>
          </div>
          {groups.length === 0 ? (
            <p className={f.muted}>
              Süzgece uyan tahta yok.{' '}
              {filtering && <button type="button" className={f.linkButton} onClick={() => { setQ(''); setSubjectFilter(''); setGradeFilter(''); setView(ALL); }}>Süzgeçleri temizle</button>}
            </p>
          ) : groups.map((g) => (
            <div key={g.key} style={{ display: 'grid', gap: 10 }}>
              {g.title && <h3 className={f.cardTitle}>{g.title} <span className={f.muted} style={{ display: 'inline', fontWeight: 400 }}>· {g.items.length}</span></h3>}
              <div className={styles.boardCards}>{g.items.map(card)}</div>
            </div>
          ))}
          {categories.length === 0 && <p className={f.muted}>İpucu: Tahtaları kategorilere ayırmak için kalem düğmesine basıp “Kategori” yazın (ör. 1. Ünite).</p>}
        </>
      )}

      {dialog && (
        <BoardInfoDialog
          board={dialog.board}
          categories={categories}
          defaultSubject={defaultSubject}
          defaultCategory={view !== ALL && view !== NONE ? view : ''}
          onClose={() => setDialog(null)}
          onSave={(info) => saveInfo(info, dialog.board)}
        />
      )}
    </section>
  );
}

/** Tahta bilgileri: ad, kategori (öğretmenin kendi kategorileri), ders, kademe */
function BoardInfoDialog({ board, categories, defaultSubject, defaultCategory, onClose, onSave }: {
  board: BoardSummary | null;
  categories: string[];
  defaultSubject?: string;
  defaultCategory: string;
  onClose: () => void;
  onSave: (info: Info) => Promise<string | null>;
}) {
  const ids = { title: useId(), cat: useId(), list: useId() };
  const [info, setInfo] = useState<Info>({
    title: board?.title || '',
    category: board?.category || defaultCategory,
    subject: board?.subject || (defaultSubject && SUBJECT_OPTIONS.includes(defaultSubject) ? defaultSubject : ''),
    grade: board?.grade || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.title.trim()) { setError('Tahtaya bir ad verin.'); return; }
    setBusy(true);
    setError(null);
    const err = await onSave(info);
    setBusy(false);
    if (err) setError(err);
  };
  return (
    <Modal title={board ? 'Tahta bilgileri' : 'Yeni tahta'} onClose={onClose} busy={busy}>
      <form className={f.form} onSubmit={submit}>
        <label className={f.field} htmlFor={ids.title}>
          Tahtanın adı
          <input id={ids.title} value={info.title} maxLength={120} onChange={(e) => setInfo({ ...info, title: e.target.value })} placeholder="Örn. Kesirlerde toplama" data-autofocus required />
        </label>
        <label className={f.field} htmlFor={ids.cat}>
          Kategori <span className={f.hint}>(isteğe bağlı; yeni bir ad yazın ya da listeden seçin)</span>
          <input id={ids.cat} list={ids.list} value={info.category} maxLength={60} onChange={(e) => setInfo({ ...info, category: e.target.value })} placeholder="Örn. 1. Ünite, LGS tekrar" />
          <datalist id={ids.list}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        {categories.length > 0 && (
          <div className={f.classChips} aria-label="Kategoriler">
            {categories.map((c) => (
              <button key={c} type="button" className={f.classChip} aria-pressed={info.category === c} onClick={() => setInfo({ ...info, category: info.category === c ? '' : c })}>{c}</button>
            ))}
          </div>
        )}
        <div className={f.grid2}>
          <div className={f.field}>
            <span>Ders</span>
            <CustomSelect value={info.subject} onChange={(v) => setInfo({ ...info, subject: v })} options={[{ value: '', label: 'Seçilmedi' }, ...SUBJECT_OPTIONS]} />
          </div>
          <div className={f.field}>
            <span>Kademe</span>
            <CustomSelect value={info.grade} onChange={(v) => setInfo({ ...info, grade: v })} options={[{ value: '', label: 'Seçilmedi' }, ...GRADE_OPTIONS]} />
          </div>
        </div>
        {error && <p className={f.error} role="alert">{error}</p>}
        <div className={f.modalActions}>
          <button type="button" className={f.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className={f.primaryButton} disabled={busy}>{busy ? 'Kaydediliyor…' : board ? 'Kaydet' : 'Oluştur ve aç'}</button>
        </div>
      </form>
    </Modal>
  );
}
