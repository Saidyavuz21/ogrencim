import { supabase } from '../supabaseClient';
import { BoardEl, cloneElements } from '../boardData';
import { getElementsBbox } from './insert';
import { LibraryCategory, LibraryItem } from './types';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: { message?: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export interface UserLibraryRow {
  id: string;
  teacher_id: string;
  school_id: string | null;
  name: string;
  category: LibraryCategory;
  elements: BoardEl[];
  visibility: 'private' | 'school';
  created_at: string;
  updated_at: string;
}

export interface SchoolLibraryRow {
  id: string;
  name: string;
  category: string;
  elements: BoardEl[];
  updated_at: string;
  author_name: string;
}

export function userRowToItem(row: UserLibraryRow): LibraryItem {
  const cat = (['matematik', 'fen', 'genel', 'diger'].includes(row.category)
    ? row.category
    : 'diger') as LibraryCategory;
  return {
    id: `user:${row.id}`,
    name: row.name,
    category: cat,
    keywords: [],
    build: () => row.elements || [],
    source: 'mine',
    rowId: row.id,
    visibility: row.visibility,
  };
}

export function schoolRowToItem(row: SchoolLibraryRow): LibraryItem {
  const cat = (['matematik', 'fen', 'genel', 'diger'].includes(row.category)
    ? row.category
    : 'diger') as LibraryCategory;
  return {
    id: `user:${row.id}`,
    name: row.name,
    category: cat,
    keywords: [],
    build: () => row.elements || [],
    source: 'school',
    rowId: row.id,
    authorName: row.author_name,
    visibility: 'school',
  };
}

/**
 * Öğretmenin kendi kütüphane kayıtlarını listeler (updated_at azalan).
 */
export async function listMyLibraryItems(): Promise<Result<LibraryItem[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };

  const { data, error } = await supabase
    .from('board_library_items')
    .select('*')
    .eq('teacher_id', auth.user.id)
    .order('updated_at', { ascending: false });

  if (error) return fail(error);
  const rows = (data as UserLibraryRow[]) || [];
  return { ok: true, data: rows.map(userRowToItem) };
}

export interface SaveLibraryItemInput {
  name: string;
  category: LibraryCategory;
  elements: BoardEl[];
  visibility?: 'private' | 'school';
}

/**
 * Tahtadan seçilen öğeleri öğretmenin kütüphanesine kaydeder.
 * - Öğeleri (0,0) noktasına kaydırır.
 * - groupId ve lib alanlarını temizler.
 * - Resim veya minitest/reveal içeren seçimleri reddeder.
 */
export async function saveLibraryItem(input: SaveLibraryItemInput): Promise<Result<LibraryItem>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };

  const trimmedName = input.name.trim().slice(0, 80);
  if (!trimmedName) return { ok: false, error: 'Şekle bir ad verin.' };

  if (!input.elements || input.elements.length === 0) {
    return { ok: false, error: 'Kaydedilecek öğe yok.' };
  }

  // İstemci tarafı doğrulama: resim ve minitest/reveal parçaları kaydedilemez
  const hasInvalid = input.elements.some((el) => {
    if (el.type === 'image') return true;
    if (el.type === 'widget' && (el.kind === 'minitest' || el.kind === 'reveal')) return true;
    return false;
  });
  if (hasInvalid) {
    return { ok: false, error: 'Resimler ve Mini Test/Cevabı Göster parçaları kütüphaneye kaydedilemez.' };
  }

  // Öğeleri hazırla:
  // 1. Birleşik kutunun sol üstünü (0,0) yapacak şekilde kaydır
  const b = getElementsBbox(input.elements);
  const prepared = cloneElements(input.elements, -b.x, -b.y);

  // 2. Her öğeden groupId ve lib alanlarını çıkar (eklenince yeni grup verilir)
  for (const el of prepared) {
    delete el.groupId;
    delete el.lib;
  }

  const payload = {
    name: trimmedName,
    category: input.category,
    elements: prepared,
    visibility: input.visibility || 'private',
  };

  const { data, error } = await supabase
    .from('board_library_items')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) return fail(error);
  return { ok: true, data: userRowToItem(data as UserLibraryRow) };
}

export interface UpdateLibraryItemPatch {
  name?: string;
  category?: LibraryCategory;
  visibility?: 'private' | 'school';
}

/**
 * Kayıtlı bir şeklin adını, kategorisini veya görünürlüğünü günceller.
 */
export async function updateLibraryItem(
  id: string,
  patch: UpdateLibraryItemPatch
): Promise<Result<LibraryItem>> {
  const updateData: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const t = patch.name.trim().slice(0, 80);
    if (!t) return { ok: false, error: 'Şekle bir ad verin.' };
    updateData.name = t;
  }
  if (patch.category !== undefined) {
    updateData.category = patch.category;
  }
  if (patch.visibility !== undefined) {
    updateData.visibility = patch.visibility;
  }

  const { data, error } = await supabase
    .from('board_library_items')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) return fail(error);
  return { ok: true, data: userRowToItem(data as UserLibraryRow) };
}

/**
 * Kayıtlı bir şekli siler.
 */
export async function deleteLibraryItem(id: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('board_library_items')
    .delete()
    .eq('id', id);

  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/**
 * Aynı okulda paylaşılan başka öğretmenlerin şekillerini döndürür.
 */
export async function listSchoolLibraryItems(): Promise<Result<LibraryItem[]>> {
  const { data, error } = await supabase.rpc('board_library_school_items');
  if (error) return fail(error);
  const rows = (data as SchoolLibraryRow[]) || [];
  return { ok: true, data: rows.map(schoolRowToItem) };
}

