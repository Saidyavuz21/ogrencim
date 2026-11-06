'use client';

import React, { useMemo, useState } from 'react';
import { Users, Download, Printer, X } from '../icons';
import { createStudent } from '../../lib/supabaseClient';
import { Notice, NoticeState } from './TeacherUi';
import { CustomSelect } from '../CustomSelect';
import styles from './TeacherDashboard.module.css';

const MAX_ROWS = 60;
const randomPin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

interface ParsedRow { line: number; no: string; name: string; error?: string }
interface ResultRow { no: string; name: string; className: string; pin: string; ok: boolean; error?: string }

/**
 * Yapıştırılan listeyi çözer. Her satır: "numara ad soyad" (boşluk, sekme, ; veya , ile).
 * Numara satırın başında veya sonunda olabilir (Excel / e-Okul kopyası).
 */
export function parseStudentList(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/[\t;,]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    let tokens = parts.length > 1 ? parts : line.split(/\s+/);
    // Sıra numarası gibi baştaki "1." / "1)" atlanır
    if (tokens.length > 2 && /^\d+[.)]$/.test(tokens[0])) tokens = tokens.slice(1);
    let no = '';
    let nameParts: string[] = [];
    if (/^\d+$/.test(tokens[0])) { no = tokens[0]; nameParts = tokens.slice(1); }
    else if (/^\d+$/.test(tokens[tokens.length - 1])) { no = tokens[tokens.length - 1]; nameParts = tokens.slice(0, -1); }
    // Numara bulunamazsa satırın kendisi gösterilir (hangi satırın hatalı olduğu görünsün)
    const name = (no ? nameParts.join(' ') : line).replace(/\s+/g, ' ').trim();
    let error: string | undefined;
    if (!no) error = 'Okul numarası bulunamadı';
    else if (!name) error = 'Ad soyad yok';
    else if (no.length > 12) error = 'Numara çok uzun';
    else if (seen.has(no)) error = 'Listede tekrar eden numara';
    if (no) seen.add(no);
    rows.push({ line: i + 1, no, name: name.slice(0, 120), error });
  });
  return rows;
}

function toCsv(rows: ResultRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [['Okul No', 'Ad Soyad', 'Sınıf', 'PIN'].map(esc).join(';')];
  rows.filter((r) => r.ok).forEach((r) => lines.push([r.no, r.name, r.className, r.pin].map(esc).join(';')));
  // Excel'in Türkçe karakterleri doğru açması için BOM
  return '﻿' + lines.join('\r\n');
}

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

interface TeacherBulkStudentsProps {
  selectedClass: string;
  /** Öğretmenin sınıfları; öğrenciler yalnızca bunlara eklenir */
  classNames: string[];
  onClose: () => void;
  onDone: () => void;
}

export function TeacherBulkStudents({ selectedClass, classNames, onClose, onDone }: TeacherBulkStudentsProps) {
  const [className, setClassName] = useState(classNames.includes(selectedClass) ? selectedClass : classNames[0] || '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const parsed = useMemo(() => parseStudentList(text), [text]);
  const valid = parsed.filter((r) => !r.error);
  const invalid = parsed.filter((r) => r.error);

  const handleAdd = async () => {
    setNotice(null);
    if (!classNames.includes(className)) return setNotice({ kind: 'error', text: 'Öğrencileri yalnızca kendi sınıflarınızdan birine ekleyebilirsiniz.' });
    if (!valid.length) return setNotice({ kind: 'error', text: 'Eklenecek geçerli satır yok.' });
    if (valid.length > MAX_ROWS) return setNotice({ kind: 'error', text: `Tek seferde en fazla ${MAX_ROWS} öğrenci eklenebilir.` });
    setBusy(true);
    setProgress(0);
    const out: ResultRow[] = [];
    for (const r of valid) {
      const pin = randomPin();
      const res = await createStudent({ studentNumber: r.no, name: r.name, className, pin });
      out.push({ no: r.no, name: r.name, className, pin, ok: res.ok, error: res.ok ? undefined : res.error });
      setProgress(out.length);
    }
    setBusy(false);
    setResults(out);
    const okCount = out.filter((r) => r.ok).length;
    setNotice(okCount === out.length
      ? { kind: 'ok', text: `${okCount} öğrenci eklendi. PIN listesini şimdi indirebilir veya yazdırabilirsiniz; PIN'leri daha sonra Öğrenciler listesinde "PIN'leri göster" ile de görebilirsiniz.` }
      : { kind: 'error', text: `${okCount} öğrenci eklendi, ${out.length - okCount} öğrenci eklenemedi (aşağıda nedenleri var). Eklenenlerin PIN listesini şimdi alın.` });
    if (okCount) onDone();
  };

  const downloadCsv = () => {
    if (!results) return;
    const blob = new Blob([toCsv(results)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className || 'sinif'}-pin-listesi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    if (!results) return;
    const rows = results.filter((r) => r.ok);
    const win = window.open('', '_blank');
    if (!win) return setNotice({ kind: 'error', text: 'Yazdırma penceresi açılamadı. Tarayıcının açılır pencere iznini kontrol edin.' });
    const cards = rows.map((r) => `<div class="card"><b>${escapeHtml(r.name)}</b><span>Sınıf: ${escapeHtml(r.className)}</span><span>Okul No: <b>${escapeHtml(r.no)}</b></span><span>PIN: <b>${escapeHtml(r.pin)}</b></span><small>Giriş: tofutr.com · Okulunu seç, numara ve PIN'i gir.</small></div>`).join('');
    win.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(className)} PIN listesi</title><style>body{font-family:Arial,sans-serif;margin:16px;color:#20352d}h1{font-size:18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.card{border:1px dashed #888;border-radius:8px;padding:12px;display:grid;gap:4px;break-inside:avoid;font-size:14px}.card small{color:#555;font-size:11px}@media print{h1{display:none}}</style></head><body><h1>${escapeHtml(className)} – öğrenci giriş bilgileri (kesip öğrencilere dağıtın)</h1><div class="grid">${cards}</div><script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  };

  return (
    <section className={styles.panel} aria-labelledby="bulk-title">
      <div className={styles.listToolbar}>
        <h2 id="bulk-title" className={styles.panelTitle}><Users size={20} aria-hidden="true" />Toplu öğrenci ekle</h2>
        <button type="button" className={styles.secondary} onClick={onClose} aria-label="Toplu eklemeyi kapat"><X size={16} aria-hidden="true" /></button>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {!results ? (
        <>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="bulk-class">Sınıf</label>
              <CustomSelect
                id="bulk-class"
                value={className}
                onChange={(val) => setClassName(val)}
                options={classNames.map((c) => ({ value: c, label: c }))}
                placeholder="Sınıf seçin"
                disabled={busy}
              />
            </div>
            <label className={`${styles.field} ${styles.fullRow}`}>Öğrenci listesi
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                disabled={busy}
                placeholder={'Her satıra bir öğrenci: numara ve ad soyad\n1024 Ayşe Yılmaz\n1025 Mehmet Kaya\n\nExcel veya e-Okul listesinden iki sütunu kopyalayıp yapıştırabilirsiniz.'}
              />
            </label>
          </div>
          <p className={styles.hintText}>Her öğrenciye 4 haneli PIN otomatik üretilir. Ekleme bitince PIN listesini indirip veya yazdırıp öğrencilere dağıtırsınız.</p>

          {parsed.length > 0 && (
            <div className={styles.tableScroll}>
              <table className={styles.gradeTable}>
                <thead><tr><th scope="col">Satır</th><th scope="col">Okul No</th><th scope="col">Ad Soyad</th><th scope="col">Durum</th></tr></thead>
                <tbody>
                  {parsed.map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.no || '—'}</td>
                      <th scope="row"><span>{r.name || '—'}</span></th>
                      <td className={r.error ? styles.bulkBad : styles.bulkOk}>{r.error || 'Hazır'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.formActions}>
            {invalid.length > 0 && <span className={styles.mutedText}>{invalid.length} satır atlanacak</span>}
            <button type="button" className={styles.primary} disabled={busy || !valid.length || !className} onClick={handleAdd}>
              {busy ? `Ekleniyor… ${progress}/${valid.length}` : `${valid.length} öğrenciyi ${className || 'sınıfa'} ekle`}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.gradeTable}>
              <thead><tr><th scope="col">Okul No</th><th scope="col">Ad Soyad</th><th scope="col">PIN</th><th scope="col">Sonuç</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.no}>
                    <td>{r.no}</td>
                    <th scope="row"><span>{r.name}</span></th>
                    <td><strong>{r.ok ? r.pin : '—'}</strong></td>
                    <td className={r.ok ? styles.bulkOk : styles.bulkBad}>{r.ok ? 'Eklendi' : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.secondary} onClick={() => { setResults(null); setText(''); setNotice(null); }}>Yeni liste</button>
            <button type="button" className={styles.secondary} onClick={downloadCsv} disabled={!results.some((r) => r.ok)}><Download size={18} aria-hidden="true" />Excel (CSV) indir</button>
            <button type="button" className={styles.primary} onClick={printList} disabled={!results.some((r) => r.ok)}><Printer size={18} aria-hidden="true" />PIN kartlarını yazdır</button>
          </div>
        </>
      )}
    </section>
  );
}
