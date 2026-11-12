// Bilgi yarışması: sınıfta tek ekranda oynanan takımlı yarışma.
// Kurallar (puanlama, joker, sıra) burada saf fonksiyonlardır; kayıt Supabase'de quiz_shows tablosundadır.
import { supabase } from './supabaseClient';
import type { QuestionRow } from './quizData';
import type { Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message?.replace(/^.*?ERROR:\s*/, '') || 'Bilinmeyen hata',
});

// --------------------------------------------------------
// Türler
// --------------------------------------------------------
export const TEAM_COLORS = [
  { id: 'coral', name: 'Mercan', background: '#f4c9bc' },
  { id: 'blue', name: 'Mavi', background: '#c5dfee' },
  { id: 'lavender', name: 'Lavanta', background: '#ddd2ee' },
  { id: 'mint', name: 'Nane', background: '#cce3cc' },
  { id: 'gold', name: 'Sarı', background: '#f1dfa6' },
  { id: 'pink', name: 'Pembe', background: '#efd0dc' },
];
export const teamBackground = (color: string) => TEAM_COLORS.find((c) => c.id === color)?.background || TEAM_COLORS[0].background;

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;
export const MAX_SHOW_QUESTIONS = 50;
export const HISTORY_LIMIT = 50;

export type ShowMode = 'score' | 'questions';
export type ShowStatus = 'playing' | 'finished';
/** Soru puan değeri: kolay 1, orta 2, zor 3 */
export type ShowLevel = 1 | 2 | 3;
export const LEVEL_LABEL: Record<ShowLevel, string> = { 1: 'Kolay', 2: 'Orta', 3: 'Zor' };
/** Yanlış cevapta: puan yok / eksi puan / soru sıradaki takıma geçer */
export type WrongRule = 'none' | 'minus' | 'pass';
export const WRONG_RULE_LABEL: Record<WrongRule, string> = {
  none: 'Puan yok',
  minus: 'Eksi puan',
  pass: 'Soru diğer takıma geçer',
};
/** Cevaplama: her soruyu tüm takımlar birlikte cevaplar / sırası gelen tek takım cevaplar */
export type ShowFormat = 'all' | 'turn';
export const FORMAT_LABEL: Record<ShowFormat, string> = {
  all: 'Tüm takımlar cevaplar',
  turn: 'Takımlar sırayla cevaplar',
};
export const SECONDS_OPTIONS = [0, 15, 30, 45, 60];

export interface ShowTeam {
  name: string;
  color: string;
  /** Öğrenci kimlikleri (gruplardan aktarıldıysa ya da sınıf dağıtıldıysa) */
  members: string[];
  score: number;
  /** Kullanılan jokerler (takım başına birer hak) */
  usedDouble?: boolean;
  usedHalf?: boolean;
}

export interface ShowQuestion {
  id: string;
  body: string;
  image_path: string | null;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  level: ShowLevel;
}

export interface ShowSettings {
  /** Soru süresi (sn); 0 = süre yok */
  seconds: number;
  /** Eski kayıtlarda yoktur: 'turn' sayılır */
  format: ShowFormat;
  wrong: WrongRule;
  jokers: boolean;
}

/** Bir soruya verilen cevap (choice = null: süre doldu) */
export interface ShowAnswer {
  q: number;
  team: number;
  choice: number | null;
  correct: boolean;
  points: number;
}

/** Açık sorunun o anki durumu */
export interface ShowRound {
  /** Cevap sırası kimde */
  turn: number;
  /** Bu soruda cevap vermiş takımlar */
  tried: number[];
  /** Yanlış olduğu görülen şıklar */
  eliminated: number[];
  /** Yarı yarıya jokeriyle gizlenen şıklar */
  hidden: number[];
  /** Çift puan jokeri bu soruda kimde etkin (yoksa null) */
  doubleFor: number | null;
  /** Tüm takımlar kipinde: takım sırasına göre işaretlenen şık (null: işaretlenmedi / boş) */
  picks: (number | null)[];
  /** Tüm takımlar kipinde: bu soruda çift puan jokerini açan takımlar */
  doubles: number[];
  /** Doğru cevap ekranda */
  revealed: boolean;
}

export interface ShowState {
  version: 1;
  teams: ShowTeam[];
  questions: ShowQuestion[];
  settings: ShowSettings;
  /** Açık sorunun sırası (questions.length = sorular bitti) */
  current: number;
  round: ShowRound;
  answers: ShowAnswer[];
}

export const DEFAULT_SETTINGS: ShowSettings = { seconds: 30, format: 'all', wrong: 'none', jokers: true };

export const newTeam = (index: number): ShowTeam => ({
  name: `Takım ${index + 1}`,
  color: TEAM_COLORS[index % TEAM_COLORS.length].id,
  members: [],
  score: 0,
});

const newRound = (questionIndex: number, teamCount: number): ShowRound => ({
  turn: teamCount ? questionIndex % teamCount : 0,
  tried: [],
  eliminated: [],
  hidden: [],
  doubleFor: null,
  picks: Array.from({ length: teamCount }, () => null),
  doubles: [],
  revealed: false,
});

export function newShowState(teams: ShowTeam[], questions: ShowQuestion[], settings: ShowSettings): ShowState {
  return { version: 1, teams, questions, settings, current: 0, round: newRound(0, teams.length), answers: [] };
}

export const questionFromBank = (q: QuestionRow, level: ShowLevel): ShowQuestion => ({
  id: q.id,
  body: q.body,
  image_path: q.image_path,
  choices: q.choices,
  correct_index: q.correct_index,
  explanation: q.explanation,
  level,
});

// --------------------------------------------------------
// Oyun kuralları (saf fonksiyonlar)
// --------------------------------------------------------
export const currentQuestion = (s: ShowState): ShowQuestion | undefined => s.questions[s.current];
export const questionsDone = (s: ShowState) => s.questions.length > 0 && s.current >= s.questions.length;

/** Elle puan düzeltme (skor kipi ve yarışma sırasında öğretmen düzeltmesi) */
export function adjustScore(s: ShowState, team: number, delta: number): ShowState {
  return { ...s, teams: s.teams.map((t, i) => (i === team ? { ...t, score: t.score + delta } : t)) };
}

/** Sıradaki takım çift puan jokerini bu soru için açar */
export function playDouble(s: ShowState): ShowState {
  const q = currentQuestion(s);
  const team = s.teams[s.round.turn];
  if (!q || !team || !s.settings.jokers || s.round.revealed || team.usedDouble || s.round.doubleFor !== null) return s;
  return {
    ...s,
    teams: s.teams.map((t, i) => (i === s.round.turn ? { ...t, usedDouble: true } : t)),
    round: { ...s.round, doubleFor: s.round.turn },
  };
}

/** Yarı yarıya jokeriyle gizlenebilecek şık var mı (en az 3 görünür şık gerekir) */
export function canUseHalf(s: ShowState): boolean {
  const q = currentQuestion(s);
  const team = s.teams[s.round.turn];
  // Tüm takımlar kipinde şıklar herkes için aynı ekranda: yarı yarıya kullanılmaz
  if (!q || !team || !s.settings.jokers || s.settings.format === 'all' || s.round.revealed || team.usedHalf) return false;
  const visible = q.choices.map((_, i) => i).filter((i) => !s.round.hidden.includes(i) && !s.round.eliminated.includes(i));
  return visible.length >= 3;
}

/**
 * Yarı yarıya: görünen yanlış şıkların yarısı (aşağı yuvarlanır, en az biri) gizlenir.
 * Hangi şıkların gizleneceği dışarıdan verilen sıralamayla seçilir (rastgelelik çağıranda).
 */
export function playHalf(s: ShowState, shuffle: <T>(list: T[]) => T[]): ShowState {
  if (!canUseHalf(s)) return s;
  const q = currentQuestion(s)!;
  const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.correct_index && !s.round.hidden.includes(i) && !s.round.eliminated.includes(i));
  const hide = shuffle(wrong).slice(0, Math.max(1, Math.floor(wrong.length / 2)));
  return {
    ...s,
    teams: s.teams.map((t, i) => (i === s.round.turn ? { ...t, usedHalf: true } : t)),
    round: { ...s.round, hidden: [...s.round.hidden, ...hide] },
  };
}

/** Sıradaki takımın cevabı (choice = null: süre doldu). Kurala göre puanlar, sırayı geçirir ya da soruyu kapatır. */
export function answer(s: ShowState, choice: number | null): ShowState {
  const q = currentQuestion(s);
  if (!q || s.round.revealed) return s;
  const team = s.round.turn;
  if (choice !== null && (choice < 0 || choice >= q.choices.length || s.round.hidden.includes(choice) || s.round.eliminated.includes(choice))) return s;
  const correct = choice === q.correct_index;
  const double = s.round.doubleFor === team ? 2 : 1;
  let points = 0;
  if (correct) points = q.level * double;
  else if (s.settings.wrong === 'minus') points = -q.level;
  const teams = points ? s.teams.map((t, i) => (i === team ? { ...t, score: t.score + points } : t)) : s.teams;
  const answers = [...s.answers, { q: s.current, team, choice, correct, points }];
  const tried = [...s.round.tried, team];

  if (!correct && s.settings.wrong === 'pass' && tried.length < s.teams.length) {
    // Soru, henüz denememiş sıradaki takıma geçer; yanlış şık elenir
    let next = team;
    do { next = (next + 1) % s.teams.length; } while (tried.includes(next));
    return {
      ...s, teams, answers,
      round: { ...s.round, turn: next, tried, eliminated: choice === null ? s.round.eliminated : [...s.round.eliminated, choice] },
    };
  }
  return { ...s, teams, answers, round: { ...s.round, tried, revealed: true } };
}

/** Tüm takımlar kipi: bir takımın söylediği/yazdığı şıkkı işaretler; aynı şık yeniden seçilirse işaret kalkar */
export function pickAnswer(s: ShowState, team: number, choice: number): ShowState {
  const q = currentQuestion(s);
  if (!q || s.settings.format !== 'all' || s.round.revealed || team < 0 || team >= s.teams.length || choice < 0 || choice >= q.choices.length) return s;
  const picks = s.teams.map((_, i) => s.round.picks[i] ?? null);
  picks[team] = picks[team] === choice ? null : choice;
  return { ...s, round: { ...s.round, picks } };
}

/** Tüm takımlar kipi: takım bu soru için çift puan jokerini açar (yarışmada bir kez) */
export function playDoubleFor(s: ShowState, team: number): ShowState {
  const t = s.teams[team];
  if (!currentQuestion(s) || !t || s.settings.format !== 'all' || !s.settings.jokers || s.round.revealed || t.usedDouble) return s;
  return {
    ...s,
    teams: s.teams.map((x, i) => (i === team ? { ...x, usedDouble: true } : x)),
    round: { ...s.round, doubles: [...s.round.doubles, team] },
  };
}

/** Tüm takımlar kipi: doğru cevabı açar ve her takımı işaretlenen şıkkına göre puanlar (işaretsiz = boş, puan değişmez) */
export function revealAll(s: ShowState): ShowState {
  const q = currentQuestion(s);
  if (!q || s.settings.format !== 'all' || s.round.revealed) return s;
  const given = s.teams.map((_, team) => {
    const choice = s.round.picks[team] ?? null;
    const correct = choice === q.correct_index;
    const points = correct ? q.level * (s.round.doubles.includes(team) ? 2 : 1) : choice !== null && s.settings.wrong === 'minus' ? -q.level : 0;
    return { q: s.current, team, choice, correct, points };
  });
  return {
    ...s,
    teams: s.teams.map((t, i) => ({ ...t, score: t.score + given[i].points })),
    answers: [...s.answers, ...given],
    round: { ...s.round, tried: s.teams.map((_, i) => i), revealed: true },
  };
}

/** Cevap beklenmeden doğru cevabı gösterir (puan yok) */
export function reveal(s: ShowState): ShowState {
  if (!currentQuestion(s) || s.round.revealed) return s;
  return { ...s, round: { ...s.round, revealed: true } };
}

/** Sonraki soruya geçer; son sorudan sonra current = questions.length olur */
export function nextQuestion(s: ShowState): ShowState {
  if (!currentQuestion(s)) return s;
  const current = s.current + 1;
  return { ...s, current, round: newRound(current, s.teams.length) };
}

/** Sıralama: puana göre; eşit puanlılar aynı sırayı paylaşır */
export function ranking(teams: ShowTeam[]): { team: ShowTeam; index: number; rank: number }[] {
  const sorted = teams.map((team, index) => ({ team, index })).sort((a, b) => b.team.score - a.team.score || a.index - b.index);
  let rank = 0;
  return sorted.map((row, i) => {
    if (i === 0 || row.team.score !== sorted[i - 1].team.score) rank = i + 1;
    return { ...row, rank };
  });
}

/** Birinci olan takım(lar)ın öğrencileri (davranış puanı için) */
export function winnerMembers(teams: ShowTeam[]): string[] {
  const rows = ranking(teams).filter((r) => r.rank === 1);
  // Herkes eşitse kazanan yoktur
  if (rows.length === teams.length) return [];
  return Array.from(new Set(rows.flatMap((r) => r.team.members)));
}

/** Kayıttan gelen içeriği güvenli biçime getirir (eksik alanlar varsayılanla dolar) */
export function normalizeState(raw: unknown): ShowState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ShowState>;
  const teamsIn = Array.isArray(r.teams) ? r.teams.slice(0, MAX_TEAMS) : [];
  const teams: ShowTeam[] = teamsIn.map((t, i) => {
    const v = (t && typeof t === 'object' ? t : {}) as Partial<ShowTeam>;
    return {
      name: typeof v.name === 'string' ? v.name.slice(0, 40) : newTeam(i).name,
      color: TEAM_COLORS.some((c) => c.id === v.color) ? (v.color as string) : newTeam(i).color,
      members: Array.isArray(v.members) ? v.members.filter((id): id is string => typeof id === 'string') : [],
      score: typeof v.score === 'number' && Number.isSafeInteger(v.score) ? v.score : 0,
      usedDouble: v.usedDouble === true || undefined,
      usedHalf: v.usedHalf === true || undefined,
    };
  });
  while (teams.length < MIN_TEAMS) teams.push(newTeam(teams.length));
  const questions: ShowQuestion[] = (Array.isArray(r.questions) ? r.questions.slice(0, MAX_SHOW_QUESTIONS) : []).flatMap((q) => {
    const v = (q && typeof q === 'object' ? q : {}) as Partial<ShowQuestion>;
    if (typeof v.body !== 'string' || !Array.isArray(v.choices) || typeof v.correct_index !== 'number') return [];
    const choices = v.choices.filter((c): c is string => typeof c === 'string');
    if (choices.length < 2 || v.correct_index < 0 || v.correct_index >= choices.length) return [];
    return [{
      id: typeof v.id === 'string' ? v.id : '',
      body: v.body,
      image_path: typeof v.image_path === 'string' ? v.image_path : null,
      choices,
      correct_index: v.correct_index,
      explanation: typeof v.explanation === 'string' ? v.explanation : null,
      level: v.level === 2 || v.level === 3 ? v.level : 1,
    }];
  });
  const st = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as Partial<ShowSettings>;
  const settings: ShowSettings = {
    seconds: SECONDS_OPTIONS.includes(st.seconds as number) ? (st.seconds as number) : DEFAULT_SETTINGS.seconds,
    format: st.format === 'all' ? 'all' : 'turn',
    wrong: st.wrong === 'minus' || (st.wrong === 'pass' && st.format !== 'all') ? st.wrong : 'none',
    jokers: st.jokers !== false,
  };
  const current = typeof r.current === 'number' && r.current >= 0 ? Math.min(Math.floor(r.current), questions.length) : 0;
  const rd = (r.round && typeof r.round === 'object' ? r.round : {}) as Partial<ShowRound>;
  const idx = (list: unknown, max: number) => (Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max) : []);
  const base = newRound(current, teams.length);
  const choiceCount = questions[current]?.choices.length || 0;
  const round: ShowRound = {
    turn: Number.isInteger(rd.turn) && (rd.turn as number) >= 0 && (rd.turn as number) < teams.length ? (rd.turn as number) : base.turn,
    tried: idx(rd.tried, teams.length),
    eliminated: idx(rd.eliminated, choiceCount),
    hidden: idx(rd.hidden, choiceCount),
    doubleFor: Number.isInteger(rd.doubleFor) && (rd.doubleFor as number) < teams.length ? (rd.doubleFor as number) : null,
    picks: teams.map((_, i) => {
      const v = Array.isArray(rd.picks) ? rd.picks[i] : null;
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) < choiceCount ? (v as number) : null;
    }),
    doubles: idx(rd.doubles, teams.length),
    revealed: rd.revealed === true,
  };
  const answers: ShowAnswer[] = (Array.isArray(r.answers) ? r.answers : []).flatMap((a) => {
    const v = (a && typeof a === 'object' ? a : {}) as Partial<ShowAnswer>;
    if (!Number.isInteger(v.q) || !Number.isInteger(v.team)) return [];
    return [{ q: v.q as number, team: v.team as number, choice: Number.isInteger(v.choice) ? (v.choice as number) : null, correct: v.correct === true, points: Number.isInteger(v.points) ? (v.points as number) : 0 }];
  });
  return { version: 1, teams, questions, settings, current, round, answers };
}

// --------------------------------------------------------
// Kayıtlar
// --------------------------------------------------------
export interface QuizShowRow {
  id: string;
  title: string;
  class_name: string | null;
  mode: ShowMode;
  status: ShowStatus;
  state: ShowState;
  awarded_at: string | null;
  awarded_points: number | null;
  created_at: string;
  updated_at: string;
}
const COLUMNS = 'id, title, class_name, mode, status, state, awarded_at, awarded_points, created_at, updated_at';
const toRow = (data: unknown): QuizShowRow => {
  const row = data as QuizShowRow;
  return { ...row, state: normalizeState(row.state) };
};

export async function listQuizShows(): Promise<Result<QuizShowRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('quiz_shows')
    .select(COLUMNS)
    .eq('teacher_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) return fail(error);
  return { ok: true, data: (data || []).map(toRow) };
}

export async function createQuizShow(input: { title: string; className: string | null; mode: ShowMode; state: ShowState }): Promise<Result<QuizShowRow>> {
  const { data, error } = await supabase
    .from('quiz_shows')
    .insert({ title: input.title.trim().slice(0, 120), class_name: input.className || null, mode: input.mode, status: 'playing', state: input.state })
    .select(COLUMNS)
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: toRow(data) };
}

export async function saveQuizShow(id: string, patch: { state?: ShowState; status?: ShowStatus; title?: string }): Promise<Result> {
  const row: Record<string, unknown> = {};
  if (patch.state) row.state = patch.state;
  if (patch.status) row.status = patch.status;
  if (patch.title !== undefined) row.title = patch.title.trim().slice(0, 120);
  const { error } = await supabase.from('quiz_shows').update(row).eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function deleteQuizShow(id: string): Promise<Result> {
  const { error } = await supabase.from('quiz_shows').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Biten yarışmada kazanan takımın öğrencilerine davranış puanı verir (yarışma başına bir kez) */
export async function awardQuizShow(id: string, studentIds: string[], points: number): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('quiz_show_award', { p_show: id, p_student_ids: studentIds, p_points: points });
  if (error) return fail(error);
  return { ok: true, data: data as number };
}

// --------------------------------------------------------
// Eski skor tabelasından aktarma (tarayıcıda sınıfa göre saklanan takımlar)
// --------------------------------------------------------
export const legacyScoreKey = (className: string) => `takim-skor:${className}`;

/** Skor tabelasında bu sınıf için kayıtlı takımlar (adlar, renkler, üyeler, puanlar); yoksa null */
export function readLegacyTeams(className: string): ShowTeam[] | null {
  if (typeof window === 'undefined' || !className) return null;
  try {
    const raw = window.localStorage.getItem(legacyScoreKey(className));
    if (!raw) return null;
    const saved = JSON.parse(raw) as unknown;
    if (!Array.isArray(saved) || saved.length < MIN_TEAMS || saved.length > MAX_TEAMS) return null;
    return normalizeState({ teams: saved }).teams;
  } catch {
    return null;
  }
}
