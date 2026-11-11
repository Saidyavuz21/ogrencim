// ========================================================
// SINIF AKVARYUMU KURALLARI
// - 5 puanın altı (eksiler dahil) yumurta; 1–4 puanda çatlaklar artar
// - 5 puanda yumurtadan çıkar; puan 5'in altına düşerse yeniden yumurta olur
// - Balığın şekli varsayılan olarak her 5 puanda değişir (20 şekil: 5–9, 10–14, … 100+);
//   bu aralık akvaryumun ayarlarından değiştirilebilir (bu cihazda hatırlanır)
// - Boy puanla neredeyse orantılı büyür (her puan yaklaşık aynı kadar boy katar); çok yüksek puanda üst sınırda durur
// - Puanı yaklaşık iki katı olan balık yanındaki küçüğe ağzını açıp saldırır, küçük kaçar (yemez)
// - 50 puanda parıltı, 75 puanda taç
// ========================================================

export interface AquariumInput {
  id: string;
  name: string;
  points: number;
}

export const HATCH_POINTS = 5;
/** Şekil değişim aralığı (puan): varsayılan ve ayarlardan seçilebilen değerler */
export const FORM_STEP = 5;
export const FORM_STEPS = [3, 5, 10, 15, 20] as const;
/** FishArt içindeki çizim sayısıyla aynı olmalı */
export const FORM_COUNT = 20;
export const SPARKLE_POINTS = 50;
export const CROWN_POINTS = 75;

/** Balık mı? Yalnızca şu anki puana bakılır: 5 ve üzeri balık, altı yumurta */
export const isFish = (s: Pick<AquariumInput, 'points'>) => s.points >= HATCH_POINTS;

/** Yumurtadaki çatlak sayısı: 0 puan ve eksi → 0, 1–4 puan → 1–4 */
export const eggCracks = (points: number) => Math.max(0, Math.min(HATCH_POINTS - 1, points));

/** Balık şekli 1–20. Yumurtadan çıkınca 1; sonra her `step` puanda bir üst şekil (5'te: 5–9 → 1, 10–14 → 2, … 100+ → 20) */
export const fishForm = (points: number, step: number = FORM_STEP) =>
  Math.max(1, Math.min(FORM_COUNT, 1 + Math.floor((Math.max(points, HATCH_POINTS) - HATCH_POINTS) / Math.max(1, step))));

const MIN_SIZE = 34;
const HATCH_SIZE = 38;
const MAX_SIZE = 260;
/**
 * Büyüme: puanla neredeyse orantılı, yalnızca hafifçe yavaşlar
 * (5 puan ≈ 38, 20 ≈ 73, 40 ≈ 116, 60 ≈ 153, 80 ≈ 186, 100 ≈ 215; ~135 puanda üst sınır 260).
 * Önceki eğri erken puanlarda hızlı büyüyüp sonra duruyordu (20 ≈ 85, 100 ≈ 207).
 */
const GROWTH = 160;
const GROWTH_SPAN = 395;

/**
 * Balığın genişliği (1000 birim genişlikteki akvaryuma göre).
 * Her puan yaklaşık aynı kadar boy katar; ekranı kaplamasın diye üst sınırda durur.
 */
export function fishSize(points: number): number {
  if (points < HATCH_POINTS) return MIN_SIZE + (HATCH_SIZE - MIN_SIZE) * Math.max(0, points) / HATCH_POINTS;
  return Math.min(MAX_SIZE, HATCH_SIZE + GROWTH_SPAN * (1 - Math.exp(-(points - HATCH_POINTS) / GROWTH)));
}

/** "Yeme" oyunu: büyük balığın puanı küçüğün yaklaşık iki katıysa ona saldırır (küçük kaçar) */
export const CHASE_RATIO = 1.8;

/**
 * "Balıklar birbirini yutsun" modu (yalnızca ekranda; gerçek puanlar değişmez):
 * - Balık, kendinden en az 1 şekil (kademe) küçük balığı yakalarsa yutar
 * - İkisi de son şekildeyse (Galaksi) puanı fazla olan diğerini yutar
 * - Yutan, yutulan kaç puanlı olursa olsun geçici olarak bir şekil aralığı kadar puan alır (bir şekil büyür); böylece
 *   şekiller atlanmadan sırayla görünür ve yuta yuta daha büyükleri de yutabilir
 * - Yutulan, mod açık kaldıkça geri gelmez; mod kapatılınca herkes geri gelir ve geçici puanlar silinir
 * - Büyük balık her seferinde yakalayamaz: küçük balık bazen kaçıp kurtulur (fark azsa daha sık)
 */
export const SWALLOW_TIER_GAP = 1;
/** Her yemde kazanılan geçici puan: bir şekil aralığının bir eksiği (5'te +4) */
export const foodPoints = (step: number = FORM_STEP) => Math.max(1, step - 1);
export function canSwallow(bigPoints: number, smallPoints: number, step: number = FORM_STEP) {
  if (!isFish({ points: bigPoints }) || !isFish({ points: smallPoints })) return false;
  const big = fishForm(bigPoints, step);
  const small = fishForm(smallPoints, step);
  if (big === FORM_COUNT && small === FORM_COUNT) return bigPoints > smallPoints;
  return big - small >= SWALLOW_TIER_GAP;
}

/** Kimliğe göre sabit sözde rastgele sayı (her açılışta aynı balık aynı yerde yüzer) */
export function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Akvaryumda görünecek kısa ad: ilk isim; aynı ilk isimden birden fazla varsa soyadının baş harfi eklenir */
export function shortNames(students: Pick<AquariumInput, 'id' | 'name'>[]): Record<string, string> {
  const parts = students.map((s) => ({ id: s.id, words: s.name.trim().split(/\s+/).filter(Boolean) }));
  const firstCount = new Map<string, number>();
  for (const p of parts) {
    const first = (p.words[0] || '').toLocaleUpperCase('tr-TR');
    firstCount.set(first, (firstCount.get(first) || 0) + 1);
  }
  const out: Record<string, string> = {};
  for (const p of parts) {
    const first = p.words[0] || '?';
    const last = p.words.length > 1 ? p.words[p.words.length - 1] : '';
    const dup = (firstCount.get(first.toLocaleUpperCase('tr-TR')) || 0) > 1;
    out[p.id] = dup && last ? `${first} ${last[0]}.` : first;
  }
  return out;
}
