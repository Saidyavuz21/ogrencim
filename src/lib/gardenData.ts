// ========================================================
// ÖĞRENCİ BAHÇESİ (veri katmanı)
// Kurallar ve yetkiler sunucuda: supabase/migrations/20261115090000_student_garden.sql
// - Öğretmen bir davranışa +1 verir → toplam puan da +1 (akvaryum/sıralama aynen çalışır).
// - O davranıştaki ilk puan fidanı diker; sonraki her puan 1 sulama hakkı.
// - Öğrenci kendi panelinden sular; ağaç "watered" sayısıyla büyür. Eksi puan yok, ağaç küçülmez.
// - Geri alma: öğretmenin kendi son 10 dakikadaki puanı; öğrenci o hakkı kullandıysa olmaz.
// ========================================================
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export interface GardenBehavior {
  id: string;
  name: string;
  /** İkon anahtarı (ör. book, heart, hand, sparkles, handshake, check, star) */
  icon: string;
  /** Ağaç türü anahtarı (ör. apple, cherry, oak, pine, orange, olive) */
  tree: string;
  sort: number;
  archived: boolean;
}

export interface GardenTree {
  behavior_id: string;
  /** Bu davranış için alınan toplam puan (ilk puan fidanı diker) */
  earned: number;
  /** Öğrencinin kaç kez suladığı */
  watered: number;
  planted_at: string;
  updated_at: string;
}

export interface GardenStudent {
  id: string;
  name: string;
  student_number: string;
  class_name: string | null;
  points: number | null;
  /** Ana şubesi başka sınıf olan grup üyesi */
  is_member: boolean;
  trees: GardenTree[];
}

export interface GardenAward {
  history_id: string;
  student_id: string;
  points: number;
  behavior_id: string;
  earned: number;
  watered: number;
}

export interface GardenUndo {
  student_id: string;
  points: number;
  behavior_id: string;
  earned: number;
  watered: number;
}

/** Varsayılan davranış ikonları ve ağaç türleri (sunucu herhangi bir kısa anahtarı kabul eder; arayüz bu listeden seçtirir) */
export const GARDEN_ICONS = ['book', 'heart', 'hand', 'sparkles', 'handshake', 'check', 'star', 'smile', 'clock', 'music', 'palette', 'leaf'] as const;
export const GARDEN_TREES = ['apple', 'cherry', 'oak', 'pine', 'orange', 'olive', 'lemon', 'willow'] as const;

/** Kullanılabilir sulama hakkı */
export const waterRights = (t: Pick<GardenTree, 'earned' | 'watered'>) => Math.max(0, t.earned - 1 - t.watered);

/**
 * Büyüme aşaması 0–5 (sulama sayısına göre): 0 fidan · 1 genç fidan · 2 genç ağaç · 3 yapraklı · 4 çiçekli · 5 meyveli.
 * Eşikler: 0, 2, 5, 9, 14, 20 sulama.
 */
export const GROWTH_THRESHOLDS = [0, 2, 5, 9, 14, 20] as const;
export function growthStage(watered: number): number {
  let stage = 0;
  GROWTH_THRESHOLDS.forEach((min, i) => { if (watered >= min) stage = i; });
  return stage;
}
/** Bir sonraki aşamaya kalan sulama (son aşamada null) */
export function wateringsToNext(watered: number): number | null {
  const next = GROWTH_THRESHOLDS.find((min) => min > watered);
  return next === undefined ? null : next - watered;
}

// ---------------- Manzara kazanımları ----------------
/**
 * Bahçe seviyesi: dikilmiş her ağaç (aşama + 1) kadar katkı verir.
 * Fidan dikmek 1, her büyüme aşaması +1 (meyveli ağaç = 6). 12 davranışla en fazla 72.
 */
export function gardenLevel(trees: Pick<GardenTree, 'earned' | 'watered'>[]): number {
  return trees.filter((t) => t.earned >= 1).reduce((sum, t) => sum + growthStage(t.watered) + 1, 0);
}

/** Manzaraya sırayla eklenen öğeler. Bahçe boş bir çayırla başlar (gökyüzü, tepeler, çimen). */
export const GARDEN_UNLOCKS = [
  { key: 'butterflies', level: 2, name: 'Kelebekler' },
  { key: 'path', level: 4, name: 'Patika' },
  { key: 'flowers', level: 6, name: 'Kır çiçekleri' },
  { key: 'fence', level: 9, name: 'Çit' },
  { key: 'house', level: 12, name: 'Küçük ev' },
  { key: 'birds', level: 16, name: 'Kuşlar ve kuş evi' },
  { key: 'bench', level: 20, name: 'Bank' },
  { key: 'pond', level: 25, name: 'Gölet' },
  { key: 'house2', level: 31, name: 'Ev büyüyor (pencere çiçekleri, baca)' },
  { key: 'lights', level: 38, name: 'Fenerler ve ışık zinciri' },
  { key: 'swing', level: 46, name: 'Salıncak' },
  { key: 'rainbow', level: 56, name: 'Gökkuşağı' },
] as const;
export type GardenUnlockKey = (typeof GARDEN_UNLOCKS)[number]['key'];

/** Açılmış öğeler ve sıradaki hedef */
export function gardenUnlocks(level: number) {
  const unlocked = new Set<GardenUnlockKey>(GARDEN_UNLOCKS.filter((u) => level >= u.level).map((u) => u.key));
  const next = GARDEN_UNLOCKS.find((u) => level < u.level) || null;
  return { unlocked, next, remaining: next ? next.level - level : 0 };
}

// ---------------- Öğretmen ----------------
/** Sınıfın davranışları; sınıfta hiç yoksa varsayılan 6 davranış eklenir. Arşivlenenler de döner. */
export async function listGardenBehaviors(className: string): Promise<Result<GardenBehavior[]>> {
  const { data, error } = await supabase.rpc('staff_garden_behaviors', { p_class: className });
  if (error) return fail(error);
  return { ok: true, data: (data as GardenBehavior[]) || [] };
}

/** Davranış ekle (id null) ya da düzenle. Sınıfta en fazla 12 etkin davranış. */
export async function saveGardenBehavior(
  className: string,
  input: { id?: string | null; name: string; icon: string; tree: string },
): Promise<Result<GardenBehavior>> {
  const { data, error } = await supabase.rpc('staff_garden_behavior_save', {
    p_id: input.id ?? null, p_class: className, p_name: input.name, p_icon: input.icon, p_tree: input.tree,
  });
  if (error) return fail(error);
  return { ok: true, data: data as GardenBehavior };
}

/** Arşivle / arşivden çıkar (silme yok) */
export async function archiveGardenBehavior(id: string, archived: boolean): Promise<Result<GardenBehavior>> {
  const { data, error } = await supabase.rpc('staff_garden_behavior_archive', { p_id: id, p_archived: archived });
  if (error) return fail(error);
  return { ok: true, data: data as GardenBehavior };
}

/** Sınıf listesi (ana şube + onaylı grup üyeleri) ve her öğrencinin ağaçları */
export async function listGardenClass(className: string): Promise<Result<GardenStudent[]>> {
  const { data, error } = await supabase.rpc('staff_garden_class', { p_class: className });
  if (error) return fail(error);
  return { ok: true, data: (data as GardenStudent[]) || [] };
}

/** Tek öğrenciye +1 */
export async function awardGarden(studentId: string, behaviorId: string): Promise<Result<GardenAward>> {
  const { data, error } = await supabase.rpc('staff_garden_award', { p_student: studentId, p_behavior: behaviorId });
  if (error) return fail(error);
  return { ok: true, data: data as GardenAward };
}

/** Sınıftaki herkese +1 */
export async function awardGardenClass(className: string, behaviorId: string): Promise<Result<GardenAward[]>> {
  const { data, error } = await supabase.rpc('staff_garden_award_class', { p_class: className, p_behavior: behaviorId });
  if (error) return fail(error);
  return { ok: true, data: (data as GardenAward[]) || [] };
}

/** Son 10 dakikada verilen bahçe puanını geri al */
export async function undoGardenAward(historyId: string): Promise<Result<GardenUndo>> {
  const { data, error } = await supabase.rpc('staff_garden_undo', { p_history: historyId });
  if (error) return fail(error);
  return { ok: true, data: data as GardenUndo };
}

// ---------------- Öğrenci ----------------
export interface MyGarden {
  trees: GardenTree[];
  /** Ağaçlarının davranışları + sınıfının etkin davranışları (henüz dikilmemiş boş yerler) */
  behaviors: GardenBehavior[];
}

export async function getMyGarden(): Promise<Result<MyGarden>> {
  const { data, error } = await supabase.rpc('student_garden');
  if (error) return fail(error);
  const d = (data || {}) as Partial<MyGarden>;
  return { ok: true, data: { trees: d.trees || [], behaviors: d.behaviors || [] } };
}

/** Ağacı 1 kez sula (hak yoksa hata) */
export async function waterMyTree(behaviorId: string): Promise<Result<GardenTree>> {
  const { data, error } = await supabase.rpc('student_garden_water', { p_behavior: behaviorId });
  if (error) return fail(error);
  return { ok: true, data: data as GardenTree };
}
