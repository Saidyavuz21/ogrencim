'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Edit, Layers, Plus, Trash2 } from '../icons';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { BoardSummary, createBoard, deleteBoard, duplicateBoard, listBoards, saveBoard } from '../../lib/boardData';
import { BoardEditor } from './BoardEditor';
import styles from './Board.module.css';
import f from '../files/Files.module.css';

const dateLabel = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Öğretmen: tahtalarım (oluştur, aç, çoğalt, yeniden adlandır, sil) */
export function TeacherBoardsPage({ defaultSubject }: { defaultSubject?: string }) {
  const { confirm, prompt } = useDialog();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    listBoards().then((res) => {
      if (!alive) return;
      if (res.ok) setBoards(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [version]);

  if (openId) return <BoardEditor boardId={openId} onClose={() => { setOpenId(null); setVersion((v) => v + 1); }} />;

  const create = async () => {
    const title = await prompt({ title: 'Yeni tahta', message: 'Tahtaya bir ad verin.', inputLabel: 'Tahtanın adı', placeholder: 'Örn. Kesirlerde toplama', confirmText: 'Oluştur', cancelText: 'Vazgeç', variant: 'primary' });
    if (!title?.trim()) return;
    const res = await createBoard(title, defaultSubject || null, null);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setOpenId(res.data.id);
  };
  const rename = async (b: BoardSummary) => {
    const title = await prompt({ title: 'Tahtayı yeniden adlandır', message: 'Yeni adı yazın.', inputLabel: 'Tahtanın adı', defaultValue: b.title, confirmText: 'Kaydet', cancelText: 'Vazgeç', variant: 'primary' });
    if (!title?.trim() || title.trim() === b.title) return;
    const res = await saveBoard(b.id, { title });
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setBoards((prev) => (prev || []).map((x) => (x.id === b.id ? { ...x, title: title.trim() } : x)));
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

  return (
    <section className={f.page} aria-label="Tahtalarım">
      <div className={f.topBar}>
        <p className={f.muted}>Tahtayı derste tam ekran açın (akıllı tahta) ya da Ödev gönder’de türü “Tahta” seçip sınıfa gönderin; öğrenciler kendi kopyası üzerinde çözer.</p>
        <button type="button" className={f.primaryButton} onClick={create}><Plus size={18} aria-hidden="true" />Yeni tahta</button>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {boards.length === 0 ? (
        <div className={f.empty}>
          <Layers size={32} aria-hidden="true" />
          <h3>Henüz tahtanız yok</h3>
          <p>Kalem, şekil, not, görsel ve Mini Test, Adım Adım, Kronometre gibi parçalarla ders tahtası hazırlayın.</p>
          <button type="button" className={f.primaryButton} onClick={create}><Plus size={18} aria-hidden="true" />İlk tahtayı oluştur</button>
        </div>
      ) : (
        <div className={styles.boardCards}>
          {boards.map((b) => (
            <article key={b.id} className={styles.boardCard}>
              <h3>{b.title}</h3>
              <p>{b.pageCount} sayfa{b.subject ? ` · ${b.subject}` : ''} · {dateLabel(b.updated_at)}</p>
              <div className={f.cardActions}>
                <button type="button" className={f.primaryButton} onClick={() => setOpenId(b.id)}>Aç</button>
                <button type="button" className={f.iconButton} onClick={() => rename(b)} aria-label={`${b.title} adını değiştir`} title="Adını değiştir"><Edit size={18} aria-hidden="true" /></button>
                <button type="button" className={f.iconButton} onClick={() => duplicate(b)} aria-label={`${b.title} çoğalt`} title="Çoğalt"><Copy size={18} aria-hidden="true" /></button>
                <button type="button" className={f.iconButton} onClick={() => remove(b)} aria-label={`${b.title} sil`} title="Sil"><Trash2 size={18} aria-hidden="true" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
