// Etkileşimli tahta: içerik modeli, tahtalar, görseller, ödeve gönderme, öğrenci çizimi.
// Sanal çözünürlük sabittir (1920×1080); her ekranda orantılı ölçeklenir.
import { supabase } from './supabaseClient';
import { compressImage, QUOTA_FULL_MESSAGE } from './imageCompress';
import { getMySchoolId, HOMEWORK_BUCKET, safeFileName, type Result } from './teacherData';
import { downloadBlob } from './reportData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export const BOARD_W = 1920;
export const BOARD_H = 1080;
export const MAX_BOARD_BYTES = 5 * 1024 * 1024;
export const MAX_DRAWING_BYTES = 2 * 1024 * 1024;
export const MAX_PAGES = 50;
export const HISTORY_LIMIT = 50;
export const BOARD_IMAGE_BUCKET = 'board-images';
export const BOARD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// --------------------------------------------------------
// İçerik modeli
// --------------------------------------------------------
export type Background = 'blank' | 'grid' | 'lines' | 'dots' | 'coord';
export const BACKGROUND_LABEL: Record<Background, string> = { blank: 'Düz', grid: 'Kareli', lines: 'Çizgili', dots: 'Noktalı', coord: 'Koordinat' };

export interface ElementLib {
  id: string;
  params?: Record<string, number>;
  scale?: number;
}

export interface StrokeEl { id: string; type: 'stroke'; points: number[]; color: string; width: number; highlighter?: boolean; groupId?: string; lib?: ElementLib }
export interface ShapeEl { id: string; type: 'line' | 'arrow' | 'rect' | 'ellipse'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; fill?: string | null; groupId?: string; lib?: ElementLib; /** Dikdörtgen köşe yuvarlaklığı (yoksa 6) */ rx?: number }
export interface NoteEl {
  id: string;
  type: 'note';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  fontSize: number;
  variant?: 'text';                            // yoksa eski Not
  textColor?: string;                          // varsayılan #1f2a24
  fontFamily?: 'sans' | 'hand' | 'display' | 'school'; // varsayılan 'sans'
  fontWeight?: 300 | 400 | 700;                // ince / normal / kalın, varsayılan 400
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';         // varsayılan 'left'
  lineHeight?: 1 | 1.3 | 1.6 | 2;              // satır aralığı
  letterSpacing?: 0 | 0.05 | 0.1;              // em
  boxFill?: string | null;                     // yalnızca variant 'text': kutu zemini
  boxBorder?: string | null;                   // kutu kenarlığı rengi (2 px)
  boxRadius?: 0 | 12 | 999;                    // Keskin / Yuvarlak / Hap
  autoW?: boolean;                             // yalnızca variant 'text': kutu yazının genişliğine oturur; elle boyutlandırılınca kapanır
  groupId?: string;
  lib?: ElementLib;
}
export interface ImageEl { id: string; type: 'image'; x: number; y: number; w: number; h: number; bucket: string; path: string; groupId?: string; lib?: ElementLib }
export type WidgetKind = 'minitest' | 'reveal' | 'steps' | 'timer' | 'match' | 'audio';
/** Eşleştirme etkinliği: soldaki öğe ↔ sağdaki eşi */
export interface MatchPair { a: string; b: string }
/** Sesli not dosyası (öğretmenin klasöründe ya da ödev alanında) */
export interface AudioRef { bucket: string; path: string; seconds?: number }
export interface WidgetData {
  /** Mini Test (öğretmenin tahtasında): bankadaki soru */
  questionId?: string;
  /** Mini Test (ödeve gönderilmiş kopyada): quiz sorusu */
  itemId?: string;
  /** Cevabı Göster: bağlı Mini Test parçasının kimliği */
  targetId?: string;
  /** Adım Adım */
  title?: string;
  steps?: string[];
  lastIsResult?: boolean;
  /** Kronometre: 0 = ileri sayım, >0 = geri sayım (sn) */
  seconds?: number;
  /** Eşleştirme: 2–8 çift */
  pairs?: MatchPair[];
  /** Sesli not */
  audio?: AudioRef;
}
export interface WidgetEl { id: string; type: 'widget'; kind: WidgetKind; x: number; y: number; w: number; h: number; data: WidgetData; groupId?: string; lib?: ElementLib }
export interface PolyEl {
  id: string;
  type: 'poly';
  points: number[];          // [x1,y1,x2,y2,...], en az 3 nokta
  color: string;             // kenar rengi
  width: number;             // kenar kalınlığı (0 = kenarsız)
  fill?: string | null;      // dolgu (yoksa içi boş)
  groupId?: string;
  lib?: ElementLib;
}
export type BoardEl = StrokeEl | ShapeEl | NoteEl | ImageEl | WidgetEl | PolyEl;
export interface BoardPage { id: string; background: Background; elements: BoardEl[] }
export interface BoardContent { version: 1; pages: BoardPage[] }
/** Öğrencinin çizim katmanı: sayfa kimliği → çizgiler */
export type DrawingLayer = Record<string, StrokeEl[]>;

export const WIDGET_LABEL: Record<WidgetKind, string> = { minitest: 'Mini Test', reveal: 'Cevabı Göster', steps: 'Adım Adım', timer: 'Kronometre', match: 'Eşleştirme', audio: 'Sesli Not' };
export const WIDGET_SIZE: Record<WidgetKind, { w: number; h: number }> = {
  minitest: { w: 720, h: 520 }, reveal: { w: 420, h: 200 }, steps: { w: 620, h: 460 }, timer: { w: 380, h: 240 },
  match: { w: 860, h: 560 }, audio: { w: 460, h: 200 },
};
export const MATCH_MAX_PAIRS = 8;
export const AUDIO_MAX_SECONDS = 180;
export const AUDIO_MAX_BYTES = 5 * 1024 * 1024;

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
export const newPage = (background: Background = 'blank'): BoardPage => ({ id: newId(), background, elements: [] });
export const emptyContent = (): BoardContent => ({ version: 1, pages: [newPage()] });
export const byteSize = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;

export function isShape(el: BoardEl): el is ShapeEl {
  return el.type === 'line' || el.type === 'arrow' || el.type === 'rect' || el.type === 'ellipse';
}

/** Öğeleri kopyalar; yeni kimlikler verir, grupları kendi içinde yeni bağımsız gruplara eşler ve isteğe bağlı öteler */
export function cloneElements(els: BoardEl[], dx = 0, dy = 0): BoardEl[] {
  const groupMap = new Map<string, string>();
  return els.map((el) => {
    let nextGid = el.groupId;
    if (el.groupId) {
      if (!groupMap.has(el.groupId)) groupMap.set(el.groupId, newId());
      nextGid = groupMap.get(el.groupId);
    }
    const id = newId();
    const lib = el.lib
      ? {
          id: el.lib.id,
          params: el.lib.params ? { ...el.lib.params } : undefined,
          scale: el.lib.scale,
        }
      : undefined;
    if (el.type === 'stroke') {
      const points = (dx === 0 && dy === 0)
        ? [...el.points]
        : el.points.map((v, i) => Math.round(v + (i % 2 ? dy : dx)));
      return { ...el, id, points, groupId: nextGid, lib };
    }
    if (el.type === 'poly') {
      const points = (dx === 0 && dy === 0)
        ? [...el.points]
        : el.points.map((v, i) => Math.round(v + (i % 2 ? dy : dx)));
      return { ...el, id, points, groupId: nextGid, lib };
    }
    if (isShape(el)) {
      return {
        ...el,
        id,
        x1: Math.round(el.x1 + dx),
        y1: Math.round(el.y1 + dy),
        x2: Math.round(el.x2 + dx),
        y2: Math.round(el.y2 + dy),
        groupId: nextGid,
        lib,
      };
    }
    return {
      ...el,
      id,
      x: Math.round(el.x + dx),
      y: Math.round(el.y + dy),
      groupId: nextGid,
      lib,
    };
  });
}

function defaultWrapLinesFallback(text: string, maxWidth: number, fontSize: number): string[] {
  const perLine = Math.max(4, Math.floor(maxWidth / (fontSize * 0.54)));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if ((line ? `${line} ${word}` : word).length <= perLine) {
        line = line ? `${line} ${word}` : word;
      } else {
        if (line) out.push(line);
        let w = word;
        while (w.length > perLine) {
          out.push(w.slice(0, perLine));
          w = w.slice(perLine);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

export type TextWrapLinesFn = (
  text: string,
  maxWidth: number,
  fontSize: number,
  family?: 'sans' | 'hand' | 'display' | 'school',
  weight?: number,
  italic?: boolean,
  letterSpacing?: number
) => string[];

/**
 * Öğeleri verilen (ox, oy) dayanağına göre orantılı olarak ölçekler.
 * - stroke ve poly: tüm noktalar
 * - line/arrow/rect/ellipse: x1, y1, x2, y2 (çizgi kalınlığı değişmez)
 * - image: x, y, w, h
 * - widget: x, y, w, h (en az 160×100)
 * - note/metin: x, y, w; fontSize (12-200); metinde h wrapFn ile, notta h de ölçeklenir
 * - lib varsa lib.scale = (eski scale ?? 1) * s
 */
export function scaleElements(
  els: BoardEl[],
  ox: number,
  oy: number,
  s: number,
  wrapFn?: TextWrapLinesFn
): BoardEl[] {
  if (s <= 0) return els;
  return els.map((el) => {
    const nextLib: ElementLib | undefined = el.lib
      ? {
          ...el.lib,
          params: el.lib.params ? { ...el.lib.params } : undefined,
          scale: Number(((el.lib.scale ?? 1) * s).toFixed(4)),
        }
      : undefined;

    if (el.type === 'stroke') {
      const points = el.points.map((val, idx) =>
        Math.round(idx % 2 === 0 ? ox + (val - ox) * s : oy + (val - oy) * s)
      );
      return { ...el, points, lib: nextLib };
    }

    if (el.type === 'poly') {
      const points = el.points.map((val, idx) =>
        Math.round(idx % 2 === 0 ? ox + (val - ox) * s : oy + (val - oy) * s)
      );
      return { ...el, points, lib: nextLib };
    }

    if (isShape(el)) {
      const x1 = Math.round(ox + (el.x1 - ox) * s);
      const y1 = Math.round(oy + (el.y1 - oy) * s);
      const x2 = Math.round(ox + (el.x2 - ox) * s);
      const y2 = Math.round(oy + (el.y2 - oy) * s);
      const rx = el.rx != null ? Math.max(1, Math.round(el.rx * s)) : undefined;
      return { ...el, x1, y1, x2, y2, rx, lib: nextLib };
    }

    if (el.type === 'image') {
      const x = Math.round(ox + (el.x - ox) * s);
      const y = Math.round(oy + (el.y - oy) * s);
      const w = Math.max(20, Math.round(el.w * s));
      const h = Math.max(20, Math.round(el.h * s));
      return { ...el, x, y, w, h, lib: nextLib };
    }

    if (el.type === 'widget') {
      const x = Math.round(ox + (el.x - ox) * s);
      const y = Math.round(oy + (el.y - oy) * s);
      const w = Math.max(160, Math.round(el.w * s));
      const h = Math.max(100, Math.round(el.h * s));
      return { ...el, x, y, w, h, lib: nextLib };
    }

    if (el.type === 'note') {
      const x = Math.round(ox + (el.x - ox) * s);
      const y = Math.round(oy + (el.y - oy) * s);
      const w = Math.max(40, Math.round(el.w * s));
      const fontSize = Math.round(Math.max(12, Math.min(200, (el.fontSize || 42) * s)));

      if (el.variant === 'text') {
        const pad = el.boxFill || el.boxBorder ? 16 : 8;
        const availableW = Math.max(20, w - pad * 2);
        const lines = wrapFn
          ? wrapFn(el.text || ' ', availableW, fontSize, el.fontFamily, el.fontWeight, el.italic, el.letterSpacing)
          : defaultWrapLinesFallback(el.text || ' ', availableW, fontSize);
        const lineCount = Math.max(1, lines.length);
        const lh = el.lineHeight ?? 1.3;
        const h = Math.round(Math.max(fontSize + pad * 2, lineCount * fontSize * lh + pad * 2));
        return { ...el, x, y, w, h, fontSize, lib: nextLib };
      }

      const h = Math.max(40, Math.round(el.h * s));
      return { ...el, x, y, w, h, fontSize, lib: nextLib };
    }

    return el;
  });
}

/** Eski/eksik içeriği güvenli biçime getirir */
export function normalizeContent(raw: unknown): BoardContent {
  const c = raw as Partial<BoardContent> | null;
  const pages = Array.isArray(c?.pages) && c!.pages.length ? c!.pages : [newPage()];
  return { version: 1, pages: pages.map((p) => ({ id: p.id || newId(), background: p.background || 'blank', elements: Array.isArray(p.elements) ? p.elements : [] })) };
}

/** Kalem izini sadeleştirir: yakın noktaları atar, tam sayıya yuvarlar (boyut sınırı için) */
export function simplifyPoints(points: number[], minDist = 2.5): number[] {
  if (points.length <= 4) return points.map(Math.round);
  const out = [Math.round(points[0]), Math.round(points[1])];
  for (let i = 2; i < points.length - 2; i += 2) {
    const dx = points[i] - out[out.length - 2];
    const dy = points[i + 1] - out[out.length - 1];
    if (dx * dx + dy * dy >= minDist * minDist) out.push(Math.round(points[i]), Math.round(points[i + 1]));
  }
  out.push(Math.round(points[points.length - 2]), Math.round(points[points.length - 1]));
  return out;
}

// --------------------------------------------------------
// Tahtalar (öğretmen)
// --------------------------------------------------------
export interface BoardRow { id: string; title: string; subject: string | null; grade: string | null; category: string | null; content: BoardContent; created_at: string; updated_at: string }
export type BoardSummary = Omit<BoardRow, 'content'> & { pageCount: number };

export async function listBoards(): Promise<Result<BoardSummary[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('boards')
    .select('id, title, subject, grade, category, created_at, updated_at, pages:content->pages')
    .eq('teacher_id', auth.user.id)
    .order('updated_at', { ascending: false });
  if (error) return fail(error);
  type Raw = Omit<BoardRow, 'content'> & { pages: unknown[] | null };
  return { ok: true, data: ((data as unknown as Raw[]) || []).map(({ pages, ...b }) => ({ ...b, pageCount: Array.isArray(pages) ? pages.length : 0 })) };
}

export async function getBoard(id: string): Promise<Result<BoardRow>> {
  const { data, error } = await supabase.from('boards').select('id, title, subject, grade, category, content, created_at, updated_at').eq('id', id).single();
  if (error || !data) return fail(error);
  const b = data as BoardRow;
  return { ok: true, data: { ...b, content: normalizeContent(b.content) } };
}

export async function createBoard(title: string, subject: string | null, grade: string | null, content: BoardContent = emptyContent(), category: string | null = null): Promise<Result<BoardRow>> {
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, error: 'Tahtaya bir ad verin.' };
  const { data, error } = await supabase.from('boards').insert({ title: t, subject, grade, content, category: category?.trim().slice(0, 60) || null })
    .select('id, title, subject, grade, category, content, created_at, updated_at').single();
  if (error || !data) return fail(error);
  return { ok: true, data: { ...(data as BoardRow), content: normalizeContent((data as BoardRow).content) } };
}

export async function saveBoard(id: string, patch: Partial<Pick<BoardRow, 'title' | 'subject' | 'grade' | 'category' | 'content'>>): Promise<Result<string>> {
  if (patch.content && byteSize(patch.content) > MAX_BOARD_BYTES) return { ok: false, error: 'Tahta 5 MB sınırını aşıyor. Bazı çizim ya da sayfaları silin.' };
  if (patch.title !== undefined) {
    patch.title = patch.title.trim().slice(0, 120);
    if (!patch.title) return { ok: false, error: 'Tahtaya bir ad verin.' };
  }
  const { data, error } = await supabase.from('boards').update(patch).eq('id', id).select('updated_at').single();
  if (error || !data) return fail(error);
  return { ok: true, data: (data as { updated_at: string }).updated_at };
}

export async function deleteBoard(id: string): Promise<Result> {
  const { error } = await supabase.from('boards').delete().eq('id', id);
  if (error) return fail(error);
  void cleanupBoardImages();
  return { ok: true, data: undefined };
}

export async function duplicateBoard(id: string): Promise<Result<BoardRow>> {
  const src = await getBoard(id);
  if (!src.ok) return src;
  return createBoard(`${src.data.title} (kopya)`.slice(0, 120), src.data.subject, src.data.grade, src.data.content, src.data.category);
}

// --------------------------------------------------------
// Sürüm geçmişi: kaydedilen tahtanın 10 dakikada bir kopyası (en çok 20 sürüm, 90 gün)
// --------------------------------------------------------
export interface BoardVersion { id: number; created_at: string; page_count: number; bytes: number; reason: string }

export async function listBoardVersions(boardId: string): Promise<Result<BoardVersion[]>> {
  const { data, error } = await supabase
    .from('board_versions')
    .select('id, created_at, page_count, bytes, reason')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as BoardVersion[]) || [] };
}

export async function getBoardVersion(id: number): Promise<Result<BoardContent>> {
  const { data, error } = await supabase.from('board_versions').select('content').eq('id', id).single();
  if (error || !data) return fail(error);
  return { ok: true, data: normalizeContent((data as { content: unknown }).content) };
}

/** Sürüme döner; o anki hâli de sürüm olarak saklanır (geri dönüş de geri alınabilir) */
export async function restoreBoardVersion(versionId: number): Promise<Result<BoardContent>> {
  const { data, error } = await supabase.rpc('board_restore_version', { p_version: versionId });
  if (error || !data) return fail(error);
  return { ok: true, data: normalizeContent(data) };
}

/** Hiçbir tahtada kullanılmayan görselleri depodan siler */
export async function cleanupBoardImages(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const [objs, boards, versions] = await Promise.all([
    supabase.storage.from(BOARD_IMAGE_BUCKET).list(auth.user.id, { limit: 1000 }),
    supabase.from('boards').select('content').eq('teacher_id', auth.user.id),
    // Sürüm geçmişindeki dosyalar da korunur (geri dönülünce görseller/sesler kaybolmasın)
    supabase.from('board_versions').select('content').eq('teacher_id', auth.user.id),
  ]);
  if (objs.error || boards.error || versions.error) return;
  const used = JSON.stringify(boards.data || []) + JSON.stringify(versions.data || []);
  const unused = (objs.data || []).map((o) => `${auth.user!.id}/${o.name}`).filter((p) => !used.includes(p));
  if (unused.length) await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(unused);
}

// --------------------------------------------------------
// Görseller
// --------------------------------------------------------
async function sniffImage(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  return null;
}

export async function uploadBoardImage(original: File): Promise<Result<{ path: string; w: number; h: number }>> {
  // Yüklemeden önce küçültülür (uzun kenar 1600 px); GIF olduğu gibi kalır
  const file = await compressImage(original);
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'Görsel 10 MB’tan büyük olamaz.' };
  const type = await sniffImage(file);
  if (!type) return { ok: false, error: 'Yalnızca JPG, PNG, WEBP ya da GIF eklenebilir.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const size = await imageSize(URL.createObjectURL(file), true);
  const path = `${auth.user.id}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).upload(path, file, { contentType: type, upsert: false });
  if (error) return fail(/row-level security/i.test(error.message) ? { message: QUOTA_FULL_MESSAGE } : error);
  return { ok: true, data: { path, ...size } };
}

/** Dosyalarım / kütüphane / okul alanındaki resmi tahtaya kopyalar */
export async function copyImageToBoard(bucket: string, sourcePath: string, name: string): Promise<Result<{ path: string; w: number; h: number }>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const path = `${auth.user.id}/${safeFileName(name)}`;
  const { error } = await supabase.storage.from(bucket).copy(sourcePath, path, { destinationBucket: BOARD_IMAGE_BUCKET });
  if (error) return fail(error);
  const url = await supabase.storage.from(BOARD_IMAGE_BUCKET).createSignedUrl(path, 600);
  const size = url.data ? await imageSize(url.data.signedUrl) : { w: 800, h: 600 };
  return { ok: true, data: { path, ...size } };
}

function imageSize(url: string, revoke = false): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 }); if (revoke) URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ w: 800, h: 600 }); if (revoke) URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Görseller için süreli adresler: "bucket/yol" → adres */
export async function boardImageUrls(images: { bucket: string; path: string }[]): Promise<Record<string, string>> {
  const byBucket = new Map<string, string[]>();
  images.forEach((i) => byBucket.set(i.bucket, Array.from(new Set([...(byBucket.get(i.bucket) || []), i.path]))));
  const out: Record<string, string> = {};
  await Promise.all(Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
    // Yanıt istekle aynı sıradadır; yol alanı her sürümde dolu gelmeyebilir
    (data || []).forEach((d, i) => { if (d.signedUrl && !d.error) out[`${bucket}/${d.path || paths[i]}`] = d.signedUrl; });
  }));
  return out;
}
export const imageKey = (el: { bucket: string; path: string }) => `${el.bucket}/${el.path}`;

/** Tahtadaki bütün dosya başvuruları: görseller ve sesli notlar */
export function mediaRefs(pages: BoardPage[]): { bucket: string; path: string }[] {
  const out: { bucket: string; path: string }[] = [];
  for (const p of pages) {
    for (const el of p.elements) {
      if (el.type === 'image') out.push({ bucket: el.bucket, path: el.path });
      else if (el.type === 'widget' && el.kind === 'audio' && el.data.audio?.path) out.push({ bucket: el.data.audio.bucket, path: el.data.audio.path });
    }
  }
  return out;
}

const AUDIO_TYPES: Record<string, string> = { webm: 'audio/webm', ogg: 'audio/ogg', mp4: 'audio/mp4', m4a: 'audio/mp4', mp3: 'audio/mpeg', mpeg: 'audio/mpeg', wav: 'audio/wav' };

/** Sesli not (kayıt ya da dosya) öğretmenin tahta klasörüne yüklenir */
export async function uploadBoardAudio(blob: Blob, name: string, seconds?: number): Promise<Result<AudioRef>> {
  if (blob.size > AUDIO_MAX_BYTES) return { ok: false, error: 'Ses dosyası 5 MB’tan büyük olamaz.' };
  const base = (blob.type || '').split(';')[0].trim();
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = Object.values(AUDIO_TYPES).includes(base) ? base : AUDIO_TYPES[ext];
  if (!type) return { ok: false, error: 'Yalnızca ses dosyası (MP3, M4A, OGG, WEBM, WAV) eklenebilir.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const fileExt = Object.entries(AUDIO_TYPES).find(([, t]) => t === type)?.[0] || 'webm';
  const path = `${auth.user.id}/ses-${Date.now().toString(36)}.${fileExt}`;
  const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).upload(path, blob, { contentType: type, upsert: false });
  if (error) return fail(error);
  return { ok: true, data: { bucket: BOARD_IMAGE_BUCKET, path, seconds: seconds ? Math.round(seconds) : undefined } };
}

// --------------------------------------------------------
// Ödeve gönderme: görseller ödevin alanına kopyalanır, Mini Test soruları sunucuda dondurulur
// --------------------------------------------------------
export async function publishBoardToHomework(homeworkId: string, boardId: string): Promise<Result<number>> {
  const b = await getBoard(boardId);
  if (!b.ok) return b;
  if (!b.data.content.pages.some((p) => p.elements.length)) return { ok: false, error: 'Tahta boş; önce bir şeyler ekleyin.' };
  const schoolId = await getMySchoolId();
  const copied = new Map<string, string>();
  const pages: BoardPage[] = [];
  for (const p of b.data.content.pages) {
    const elements: BoardEl[] = [];
    for (const el of p.elements) {
      const copyFile = async (path: string, fallbackName: string): Promise<string | { error: string }> => {
        let to = copied.get(path);
        if (!to) {
          to = `${schoolId || 'none'}/${homeworkId}/${safeFileName(path.split('/').pop() || fallbackName)}`;
          const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).copy(path, to, { destinationBucket: HOMEWORK_BUCKET });
          if (error) return { error: error.message };
          copied.set(path, to);
        }
        return to;
      };
      if (el.type === 'image' && el.bucket === BOARD_IMAGE_BUCKET) {
        const to = await copyFile(el.path, 'gorsel.png');
        if (typeof to !== 'string') return { ok: false, error: to.error };
        elements.push({ ...el, bucket: HOMEWORK_BUCKET, path: to });
      } else if (el.type === 'widget' && el.kind === 'audio' && el.data.audio?.bucket === BOARD_IMAGE_BUCKET) {
        const to = await copyFile(el.data.audio.path, 'ses.webm');
        if (typeof to !== 'string') return { ok: false, error: to.error };
        elements.push({ ...el, data: { ...el.data, audio: { ...el.data.audio, bucket: HOMEWORK_BUCKET, path: to } } });
      } else {
        elements.push(el);
      }
    }
    pages.push({ ...p, elements });
  }
  const { data, error } = await supabase.rpc('board_publish', { p_hw: homeworkId, p_board: boardId, p_content: { version: 1, pages } });
  if (error) return fail(error);
  return { ok: true, data: Number(data) || 0 };
}

// --------------------------------------------------------
// Ödevdeki tahta, öğrenci çizimi
// --------------------------------------------------------
export async function getHomeworkBoard(homeworkId: string): Promise<Result<{ title: string; content: BoardContent }>> {
  const { data, error } = await supabase.from('homework_boards').select('title, content').eq('homework_id', homeworkId).single();
  if (error || !data) return fail(error);
  const r = data as { title: string; content: unknown };
  return { ok: true, data: { title: r.title, content: normalizeContent(r.content) } };
}

export async function getDrawing(homeworkId: string, studentId: string): Promise<Result<{ pages: DrawingLayer; updated_at: string } | null>> {
  const { data, error } = await supabase.from('board_drawings').select('pages, updated_at').eq('homework_id', homeworkId).eq('student_id', studentId).maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: (data as { pages: DrawingLayer; updated_at: string } | null) || null };
}

export async function saveMyDrawing(homeworkId: string, pages: DrawingLayer): Promise<Result<string>> {
  if (byteSize(pages) > MAX_DRAWING_BYTES) return { ok: false, error: 'Çizim 2 MB sınırını aşıyor. Bazı çizgileri silip yeniden dene.' };
  const { data, error } = await supabase.rpc('save_board_drawing', { p_hw: homeworkId, p_pages: pages });
  if (error) return fail(error);
  return { ok: true, data: String(data) };
}

export interface DrawingSummary { student_id: string; updated_at: string; strokes: number }
export async function listDrawings(homeworkId: string): Promise<Result<DrawingSummary[]>> {
  const { data, error } = await supabase.from('board_drawings').select('student_id, updated_at, pages').eq('homework_id', homeworkId);
  if (error) return fail(error);
  return {
    ok: true,
    data: ((data as { student_id: string; updated_at: string; pages: DrawingLayer }[]) || []).map((d) => ({
      student_id: d.student_id, updated_at: d.updated_at, strokes: Object.values(d.pages || {}).reduce((a, s) => a + (s?.length || 0), 0),
    })),
  };
}

/** "Cevabı Göster" (alıştırma): sunucu doğru cevabı döndürür, soru puansız çözülmüş sayılır */
export async function revealAnswer(homeworkId: string, itemId: string): Promise<Result<{ correct_index: number; explanation: string | null }>> {
  const { data, error } = await supabase.rpc('quiz_reveal', { p_hw: homeworkId, p_item: itemId });
  if (error || !data) return fail(error);
  return { ok: true, data: data as { correct_index: number; explanation: string | null } };
}

// --------------------------------------------------------
// Dışa aktarma: sayfa PNG (görseller içine gömülür)
// --------------------------------------------------------
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

import { stripMathDelimiters } from './math/parseMath';
import { stripRich } from './math/parseRich';

const fontCache: Record<string, string> = {};
let katexCssDataCache: string | null = null;

async function getEmbeddedKatexCss(): Promise<string | null> {
  if (katexCssDataCache) return katexCssDataCache;
  try {
    const res = await fetch('/fonts/katex/katex.min.css');
    if (!res.ok) return null;
    let cssText = await res.text();
    const fontNames = [
      'KaTeX_Main-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-Italic', 'KaTeX_Main-BoldItalic',
      'KaTeX_Math-Italic', 'KaTeX_Math-BoldItalic',
      'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular', 'KaTeX_Size4-Regular',
      'KaTeX_AMS-Regular', 'KaTeX_SansSerif-Regular', 'KaTeX_SansSerif-Bold', 'KaTeX_SansSerif-Italic',
      'KaTeX_Script-Regular', 'KaTeX_Typewriter-Regular', 'KaTeX_Caligraphic-Regular', 'KaTeX_Caligraphic-Bold',
      'KaTeX_Fraktur-Regular', 'KaTeX_Fraktur-Bold',
    ];
    await Promise.all(
      fontNames.map(async (name) => {
        const dataUrl = await fetchFontDataUrl(`/fonts/katex/${name}.woff2`);
        if (dataUrl) {
          const regex = new RegExp(`url\\([^)]*${name}[^)]*\\.woff2[^)]*\\)`, 'g');
          cssText = cssText.replace(regex, `url("${dataUrl}")`);
        }
      })
    );
    katexCssDataCache = cssText;
    return cssText;
  } catch {
    return null;
  }
}

async function fetchFontDataUrl(url: string): Promise<string | null> {
  if (fontCache[url]) return fontCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        fontCache[url] = result;
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface RenderBoardSvgOptions {
  width?: number;
  type?: 'image/png' | 'image/webp' | 'image/jpeg';
  quality?: number;
  onFallbackMath?: () => void;
}

export async function renderBoardSvgToBlob(
  svg: SVGSVGElement,
  options: RenderBoardSvgOptions = {}
): Promise<Blob> {
  const targetW = options.width ? Math.max(64, Math.round(options.width)) : BOARD_W;
  const targetH = options.width
    ? Math.max(36, Math.round((targetW * BOARD_H) / BOARD_W))
    : BOARD_H;
  const mimeType = options.type || 'image/png';
  const quality = options.quality;
  const hasForeignObject = !!svg.querySelector('foreignObject');

  const renderToBlob = async (targetSvg: SVGSVGElement): Promise<Blob> => {
    const clone = targetSvg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(BOARD_W));
    clone.setAttribute('height', String(BOARD_H));

    // CSS değişkenlerini somut yazı tipine çevir ve kullanılan web fontlarını bul
    const textElements = Array.from(clone.querySelectorAll('text, tspan'));
    let usesPatrickHand = false;
    let usesFredoka = false;
    let usesAndika = false;

    for (const el of textElements) {
      const styleAttr = el.getAttribute('style') || '';
      if (styleAttr.includes('var(--font-geist-sans)')) {
        el.setAttribute('style', styleAttr.replace(/var\(--font-geist-sans\)/g, 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'));
      }
      const family = (el.getAttribute('font-family') || '') + ' ' + styleAttr;
      if (family.includes('Patrick Hand')) usesPatrickHand = true;
      if (family.includes('Fredoka')) usesFredoka = true;
      if (family.includes('Andika')) usesAndika = true;
    }

    // Web yazı tiplerini SVG içine göm
    const fontCssRules: string[] = [];
    if (usesPatrickHand) {
      const patrickData = await fetchFontDataUrl('/fonts/patrick-hand.woff2');
      if (patrickData) {
        fontCssRules.push(`@font-face { font-family: 'Patrick Hand'; font-style: normal; font-weight: 400; src: url(${patrickData}) format('woff2'); }`);
      }
    }
    if (usesFredoka) {
      const [regular, light, bold] = await Promise.all([
        fetchFontDataUrl('/fonts/fredoka-regular.woff2'),
        fetchFontDataUrl('/fonts/fredoka-light.woff2'),
        fetchFontDataUrl('/fonts/fredoka-bold.woff2'),
      ]);
      if (regular) fontCssRules.push(`@font-face { font-family: 'Fredoka'; font-style: normal; font-weight: 400; src: url(${regular}) format('woff2'); }`);
      if (light) fontCssRules.push(`@font-face { font-family: 'Fredoka'; font-style: normal; font-weight: 300; src: url(${light}) format('woff2'); }`);
      if (bold) fontCssRules.push(`@font-face { font-family: 'Fredoka'; font-style: normal; font-weight: 700; src: url(${bold}) format('woff2'); }`);
    }
    if (usesAndika) {
      const [regular, bold] = await Promise.all([
        fetchFontDataUrl('/fonts/andika-regular.woff2'),
        fetchFontDataUrl('/fonts/andika-bold.woff2'),
      ]);
      if (regular) fontCssRules.push(`@font-face { font-family: 'Andika'; font-style: normal; font-weight: 400; src: url(${regular}) format('woff2'); }`);
      if (bold) fontCssRules.push(`@font-face { font-family: 'Andika'; font-style: normal; font-weight: 700; src: url(${bold}) format('woff2'); }`);
    }

    // foreignObject varsa KaTeX CSS ve fontlarını göm
    const foreignObjects = Array.from(clone.querySelectorAll('foreignObject'));
    if (foreignObjects.length > 0) {
      for (const fo of foreignObjects) {
        for (const child of Array.from(fo.children)) {
          if (!child.getAttribute('xmlns')) {
            child.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
          }
        }
      }
      const katexCss = await getEmbeddedKatexCss();
      if (katexCss) {
        fontCssRules.push(katexCss);
      }
    }

    if (fontCssRules.length > 0) {
      let defs = clone.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        clone.insertBefore(defs, clone.firstChild);
      }
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = fontCssRules.join('\n');
      defs.appendChild(styleEl);
    }

    const images = Array.from(clone.querySelectorAll('image'));
    await Promise.all(images.map(async (img) => {
      const href = img.getAttribute('href');
      if (!href || href.startsWith('data:')) return;
      const data = await toDataUrl(href);
      if (data) img.setAttribute('href', data);
      else img.remove();
    }));

    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Görsel oluşturulamadı'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Tarayıcı desteklemiyor');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas toBlob başarısız'));
          }, mimeType, quality);
        } catch (err) {
          reject(err);
        }
      });
      if (!blob) throw new Error('Görsel oluşturulamadı');
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  try {
    return await renderToBlob(svg);
  } catch (err) {
    if (hasForeignObject) {
      try {
        const fallbackSvg = svg.cloneNode(true) as SVGSVGElement;
        const fos = Array.from(fallbackSvg.querySelectorAll('foreignObject'));
        for (const fo of fos) {
          const rawText = fo.textContent || '';
          const cleanText = stripMathDelimiters(stripRich(rawText));
          const x = fo.getAttribute('x') || '0';
          const y = fo.getAttribute('y') || '0';
          const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('x', String(Number(x) + 8));
          textEl.setAttribute('y', String(Number(y) + 36));
          textEl.setAttribute('font-size', '36');
          textEl.setAttribute('fill', '#1f2a24');
          textEl.textContent = cleanText;
          fo.parentNode?.replaceChild(textEl, fo);
        }
        const blob = await renderToBlob(fallbackSvg);
        options.onFallbackMath?.();
        return blob;
      } catch {
        // Fallback da başarısız olursa orijinal hatayı fırlat
      }
    }
    throw err;
  }
}

export async function exportBoardPng(
  svg: SVGSVGElement,
  filename: string,
  onNotice?: (msg: string) => void
): Promise<void> {
  const blob = await renderBoardSvgToBlob(svg, {
    type: 'image/png',
    onFallbackMath: () => onNotice?.('Formüller resimde düz yazı olarak çıktı.'),
  });
  downloadBlob(blob, filename);
}
