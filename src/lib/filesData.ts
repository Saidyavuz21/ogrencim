// Öğretmen dosyaları, klasörler, etiketler, sınıfla paylaşım, setler ve ortak kütüphane.
// Kurallar sunucuda: sahiplik, kota (500 MB), paylaşımın yalnızca kendi sınıflarına yapılması,
// öğrencinin yalnızca kendi sınıfıyla paylaşılanı görmesi.
import { supabase } from './supabaseClient';
import { formatBytes, safeFileName, type Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: friendly(error?.message || 'Bilinmeyen hata'),
});

/** Sunucu hatalarını öğretmenin anlayacağı dile çevirir */
function friendly(message: string) {
  if (/row-level security|violates row-level/i.test(message)) return 'Bu işlem için yetkiniz yok.';
  if (/duplicate key.*teacher_folders/i.test(message)) return 'Bu adla bir klasörünüz zaten var.';
  if (/duplicate key.*teacher_shares/i.test(message)) return 'Bu sınıfla zaten paylaşılmış.';
  if (/Payload too large|maximum allowed size|exceeded the maximum/i.test(message)) return 'Dosya 25 MB sınırını aşıyor.';
  if (/mime type .* is not supported|invalid_mime_type/i.test(message)) return 'Bu dosya türü desteklenmiyor.';
  return message;
}

export const FILES_BUCKET = 'teacher-files';
export const LIBRARY_BUCKET = 'library';
export const FILE_QUOTA_BYTES = 500 * 1024 * 1024;
export const MAX_TEACHER_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_AT_ONCE = 20;

// --------------------------------------------------------
// Dosya türleri
// --------------------------------------------------------
const OFFICE_TYPES: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Seçicide gösterilecek uzantılar */
export const TEACHER_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

const extOf = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');

/**
 * Gerçek türü ilk baytlardan bulur. Office dosyaları ZIP (docx/pptx/xlsx) ya da OLE (doc/ppt/xls) imzası
 * taşır; hangisi olduğunu uzantı söyler (imza uzantıyla uyuşmalı).
 */
export async function detectTeacherFileType(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));
  const ext = extOf(file.name);
  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif';
  }
  const isZip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  const isOle = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
  if (isZip && ['docx', 'pptx', 'xlsx'].includes(ext)) return OFFICE_TYPES[ext];
  if (isOle && ['doc', 'ppt', 'xls'].includes(ext)) return OFFICE_TYPES[ext];
  return null;
}

export type FileKind = 'pdf' | 'image' | 'word' | 'slides' | 'sheet' | 'other';
export function fileKind(mime: string): FileKind {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('word')) return 'word';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slides';
  if (mime.includes('sheet') || mime.includes('excel')) return 'sheet';
  return 'other';
}
export const KIND_LABEL: Record<FileKind, string> = { pdf: 'PDF', image: 'Resim', word: 'Word', slides: 'Sunum', sheet: 'Tablo', other: 'Dosya' };
/** Tarayıcıda açılabilir mi (HEIC çoğu tarayıcıda açılmaz → indirilir) */
export const canPreview = (mime: string) => mime === 'application/pdf' || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime);

/** Kademe seçenekleri */
export const GRADE_OPTIONS = ['Anaokulu', '1. sınıf', '2. sınıf', '3. sınıf', '4. sınıf', '5. sınıf', '6. sınıf', '7. sınıf', '8. sınıf', '9. sınıf', '10. sınıf', '11. sınıf', '12. sınıf'];

// --------------------------------------------------------
// Klasörler
// --------------------------------------------------------
export interface FolderRow { id: string; name: string; position: number; created_at: string }

export async function listFolders(): Promise<Result<FolderRow[]>> {
  const { data, error } = await supabase.from('teacher_folders').select('id, name, position, created_at').order('position').order('created_at');
  if (error) return fail(error);
  return { ok: true, data: (data as FolderRow[]) || [] };
}

export async function createFolder(name: string, position: number): Promise<Result<FolderRow>> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: 'Klasör adı yazın.' };
  const { data, error } = await supabase.from('teacher_folders').insert({ name: clean, position }).select('id, name, position, created_at').single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as FolderRow };
}

export async function renameFolder(id: string, name: string): Promise<Result> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: 'Klasör adı yazın.' };
  const { error } = await supabase.from('teacher_folders').update({ name: clean }).eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Klasör silinir; içindeki dosyalar silinmez, "Klasörsüz"e geçer */
export async function deleteFolder(id: string): Promise<Result> {
  const { error } = await supabase.from('teacher_folders').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function reorderFolders(ids: string[]): Promise<Result> {
  const { error } = await supabase.rpc('reorder_teacher_folders', { p_ids: ids });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Dosyalar
// --------------------------------------------------------
export interface TeacherFileRow {
  id: string;
  folder_id: string | null;
  name: string;
  path: string;
  size: number;
  mime: string;
  grade: string | null;
  subject: string | null;
  topic: string | null;
  tags: string[];
  position: number;
  created_at: string;
}
const FILE_COLUMNS = 'id, folder_id, name, path, size, mime, grade, subject, topic, tags, position, created_at';

export async function listMyFiles(): Promise<Result<TeacherFileRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('teacher_files')
    .select(FILE_COLUMNS)
    .eq('teacher_id', auth.user.id)
    .order('position')
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as TeacherFileRow[]) || [] };
}

export interface FileMeta { grade?: string | null; subject?: string | null; topic?: string | null; tags?: string[] }

/** Seçilen dosyaları denetler (tür, boyut, kota); sorun varsa açıklamasını döndürür */
export function checkUploadBatch(files: File[], usedBytes: number): string | null {
  if (files.length > MAX_UPLOAD_AT_ONCE) return `Tek seferde en fazla ${MAX_UPLOAD_AT_ONCE} dosya yükleyebilirsiniz.`;
  for (const f of files) {
    if (f.size > MAX_TEACHER_FILE_BYTES) return `"${f.name}" 25 MB'tan büyük (${formatBytes(f.size)}).`;
    if (f.size === 0) return `"${f.name}" boş bir dosya.`;
  }
  const total = files.reduce((a, f) => a + f.size, 0);
  if (usedBytes + total > FILE_QUOTA_BYTES) {
    return `Depolama alanınız yetmiyor: ${formatBytes(FILE_QUOTA_BYTES - usedBytes)} boş, seçilenler ${formatBytes(total)}.`;
  }
  return null;
}

/**
 * Dosyaları yükler. Her dosya ayrı denenir; biri başarısız olursa ötekiler yine yüklenir.
 * Kayıt yazılamazsa yüklenen dosya geri silinir (yarım kayıt kalmaz).
 */
export async function uploadTeacherFiles(
  files: File[],
  folderId: string | null,
  meta: FileMeta,
  startPosition: number,
  onProgress?: (done: number, total: number) => void,
): Promise<{ uploaded: TeacherFileRow[]; errors: string[] }> {
  const uploaded: TeacherFileRow[] = [];
  const errors: string[] = [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { uploaded, errors: ['Oturum bulunamadı.'] };
  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length);
    const type = await detectTeacherFileType(file).catch(() => null);
    if (!type) {
      errors.push(`"${file.name}": desteklenmeyen ya da bozuk dosya (PDF, resim, Word, PowerPoint, Excel yüklenebilir).`);
      continue;
    }
    const path = `${auth.user.id}/${safeFileName(file.name)}`;
    const up = await supabase.storage.from(FILES_BUCKET).upload(path, file, { contentType: type, upsert: false });
    if (up.error) {
      errors.push(`"${file.name}": ${friendly(up.error.message)}`);
      continue;
    }
    const { data, error } = await supabase.from('teacher_files').insert({
      folder_id: folderId,
      name: file.name.slice(0, 160),
      path,
      size: file.size,
      mime: type,
      grade: meta.grade || null,
      subject: meta.subject || null,
      topic: meta.topic || null,
      tags: meta.tags || [],
      position: startPosition + i,
    }).select(FILE_COLUMNS).single();
    if (error || !data) {
      await supabase.storage.from(FILES_BUCKET).remove([path]);
      errors.push(`"${file.name}": ${friendly(error?.message || 'kaydedilemedi')}`);
      continue;
    }
    uploaded.push(data as TeacherFileRow);
  }
  onProgress?.(files.length, files.length);
  return { uploaded, errors };
}

export async function updateFile(id: string, patch: Partial<Pick<TeacherFileRow, 'name' | 'folder_id' | 'grade' | 'subject' | 'topic' | 'tags'>>): Promise<Result<TeacherFileRow>> {
  const clean = { ...patch };
  if (clean.name !== undefined) {
    clean.name = clean.name.trim().slice(0, 160);
    if (!clean.name) return { ok: false, error: 'Dosya adı boş olamaz.' };
  }
  const { data, error } = await supabase.from('teacher_files').update(clean).eq('id', id).select(FILE_COLUMNS).single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as TeacherFileRow };
}

export async function moveFiles(ids: string[], folderId: string | null): Promise<Result> {
  if (!ids.length) return { ok: true, data: undefined };
  const { error } = await supabase.from('teacher_files').update({ folder_id: folderId }).in('id', ids);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function reorderFiles(ids: string[]): Promise<Result> {
  const { error } = await supabase.rpc('reorder_teacher_files', { p_ids: ids });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Dosya kalıcı olarak silinir (paylaşımları ve setlerdeki yeri de); ödevlere eklenmiş kopyalar etkilenmez */
export async function deleteFiles(rows: Pick<TeacherFileRow, 'id' | 'path'>[]): Promise<Result> {
  if (!rows.length) return { ok: true, data: undefined };
  const { error } = await supabase.from('teacher_files').delete().in('id', rows.map((r) => r.id));
  if (error) return fail(error);
  // Kayıt silindikten sonra depodaki dosya (silinemezse yalnızca yer kaplar, görünmez)
  await supabase.storage.from(FILES_BUCKET).remove(rows.map((r) => r.path));
  return { ok: true, data: undefined };
}

/** Özel dosya için 10 dakikalık bağlantı; download verilirse indirme olarak açılır */
export async function signedFileUrl(bucket: string, path: string, download?: string): Promise<Result<string>> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600, download ? { download } : undefined);
  if (error || !data) return fail(error);
  return { ok: true, data: data.signedUrl };
}

export interface FileUsage { used: number; quota: number }
export async function getFileUsage(): Promise<Result<FileUsage>> {
  const { data, error } = await supabase.rpc('teacher_storage_used');
  if (error) return fail(error);
  return { ok: true, data: { used: Number(data) || 0, quota: FILE_QUOTA_BYTES } };
}

// --------------------------------------------------------
// Setler
// --------------------------------------------------------
export interface SetItemRow { file_id: string; position: number }
export interface ContentSetRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  items: SetItemRow[];
}

export async function listMySets(): Promise<Result<ContentSetRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('content_sets')
    .select('id, title, description, created_at, items:content_set_items(file_id, position)')
    .eq('teacher_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  const sets = ((data as ContentSetRow[]) || []).map((s) => ({ ...s, items: [...(s.items || [])].sort((a, b) => a.position - b.position) }));
  return { ok: true, data: sets };
}

export async function createSet(title: string, description: string): Promise<Result<ContentSetRow>> {
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, error: 'Set adı yazın.' };
  const { data, error } = await supabase
    .from('content_sets')
    .insert({ title: t, description: description.trim().slice(0, 500) || null })
    .select('id, title, description, created_at')
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: { ...(data as Omit<ContentSetRow, 'items'>), items: [] } };
}

export async function updateSet(id: string, title: string, description: string): Promise<Result> {
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, error: 'Set adı yazın.' };
  const { error } = await supabase.from('content_sets').update({ title: t, description: description.trim().slice(0, 500) || null }).eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function deleteSet(id: string): Promise<Result> {
  const { error } = await supabase.from('content_sets').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Setin dosyalarını verilen sırayla kaydeder (eklenen/çıkarılan dahil) */
export async function saveSetItems(setId: string, before: string[], after: string[]): Promise<Result> {
  const removed = before.filter((id) => !after.includes(id));
  const added = after.filter((id) => !before.includes(id));
  if (removed.length) {
    const { error } = await supabase.from('content_set_items').delete().eq('set_id', setId).in('file_id', removed);
    if (error) return fail(error);
  }
  if (added.length) {
    const { error } = await supabase.from('content_set_items').insert(added.map((file_id) => ({ set_id: setId, file_id, position: after.indexOf(file_id) })));
    if (error) return fail(error);
  }
  const { error } = await supabase.rpc('reorder_set_items', { p_set: setId, p_ids: after });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Sınıfla paylaşım
// --------------------------------------------------------
export interface ShareRow {
  id: string;
  class_name: string;
  file_id: string | null;
  set_id: string | null;
  note: string | null;
  created_at: string;
}

export async function listMyShares(): Promise<Result<ShareRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('teacher_shares')
    .select('id, class_name, file_id, set_id, note, created_at')
    .eq('teacher_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as ShareRow[]) || [] };
}

/** Seçilen sınıflarla paylaşır; zaten paylaşılmış sınıflar atlanır */
export async function shareWithClasses(target: { fileId?: string; setId?: string }, classes: string[], note: string): Promise<Result<ShareRow[]>> {
  if (!classes.length) return { ok: false, error: 'En az bir sınıf seçin.' };
  const rows = classes.map((class_name) => ({
    class_name,
    file_id: target.fileId || null,
    set_id: target.setId || null,
    note: note.trim().slice(0, 300) || null,
  }));
  const { data, error } = await supabase.from('teacher_shares').insert(rows).select('id, class_name, file_id, set_id, note, created_at');
  if (error) return fail(error);
  return { ok: true, data: (data as ShareRow[]) || [] };
}

export async function removeShare(id: string): Promise<Result> {
  const { error } = await supabase.from('teacher_shares').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Ortak kütüphane
// --------------------------------------------------------
export interface LibraryItemRow {
  id: string;
  title: string;
  path: string;
  size: number;
  mime: string;
  category: string | null;
  tags: string[];
  created_at: string;
}
const LIBRARY_COLUMNS = 'id, title, path, size, mime, category, tags, created_at';

/** Kütüphane dosyasının indirme/ödev adı: başlık + depodaki uzantı */
export const libraryFileName = (i: Pick<LibraryItemRow, 'title' | 'path'>) => {
  const dot = i.path.lastIndexOf('.');
  const ext = dot > 0 ? i.path.slice(dot) : '';
  return ext && !i.title.toLowerCase().endsWith(ext.toLowerCase()) ? `${i.title}${ext}` : i.title;
};

export async function listLibrary(): Promise<Result<LibraryItemRow[]>> {
  const { data, error } = await supabase.from('library_items').select(LIBRARY_COLUMNS).order('category').order('title');
  if (error) return fail(error);
  return { ok: true, data: (data as LibraryItemRow[]) || [] };
}

/** Yönetici: kütüphaneye yükler */
export async function uploadLibraryItems(files: File[], meta: { category: string; tags: string[] }): Promise<{ uploaded: LibraryItemRow[]; errors: string[] }> {
  const uploaded: LibraryItemRow[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (file.size > MAX_TEACHER_FILE_BYTES) { errors.push(`"${file.name}" 25 MB'tan büyük.`); continue; }
    const type = await detectTeacherFileType(file).catch(() => null);
    if (!type) { errors.push(`"${file.name}": desteklenmeyen ya da bozuk dosya.`); continue; }
    const path = safeFileName(file.name);
    const up = await supabase.storage.from(LIBRARY_BUCKET).upload(path, file, { contentType: type, upsert: false });
    if (up.error) { errors.push(`"${file.name}": ${friendly(up.error.message)}`); continue; }
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || file.name.slice(0, 120);
    const { data, error } = await supabase.from('library_items').insert({
      title, path, size: file.size, mime: type, category: meta.category.trim().slice(0, 60) || null, tags: meta.tags,
    }).select(LIBRARY_COLUMNS).single();
    if (error || !data) {
      await supabase.storage.from(LIBRARY_BUCKET).remove([path]);
      errors.push(`"${file.name}": ${friendly(error?.message || 'kaydedilemedi')}`);
      continue;
    }
    uploaded.push(data as LibraryItemRow);
  }
  return { uploaded, errors };
}

export async function updateLibraryItem(id: string, patch: Partial<Pick<LibraryItemRow, 'title' | 'category' | 'tags'>>): Promise<Result<LibraryItemRow>> {
  const { data, error } = await supabase.from('library_items').update(patch).eq('id', id).select(LIBRARY_COLUMNS).single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as LibraryItemRow };
}

export async function deleteLibraryItem(item: Pick<LibraryItemRow, 'id' | 'path'>): Promise<Result> {
  const { error } = await supabase.from('library_items').delete().eq('id', item.id);
  if (error) return fail(error);
  await supabase.storage.from(LIBRARY_BUCKET).remove([item.path]);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Öğrenci: Ders materyalleri
// --------------------------------------------------------
export interface MaterialFile { id: string; name: string; path: string; size: number; mime: string; subject: string | null; topic: string | null }
export interface MaterialShare {
  id: string;
  teacher_name: string;
  note: string | null;
  created_at: string;
  file: MaterialFile | null;
  set: { id: string; title: string; description: string | null; files: MaterialFile[] } | null;
}

const MAT_FILE = 'id, name, path, size, mime, subject, topic';

export async function listMyMaterials(): Promise<Result<MaterialShare[]>> {
  const { data, error } = await supabase
    .from('teacher_shares')
    .select(`id, teacher_name, note, created_at, file:teacher_files(${MAT_FILE}), set:content_sets(id, title, description, items:content_set_items(position, file:teacher_files(${MAT_FILE})))`)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  type RawSet = { id: string; title: string; description: string | null; items: { position: number; file: MaterialFile | null }[] };
  type Raw = Omit<MaterialShare, 'set'> & { set: RawSet | null };
  const rows = ((data as unknown as Raw[]) || []).map((r) => ({
    ...r,
    set: r.set
      ? {
          id: r.set.id,
          title: r.set.title,
          description: r.set.description,
          files: [...(r.set.items || [])].sort((a, b) => a.position - b.position).map((i) => i.file).filter((f): f is MaterialFile => !!f),
        }
      : null,
  }));
  // Silinmiş/erişilemeyen içerikler listelenmez
  return { ok: true, data: rows.filter((r) => r.file || r.set) };
}
