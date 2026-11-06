// Analitik ve raporlama: sınıf karnesi, öğrenci gelişimi, dışa aktarma (CSV/Excel, PNG, yazdır/PDF).
// Yeni tablo yok: notlar, puan geçmişi ve ödev kontrolleri mevcut RLS kurallarıyla okunur.
import { supabase } from './supabaseClient';
import { EXAMS, type ExamId, type Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

// --------------------------------------------------------
// İstatistik
// --------------------------------------------------------
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const round1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);
/** Türkçe ondalık: 72,5 */
export const fmt = (x: number | null | undefined, digits = 1) =>
  x == null ? '—' : x.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** MEB puan aralıkları (100'lük not → 1–5) */
export const GRADE_BANDS = [
  { label: '0–49', name: 'Başarısız (1)', min: 0, max: 49.99 },
  { label: '50–59', name: 'Geçer (2)', min: 50, max: 59.99 },
  { label: '60–69', name: 'Orta (3)', min: 60, max: 69.99 },
  { label: '70–84', name: 'İyi (4)', min: 70, max: 84.99 },
  { label: '85–100', name: 'Pekiyi (5)', min: 85, max: 100 },
];
export const bandCounts = (scores: number[]) => GRADE_BANDS.map((b) => scores.filter((s) => s >= b.min && s <= b.max).length);

export const EXAM_ORDER: ExamId[] = EXAMS.map((e) => e.id);
export const examLabel = (id: ExamId) => EXAMS.find((e) => e.id === id)?.label || id;

// --------------------------------------------------------
// Veri
// --------------------------------------------------------
export interface GradeCell { student_id: string; subject: string; exam: ExamId; score: number; updated_at: string }

export async function listGradesFor(studentIds: string[]): Promise<Result<GradeCell[]>> {
  if (!studentIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase.from('grades').select('student_id, subject, exam, score, updated_at').in('student_id', studentIds);
  if (error) return fail(error);
  return { ok: true, data: ((data as GradeCell[]) || []).map((g) => ({ ...g, score: Number(g.score) })) };
}

export interface CheckCell { homework_id: string; student_id: string; status: 'yapti' | 'kismen' | 'yapmadi' }

/** Öğretmenin bu sınıfa verdiği ödevlerin kontrolleri (ödev yapma oranı için) */
export async function listClassChecks(className: string): Promise<Result<{ homeworkCount: number; checks: CheckCell[] }>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const hw = await supabase.from('homeworks').select('id').eq('teacher_id', auth.user.id).eq('class_name', className);
  if (hw.error) return fail(hw.error);
  const ids = ((hw.data as { id: string }[]) || []).map((h) => h.id);
  if (!ids.length) return { ok: true, data: { homeworkCount: 0, checks: [] } };
  const checks = await supabase.from('homework_checks').select('homework_id, student_id, status').in('homework_id', ids);
  if (checks.error) return fail(checks.error);
  return { ok: true, data: { homeworkCount: ids.length, checks: (checks.data as CheckCell[]) || [] } };
}

export interface PointEvent { amount: number; created_at: string; reason: string }

/** Öğrencinin puan geçmişi (eskiden yeniye); öğretmen kendi okulundaki, öğrenci kendi geçmişini görür */
export async function listPointEvents(studentId: string): Promise<Result<PointEvent[]>> {
  const { data, error } = await supabase
    .from('points_history')
    .select('amount, created_at, reason')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })
    .limit(2000);
  if (error) return fail(error);
  return { ok: true, data: ((data as PointEvent[]) || []).map((p) => ({ ...p, amount: Number(p.amount) })) };
}

/**
 * Puanın günlere göre değişimi: her günün sonundaki toplam puan.
 * Başlangıç, bugünkü puandan geçmişteki değişimler çıkarılarak bulunur.
 */
export function pointsTimeline(events: PointEvent[], currentPoints: number): { day: string; value: number }[] {
  if (!events.length) return [];
  const dayOf = (iso: string) => new Date(iso).toLocaleDateString('sv-SE');
  let running = currentPoints - events.reduce((a, e) => a + e.amount, 0);
  // İlk nokta: ilk değişimden önceki puan
  const out = [{ day: dayOf(events[0].created_at), value: running }];
  for (const e of events) {
    running += e.amount;
    const d = dayOf(e.created_at);
    const last = out[out.length - 1];
    if (out.length > 1 && last.day === d) last.value = running;
    else out.push({ day: d, value: running });
  }
  return out;
}

// --------------------------------------------------------
// Dışa aktarma
// --------------------------------------------------------
type CsvValue = string | number | null | undefined;

/**
 * Excel'in Türkçe ayarlarında doğrudan açılan CSV: UTF-8 BOM, ";" ayırıcı, virgüllü ondalık.
 */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  const cell = (v: CsvValue) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? v.toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 2 }) : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, header: string[], rows: CsvValue[][]) {
  downloadBlob(new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' }), filename);
}

/** Dosya adı için güvenli parça: "8-A Sınıf Karnesi" → "8-A-sinif-karnesi" */
export const fileSlug = (s: string) =>
  s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rapor';

/** Grafiği (SVG) PNG olarak indirir; renkler SVG'nin içinde yazılı olmalı (dış CSS taşınmaz) */
export async function downloadSvgAsPng(svg: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const box = svg.viewBox.baseVal;
  const width = box && box.width ? box.width : svg.clientWidth;
  const height = box && box.height ? box.height : svg.clientHeight;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Görsel oluşturulamadı'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tarayıcı desteklemiyor');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Görsel oluşturulamadı');
  downloadBlob(blob, filename);
}
