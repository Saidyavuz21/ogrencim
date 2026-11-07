// Etkileşimli tahta: içerik modeli, tahtalar, görseller, ödeve gönderme, öğrenci çizimi.
// Sanal çözünürlük sabittir (1920×1080); her ekranda orantılı ölçeklenir.
import { supabase } from './supabaseClient';
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

export interface StrokeEl { id: string; type: 'stroke'; points: number[]; color: string; width: number; highlighter?: boolean }
export interface ShapeEl { id: string; type: 'line' | 'arrow' | 'rect' | 'ellipse'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; fill?: string | null }
export interface NoteEl { id: string; type: 'note'; x: number; y: number; w: number; h: number; text: string; color: string; fontSize: number }
export interface ImageEl { id: string; type: 'image'; x: number; y: number; w: number; h: number; bucket: string; path: string }
export type WidgetKind = 'minitest' | 'reveal' | 'steps' | 'timer';
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
  /** Kronometre: 0 = ileri sayım, >0 = geri sayım (sn) */
  seconds?: number;
}
export interface WidgetEl { id: string; type: 'widget'; kind: WidgetKind; x: number; y: number; w: number; h: number; data: WidgetData }
export type BoardEl = StrokeEl | ShapeEl | NoteEl | ImageEl | WidgetEl;
export interface BoardPage { id: string; background: Background; elements: BoardEl[] }
export interface BoardContent { version: 1; pages: BoardPage[] }
/** Öğrencinin çizim katmanı: sayfa kimliği → çizgiler */
export type DrawingLayer = Record<string, StrokeEl[]>;

export const WIDGET_LABEL: Record<WidgetKind, string> = { minitest: 'Mini Test', reveal: 'Cevabı Göster', steps: 'Adım Adım', timer: 'Kronometre' };
export const WIDGET_SIZE: Record<WidgetKind, { w: number; h: number }> = {
  minitest: { w: 720, h: 520 }, reveal: { w: 420, h: 200 }, steps: { w: 620, h: 460 }, timer: { w: 380, h: 240 },
};

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
export const newPage = (background: Background = 'blank'): BoardPage => ({ id: newId(), background, elements: [] });
export const emptyContent = (): BoardContent => ({ version: 1, pages: [newPage()] });
export const byteSize = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;

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

/** Hiçbir tahtada kullanılmayan görselleri depodan siler */
export async function cleanupBoardImages(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const [objs, boards] = await Promise.all([
    supabase.storage.from(BOARD_IMAGE_BUCKET).list(auth.user.id, { limit: 1000 }),
    supabase.from('boards').select('content').eq('teacher_id', auth.user.id),
  ]);
  if (objs.error || boards.error) return;
  const used = JSON.stringify(boards.data || []);
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

export async function uploadBoardImage(file: File): Promise<Result<{ path: string; w: number; h: number }>> {
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'Görsel 10 MB’tan büyük olamaz.' };
  const type = await sniffImage(file);
  if (!type) return { ok: false, error: 'Yalnızca JPG, PNG, WEBP ya da GIF eklenebilir.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const size = await imageSize(URL.createObjectURL(file), true);
  const path = `${auth.user.id}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).upload(path, file, { contentType: type, upsert: false });
  if (error) return fail(error);
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
      if (el.type === 'image' && el.bucket === BOARD_IMAGE_BUCKET) {
        let to = copied.get(el.path);
        if (!to) {
          to = `${schoolId || 'none'}/${homeworkId}/${safeFileName(el.path.split('/').pop() || 'gorsel.png')}`;
          const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).copy(el.path, to, { destinationBucket: HOMEWORK_BUCKET });
          if (error) return fail(error);
          copied.set(el.path, to);
        }
        elements.push({ ...el, bucket: HOMEWORK_BUCKET, path: to });
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

export async function exportBoardPng(svg: SVGSVGElement, filename: string): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(BOARD_W));
  clone.setAttribute('height', String(BOARD_H));
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
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Görsel oluşturulamadı')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = BOARD_W;
  canvas.height = BOARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tarayıcı desteklemiyor');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.drawImage(img, 0, 0, BOARD_W, BOARD_H);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Görsel oluşturulamadı');
  downloadBlob(blob, filename);
}
