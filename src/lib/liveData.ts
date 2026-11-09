'use client';

// Canlı ders: oturum, tahta kopyası, çizim katmanları, anlık quiz, katılanlar.
// Yazma işlemlerinin hepsi sunucu fonksiyonlarıyla; okuma RLS ile. Realtime değişiklikleri RLS'e göre dağıtır.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';
import { BoardContent, byteSize, imageKey, mediaRefs, normalizeContent, StrokeEl } from './boardData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export const LIVE_PEN_SECONDS = 30;
export const LIVE_LAYER_MAX_BYTES = 256 * 1024;
/** Öğrencinin "buradayım" bildirimi; bu sürenin iki katı sessiz kalan "ayrıldı" sayılır */
export const LIVE_HEARTBEAT_MS = 30_000;
const MEDIA_URL_SECONDS = 8 * 3600;

export interface LiveQuestion {
  key: string;
  body: string;
  choices: string[];
  image_url: string | null;
  opened_at: string;
  closed: boolean;
  counts?: number[];
  total?: number;
  correct_index?: number;
  explanation?: string | null;
}

export interface LiveSession {
  id: string;
  teacher_id: string;
  class_name: string;
  board_id: string | null;
  title: string;
  page_index: number;
  step_state: Record<string, number>;
  question: LiveQuestion | null;
  projected_student: string | null;
  pen_student: string | null;
  pen_until: string | null;
  pen_all: boolean;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
}
const SESSION_COLUMNS = 'id, teacher_id, class_name, board_id, title, page_index, step_state, question, projected_student, pen_student, pen_until, pen_all, started_at, ended_at, updated_at';

export interface LiveLayer {
  id: number;
  session_id: string;
  page_id: string;
  kind: 'shared' | 'private';
  author_student: string | null;
  strokes: StrokeEl[];
  updated_at: string;
}

export interface LiveAnswer { question_key: string; student_id: string; choice: number; answered_at: string }
export interface LiveParticipant { student_id: string; joined_at: string; last_seen: string }

// --------------------------------------------------------
// Öğretmen
// --------------------------------------------------------
/** Tahtanın kopyasıyla canlı dersi başlatır; görsel/ses adresleri ders süresince (8 saat) geçerlidir */
export async function startLive(className: string, boardId: string, title: string, content: BoardContent): Promise<Result<string>> {
  if (!content.pages.length) return { ok: false, error: 'Tahtada en az bir sayfa olmalı.' };
  const refs = mediaRefs(content.pages);
  const media: Record<string, string> = {};
  const byBucket = new Map<string, string[]>();
  refs.forEach((r) => byBucket.set(r.bucket, Array.from(new Set([...(byBucket.get(r.bucket) || []), r.path]))));
  for (const [bucket, paths] of byBucket.entries()) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, MEDIA_URL_SECONDS);
    if (error) return fail(error);
    (data || []).forEach((d, i) => { if (d.signedUrl && !d.error) media[imageKey({ bucket, path: d.path || paths[i] })] = d.signedUrl; });
  }
  const { data, error } = await supabase.rpc('live_start', { p_class: className, p_board: boardId, p_title: title, p_content: content, p_media: media });
  if (error || !data) return fail(error);
  return { ok: true, data: String(data) };
}

export interface LivePatch {
  page_index?: number;
  step_state?: Record<string, number>;
  projected_student?: string | null;
  pen_student?: string | null;
  pen_seconds?: number;
  pen_all?: boolean;
  clear_question?: boolean;
}
export async function liveControl(sessionId: string, patch: LivePatch): Promise<Result> {
  const { error } = await supabase.rpc('live_control', { p_session: sessionId, p_patch: patch });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function liveOpenQuestion(sessionId: string, questionId: string, imageUrl: string | null): Promise<Result<LiveQuestion>> {
  const { data, error } = await supabase.rpc('live_open_question', { p_session: sessionId, p_question: questionId, p_image_url: imageUrl });
  if (error || !data) return fail(error);
  return { ok: true, data: data as LiveQuestion };
}

export async function liveCloseQuestion(sessionId: string, reveal: boolean): Promise<Result<LiveQuestion>> {
  const { data, error } = await supabase.rpc('live_close_question', { p_session: sessionId, p_reveal: reveal });
  if (error || !data) return fail(error);
  return { ok: true, data: data as LiveQuestion };
}

export async function liveClearShared(sessionId: string, pageId: string): Promise<Result> {
  const { error } = await supabase.rpc('live_clear_shared', { p_session: sessionId, p_page: pageId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function liveEnd(sessionId: string): Promise<Result> {
  const { error } = await supabase.rpc('live_end', { p_session: sessionId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/**
 * Canlı ders açılabilecek sınıflar (sunucudaki teacher_has_class ile aynı kural):
 * ana sınıf (profil) + Sınıflarım; okul yöneticisinde okulun bütün sınıfları.
 */
export async function listLiveClasses(): Promise<Result<string[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const [profile, classes] = await Promise.all([
    supabase.from('profiles').select('class_name, is_school_admin, school_id').eq('id', auth.user.id).maybeSingle(),
    supabase.from('teacher_classes').select('class_name').eq('teacher_id', auth.user.id),
  ]);
  if (profile.error) return fail(profile.error);
  if (classes.error) return fail(classes.error);
  const p = profile.data as { class_name: string | null; is_school_admin: boolean | null; school_id: string | null } | null;
  const names = new Set<string>();
  if (p?.class_name?.trim()) names.add(p.class_name.trim());
  ((classes.data as { class_name: string }[]) || []).forEach((c) => { if (c.class_name?.trim()) names.add(c.class_name.trim()); });
  if (p?.is_school_admin && p.school_id) {
    const { data } = await supabase.from('students').select('class_name').eq('school_id', p.school_id);
    ((data as { class_name: string | null }[]) || []).forEach((s) => { if (s.class_name?.trim()) names.add(s.class_name.trim()); });
  }
  const home = p?.class_name?.trim();
  const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  return { ok: true, data: home ? [home, ...sorted.filter((n) => n !== home)] : sorted };
}

/** Öğretmenin açık kalmış oturumu (sayfa yenilenince devam etmek için) */
export async function getMyOpenLive(): Promise<Result<LiveSession | null>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase.from('live_sessions').select(SESSION_COLUMNS)
    .eq('teacher_id', auth.user.id).is('ended_at', null)
    .gt('started_at', new Date(Date.now() - 8 * 3600_000).toISOString())
    .maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: (data as LiveSession | null) || null };
}

// --------------------------------------------------------
// Öğrenci
// --------------------------------------------------------
/** Öğrencinin sınıflarındaki açık canlı dersler */
export async function listMyLiveSessions(): Promise<Result<LiveSession[]>> {
  const { data, error } = await supabase.from('live_sessions').select(SESSION_COLUMNS)
    .is('ended_at', null)
    .gt('started_at', new Date(Date.now() - 8 * 3600_000).toISOString())
    .order('started_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as LiveSession[]) || [] };
}

export async function liveAnswer(sessionId: string, key: string, choice: number): Promise<Result> {
  const { error } = await supabase.rpc('live_answer', { p_session: sessionId, p_key: key, p_choice: choice });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function liveHeartbeat(sessionId: string): Promise<void> {
  await supabase.rpc('live_heartbeat', { p_session: sessionId });
}

// --------------------------------------------------------
// Ortak
// --------------------------------------------------------
export async function getLiveContent(sessionId: string): Promise<Result<{ content: BoardContent; media: Record<string, string> }>> {
  const { data, error } = await supabase.from('live_content').select('content, media').eq('session_id', sessionId).single();
  if (error || !data) return fail(error);
  const r = data as { content: unknown; media: Record<string, string> | null };
  return { ok: true, data: { content: normalizeContent(r.content), media: r.media || {} } };
}

export async function saveLiveLayer(sessionId: string, pageId: string, kind: 'shared' | 'private', strokes: StrokeEl[]): Promise<Result<string>> {
  if (byteSize(strokes) > LIVE_LAYER_MAX_BYTES) return { ok: false, error: 'Bu sayfadaki çizim sınırı doldu. Bazı çizgileri silip yeniden dene.' };
  const { data, error } = await supabase.rpc('live_save_layer', { p_session: sessionId, p_page: pageId, p_kind: kind, p_strokes: strokes });
  if (error) return fail(error);
  return { ok: true, data: String(data) };
}

const uniqueChannel = (name: string) => `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Oturumu canlı tutar: oturum satırı, çizim katmanları ve (öğretmen için) cevaplar ile katılanlar.
 * Realtime bağlantısı koparsa 15 sn'de bir yeniden okunur; bağlanınca aradaki değişiklikler tazelenir.
 */
export function useLiveSession(sessionId: string | null, opts: { teacher: boolean }) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [layers, setLayers] = useState<LiveLayer[]>([]);
  const [answers, setAnswers] = useState<LiveAnswer[]>([]);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const teacher = opts.teacher;
  const questionKey = session?.question?.key || null;
  const keyRef = useRef<string | null>(null);
  useEffect(() => { keyRef.current = questionKey; }, [questionKey]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const [s, l] = await Promise.all([
      supabase.from('live_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle(),
      supabase.from('live_layers').select('id, session_id, page_id, kind, author_student, strokes, updated_at').eq('session_id', sessionId),
    ]);
    if (s.error) { setError(s.error.message); return; }
    if (!s.data) { setError('Canlı ders bulunamadı ya da bitti.'); setSession(null); return; }
    setError(null);
    setSession(s.data as LiveSession);
    if (!l.error) setLayers((l.data as LiveLayer[]) || []);
    if (teacher) {
      const [a, p] = await Promise.all([
        supabase.from('live_answers').select('question_key, student_id, choice, answered_at').eq('session_id', sessionId),
        supabase.from('live_participants').select('student_id, joined_at, last_seen').eq('session_id', sessionId),
      ]);
      if (!a.error) setAnswers((a.data as LiveAnswer[]) || []);
      if (!p.error) setParticipants((p.data as LiveParticipant[]) || []);
    }
  }, [sessionId, teacher]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const load = () => { if (alive) void refresh(); };
    const first = setTimeout(load, 0);
    const filter = `session_id=eq.${sessionId}`;
    let channel = supabase
      .channel(uniqueChannel(`live-${sessionId}`))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        setSession(payload.new as LiveSession);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_layers', filter }, (payload) => {
        const row = payload.new as LiveLayer;
        if (!row?.id) return;
        setLayers((prev) => {
          const i = prev.findIndex((x) => x.id === row.id);
          if (i === -1) return [...prev, row];
          if (prev[i].updated_at > row.updated_at) return prev;
          const next = prev.slice();
          next[i] = row;
          return next;
        });
      });
    if (teacher) {
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_answers', filter }, (payload) => {
          const row = payload.new as LiveAnswer;
          if (!row?.student_id) return;
          setAnswers((prev) => [...prev.filter((a) => !(a.question_key === row.question_key && a.student_id === row.student_id)), row]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_participants', filter }, (payload) => {
          const row = payload.new as LiveParticipant;
          if (!row?.student_id) return;
          setParticipants((prev) => [...prev.filter((p) => p.student_id !== row.student_id), row]);
        });
    }
    channel.subscribe((status) => {
      if (!alive) return;
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') load();
    });
    const fallback = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [sessionId, teacher, refresh]);

  // Yansıtılan öğrenci değişince yeni öğrencinin katmanı okunur (RLS önceden göstermez)
  const projected = session?.projected_student ?? null;
  useEffect(() => {
    if (!sessionId || !projected) return;
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [sessionId, projected, refresh]);

  const currentAnswers = questionKey ? answers.filter((a) => a.question_key === questionKey) : [];
  return { session, setSession, layers, setLayers, answers: currentAnswers, participants, error, connected, refresh, keyRef };
}

/** Öğrencinin ana sayfası için: sınıfında açık canlı ders var mı (Realtime + 60 sn yedek) */
export function useMyLiveSessions(enabled: boolean) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => { listMyLiveSessions().then((r) => { if (alive && r.ok) setSessions(r.data); }); };
    const first = setTimeout(load, 0);
    const channel = supabase
      .channel(uniqueChannel('live-list'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, (payload) => {
        const row = payload.new as LiveSession;
        if (!row?.id) return;
        setSessions((prev) => {
          if (row.ended_at) return prev.filter((x) => x.id !== row.id);
          if (prev.some((x) => x.id === row.id)) return prev.map((x) => (x.id === row.id ? row : x));
          return [row, ...prev];
        });
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') load(); });
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearTimeout(first); clearInterval(t); supabase.removeChannel(channel); };
  }, [enabled]);
  return sessions;
}
