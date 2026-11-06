// Okuma yarışması veri katmanı (okuma hızı: 1 dakikada okunan kelime).
// Kurallar sunucuda: sıra/ad/tarih otomatik, "bitir" sonrası o gün ölçülenler kilitli,
// sonradan eklenenler "late" etiketiyle sıralamaya girer ama madalya almaz.
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export const READING_SECONDS = 60;
export const MAX_WORDS = 1000;

export interface ReadingContest {
  id: string;
  class_name: string;
  seq: number;
  title: string;
  contest_date: string;
  finished_at: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface ReadingResult {
  contest_id: string;
  student_id: string;
  words: number;
  late: boolean;
  updated_at: string;
}

const CONTEST_COLUMNS = 'id, class_name, seq, title, contest_date, finished_at, teacher_id, created_at';

// --------------------------------------------------------
// Öğretmen
// --------------------------------------------------------
/** Sınıfın yarışmaları (en yeni önce) ve öğretmenin girdiği bütün sonuçlar */
export async function listClassReading(className: string): Promise<Result<{ contests: ReadingContest[]; results: ReadingResult[] }>> {
  if (!className) return { ok: true, data: { contests: [], results: [] } };
  const { data, error } = await supabase
    .from('reading_contests')
    .select(CONTEST_COLUMNS)
    .eq('class_name', className)
    .order('seq', { ascending: false });
  if (error) return fail(error);
  const contests = (data as ReadingContest[]) || [];
  if (!contests.length) return { ok: true, data: { contests, results: [] } };
  const res = await supabase
    .from('reading_results')
    .select('contest_id, student_id, words, late, updated_at')
    .in('contest_id', contests.map((c) => c.id));
  if (res.error) return fail(res.error);
  return { ok: true, data: { contests, results: (res.data as ReadingResult[]) || [] } };
}

/** Yeni yarışma: ad, sıra ve tarih sunucuda atanır */
export async function createReadingContest(className: string): Promise<Result<ReadingContest>> {
  const { data, error } = await supabase
    .from('reading_contests')
    .insert({ class_name: className })
    .select(CONTEST_COLUMNS)
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as ReadingContest };
}

export async function setReadingContestFinished(id: string, finished: boolean): Promise<Result<ReadingContest>> {
  const { data, error } = await supabase
    .from('reading_contests')
    .update({ finished_at: finished ? new Date().toISOString() : null })
    .eq('id', id)
    .select(CONTEST_COLUMNS)
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as ReadingContest };
}

export async function deleteReadingContest(id: string): Promise<Result> {
  const { error, count } = await supabase.from('reading_contests').delete({ count: 'exact' }).eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Yarışma silinemedi (yalnızca kendi yarışmanızı silebilirsiniz).' };
  return { ok: true, data: undefined };
}

export async function saveReadingResult(contestId: string, studentId: string, words: number): Promise<Result<ReadingResult>> {
  if (!Number.isInteger(words) || words < 0 || words > MAX_WORDS) {
    return { ok: false, error: `Kelime sayısı 0 ile ${MAX_WORDS} arasında bir tam sayı olmalı.` };
  }
  const { data, error } = await supabase
    .from('reading_results')
    .upsert({ contest_id: contestId, student_id: studentId, words }, { onConflict: 'contest_id,student_id' })
    .select('contest_id, student_id, words, late, updated_at')
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as ReadingResult };
}

export async function deleteReadingResult(contestId: string, studentId: string): Promise<Result> {
  const { error } = await supabase.from('reading_results').delete().eq('contest_id', contestId).eq('student_id', studentId);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Sıralama hesapları (öğretmen ekranı; öğrencide aynısı sunucuda)
// --------------------------------------------------------
export interface RankedEntry {
  studentId: string;
  words: number;
  late: boolean;
  /** Herkes arasında sıra (eşit kelimede aynı sıra) */
  rank: number;
  /** O gün ölçülenler arasında ilk 3 (sonradan eklenen madalya almaz) */
  medal: 1 | 2 | 3 | null;
}

function competitionRanks<T>(list: T[], value: (x: T) => number): number[] {
  const out: number[] = [];
  list.forEach((x, i) => {
    out.push(i > 0 && value(x) === value(list[i - 1]) ? out[i - 1] : i + 1);
  });
  return out;
}

export function rankContest(results: ReadingResult[]): RankedEntry[] {
  const sorted = [...results].sort((a, b) => b.words - a.words);
  const ranks = competitionRanks(sorted, (r) => r.words);
  const day = sorted.filter((r) => !r.late);
  const dayRanks = competitionRanks(day, (r) => r.words);
  const dayRank = new Map(day.map((r, i) => [r.student_id, dayRanks[i]]));
  return sorted.map((r, i) => {
    const d = dayRank.get(r.student_id);
    return { studentId: r.student_id, words: r.words, late: r.late, rank: ranks[i], medal: d && d <= 3 ? (d as 1 | 2 | 3) : null };
  });
}

export interface GainEntry { studentId: string; gain: number; words: number; previous: number; rank: number }

/** Bir önceki yarışmaya göre gelişim (iki yarışmada da ölçülenler) */
export function rankGains(current: ReadingResult[], previous: ReadingResult[]): GainEntry[] {
  const prev = new Map(previous.map((r) => [r.student_id, r.words]));
  const list = current
    .filter((r) => prev.has(r.student_id))
    .map((r) => ({ studentId: r.student_id, words: r.words, previous: prev.get(r.student_id)!, gain: r.words - prev.get(r.student_id)! }))
    .sort((a, b) => b.gain - a.gain);
  const ranks = competitionRanks(list, (x) => x.gain);
  return list.map((x, i) => ({ ...x, rank: ranks[i] }));
}

// --------------------------------------------------------
// Öğrenci
// --------------------------------------------------------
export interface OverviewTopRow { name: string; words: number; rank: number; late: boolean; medal: 1 | 2 | 3 | null; me: boolean }
export interface OverviewGainRow { name: string; gain: number; rank: number; me: boolean }
export interface ReadingOverviewContest {
  id: string;
  seq: number;
  title: string;
  date: string;
  finished: boolean;
  participants: number;
  class_avg: number | null;
  mine: { words: number; rank: number; late: boolean; medal: 1 | 2 | 3 | null; gain: number | null; gain_rank: number | null } | null;
  top: OverviewTopRow[];
  top_gain: OverviewGainRow[];
}

/** Öğrencinin sınıfındaki yarışmalar (en yeni önce): kendi sonucu, ilk 10, gelişim */
export async function getReadingOverview(): Promise<Result<ReadingOverviewContest[]>> {
  const { data, error } = await supabase.rpc('reading_overview');
  if (error) return fail(error);
  return { ok: true, data: (data as ReadingOverviewContest[]) || [] };
}
